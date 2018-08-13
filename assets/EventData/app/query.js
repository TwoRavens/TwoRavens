import m from 'mithril';
import jsep from 'jsep';

import * as app from './app';
import * as tour from './tour';

// functions for generating database queries
// subset queries are built from the abstractQuery, which is managed in app.js
// aggregation queries contain the subset query as the first stage in the pipeline. The second group stage pulls data from subsetPreferences

// submit*() functions cause a state change/update the menus
// build*() functions are pure and return mongo queries
// process*() functions are for constructing the subset query, relative to a specific node, group, or rule on the query tree


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

export let unaryFunctions = new Set([
    'abs', 'ceil', 'exp', 'floor', 'ln', 'log', 'log10', 'sqrt', 'trunc', // math
    'and', 'not', 'or', // logic
    'trim', 'toLower', 'toUpper', // string
    'toBool', 'toDouble', 'toInt', 'toString' // type
]);
export let binaryFunctions = new Set([
    'add', 'divide', 'mod', 'multiply', 'pow', 'subtract', // math
    'eq', 'gt', 'gte', 'lt', 'lte', 'ne', // comparison
    'concat' // string
]);

export let unaryOperators = {
    '+': 'add',
    '-': 'subtract',
    '~': 'not'
};
export let binaryOperators =  {
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

    let parse = tree => {
        if (tree.type === 'Literal') return tree.value;

        // Variables
        if (tree.type === 'Identifier') {
            if (variables.has(tree.name)) return tree.name;
            throw 'Invalid variable';
        }

        // Functions
        if (tree.type === 'CallExpression') {
            if (unaryFunctions.has(tree.callee.name.toLowerCase()))
                return {['$' + tree.callee.name.toLowerCase()]: parse(tree.arguments[0])};
            if (binaryFunctions.has(tree.callee.name.toLowerCase()))
                return {['$' + tree.callee.name.toLowerCase()]: tree.arguments.map(arg => parse(arg))};
            throw `Invalid function: ${tree.callee.name} with ${tree.arguments.length} arguments`;
        }

        // Unary Operators
        if (tree.type === 'UnaryExpression') {
            if (tree.operator in unaryOperators)
                return {['$' + unaryOperators[tree.operator]]: [parse(tree.argument)]};
            throw 'Invalid unary operator: ' + tree.operator;
        }

        // Binary Operators
        if (tree.type === 'BinaryExpression') {
            if (tree.operator in binaryOperators)
                return {['$' + binaryOperators[tree.operator]]: [parse(tree.left), parse(tree.right)]};
            throw 'Invalid binary operator: ' + tree.operator;
        }
    };

    return parse(jsep(text));
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
    let query = JSON.stringify(buildAggregation(step.abstractQuery, app.subsetPreferences));
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

export function buildAggregation(tree, preferences) {
    // unit of measure
    let unit = {};

    // event measure
    let event = {};

    let tempSubsets = app.genericMetadata[app.selectedDataset]['subsets'];

    // note that only aggregation transforms for unit-date, unit-dyad and event-categorical have been written.
    // To aggregate down to date events, for example, a new function would need to be added under ['event']['date'].
    let transforms = {
        'unit': {
            'date': (subset) => {

                if (!preferences[subset]['aggregation'] || preferences[subset]['aggregation'] === 'None') return;

                let dateColumn = app.coerceArray(tempSubsets[subset]['columns'])[0];
                let dateFormat = {
                    'Weekly': '%Y-%V',
                    'Monthly': '%Y-%m',
                    'Yearly': '%Y'
                }[preferences[subset]['aggregation']];

                if (dateFormat) unit[subset + '-' + preferences[subset]['aggregation']] = {
                    "$dateToString": {
                        "format": dateFormat,
                        "date": "$" + dateColumn
                    }
                };

                else if (preferences[subset]['aggregation'] === 'Quarterly') {
                    // function takes a mongodb subquery and returns the subquery casted to a string
                    let toString = (query) => ({"$substr": [query, 0, -1]});
                    unit[subset + '-Quarterly'] = {
                        '$concat': [
                            toString({'$year': '$' + dateColumn}), '-',
                            toString({'$trunc': {'$divide': [{'$month': '$' + dateColumn}, 4]}})
                        ]
                    }
                }
            },
            'dyad': (subset) => {
                if (!app.unitMeasure[subset] || !(subset in preferences) || !('edges' in preferences[subset])) return;

                let [leftTab, rightTab] = Object.keys(tempSubsets[subset]['tabs']);
                let filteredLinks = preferences[subset]['edges']
                    .filter(link => link.source.tab === leftTab && link.target.tab === rightTab);

                for (let idx in filteredLinks) {
                    let link = filteredLinks[idx];
                    let leftTabColumn = tempSubsets[subset]['tabs'][link.source.tab]['full'];
                    let rightTabColumn = tempSubsets[subset]['tabs'][link.target.tab]['full'];
                    unit[subset.replace(/[$.-]/g, '') + '-' + link.source.name.replace(/[$.-]/g, '') + '-' + link.target.name.replace(/[$.-]/g, '')] = {
                        '$and': [
                            {'$in': ['$' + leftTabColumn, [...link.source.selected]]},
                            {'$in': ['$' + rightTabColumn, [...link.target.selected]]}
                        ]
                    }
                }
            }
        },
        'event': {
            'categorical': (subset) => {
                if (app.eventMeasure !== subset) return;

                let masterColumn = app.coerceArray(tempSubsets[subset]['columns'])[0];
                let masterFormat = app.genericMetadata[app.selectedDataset]['formats'][masterColumn];
                let masterAlignment = app.genericMetadata[app.selectedDataset]['alignments'][masterColumn];
                let targetFormat = preferences[subset]['aggregation'];

                let bins = {};
                if (masterAlignment) {
                    for (let equivalency of app.alignmentData[masterAlignment]) {
                        if (!(masterFormat in equivalency && targetFormat in equivalency)) continue;
                        if (!preferences[subset]['selections'].has(equivalency[masterFormat])) continue;

                        if (!(equivalency[targetFormat] in bins)) bins[equivalency[targetFormat]] = new Set();
                        bins[equivalency[targetFormat]].add(equivalency[masterFormat])
                    }
                }
                else for (let selection of preferences[subset]['selections']) bins[selection] = new Set([selection]);

                for (let bin of Object.keys(bins)) {
                    if (bins[bin].size === 1) event[bin] = {
                        "$sum": {
                            "$cond": [{
                                "$eq": ["$" + masterColumn, [...bins[bin]][0]]
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
                                        "in": {"$eq": ["$$el", "$" + masterColumn]}
                                    }
                                }
                            }, 1, 0]
                        }
                    }
                }
            }
        }
    };

    // for each aggregation screen, apply modifications to the aggregation query
    Object.keys(tempSubsets).forEach(subset => {
        if (!('measures' in tempSubsets[subset])) return;
        for (let measure of app.coerceArray(tempSubsets[subset]['measures']))
            (transforms[measure][tempSubsets[subset]['type']] || Function)(subset);
    });

    let pipeline = [];
    const subset = buildSubset(tree);
    if (subset.length) pipeline.push({"$match": subset});
    pipeline.push({"$group": Object.assign({"_id": unit}, event)});
    return pipeline;
}

