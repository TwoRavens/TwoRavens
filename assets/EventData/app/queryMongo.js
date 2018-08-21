import jsep from 'jsep';

import * as app from './app';
import {incrementMonth} from "./app";
import {isSameMonth} from "./app";


// functions for generating database queries
// subset queries are built typically built from abstractManipulations. An additional menu step may be added too

// build*() functions are pure and return mongo queries. There is one per step type, and one for the overall pipeline
// process*() functions are for constructing the subset query, relative to a specific node, group, or rule on the query tree

// PIPELINE DESCRIPTION
// transform step: add new fields/columns/variables:
// {transforms: [{name: 'newName', equation: 'plaintext formula'}, ...]}

// subset step: filter rows based on constraints
// {abstractQuery: [JQTree representation of constraints], nodeId: int, groupId: int, queryId: int}

// aggregate step: count number of ocurrences in bins
// {measuresUnit: [], measuresAccum: []}

// menu step: mutate to a format that can be rendered in a menu
// {name: 'Actor', type: 'dyad', step: [previous pipeline step]}

export function buildPipeline(pipeline, variables = new Set()) {
    let compiled = [];

    pipeline.forEach(step => {

        if (step.type === 'transform') compiled.push({
            '$addFields': step.transforms.reduce((out, transformation) => {
                out[transformation.name] = buildTransform(transformation.equation, variables)['query'];
                out[transformation.name]['$comment'] = transformation.equation;
                variables.add(transformation['name']);
                return out;
            }, {})
        });

        if (step.type === 'subset')
            compiled.push({'$match': buildSubset(step.abstractQuery, true)});

        if (step.type === 'aggregate') {
            let aggPrepped = buildAggregation(step.measuresUnit, step.measuresAccum);
            compiled.push(...aggPrepped['pipeline']);
            variables = new Set([...aggPrepped['columnsUnit'], ...aggPrepped['columnsAccum']])
        }

        if (step.type === 'menu')
            compiled.push(...buildMenu(step))

    });

    return {pipeline: compiled, variables};
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
            if (tree.operator === '+') return parse(tree.argument);
            if (tree.operator === '-') return {"$subtract": [0, parse(tree.argument)]};
            if (tree.operator === '~') return {"$not": parse(tree.argument)};
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
                    rule_query_inner['$gte'] = {'$date': child.fromDate.toISOString().slice(0, 10)}
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    rule_query_inner['$lte'] = {'$date': child.toDate.toISOString().slice(0, 10)}
                }
            }
            rule_query[column] = rule_query_inner;
        } else if (rule.structure === 'interval') {
            for (let child of rule.children) {
                if ('fromDate' in child) {
                    child.fromDate = new Date(child.fromDate);
                    rule_query[child.column] = {
                        '$gte': {'$date': child.fromDate.toISOString().slice(0, 10)}
                    };
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    rule_query[child.column] = {
                        '$lte': {'$date': child.toDate.toISOString().slice(0, 10)}
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
                columnsAccum.push(...selections);

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

// given a menu, return pipeline steps for collecting data
export function buildMenu(menu, preferences = undefined) {
    if (menu.type === 'dyad') {

        let branches = new Set();
        Object.keys(menu.tabs).forEach(tabName => {
            branches.add({tab: tabName, type: 'full', column: menu.tabs[tabName].full});
            menu.tabs[tabName].filters.forEach(filter => branches.add({tab: tabName, type: 'filter', column: filter}));
        });

        menu['delimited'] = menu['delimited'] || {};

        return [
            {
                $facet: branches.reduce((facets, branch) => {

                    let restriction = [];
                    if (branch.type === 'full') {
                        // must apply restrictions to only return full that matches filters
                        restriction = [
                            {
                                $match: Object.keys(preferences.tabs[branch.tab].filters).reduce((out, column) => {
                                    // if no selections are made, don't add a constraint on the column of the filter
                                    if (preferences.tabs[branch.tab].filters[column].selected.size === 0) return out;

                                    // must only match full values that match the filter
                                    if (column in menu.delimited) out[column] = {
                                        // PHOENIX example: match .*; any number of times, then one of the selected filters (AFG|MUS)
                                        $regex: `^(.*${menu.delimited[column]})*(${[...preferences.tabs[branch.tab].filters[column].selected].join('|')})`,
                                        $options: 'i' // insensitive to diacritics
                                    };
                                    else out[column] = {$in: [...preferences.tabs[branch.tab].filters[column].selected]};
                                    return out;
                                }, {})
                            }
                        ];
                    }

                    if (branch.type === 'filter' && branch.column in menu.delimited) {
                        // must apply restrictions to deconstruct filters by delimiter
                        restriction = [
                            {$project: {[branch.column]: {$split: ['$' + branch.column, menu.delimited[branch.column]]}}},
                            {$unwind: '$' + branch.column}
                        ];
                    }

                    let getDistinct = [
                        {$group: {_id: {[branch.column]: "$" + branch.column}}},
                        {$group: {_id: null, [branch.column]: {"$push": "$_id." + branch.column}}}
                    ];

                    // restrict to filters and deconstruct delimiters as necessary, then get distinct values
                    facets[Object.values(branch).join('-')] = [...restriction, ...getDistinct];
                    return facets;
                }, {})
            }
        ];
    }

    if (menu.type === 'date') {
        return [
            {
                $group: {
                    _id: {year: {$year: '$' + menu.column}, month: {$month: '$' + menu.column}},
                    total: {$sum: 1}
                }
            },
            {$project: {year: '$_id.year', month: '$_id.month', _id: 0, total: 1}},
            {$match: {year: {$exists: true}, month: {$exists: true}}},
            {$sort: {year: 1, month: 1}}
        ];
    }

    if (['categorical', 'categorical_grouped'].indexOf(menu.type) !== -1) {
        return [
            {$group: {_id: {[format]: '$' + menu.column}, total: {$sum: 1}}},
            {$project: {[format]: '$_id.' + format, _id: 0, total: 1}}
        ]
    }
}

// If there is a postProcessing step at the given key, it will return modified data. Otherwise return the data unmodified
let defaultValue = (value) => ({get: (target, name) => target.hasOwnProperty(name) ? target[name] : value});
export let menuPostProcess = new Proxy({
    'dyad': (data) => Object.keys(data).reduce((out, branch) => {
        let [tabName, columnType, column] = branch.split('-');
        out[tabName] = out[tabName] || {filters: {}};

        if (columnType === 'full') out[tabName].full = data[branch];
        if (columnType === 'filter') out[tabName].filters[column] = data[branch];
        return out;
    }, {}),

    'date': (data) => data
        .map(entry => ({'Date': new Date(entry['year'], entry['month'] - 1, 0), 'Freq': entry.total}))
        .reduce((out, entry) => {
            if (out.length === 0) return [entry];
            let tempDate = incrementMonth(out[out.length - 1]['Date']);

            while (!isSameMonth(tempDate, entry['Date'])) {
                out.push({Freq: 0, Date: new Date(tempDate)});
                tempDate = incrementMonth(tempDate);
            }
            out.push(entry);
            return (out);
        }, [])

}, defaultValue(data => data));
