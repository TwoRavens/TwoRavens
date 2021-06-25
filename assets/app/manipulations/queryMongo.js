import jsep from 'jsep';

import {alignmentData} from "../app";
import * as common from "../../common/common";
import {
    getGeographicVariables,
    getCategoricalVariables,
    getOrderingVariable,
    getPredictorVariables,
    getTargetVariables
} from "../problem";

// functions for generating database queries
// subset queries are built from manipulations pipelines. An additional menu step may be added too

// build*() functions are pure and return mongo queries. There is one per step type, and one for the overall pipeline
// process*() functions are for constructing the subset query, relative to a specific node, group, or rule on the query tree

// PIPELINE DESCRIPTION
// transform step: add new fields/columns/variables:
// {
//     transforms: [{name: 'newName', equation: 'plaintext formula'}, ...],
//     expansions: [{name: 'var1,var2', variables: {var1: {type: 'polynomial', powers: '1 2 3'}, var2: {type: 'none'}}, interactionDegree: 2}, ...],
//     binning: [...], manual: [...]
// }

// subset step: filter rows based on constraints
// {abstractQuery: [JQTree representation of constraints], nodeId: int, groupId: int, queryId: int}

// aggregate step: count number of ocurrences in bins
// {measuresUnit: [], measuresAccum: []}

// menu step: mutate to a format that can be rendered in a menu
// {name: 'Actor', type: 'dyad', preferences: {...}, metadata: {...}}
window.buildPipeline = buildPipeline;

export function buildPipeline(pipeline, variables = new Set()) {
    // mongodb query
    let compiled = [];

    // datasets used in the pipeline {[collection name]: {path: "", indexes: []}}
    let datasets = {};

    // need to know which variables are unit measures and which are accumulators. Also describe the unit variables with labels
    // only returned if the last step in the pipeline is an aggregation
    let units, accumulators, labels;

    variables = new Set(variables);

    pipeline.filter(_=>_).forEach(step => {

        if (step.type === 'transform' && step.transforms.length) compiled.push({
            '$addFields': step.transforms.reduce((out, transformation) => {
                out[transformation.name] = buildEquation(transformation.equation, variables)['query'];
                variables.add(transformation['name']);
                return out;
            }, {})
        });

        if (step.type === 'transform' && step.expansions?.length) compiled.push({
            '$addFields': Object.assign(...step.expansions.map(expansion => {
                let terms = expansionTerms(expansion);
                variables = new Set([...terms, ...variables]);
                return terms.reduce((acc, term) => {
                    acc[term] = buildEquation(term, variables)['query'];
                    return acc;
                }, {})
            }))
        });

        if (step.type === 'transform' && step.binnings?.length) {
            step.binnings.map(bin => variables.add(bin.name));
            compiled.push(buildBinning(step.binnings));
        }
        if (step.type === 'transform' && step.manual?.length) {
            step.manual.map(labeling => variables.add(labeling.name));
            compiled.push(buildManual(step.manual));
        }

        if (step.type === 'imputation' && step.imputations?.length)
            compiled = compiled.concat(buildImputation(step.imputations));

        if (step.type === 'subset') compiled.push({'$match': buildSubset(step.abstractQuery, true)});

        if (step.type === 'aggregate') {
            let aggPrepped = buildAggregation(step.measuresUnit, step.measuresAccum);
            compiled.push(...aggPrepped['pipeline']);
            variables = new Set([...aggPrepped['units'], ...aggPrepped['accumulators']]);
            units = new Set(aggPrepped['units']);
            accumulators = new Set(aggPrepped['accumulators']);
            labels = aggPrepped['labels'];
        } else [units, accumulators, labels] = [undefined, undefined, undefined];

        if (step.type === 'join') {
            let joinPrepped = buildJoin(step)
            compiled.push(...joinPrepped['pipeline'])
            variables = new Set([...joinPrepped['variables'], ...variables]);
            datasets[step.from] = {
                path: step.fromPath,
                indexes: [step.index]
            }
        }

        if (step.type === 'menu') {
            let menuPrepped = buildMenu(step);
            compiled.push(...menuPrepped['pipeline'])
            if (menuPrepped['variables']) variables = menuPrepped['variables']
        }

    });

    return {pipeline: compiled, variables, datasets, units, accumulators, labels};
}


