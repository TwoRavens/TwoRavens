import m from 'mithril';
import jsep from 'jsep';

import * as app from './app';
import * as tour from './tour';

// PIPELINE DESCRIPTION
// transform step: add new fields/columns/variables:
// {transforms: [{name: 'newName', equation: 'plaintext formula'}, ...]}

// subset step: filter rows based on constraints
// {abstractQuery: [JQTree representation of constraints], nodeId: int, groupId: int, queryId: int}

// aggregate step: count number of ocurrences in bins
// {measuresUnit: [], measuresAccum: []}


// functions for generating database queries
// subset queries are built from the abstractQuery, which is managed in app.js
// aggregation queries contain the subset query as the first stage in the pipeline. The second group stage pulls data from subsetPreferences

// submit*() functions cause a state change/update the menus
// build*() functions are pure and return mongo queries
// process*() functions are for constructing the subset query, relative to a specific node, group, or rule on the query tree

export function buildPipeline(pipeline) {
    let compiled = [];

    pipeline.forEach(step => {
        if (step.type === 'transform') compiled.push({
            '$addFields': step.transforms.reduce((out, transformation) => {
                out[transformation.name] = buildTransform(transformation['equation'])['query'];
                out[transformation.name]['$comment'] = transformation['equation'];
                return out;
            })
        });
        if (step.type === 'subset')
            compiled.push({'$match': buildSubset(step.abstractQuery, true)});
        if (step.type === 'aggregate')
            compiled = compiled.concat(buildAggregation(step.measuresUnit, step.measuresAccum)['pipeline']);
    });

    return compiled;
}

export let unaryFunctions = new Set([
    'abs', 'ceil', 'exp', 'floor', 'ln', 'log10', 'sqrt', 'trunc', // math
    'and', 'not', 'or', // logic
    'trim', 'toLower', 'toUpper', // string
    'toBool', 'toDouble', 'toInt', 'toString' // type
]);
export let binaryFunctions = new Set([
    'divide', 'log', 'mod', 'pow', 'subtract', // math
    'eq', 'gt', 'gte', 'lt', 'lte', 'ne', // comparison
]);
export let variadicFunctions = new Set([
    'add', 'multiply', 'concat' // any number of arguments
]);

export let unaryOperators = {
    '+': 'add',
    '-': 'subtract',
    '~': 'not'
};
export let binaryOperators = {
    '+': 'add',
    '/': 'divide',
    '%': 'mod',
    '*': 'multiply',
    '^': 'pow',
    '-': 'subtract'
};

// return a mongo projection from a string that describes a transformation
// let examples = ['2 + numhits * sqrt(numwalks / 3)', 'strikes % 3', '~wonGame'];
export function buildTransform(text, variables) {

    let usedTerms = {
        variables: new Set(),
        unaryFunctions: new Set(),
        binaryFunctions: new Set(),
        variadicFunctions: new Set(),
        unaryOperators: new Set(),
        binaryOperators: new Set()
    };

    let parse = tree => {
        if (tree.type === 'Literal') return tree.value;

        // Variables
        if (tree.type === 'Identifier') {
            if (variables.has(tree.name)) {
                usedTerms.variables.add(tree.name);
                return tree.name;
            }
            throw 'Invalid variable: ' + tree.name;
        }

        // Functions
        if (tree.type === 'CallExpression') {
            if (unaryFunctions.has(tree.callee.name)) {
                usedTerms.unaryFunctions.add(tree.callee.name);
                return {['$' + tree.callee.name]: parse(tree['arguments'][0])};
            }
            if (binaryFunctions.has(tree.callee.name) && tree['arguments'].length === 2) {
                usedTerms.binaryFunctions.add(tree.callee.name);
                return {['$' + tree.callee.name]: tree['arguments'].map(arg => parse(arg))};
            }
            if (variadicFunctions.has(tree.callee.name)) {
                usedTerms.variadicFunctions.add(tree.callee.name);
                return {['$' + tree.callee.name]: tree['arguments'].map(arg => parse(arg))};
            }
            throw `Invalid function: ${tree.callee.name} with ${tree['arguments'].length} arguments`;
        }

        // Unary Operators
        if (tree.type === 'UnaryExpression') {
            if (tree.operator in unaryOperators) {
                usedTerms.unaryOperators.add(tree.operator);
                return {['$' + unaryOperators[tree.operator]]: [parse(tree.argument)]};
            }
            throw 'Invalid unary operator: ' + tree.operator;
        }

        // Binary Operators
        if (tree.type === 'BinaryExpression') {
            if (tree.operator in binaryOperators) {
                usedTerms.binaryOperators.add(tree.operator);
                return {['$' + binaryOperators[tree.operator]]: [parse(tree.left), parse(tree.right)]};
            }
            throw 'Invalid binary operator: ' + tree.operator;
        }

        throw 'Unknown syntax: ' + tree.type;
    };

    return {query: parse(jsep(text)), usedTerms};
}