// almost pure- the function mutates the argument
export function reformatAggregation(jsondata) {
    console.log(jsondata);
    if (jsondata.length === 0) return {data: jsondata, headers: []};

    // get all unique subset names from the _id object. usage of Set is to remove repeated dyad keys
    let headers = new Set(Object.keys(jsondata[0]._id).map(id => id.split('-')[0]));

    // reformat data for each unit measure
    headers.forEach(unit => {
        if (app.genericMetadata[app.selectedDataset]['subsets'][unit]['type'] === 'dyad' && jsondata.length !== 0) {

            let jsondataMerged = [];
            let mergeAggEntry = (newEntry) => {
                let matches = jsondataMerged.filter(entry => Object.keys(entry._id)
                    .every(attribute => entry._id[attribute] === newEntry._id[attribute]));
                if (matches.length === 1)
                    Object.keys(matches[0])
                        .filter(attribute => attribute !== '_id')
                        .forEach(attribute => matches[0][attribute] += newEntry[attribute]);
                else jsondataMerged.push(newEntry)
            };

            // aggregations over the dyad unit of analysis represent 'inclusion in a link' as a boolean flag in the group _id
            // the _id is of the form "[subsetName]-[sourceNode]-[targetNode]": bool
            let links = new Set(Object.keys(jsondata[0]._id)
                .filter(id => id.split('-')[0] === unit.replace(/[$.-]/g, ''))
                .map(id => id.slice(unit.replace(/[$.-]/g, '').length + 1)));

            // create a record set, where the link name is flattened
            links.forEach((link) => {
                jsondata.forEach(entry => {
                    // record must have the link defined
                    if (!entry._id[unit.replace(/[$.-]/g, '') + '-' + link]) return;

                    // filter out all _ids related to the current dyad subset
                    let filteredId = Object.keys(entry._id)
                        .filter(id => !(id.split('-')[0] === unit.replace(/[$.-]/g, '')))
                        .reduce((out, key) => {
                            out[key] = entry._id[key];
                            return out;
                        }, {});

                    // add a new _id of the form "[subsetName]": "[sourceNode]-[targetNode]"
                    let newId = Object.assign({[unit]: link}, filteredId);
                    // newId occludes the _id key from the original record in the new object
                    mergeAggEntry(Object.assign({}, entry, {_id: newId}))
                })
            });
            jsondata = jsondataMerged;
        }
        else if (app.genericMetadata[app.selectedDataset]['subsets'][unit]['type'] === 'date' && jsondata.length !== 0) {
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