// ~~~~ TRANSFORMS ~~~~
export let unaryFunctions = new Set([
    'abs', 'ceil', 'exp', 'floor', 'ln', 'log10', 'sqrt', 'trunc', // math
    'and', 'not', 'or', // logic
    'trim', 'toLower', 'toUpper', // string
    'toBool', 'toDouble', 'toInt', 'toString', // type
    'v' // for variable names containing spaces, syntax and operators
]);
export let binaryFunctions = new Set([
    'divide', 'log', 'mod', 'pow', 'subtract', // math
    'eq', 'gt', 'gte', 'lt', 'lte', 'ne', // comparison
    'dateFromString'
]);
export let variadicFunctions = new Set([
    'add', 'multiply',
    'max', 'min', 'avg',
    'stdDevPop', 'stdDevSamp',
    'concat' // any number of arguments
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

export let dateStringFormats = {
    "%d": "Day of Month (2 digits, zero padded) 01-31",
    "%m": "Month (2 digits, zero padded) 01-12",
    "%Y": "Year (4 digits, zero padded) 0000-9999"
};

// return a mongo projection from a string that describes a transformation
// let examples = ['2 + numhits * sqrt(numwalks / 3)', 'strikes % 3', '~wonGame'];
export function buildEquation(text, variables) {

    let usedTerms = {
        variables: new Set(),
        unaryFunctions: new Set(),
        binaryFunctions: new Set(),
        variadicFunctions: new Set(),
        unaryOperators: new Set(),
        binaryOperators: new Set()
    };

    let parse = tree => {
        if (tree.type === 'Compound') throw 'Ambiguous compound. You may need to disambiguate the variable name by wrapping in v("...").'
        if (tree.type === 'Literal') return tree.value;

        // Variables
        if (tree.type === 'Identifier') {
            if (!variables || variables.has(tree.name)) {
                usedTerms.variables.add(tree.name);
                return '$' + tree.name;
            }
            throw `Invalid variable: ${tree.name}. You may need to disambiguate the variable name by wrapping in v("...").`;
        }

        // Functions
        if (tree.type === 'CallExpression') {
            if (tree.callee.name === 'v') {
                return parse({
                    type: 'Identifier',
                    name: tree.arguments.map(arg => ({
                        Literal: arg.value,
                        Identifier: arg.name
                    }[arg.type])).join(' ')})
            }

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

// ~~~~ BINNING IN TRANSFORM ~~~~
function buildBinning(binnings) { // takes a list of binning descriptors
    return {
        $addFields: binnings.reduce((out, binning) => {
            let {name, variableIndicator, partitions} = binning;
            out[name] = {
                $switch: {
                    branches: partitions.map((partition, i) => ({
                        case: {$lte: ['$' + variableIndicator, partition]}, then: i
                    })),
                    default: partitions.length
                }
            };
            return out;
        }, {})
    }
}

// ~~~~ MANUAL LABELING IN TRANSFORM ~~~~
function buildManual(variables) {
    return {
        $addFields: variables.reduce((out, manual) => {
            let {name, variableIndicator, variableDefault, indicators, values} = manual;
            out[name] = {
                $arrayElemAt: [
                    [...values, variableDefault],  // indexOfArray is -1 when not found, which is the last element
                    {$indexOfArray: [indicators, '$' + variableIndicator]}
                ]
            };
            return out;
        }, {})
    }
}

// ~~~~ EXPANSIONS ~~~~
// used to compute interaction terms of degree k
const k_combinations = (list, k) => {
    if (k > list.length || k <= 0) return []; // no valid combinations of size k
    if (k === list.length) return [list]; // one valid combination of size k
    if (k === 1) return list.reduce((acc, cur) => [...acc, [cur]], []); // k combinations of size k

    let combinations = [];

    for (let i = 0; i <= list.length - k + 1; i++) {
        let subcombinations = k_combinations(list.slice(i + 1), k - 1);
        for (let j = 0; j < subcombinations.length; j++) {
            combinations.push([list[i], ...subcombinations[j]])
        }
    }

    return combinations
};

// used to compute interaction terms of degree lte k
const lte_k_combinations = (set, k) =>
    Array(k).fill(null).reduce((acc, _, idx) => [...acc, ...k_combinations(set, idx + 1)], []);

// for completeness (unused)
// const combinations = set =>
//     set.reduce((acc, _, idx) => [...acc, ...k_combinations(set, idx + 1)], []);

// https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript
const f = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(f(a, b), ...c) : a);

export function expansionTerms(preferences) {
    let startVariables = Object.keys(preferences.variables);
    // find all combinations of variables lte size k
    return lte_k_combinations(startVariables, preferences.degreeInteraction)
        .reduce((acc, comb) =>
            // some variables have multiple-term expansions, compute the cartesian products within each combination
            acc.concat(cartesian(...comb.map(variable => {
                let varPrefs = preferences.variables[variable];

                if (varPrefs.type === 'None') return [variable];
                if (varPrefs.type === 'Dummy') return [`toString(${variable})`];
                if (varPrefs.type === 'Polynomial')
                    return varPrefs.powers.trim().split(' ').map(power => variable + '^' + power);
            }))
                .map(term => Array.isArray(term) ? term : [term]) // fix a degenerate case for singleton groups
                .map(term => term // build each term from a list of equations on each variable
                    .map(variable => variable.replace('^1', '')) // don't compute the first power
                    .join('*')) // multiply each variable together
                .filter(variable => !startVariables.includes(variable))), []); // don't duplicate original variables
}


// ~~~~ IMPUTATION ~~~~
export function buildImputation(imputations) {
    let parseType = (variableType, value) => (({
        'string': _ => _,
        'numeric': parseFloat,
        'date': v => new Date(v).toISOString(),
        'bool': v => !(v.toLowerCase().startsWith('f') || v.startsWith('0') || v.toLowerCase().startsWith('n'))
    })[variableType](value));

    return imputations.map(imputation => {
        let nullValues = Object.keys(imputation.variableTypes)
            .reduce((values, variable) => Object.assign(values, {
                [variable]: imputation.nullValues.split(' ')
                    .map(nullValue => parseType(imputation.variableTypes[variable], nullValue))
            }), {});
        if (imputation.imputationMode === 'Delete') return {
            $match: [...imputation.variables].reduce((out, variable) => {
                out[variable] = {$nin: nullValues[variable]};
                return out;
            }, {})
        };

        if (imputation.imputationMode === 'Replace') {

            return {
                $addFields: Object.keys(imputation.replacementValues).reduce((out, variable) => {
                    out[variable] = {
                        $cond: {
                            if: {$in: ['$' + variable, nullValues[variable]]},
                            then: imputation.replacementValues[variable],
                            else: '$' + variable
                        }
                    };
                    return out;
                }, {})
            };
        }
    })
}

// ~~~~ SUBSETS ~~~~
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
    } else {
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

export let operators = {'>=': '$gte', '>': '$gt', '<=': '$lte', '<': '$lt', '==': '$eq', '!=': '$ne'};
export let operatorRegex = new RegExp(`(${Object.keys(operators).join('|')})`);

// Return a mongoDB query for a rule data structure
function processRule(rule) {
    let rule_query = {};

    if (rule.subset === 'date') {
        if (rule.structure === 'point') {
            let rule_query_inner = [];
            let column;
            for (let child of rule.children) {
                column = child.column;
                if ('fromDate' in child) {
                    child.fromDate = new Date(child.fromDate);
                    rule_query_inner.push({[column]: {$gte: {'$date': new Date(child.fromDate).toISOString().slice(0, 10)}}})
                }
                if ('toDate' in child) {
                    child.toDate = new Date(child.toDate);
                    rule_query_inner.push({[column]: {$lte: {'$date': new Date(child.toDate).toISOString().slice(0, 10)}}})
                }
            }
            rule_query = {$or: [{$and: rule_query_inner}, {[column]: {$exists: 0}}]};
        } else if (rule.structure === 'interval') {
            let or = [];
            for (let column of rule.children.map(child => child.column)) {
                or.push({[column]: {$exists: 0}});
                or.push({
                    [column]: rule.children.reduce((out, child) => {
                        let side = 'fromDate' in child ? 'fromDate' : 'toDate';
                        out[side === 'fromDate' ? '$gte' : '$lte'] = {
                            '$date': new Date(child[side]).toISOString().slice(0, 10)
                        }
                    }, {})
                });
            }
            rule_query = or;
        }
    }

    if (rule.subset === 'automated') {

        let [variable, constraint, condition] = rule.name.split(operatorRegex).map(_ => _.trim());
        rule_query[variable] = {[operators[constraint]]: buildEquation(condition)['query']}
    }

    if (rule.subset === 'continuous') {

        rule_query[rule.column] = rule.children.reduce((out, child) => {
            if ('fromLabel' in child) out['$gte'] = child.fromLabel;
            if ('toLabel' in child) out['$lte'] = child.toLabel;
            return out;
        }, {});
    }

    if (['discrete', 'discrete_grouped'].includes(rule.subset)) {
        let rule_query_inner = [];
        for (let child of rule.children) {
            rule_query_inner.push(child.value);
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

/// Return the list of variables used by the subset query
export let getSubsetDependencies = node => {
    if (['group', 'query'].includes(node.type) && node.children)
        return node.children.flatMap(getSubsetDependencies)
    if (node.subset === 'date')
        return node.children.map(child => child.column)
    if (node.subset === 'automated') {
        let [variable, _, condition] = node.name.split(operatorRegex).map(_ => _.trim());
        return [variable, ...buildEquation(condition).usedTerms.variables]
    }
    if (['continuous', 'discrete', 'discrete_grouped'].includes(node.subset))
        return [node.column]
    if (['dyad', 'link'].includes(node.subset))
        return node.children.flatMap(getSubsetDependencies)
    if (node.subset === 'node')
        return [node.column]
    if (node.subset === 'coordinates')
        return node.children.map(child => child.column)
    if (node.subset === 'custom')
        // TODO: parse from query?
        return [undefined]
    // should not be possible to reach this
    console.warn("unknown subset type", node)
    return []
}

// ~~~~ AGGREGATIONS ~~~~
export function buildAggregation(unitMeasures, accumulations) {
    // unit of measure
    let unit = {};

    // event measure
    let event = {};

    let labels = {};

    // monads/dyads require a melt after grouping
    let dyadMeasureName;
    let columnsDyad = [];
    let columnsNonDyad = [];
    let columnsAccum = [];

    // relevant for a date and continuous unit measures
    // this is used to rebuild date objects and continuous bin boundaries after the grouping stage
    let postTransforms = {};

    // note that only aggregation transforms for unit-date, unit-dyad and accumulator-discrete have been written.
    // To aggregate down to date events, for example, a new function would need to be added under ['event']['date'].
    let transforms = {
        'unit': {
            'date': (data) => {
                let dateFormat = {
                    // 'Weekly': '%G-%V',
                    'Monthly': '%Y-%m',
                    'Yearly': '%Y'
                }[data['measure']];

                columnsNonDyad.push(data['column']);
                labels['date'] = labels['date'] || [];
                labels['date'].push(data['column']);

                if (dateFormat) {
                    // transform into string for grouping
                    unit[data['column']] = {
                        $dateToString: {
                            format: dateFormat,
                            date: "$" + data['column']
                        }
                    };
                    // transform back out of string afterwards
                    // if (data['measure'] === 'Weekly') postTransforms[data['column']] = {
                    //     $dateFromString: {
                    //         format: dateFormat,
                    //         dateString: '$_id\\.' + data['column']
                    //     }
                    // };
                    if (data['measure'] === 'Monthly' || data['measure'] === 'Yearly') postTransforms[data['column']] = {
                        $dateFromString: {
                            // format: '%Y-%m-%d',
                            dateString: {
                                $concat: ['$_id\\.' + data['column'], {
                                    'Monthly': '-01T00:00:00.000',
                                    'Yearly': '-01-01T00:00:00.000'
                                }[data['measure']]]
                            }
                        }
                    };
                } else if (data['measure'] === 'Quarterly') {
                    // function takes a mongodb subquery and returns the subquery casted to a string
                    let toString = (query) => ({$substr: [query, 0, -1]});
                    unit[data['column']] = {
                        $concat: [
                            toString({$year: '$' + data['column']}), '-',
                            toString({$trunc: {$divide: [{$month: '$' + data['column']}, 4]}})
                        ]
                    };
                    postTransforms[data['column']] = {
                        $dateFromParts: {
                            year: {$toInt: {$arrayElemAt: [{$split: ['$_id\\.' + data['column'], '-']}, 0]}},
                            month: {$multiply: [{$toInt: {$arrayElemAt: [{$split: ['$_id\\.' + data['column'], '-']}, 1]}}, 4]},
                            day: 1
                        }
                    };
                }
            },
            'dyad': (data) => {
                data.children.map(link => {
                    let [leftChild, rightChild] = link.children;
                    dyadMeasureName = leftChild.column + '-' + rightChild.column;

                    let dyadName = leftChild.aggregationName.replace(/[$.-]/g, '') + '-' + rightChild.aggregationName.replace(/[$.-]/g, '');
                    columnsDyad.push(dyadName);

                    unit[dyadName] = {
                        $and: [
                            {$in: ['$' + leftChild.column, [...leftChild.actors]]},
                            {$in: ['$' + rightChild.column, [...rightChild.actors]]}
                        ]
                    }
                });

                labels['dyad'] = labels['dyad'] || [];
                labels['dyad'].push(dyadMeasureName);
            },
            'continuous': (data) => {
                columnsNonDyad.push(data['column']);

                let standardized = {
                    $divide: [
                        {$subtract: ['$' + data['column'], data['min']]},
                        (data['max'] - data['min']) / data['measure']
                    ]
                }
                // FIXME mongodb 3.6: remove once mongo updates
                if (IS_EVENTDATA_DOMAIN) {
                    unit[data['column']] = {$subtract: [standardized, {$mod: [standardized, 1]}]}
                } else {
                    unit[data['column']] = {$toInt: standardized};
                }

                postTransforms[data['column']] = {
                    $add: [
                        data['min'],
                        {$multiply: ['$_id\\.' + data['column'], (data['max'] - data['min']) / data['measure']]}
                    ]
                }
            },
            'discrete': data => {
                columnsNonDyad.push(data['column']);
                unit[data['column']] = `$${data['column']}`
            }
        },
        'accumulator': {
            'push': data => {
                columnsAccum.push(data['column']);
                event[data['column']] = {$push: `$${data['column']}`}
            },
            'first': data => {
                columnsAccum.push(data['column']);
                event[data['column']] = {$first: `$${data['column']}`}
            },
            'discrete': (data) => {
                let selections = new Set(data.children.map(child => child.name));

                let bins = {};
                if ('alignment' in data && data['alignment']) {
                    for (let equivalency of alignmentData[data['alignment']]) {
                        if (!(data['formatSource'] in equivalency && data['formatTarget'] in equivalency)) continue;
                        if (!selections.has(equivalency[data['formatSource']])) continue;

                        if (!(equivalency[data['formatTarget']] in bins)) bins[equivalency[data['formatTarget']]] = new Set();
                        bins[equivalency[data['formatTarget']]].add(equivalency[data['formatSource']])
                    }
                } else for (let selection of selections) bins[selection] = new Set([selection]);

                for (let bin of Object.keys(bins)) {
                    columnsAccum.push(data['column'] + '-' + bin);
                    if (bins[bin].size === 1) event[data['column'] + '-' + bin] = {
                        $sum: {
                            $cond: [{
                                $eq: ["$" + data['column'], [...bins[bin]][0]]
                            }, 1, 0]
                        }
                    };
                    else event[data['column'] + '-' + bin] = {
                        $sum: {
                            $cond: [{
                                $anyElementTrue: {
                                    $map: {
                                        input: [...bins[bin]],
                                        as: "el",
                                        in: {$eq: ["$$el", "$" + data['column']]}
                                    }
                                }
                            }, 1, 0]
                        }
                    }
                }
            }
        }
    };

    unitMeasures.forEach(measure => transforms.unit[measure.subset](measure));
    accumulations.forEach(measure => transforms.accumulator[measure.subset](measure));

    let reformatter = [];

    if (dyadMeasureName) {
        let _id = columnsNonDyad.reduce((out_id, columnNonDyad) => {
            out_id[columnNonDyad] = "$_id\\." + columnNonDyad;
            return out_id;
        }, {});

        reformatter = reformatter.concat([
            {
                $facet: columnsDyad.reduce((facet, dyad) => { // build a pipeline for each dyad
                    facet[dyad] = [
                        {$match: {["_id\\." + dyad]: true}},
                        {
                            $group: columnsAccum.reduce((accumulators, columnAccum) => {
                                accumulators[columnAccum] = {$sum: "$" + columnAccum};
                                return accumulators;
                            }, {_id})
                        },
                        {$addFields: Object.assign({[dyadMeasureName]: dyad}, _id, postTransforms)}
                    ];
                    return facet;
                }, {})
            },
            {$project: {combine: {$setUnion: columnsDyad.map(column => '$' + column)}}},
            {$unwind: "$combine"},
            {$replaceRoot: {newRoot: "$combine"}}
        ]);
    } else if (columnsNonDyad.length) {
        reformatter = reformatter.concat([
            {
                $addFields: Object.assign(columnsNonDyad.reduce((addFields, column) => {
                    addFields[column] = '$_id\\.' + column;
                    return addFields;
                }, {}), postTransforms)
            }
        ]);
    }

    reformatter.push({$project: {_id: 0}});

    let columnsUnit = columnsNonDyad.concat(dyadMeasureName ? [dyadMeasureName] : []);

    let sortPipeline = columnsUnit.length ? [{
        $sort: columnsUnit.reduce((out, column) => {
            out[column] = 1;
            return out;
        }, {})
    }] : [];

    return {
        pipeline: [{"$group": Object.assign({"_id": unit}, event)}, ...reformatter, ...sortPipeline],
        units: columnsUnit,
        accumulators: columnsAccum,
        labels
    };
}

// ~~~~ JOIN ~~~~
export function buildJoin(step) {
    return {
        'pipeline': [
            {
                $lookup: {
                    from: "tr_" + step.from,
                    localField: step.index,
                    foreignField: step.index,
                    as: `__temp`
                }
            },
            {$unwind: "$__temp"},
            {
                $addFields: Object.entries(step.variables)
                    .reduce((out, [outName, inName]) => Object.assign(out, {
                        [outName]: `$__temp\\.${inName}`
                    }), {})
            },
            {
                $project: {__temp: 0}
            }
        ],
        'variables': Object.keys(step.variables)
    }
}

// ~~~~ MENUS ~~~~
// given a menu, return pipeline steps for collecting data
export function buildMenu(step) {
    let {metadata, preferences} = step;

    let makeBranches = branches => [
        {
            $facet: [...branches].reduce((facets, branch) => {

                let restriction = [];
                if (branch.type === 'full') {
                    // must apply restrictions to only return full that matches filters
                    if ('tabs' in preferences) restriction = [
                        {
                            $match: metadata.tabs[branch.tab].filters.reduce((out, column) => {
                                if (!(branch.tab in preferences.tabs)) return out;
                                // if no selections are made, don't add a constraint on the column of the filter
                                if (preferences.tabs[branch.tab].filters[column].selected.size === 0) return out;

                                // must only match full values that match the filter
                                if ('delimited' in metadata && column in metadata.delimited) out[column] = {
                                    // PHOENIX example: match .*; any number of times, then one of the selected filters (AFG|MUS)
                                    $regex: `^(.*${metadata.delimited[column]})*(${[...preferences.tabs[branch.tab].filters[column].selected].join('|')})`,
                                    $options: 'i' // insensitive to diacritics
                                };
                                else out[column] = {$in: [...preferences.tabs[branch.tab].filters[column].selected]};
                                return out;
                            }, {})
                        }
                    ];
                    else restriction = [];
                }

                if (branch.type === 'filter' && 'delimited' in metadata && branch.column in metadata.delimited) {
                    // must apply restrictions to deconstruct filters by delimiter
                    restriction = [
                        {$project: {[branch.column]: {$split: ['$' + branch.column, metadata.delimited[branch.column]]}}},
                        {$unwind: '$' + branch.column}
                    ];
                }

                let getDistinct = [
                    {$group: {_id: {[branch.column]: "$" + branch.column}}},
                    {$sort: {['_id\\.' + branch.column]: 1}},
                    {$group: {_id: 0, values: {"$push": "$_id\\." + branch.column}}},
                    {$project: {values: '$values', _id: 0}}
                ];

                // restrict to filters and deconstruct delimiters as necessary, then get distinct values
                facets[Object.values(branch).join('-')] = [...restriction, ...getDistinct];
                return facets;
            }, {})
        },
        {
            $project: [...branches].reduce((out, branch) => {
                let branchName = Object.values(branch).join('-');
                out[branchName] = {$arrayElemAt: ['$' + branchName, 0]};
                return out;
            }, {_id: 0})
        },
        {
            $project: [...branches].reduce((out, branch) => {
                let branchName = Object.values(branch).join('-');
                if (branch.type === 'full') out[branch.tab + '\\.full'] = '$' + Object.values(branch).join('-') + '\\.values';
                else out[branch.tab + '\\.filters\\.' + branch.column] = '$' + branchName + '\\.values';
                return out;
            }, {_id: 0})
        }
    ];


    if (metadata.type === 'dyadSearch') {
        let branch = {tab: metadata.currentTab, type: 'full', column: metadata.tabs[metadata.currentTab].full};
        return {pipeline: makeBranches([branch])}
    }

    if (metadata.type === 'dyad') {

        let branches = new Set();
        Object.keys(metadata.tabs).forEach(tabName => {
            branches.add({tab: tabName, type: 'full', column: metadata.tabs[tabName].full});
            metadata.tabs[tabName].filters.forEach(filter => branches.add({
                tab: tabName,
                type: 'filter',
                column: filter
            }));
        });

        return {pipeline: makeBranches([...branches])};
    }

    if (metadata.type === 'date') return {pipeline: [
        {
            $group: {
                _id: {year: {$year: '$' + metadata.columns[0]}, month: {$month: '$' + metadata.columns[0]}},
                total: {$sum: 1}
            }
        },
        {$project: {year: '$_id\\.year', month: '$_id\\.month', _id: 0, total: 1}},
        {$match: {year: {$exists: true}, month: {$exists: true}}},
        {$sort: {year: 1, month: 1}}
    ], variables: ['year', 'month', 'total']};

    if (['discrete', 'discrete_grouped'].includes(metadata.type)) return {pipeline: [
        {$group: {_id: {[metadata.columns[0]]: '$' + metadata.columns[0]}, total: {$sum: 1}}},
        {$project: {[metadata.columns[0]]: '$_id\\.' + metadata.columns[0], _id: 0, total: 1}},
        {$limit: 1000}
    ], variables: [metadata.columns[0], 'total']};

    if (metadata.type === 'continuous') {
        let boundaries = Array(metadata.buckets + 1).fill(0).map((arr, i) => metadata.min + i * (metadata.max - metadata.min) / metadata.buckets);
        boundaries[boundaries.length - 1] += 1; // the upper bound is exclusive
        return {pipeline: [
            {
                $bucket: {
                    boundaries,
                    groupBy: '$' + metadata.columns[0],
                    default: 'ignore',
                    output: {
                        Freq: {$sum: 1}
                    }
                }
            },
            {$match: {_id: {$ne: 'ignore'}}},
            {
                $project: {
                    _id: 0,
                    Label: {$add: ['$_id', (metadata.max - metadata.min) / metadata.buckets / 2]},
                    Freq: 1
                }
            },
            {$sort: {Label: 1}}
        ], variables: ['Label', 'Freq']};
    }

    if (metadata.type === 'data') {
        let subset = [];
        if (metadata.dropNA) subset.push({
            $match: metadata.dropNA.reduce((query, variable) => Object.assign(query, {
                [variable]: {$ne: null}
            }), {})
        });
        if (metadata.skip) subset.push({$skip: metadata.skip});
        if (metadata.limit) subset.push({$limit: metadata.limit});
        if (metadata.sample) subset.push({$sample: {size: metadata.sample}});

        if (!metadata.variables && metadata.categorical && metadata.categorical.length > 0) return {pipeline: [
            ...subset,
            {
                $addFields: metadata.categorical.reduce((out, entry) => {
                    out[entry] = {'$toString': '$' + entry};
                    return out;
                }, {})
            },
            {$project: {_id: 0}}
        ]};

        return {pipeline: [
            ...subset,
            {
                $project: (metadata.variables || []).reduce((out, entry) => {
                    out[entry] = (metadata.categorical || []).includes(entry) ? {'$toString': '$' + entry} : 1;
                    return out;
                }, {_id: 0})
            }
        ], variables: metadata?.variables?.length > 0 && [...new Set(metadata.variables)]};

    }

    if (metadata.type === 'count') return {pipeline: [{
        $count: 'total'
    }], variables: ['total']};

    if (metadata.type === 'summary') return {pipeline: [
        {
            $group: metadata.variables.reduce((out, variable) => Object.assign(out, {
                [variable + '-mean']: {$avg: '$' + variable},
                [variable + '-max']: {$max: '$' + variable},
                [variable + '-min']: {$min: '$' + variable},
                [variable + '-stdDev']: {$stdDevPop: '$' + variable},
                [variable + '-validCount']: {$sum: {$cond: [{$ne: ['$' + variable, undefined]}, 1, 0]}},
                [variable + '-invalidCount']: {$sum: {$cond: [{$ne: ['$' + variable, undefined]}, 0, 1]}},
                [variable + '-types']: {$addToSet: {$type: '$' + variable}},
                [variable + '-uniques']: {$addToSet: '$' + variable},
            }), {_id: 0})
        },
        {
            $project: metadata.variables.reduce((out, variable) => {
                out[variable] = {
                    mean: '$' + variable + '-mean',
                    max: '$' + variable + '-max',
                    min: '$' + variable + '-min',
                    stdDev: '$' + variable + '-stdDev',
                    validCount: '$' + variable + '-validCount',
                    invalidCount: '$' + variable + '-invalidCount',
                    types: '$' + variable + '-types',
                    uniques: {$size: '$' + variable + '-uniques'}
                };
                return out;
            }, {_id: 0})
        }
    ]};


    // build steps for subsetting data down for out-of-database splitting
    if (metadata.type === 'indexes') {
        let problem = metadata.problem;
        let pipeline = [];

        // ensures temporal column is sorted
        if (problem.task === 'forecasting')
            pipeline.push({$sort: {[`$${getOrderingVariable(problem)}`]: 1}});

        let projectionColumns = [...problem.tags.indexes];
        if (problem.task === 'forecasting')
            projectionColumns.push(getOrderingVariable(problem), ...problem.tags.crossSection);

        if (problem.splitOptions.stratified)
            projectionColumns.push(getTargetVariables(problem)[0]);

        pipeline.push({
            $project: [...new Set(projectionColumns)].reduce((projection, column) => Object.assign({
                [column]: 1
            }), {})
        });

        return {pipeline, variables: projectionColumns};
    }

    if (metadata.type === 'split') {
        let split = metadata.split;
        let problem = metadata.problem;
        let collectionName = metadata.collectionName;

        let splitOptions = problem.splitOptions;
        let predictors = getPredictorVariables(problem);
        let targets = getTargetVariables(problem);
        let temporalName = getOrderingVariable(problem);
        let crossSections = problem.tags.crossSection;
        let categoricals = getCategoricalVariables(problem);

        let pipeline = [];

        // don't filter rows to a split
        if (splitOptions.outOfSampleSplit || split === 'all') return {pipeline};

        // some splitting conditions may be handled without a join
        // when forecasting without cross sections
        if (problem.task === 'forecasting' && crossSections.length === 0) {
            if (temporalName)
                pipeline.push({$sort: {[`$${temporalName}`]: -1}});

            if (split === 'train') pipeline.push(
                {$skip: Math.min(problem.forecastingHorizon, splitOptions.maxRecordCount)},
                {$limit: splitOptions.maxRecordCount});

            if (split === 'test') pipeline.push(
                {$limit: Math.min(problem.forecastingHorizon, splitOptions.maxRecordCount)});

            pipeline.push(
                {[{'train': '$skip','test': '$limit'}[split]]: problem.forecastingHorizon});

            if (temporalName)
                pipeline.push({$sort: {[`$${temporalName}`]: 1}});
        }

        // when not forecasting, without shuffling or stratifications
        if (problem.task !== 'forecasting'
            && !splitOptions.splitsFile
            && splitOptions.shuffle === false
            && splitOptions.stratified === false
            && crossSections.length === 0) {

            pipeline.push({
                [{
                    'train': '$limit',
                    'test': '$skip'
                }[split]]: Math.floor(splitOptions.maxRecordCount / splitOptions.trainTestRatio)
            })
        }

        // heavy universal implementation using a separate collection
        else pipeline.push(
            // create a new key in every document
            //  "results_collection": [{"split": "train" || "test"}]
            {
                $lookup: {
                    "from": 'tr_' + collectionName,
                    "localField": "d3mIndex",
                    "foreignField": "d3mIndex",
                    "as": "results_collection"
                }
            },
            // expand "results_collection" singleton array into one record per array element
            {
                $unwind: '$results_collection'
            },
            // subset to only rows in the data split
            {
                $match: {
                    // the "\\" differentiates periods in a column name from nested objects
                    '$results_collection\\.split': {
                        $eq: splitOptions.split
                    }
                }
            },
            // split column is no longer needed
            {
                $project: {'$results_collection': 0}
            });

        // aggregation for time series forecasting
        if (problem.task === 'forecasting'
            && temporalName
            && crossSections.length > 0) {

            let structuralVariables = [temporalName, ...crossSections];
            let allVariables = [...targets, ...predictors]
                .filter(variable => !structuralVariables.includes(variable));
            let continuousVariables = allVariables
                .filter(variable => !categoricals.includes(variable));

            // initial group into treatments x categorical levels
            pipeline.push({
                $group: continuousVariables.reduce((group, variableName) => Object.assign(group, {
                    [variableName]: {$sum: `$${variableName}`}
                }), {
                    // internal row count for computing mean through multiple groupings
                    _tr_row_count: {$sum: 1},
                    _id: [...structuralVariables, ...categoricals].reduce((group, variableName) => Object.assign(group, {
                        [variableName]: 1
                    }), {})
                })
            });
            let remainingCategoricals = [...categoricals];
            let collapsedCategoricals = [];
            while (remainingCategoricals.length > 0) {
                let categoricalName = remainingCategoricals.shift();
                collapsedCategoricals.push(categoricalName);

                pipeline.push({
                    // WARN: categoricalName must be set last. Temporal is sorted, then cross sections, then categoricals
                    $sort: Object.assign(
                        {
                            [`_id\\.${temporalName}`]: 1
                        },
                        crossSections.reduce((sorter, variableName) => Object.assign(sorter, {
                            [`_id\\.${variableName}`]: 1
                        }), {}),
                        {
                            [`_id\\.${categoricalName}`]: 1
                        })
                }, {
                    $group: Object.assign(
                        continuousVariables.reduce((reducer, accumName) => Object.assign(reducer, {
                            [accumName]: {$sum: `$${accumName}`}
                        })),
                        // all other unaggregated categoricals in the _id are identical constants
                        collapsedCategoricals.reduce((reducer, accumName) => Object.assign(reducer, {
                            [accumName]: {$first: 1}
                        })),
                        {_tr_row_count: {$sum: '$_tr_row_count'}},
                        {
                            [categoricalName]: {$push: `$_id\\.${categoricalName}`},
                            _id: [...structuralVariables, ...remainingCategoricals]
                                .reduce((group, variableName) => Object.assign(group, {
                                    [variableName]: `_id\\.${variableName}`
                                }), {})
                        })
                }, {
                    $addFields: {
                        [categoricalName]: {
                            $reduce: {
                                input: `$${categoricalName}`,
                                initialValue: {
                                    mode: undefined,
                                    previous: undefined,
                                    maxCount: -1,
                                    curCount: 0
                                },
                                in: {
                                    mode: {
                                        $cond: [
                                            {
                                                $and: [
                                                    {$gte: ['$$this\\.maxObservations', '$$this\\.curObservations']},
                                                    {$eq: ['$$value', '$$this\\.previous']}
                                                ]
                                            },
                                            '$$this\\.mode',
                                            '$$value'
                                        ]
                                    },
                                    curCount: {
                                        $cond: [
                                            {$eq: ['$$this', '$$value\\.previous']},
                                            {$add: ['$$value\\.curObservations', 1]},
                                            0
                                        ]
                                    },
                                    maxCount: {
                                        $max: ['$$value\\.curObservations', '$$value\\.maxObservations']
                                    },
                                    previous: '$$this'
                                }
                            }
                        }
                    }
                }, {
                    $addFields: continuousVariables.reduce((fields, variableName) => Object.assign(fields, {
                        [variableName]: {$divide: [`$${variableName}`, '$_tr_row_count}']}
                    }), {
                        [categoricalName]: `$${categoricalName}\\.mode`
                    })
                })
            }
        }

        // global record limit
        if (splitOptions.maxRecordCount !== undefined) pipeline.push({
            $limit: splitOptions.maxRecordCount
        });

        return {pipeline};

        // alternate implementation that just takes first categorical observation
        // {
        //     $group: [temporalName, ...crossSections, ...categoricals].reduce((group, variable) => Object.assign(group,
        //         {
        //             [variable]: {[categoricals.includes(variable) ? '$first' : '$avg']: `$${variable}`}
        //         }),
        //         {
        //             _id: crossSections.reduce((id, crossSection) => Object.assign(id,
        //                 {
        //                     [crossSection]: 1
        //                 }),
        //                 {
        //                     [temporalName]: 1
        //                 })
        //         })
        // }
    }

}

// If there is a postProcessing step at the given key, it will return modified data. Otherwise return the data unmodified
let defaultValue = (value) => ({get: (target, name) => target.hasOwnProperty(name) ? target[name] : value});
export let menuPostProcess = new Proxy({
    'dyad': data => data[0],

    'date': (data) => data
        .map(entry => ({'Label': new Date(entry['year'], entry['month'] - 1, 0), 'Freq': entry.total}))
        .sort(comparableSort)
        .reduce((out, entry) => {
            if (out.length === 0) return [entry];
            let tempDate = incrementMonth(out[out.length - 1]['Label']);

            while (!isSameMonth(tempDate, entry['Label'])) {
                out.push({Freq: 0, Label: new Date(tempDate)});
                tempDate = incrementMonth(tempDate);
            }
            out.push(entry);
            return out;
        }, []),

    'summary': data => data[0],

    'count': data => data.length ? data[0].total : 0
}, defaultValue(data => data));


// date handling
// we must be very particular about how months get incremented, to handle leap years etc.
export function incrementMonth(date) {
    let months = date.getFullYear() * 12 + date.getMonth() + 1;
    return new Date(Math.floor(months / 12), months % 12);
}

export let isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export function comparableSort(a, b) {
    if (a['Label'] === b['Label']) return 0;
    return (a['Label'] < b['Label']) ? -1 : 1;
}

// D3M datasetDoc.json apply changes to a doc based on a mongo pipeline
// written to follow schema version 3.1:
// https://gitlab.datadrivendiscovery.org/MIT-LL/d3m_data_supply/blob/shared/schemas/datasetSchema.json
export let translateDatasetDoc = (pipeline, doc, problem) => {
    doc = common.deepCopy(doc);

    let typeInferences = {
        'integer': new Set(['toInt', 'ceil', 'floor', 'trunc']),
        'boolean': new Set(['toBool', 'and', 'not', 'or', 'eq', 'gt', 'gte', 'lt', 'lte', 'ne']),
        'string': new Set(['toString', 'trim', 'toLower', 'toUpper', 'concat']),
        'real': new Set([
            'toDouble', 'abs', 'exp', 'ln', 'log10', 'sqrt', 'divide', 'log', 'mod', 'pow',
            'subtract', 'add', 'multiply', 'max', 'min', 'avg', 'stdDevPop', 'stdDevSamp',
            'sum'
        ])
    };

    Object.assign(doc, {dataResources: [...doc.dataResources]});

    // assuming that there is only one tabular dataResource
    let tableResourceIndex = doc.dataResources.findIndex(resource => resource.resType === 'table');
    let allCols = [...doc.dataResources[tableResourceIndex].columns];

    // rewrite the columns by stepping through each step in the manipulations pipeline
    doc.dataResources[tableResourceIndex].columns = pipeline.reduce((columns, step) => {

        // shallow copy each object to avoid global mutations
        let outColumns = columns.map(column => Object.assign({}, column));

        // helper to modify column
        let mutateField = data => field => {
            let target = outColumns.find(column => column.colName === field);
            if (!target) {
                target = {};
                outColumns.push(target)
            }
            target.colName = field;
            // if the output value is based on an operation (example {$toString: $colName})
            if (typeof data[field] === 'object')
                target.colType = Object.keys(typeInferences)
                    // find the type of the data after transformation based on the $op name
                    .find(type => typeInferences[type].has(Object.keys(data[field])[0].substr(1)));
            // if the output value is based on another column, retrieve the type information (as well as any other information) from the other column
            else if (typeof data[field] === 'string' && data[field][0] === '$')
                // assign into target
                Object.assign(target,
                    // all information from the source column
                    allCols.find(column => column.colName === data[field].substr(1)),
                    // but overwrite the column name
                    {colName: field});
            // if the output value is a literal
            else target.colType = {'number': 'real', 'string': 'string', 'boolean': 'boolean'}[typeof data[field]]; // javascript type: D3M type
            // TODO: roles may not always make sense after modifications
            //          in many cases, roles are just dropped and rewritten via tags
            // if role is not defined, make it a suggestedTarget
            target.role = target.role || ['suggestedTarget'];

            // prepended mutations are found first when looking up types
            allCols.unshift(target);
        };

        if ('$addFields' in step) Object.keys(step.$addFields)
            .forEach(mutateField(step.$addFields));

        if ('$project' in step) {
            // set of columns to mask (if every column in projection is falsey)
            if (Object.values(step.$project).every(value => ['number', 'bool'].includes(typeof value) && !value))
                return outColumns.filter(column => !(column.colName.split("\\.")[0] in step.$project));

            // not every projection is falsey, so only columns in projection will be present
            outColumns = outColumns.filter(column => column.colName in step.$project);
            // for each field in the projection, mutate the column metadata
            Object.keys(step.$project).forEach(field => {
                // drop falsey columns
                if (!step.$project[field])
                    // match columns to drop based on all text up to "\\."
                    delete outColumns[outColumns.indexOf(column => column.colName.split("\\.")[0] === field)];
                // read the projection and apply the mutation if non-trivial
                else if (![true, 1].includes(step.$project[field])) // no modifications necessary if just trivial projection inclusion
                    mutateField(step.$project)(field)
            });
            return outColumns.filter(_ => _);
        }

        if ('$group' in step) {
            outColumns = [];

            let getType = (data, field) => {
                // if the output value is based on an operation (example {$toString: $colName})
                if (typeof data[field] === 'object')
                    return Object.keys(typeInferences)
                        // find the type of the data after transformation based on the $op name
                        .find(type => typeInferences[type].has(Object.keys(data[field])[0].substr(1)));
                // if the output value is based on another column, retrieve the type information (as well as any other information) from the other column
                else if (typeof data[field] === 'string' && data[field][0] === '$')
                    // assign into target
                    return allCols.find(column => column.colName === data[field].substr(1)).colType;
                // if the output value is a literal
                else return {'number': 'real', 'string': 'string', 'boolean': 'boolean'}[typeof data[field]]; // javascript type: D3M type
            }
            outColumns = [
                ...step.$group._id ? Object.keys(step.$group._id).map(field => ({
                    colName: `_id\\.${field}`,
                    colType: getType(step.$group._id, field),
                    role: ['suggestedTarget']
                })) : [],
                ...Object.keys(step.$group).filter(field => field !== "_id")
                    .map(field => ({
                        colName: field,
                        colType: getType(step.$group, field),
                        role: ['attribute']
                    }))
            ].filter(_=>_)

            // $group creates all new columns
            allCols = [...outColumns]
        }

        if ('$facet' in step) throw '$facet D3M datasetDoc.json translation not implemented';
        if ('$redact' in step) throw '$redact D3M datasetDoc.json translation not implemented';
        if ('$replaceRoot' in step) throw '$replaceRoot D3M datasetDoc.json translation not implemented';
        if ('$unwind' in step) throw '$unwind D3M datasetDoc.json translation not implemented';

        return outColumns;
    }, doc.dataResources[tableResourceIndex].columns)
        .map(struct => Object.assign(struct, { // relabel roles to reflect the proper target
            role: [
                getTargetVariables(problem).includes(struct.colName) ? 'suggestedTarget'
                    : struct.colName === 'd3mIndex' ? 'index' : 'attribute'
            ]
        }));

    let add = (collection, obj) => !collection.includes(obj) && collection.push(obj);

    [
        [getPredictorVariables(problem), 'attribute'],
        [getTargetVariables(problem), 'suggestedTarget'],
        [problem.tags.privileged, 'suggestedPrivilegedData'],
        [problem.tags.crossSection, 'suggestedGroupingKey'],
        [problem.tags.boundary, 'boundaryIndicator'],
        [getGeographicVariables(problem), 'locationIndicator'],
        [[getOrderingVariable(problem)], 'timeIndicator'],
        [problem.tags.weights, 'instanceWeight'],
        [problem.tags.indexes, 'index']
    ].forEach(pair => pair[0]
        .filter(variable => doc.dataResources[tableResourceIndex].columns
            .find(column => column.colName === variable))
        .forEach(variable => add(doc.dataResources[tableResourceIndex].columns
            .find(column => column.colName === variable).role, pair[1])));

    return doc;
};