export async function submitQuery() {

    // Only construct and submit the query if new subsets have been added since last query
    let newSubsets = false;
    let step = app.getTransformStep(app.eventdataSubsetName);
    for (let idx in step.abstractQuery) {
        if (step.abstractQuery[idx].type !== 'query') {
            newSubsets = true;
            break
        }
    }

    if (!newSubsets) {
        alert("Nothing has been staged yet! Stage your preferences before subset.");
        return;
    }

    app.setLaddaSpinner('btnUpdate', true);

    let subsetName = app.selectedSubsetName;

    let success = await app.loadSubset(subsetName, {includePending: true, recount: true, requireMatch: true});
    if (!success) return;

    // clear all subset data. Note this is intentionally mutating the object, not rebinding it
    Object.keys(app.subsetData)
        .filter(subset => subset !== subsetName)
        .forEach(subset => delete app.subsetData[subset]);

    // True for adding a query group, all existing preferences are grouped under a 'query group'
    app.addGroup(true);

    // Add all nodes to selection
    let nodeList = [...Array(step.nodeId).keys()];

    let subsetTree = $('#subsetTree');

    nodeList.forEach((node_id) => {
        const node = subsetTree.tree("getNodeById", node_id);
        if (!node) return;
        subsetTree.tree("addToSelection", node);
        if (node.type !== 'query') node.editable = false;
    });

    // Redraw tree
    step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
    let state = subsetTree.tree('getState');
    subsetTree.tree('loadData', step.abstractQuery);
    subsetTree.tree('setState', state);
}

// Recursively traverse the tree in the right panel. For each node, call processNode
export function buildSubset(tree, useStaged = true) {
    // Base case
    if (tree.length === 0) return {};

    let queryStack = [];
    let stagedSubsetData = [];
    for (let child of tree) {
        if (child.type === 'query') queryStack.push(child);
        else stagedSubsetData.push(child)
    }

    // Treat staged subset data as just another query on the query stack
    if (useStaged && stagedSubsetData.length)
        queryStack.push({'children': stagedSubsetData, 'operation': 'and', 'name': 'New Query', type: 'query'});
    return processGroup({'children': queryStack});
}

// If node is a group, then build up the overall operator tree via processGroup
// If node is a subset, then consider it a leaf, use processRule to build query specific to subset
function processNode(node) {
    if (node.type === 'group' && 'children' in node && node.children.length !== 0) {
        // Recursively process subgroups
        return processGroup(node);
    } else if (node.type === 'query' && 'children' in node && node.children.length !== 0) {
        // Recursively process query
        return processGroup(node);
    }
    else {
        // Explicitly process rules
        return processRule(node);
    }
}

// Group precedence parser
// Constructs a boolean operator tree via operator precedence between siblings (for groups and queries)
function processGroup(group) {

    // all rules are 'or'ed together
    let group_query = {'$or': []};

    // strings of rules conjoined by 'and' operators are clotted in semigroups that act together as one rule
    let semigroup = [];

    for (let child_id = 0; child_id < group.children.length - 1; child_id++) {
        let op_self = group.children[child_id]['operation'];
        let op_next = group.children[child_id + 1]['operation'];

        // Clot together and operators
        if (op_self === 'and' || op_next === 'and') {
            semigroup.push(processNode(group.children[child_id]));
            if (op_next === 'or') {
                group_query['$or'].push({'$and': semigroup.slice()});
                semigroup = [];
            }
        }

        // If not part of an 'and' clot, simply add to the query
        if (op_self === 'or' && op_next === 'or') {
            group_query['$or'].push(processNode(group.children[child_id]));
        }
    }

    // Process final sibling
    if (group.children.length > 0 && group.children[group.children.length - 1]['operation'] === 'and') {
        semigroup.push(processNode(group.children[group.children.length - 1]));
        group_query['$or'].push({'$and': semigroup.slice()})
    } else
        group_query['$or'].push(processNode(group.children[group.children.length - 1]));

    // Remove unnecessary conjunctions
    if (group_query['$or'].length === 1) {
        group_query = group_query['$or'][0]
    }
    if ('$and' in group_query && group_query['$and'].length === 1) {
        group_query = group_query['$and'][0]
    }

    return group_query;
}

// Return a mongoDB query for a rule data structure
function processRule(rule) {
    let rule_query = {};

    if (rule.subset === 'date') {

        let rule_query_inner = {};
        if (rule.structure === 'point') {
            let rule_query_inner = {};
            let column;
            for (let child of rule.children) {
                column = child.column;
                if ('fromDate' in child) {
                    child.fromDate = new Date(child.fromDate);
                    rule_query_inner['$gte'] = {'$date': {'$numberLong': String(child.fromDate.getTime())}}
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    rule_query_inner['$lte'] = {'$date': {'$numberLong': String(child.toDate.getTime())}}
                }
            }
            rule_query[column] = rule_query_inner;
        } else if (rule.structure === 'interval') {
            for (let child of rule.children) {
                if ('fromDate' in child) {
                    child.fromDate = new Date(child.fromDate);
                    rule_query[child.column] = {
                        '$gte': {'$date': {'$numberLong': String(child.fromDate.getTime())}}
                    };
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    rule_query[child.column] = {
                        '$lte': {'$date': {'$numberLong': String(child.toDate.getTime())}}
                    };
                }
            }
        }
    }

    if (['categorical', 'categorical_grouped'].indexOf(rule.subset) !== -1) {
        let rule_query_inner = [];
        for (let child of rule.children) {
            rule_query_inner.push(child.name);
        }

        rule_query_inner = {'$in': rule_query_inner};
        if ('negate' in rule && !rule.negate) {
            rule_query_inner = {'$not': rule_query_inner};
        }

        rule_query[rule.column] = rule_query_inner;
    }

    // Actor subset is itself a group of links. A link is a hardcoded group, and source/target lists are leaf nodes
    if (rule.subset === 'dyad') {
        return processGroup(rule);
    }

    if (rule.subset === 'link') {
        return {'$and': rule.children.map(child => processNode(child))};
    }

    if (rule.subset === 'node') {
        return {[rule.column]: {'$in': rule.actors}}
    }

    if (rule.subset === 'coordinates') {
        let rule_query_inner = [];

        for (let child of rule.children) {
            if (child.name === 'Latitude') {
                let latitude = {
                    [child.column]: {
                        '$lte': parseFloat(child.children[0].name),
                        '$gte': parseFloat(child.children[1].name)
                    }
                };

                if ('negate' in child && !child.negate) {
                    latitude = {'$not': latitude};
                }
                rule_query_inner.push(latitude);

            } else if (child.name === 'Longitude') {
                let longitude = {
                    [child.column]: {
                        '$lte': parseFloat(child.children[0].name),
                        '$gte': parseFloat(child.children[1].name)
                    }
                };

                if ('negate' in child && !child.negate) {
                    longitude = {'$not': longitude};
                }
                rule_query_inner.push(longitude);
            }
        }

        if ('negate' in rule && !rule.negate) {
            rule_query_inner = {'$not': rule_query_inner};
        }

        rule_query['$and'] = rule_query_inner;
    }

    if (rule.subset === 'custom') {
        // makes a copy and validates json
        rule_query = JSON.parse(JSON.stringify(rule.custom));
        console.log(rule_query);
    }

    return rule_query;
}

export function submitAggregation() {
    if (!app.eventMeasure) {
        tour.tourStartEventMeasure();
        return;
    }

    let step = app.getTransformStep(app.eventdataSubsetName);
    let query = JSON.stringify(buildAggregation(step.measuresUnit, step.measuresAccum));
    console.log("Aggregation Query: " + query);

    app.setLaddaSpinner('btnUpdate', true);

    app.getData({
        host: app.genericMetadata[app.selectedDataset]['host'],
        method: 'aggregate',
        query: query,
        dataset: app.selectedDataset
    })
        .then(reformatAggregation)
        .then(({data, headersUnit, headersEvent}) => {
            app.setAggregationData(data);
            app.setAggregationHeadersUnit(headersUnit);
            app.setAggregationHeadersEvent(headersEvent);
        })
        .then(() => app.setLaddaSpinner('btnUpdate', false))
        .then(() => app.setAggregationStaged(false)).then(m.redraw)
        .catch(app.laddaStopAll);
}

export function buildAggregation(unitMeasures, accumulations) {
    // unit of measure
    let unit = {};

    // event measure
    let event = {};

    // monads/dyads require a melt after grouping
    let dyadMeasureName;
    let columnsDyad = [];
    let columnsNonDyad = [];
    let columnsAccum = [];

    // note that only aggregation transforms for unit-date, unit-dyad and event-categorical have been written.
    // To aggregate down to date events, for example, a new function would need to be added under ['event']['date'].
    let transforms = {
        'unit': {
            'date': (data) => {

                let dateFormat = {
                    'Weekly': '%Y-%V',
                    'Monthly': '%Y-%m',
                    'Yearly': '%Y'
                }[data['unit']];

                let columnName = data['measureName'] + '-' + data['unit'];
                columnsNonDyad.push(columnName);

                if (dateFormat) unit[columnName] = {
                    "$dateToString": {
                        "format": dateFormat,
                        "date": "$" + data['column']
                    }
                };


                else if (data['unit'] === 'Quarterly') {
                    // function takes a mongodb subquery and returns the subquery casted to a string
                    let toString = (query) => ({"$substr": [query, 0, -1]});
                    unit[columnName] = {
                        '$concat': [
                            toString({'$year': '$' + data['column']}), '-',
                            toString({'$trunc': {'$divide': [{'$month': '$' + data['column']}, 4]}})
                        ]
                    }
                }
            },
            'dyad': (data) => {
                dyadMeasureName = data['measureName'];
                data.children.map(link => {
                    let [leftChild, rightChild] = link.children;

                    let dyadName = data['measureName'].replace(/[$.-]/g, '') + '-' + leftChild.name.replace(/[$.-]/g, '') + '-' + rightChild.name.replace(/[$.-]/g, '');
                    columnsDyad.push(dyadName);

                    unit[dyadName] = {
                        '$and': [
                            {'$in': ['$' + leftChild.column, [...leftChild.actors]]},
                            {'$in': ['$' + rightChild.column, [...rightChild.actors]]}
                        ]
                    }
                });
            }
        },
        'event': {
            'categorical': (data) => {
                let selections = new Set(data.children.map(child => child.name));
                columnsAccum = columnsAccum.concat([...selections]);

                let bins = {};
                if ('alignment' in data) {
                    for (let equivalency of app.alignmentData[data['alignment']]) {
                        if (!(data['formatSource'] in equivalency && data['formatTarget'] in equivalency)) continue;
                        if (!selections.has(equivalency[data['formatSource']])) continue;

                        if (!(equivalency[data['formatTarget']] in bins)) bins[equivalency[data['formatTarget']]] = new Set();
                        bins[equivalency[data['formatTarget']]].add(equivalency[data['formatSource']])
                    }
                }
                else for (let selection of selections) bins[selection] = new Set([selection]);

                for (let bin of Object.keys(bins)) {
                    if (bins[bin].size === 1) event[bin] = {
                        "$sum": {
                            "$cond": [{
                                "$eq": ["$" + data['column'], [...bins[bin]][0]]
                            }, 1, 0]
                        }
                    };
                    else event[bin] = {
                        "$sum": {
                            "$cond": [{
                                "$anyElementTrue": {
                                    "$map": {
                                        "input": [...bins[bin]],
                                        "as": "el",
                                        "in": {"$eq": ["$$el", "$" + data['column']]}
                                    }
                                }
                            }, 1, 0]
                        }
                    }
                }
            }
        }
    };

    let reformatter = [];
    if (dyadMeasureName) {
        let _id = columnsNonDyad.reduce((out_id, columnNonDyad) => {
            out_id[columnNonDyad] = "$_id." + columnNonDyad;
            return out_id;
        }, {});

        reformatter = [
            {
                "$facet": columnsDyad.reduce((facet, dyad) => { // build a pipeline for each dyad
                    facet[dyad] = [
                        {"$match": {["_id." + column]: true}},
                        {
                            "$group": columnsAccum.reduce((accumulators, columnAccum) => {
                                accumulators[columnAccum] = {"$sum": "$" + columnAccum};
                                return accumulators;
                            }, {_id})
                        },
                        {"$addFields": Object.assign({[dyadMeasureName]: dyad}, _id)}
                    ];
                    return facet;
                }, {})
            },
            {"$project": {"combine": {"$setUnion": columnsDyad.map(column => '$' + column)}}},
            {"$unwind": "$combine"},
            {"$replaceRoot": {"newRoot": "$combine"}},
            {"$project": {"_id": 0}}
        ];
    }
    else {
        reformatter = [
            {
                "$addFields": columnsNonDyad.reduce((addFields, column) => {
                    addFields[column] = '$_id.' + column;
                    return addFields;
                }, {})
            },
            {"$project": {"$_id": 0}}
        ];
    }

    unitMeasures.forEach(measure => transforms.unit[measure.type](measure));
    accumulations.forEach(measure => transforms.unit[measure.type](measure));

    return {
        pipeline: [{"$group": Object.assign({"_id": unit}, event)}].concat(reformatter),
        columnsUnit: columnsNonDyad.concat(dyadMeasureName ? [dyadMeasureName] : []),
        columnsAccum
    };
}

// almost pure- the function mutates the argument
export function reformatAggregation(jsondata) {
    console.log(jsondata);
    if (jsondata.length === 0) return {data: jsondata, headers: []};

    // get all unique subset names from the _id object. usage of Set is to remove repeated dyad keys
    let headers = new Set(Object.keys(jsondata[0]._id).map(id => id.split('-')[0]));

    // reformat data for each unit measure
    headers.forEach(unit => {
        if (app.genericMetadata[app.selectedDataset]['subsets'][unit]['type'] === 'date' && jsondata.length !== 0) {
            // date ids are of the format: '[unit]-[dateFormat]'; grab the dateFormat from the id:
            let format = Object.keys(jsondata[0]._id).filter(id => id.split('-')[0] === unit)[0].split('-')[1];

            jsondata.forEach(entry => {
                    if (entry._id[unit + '-' + format] === undefined) return;
                    entry._id[unit] = {
                        'Weekly': dateStr => {
                            let [year, week] = dateStr.split('-');
                            let date = new Date(new Date(year, 0).setDate(week * 7));
                            return date.toISOString().slice(0, 10);
                        },
                        'Monthly': (dateStr) => dateStr + '-01',
                        'Yearly': (dateStr) => dateStr + '-01-01',
                        'Quarterly': (dateStr) => {
                            let [year, quarter] = dateStr.split('-');
                            return year + '-' + app.pad(quarter * 3, 2) + '-01'; // weak typing '2' * 2 = 4
                        },
                    }[format](entry._id[unit + '-' + format]);
                    delete entry._id[unit + '-' + format];
                }
            )
        }
    });
    // NOTE: compute before mutating/flattening jsondata below
    let events = Object.keys(jsondata[0])
        .filter(key => key !== '_id')
        .sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b));

    // flatten unit of analysis _id into root object, and sort by order of unit headers
    jsondata = jsondata.map(entry => {
        // because R stringifies {"0": 452, "1": 513} as [452, 513]
        if (Array.isArray(entry)) entry = Object.assign({}, entry);

        let {_id} = entry;
        delete entry._id;
        Object.assign(entry, _id);
        return entry;
    }).sort((a, b) => {
        for (let header of headers) {
            if (!(header in a) || !(header in b)) continue;
            let compare = {
                'number': () => a[header] - b[header],
                'string': () => a[header].localeCompare(b[header])
            }[typeof a[header]]();
            if (compare) return compare;
        }
    });

    return {
        data: jsondata,
        headersUnit: [...headers],
        headersEvent: [...events]
    }
}

export function genericRealignment(alignment, inFormat, outFormat, data) {
    // TODO this is lossy one way. Not using it yet.
    let transform = alignment.reduce((out, equivalency) => {
        out[equivalency[inFormat]] = equivalency[outFormat];
        return out;
    }, {});
    return [...new Set(data.map(point => transform[point]))];
}

// Take an abstract query for one dataset, and turn it into a query for another - with descriptive logs
export function realignQuery(step, source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

    let toVariableString = (variables) => String(variables.map(variable => variable.replace('_constructed', '')));

    let realignBranch = (query) => {
        return query.map(branch => {
            if (branch.type !== 'rule') {
                branch.children = realignBranch(branch.children);
                if (branch.children.length === 0) {
                    log.push('Removed ' + branch.name + ', because it has no children.');
                    return;
                }
                return branch
            }

            let subsetName = branch.name.replace(' Subset', '');
            if (!(subsetName in targetSubsets)) {
                log.push('Removed ' + branch.name + ', because it does not have an alignment in ' + target + '.');
                return;
            }

            if (branch.subset === 'dyad') {
                let sourceTabs = Object.keys(sourceSubsets[subsetName]['tabs']);
                let targetTabs = Object.keys(targetSubsets[subsetName]['tabs']);

                // This is a bit of a shortcut
                if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return;
                }

                let sourceFull = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['full']);
                let targetFull = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['full']);

                let sourceFormats = sourceFull.map(column => app.genericMetadata[source]['formats'][column]);
                let targetFormats = targetFull.map(column => app.genericMetadata[target]['formats'][column]);

                // if full column formats are already matching, then return
                if ([sourceFormats, targetFormats].every(formats => formats.every(format => format)) // exists
                    && [0, 1].every(i => sourceFormats[i] === targetFormats[i])) {                   // and equal
                    return branch;
                }

                log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats));
                return;

                // actor alignments script is on hold
                // // else if realignment can be achieved via filters
                // let sourceFilters = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['filters']);
                // let targetFilters = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['filters']);
                //
                // let sourceAlignment = app.genericMetadata[source]['alignments'][sourceFull];
                // let targetAlignment = app.genericMetadata[target]['alignments'][targetFull];
                //
                // let relabelDyad = () => branch.children.forEach((monad, i) => monad['column'] = targetFull[i]);
                // if (sourceFormats.every((format, i) => format === targetFormats[i])) {
                //     relabelDyad();
                //     log.push('Relabeled dyad columns in ' + branch.name + '.');
                //     return branch;
                // }
                // else if ((!sourceAlignment || !targetAlignment || sourceAlignment !== targetAlignment)
                //     && targetFormats.some((format, i) => format !== sourceFormats[i])) {
                //     log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats))
                //     return;
                // }
                //
                // if (sourceAlignment && targetAlignment && sourceAlignment === targetAlignment) {
                //     log.push('Realigned dyad columns in ' + branch.name + '.');
                // }
                // return branch;
            }

            if (branch.subset === 'categorical' || branch.subset === 'categorical_grouped') {
                let sourceColumn = app.coerceArray(sourceSubsets[subsetName]['columns'])[0];
                let targetColumn = app.coerceArray(targetSubsets[subsetName]['columns'])[0];

                let sourceFormat = app.genericMetadata[source]['formats'][sourceColumn];
                let targetFormat = app.genericMetadata[target]['formats'][targetColumn];

                if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return
                }

                if (branch.column !== targetColumn)
                    log.push('Relabeled column in ' + branch.name + '.');
                branch.column = targetColumn;
                return branch;
            }

            if (branch.subset === 'date') {
                let sourceColumns = app.coerceArray(sourceSubsets[subsetName]['columns']);
                let targetColumns = app.coerceArray(targetSubsets[subsetName]['columns']);
                if (branch.children.some((handle, i) => handle['column'] !== targetColumns[i % targetColumns.length]))
                    log.push('Relabeled column intervals in ' + branch.name
                        + ' from ' + toVariableString(sourceColumns) + ' to ' + toVariableString(targetColumns) + '.');

                // the modular indexing is for handling conversions between point and interval date structures
                branch.children.forEach((handle, i) => handle['column'] = targetColumns[i % targetColumns.length]);
                return branch;
            }


            if (branch.subset === 'coordinates') {
                let targetColumns = targetSubsets[subsetName]['columns'];
                if (branch.children.some((orient, i) => orient['column'] !== targetColumns[i]))
                    log.push('Relabeled columns in ' + branch.name + ' from ' + String(branch.children.map(child => child['column'])) + ' to ' + String(targetColumns));
                branch.children.forEach((orient, i) => orient['column'] = targetColumns[i]);
                return branch;
            }

            if (branch.subset === 'custom') {
                log.push('Removed ' + branch.name + ', because custom queries do not have ontological alignments.');
                return;
            }

        }).filter(branch => branch !== undefined) // prune subsets and groups that didn't transfer
    };

    step.abstractQuery = realignBranch(step.abstractQuery);
    return log;
}

export function realignPreferences(source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

    Object.keys(app.subsetPreferences).forEach(subset => {
        if (Object.keys(app.subsetPreferences[subset]).length === 0) return;
        if (!(subset in targetSubsets)) {
            log.push(subset + ' is not available for ' + target + ', but subset preferences have been cached.');
            return;
        }

        let subsetType = targetSubsets[subset]['type'];

        if (subsetType === 'dyad') {
            let sourceTabs = Object.keys(sourceSubsets[subset]['tabs']);
            let targetTabs = Object.keys(targetSubsets[subset]['tabs']);
            // This is a bit of a shortcut
            if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                log.push(subset + ' has a different alignment, so the groups and links from ' + source + ' have been cached and are not visible from ' + target + '.')
            }
        }

        if (subsetType === 'categorical' || subsetType === 'categorical_grouped') {
            let sourceColumn = app.coerceArray(sourceSubsets[subset]['columns'])[0];
            let targetColumn = app.coerceArray(targetSubsets[subset]['columns'])[0];

            let sourceFormat = app.genericMetadata[source]['formats'][sourceColumn];
            let targetFormat = app.genericMetadata[target]['formats'][targetColumn];

            if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                log.push('Cleared menu preferences in ' + subset + ', because the column formats are not comparable.');
                app.subsetPreferences[subset] = {}
            }
        }
    });
    return log;
}

export function realignVariables(source, target) {
    let log = [];
    let newSelectedVariables = new Set();
    app.selectedVariables.forEach(variable => {
        if (!(variable in app.genericMetadata[source]['formats'])) {
            log.push('De-selected ' + variable + ', because it has no recorded equivalent in ' + target + '.');
            return;
        }
        Object.keys(app.genericMetadata[target]['formats']).forEach(targetVar => {
            let targetFormat = app.genericMetadata[target]['formats'][targetVar];
            if (targetFormat === app.genericMetadata[source]['formats'][variable])
                newSelectedVariables.add(targetVar);
        })
    });
    let equivalents = [...newSelectedVariables].filter(x => !app.selectedVariables.has(x));
    if (equivalents.length !== 0) log.push('Selected equivalent variables: ' + String(equivalents));

    app.setSelectedVariables(newSelectedVariables);
    return log;
}