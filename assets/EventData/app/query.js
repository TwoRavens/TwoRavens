import * as app from './app';
import * as tour from './tour';
import m from 'mithril';

// functions for generating database queries
// subset queries are built from the abstractQuery, which is managed in app.js
// aggregation queries contain the subset query as the first stage in the pipeline. The second group stage pulls data from subsetPreferences

// submit*() functions cause a state change/update the menus
// build*() functions are pure and return mongo queries
// process*() functions are for constructing the subset query, relative to a specific node, group, or rule on the query tree


export function submitQuery(datasetChanged = false) {

    // Only construct and submit the query if new subsets have been added since last query
    let newSubsets = false;
    for (let idx in app.abstractQuery) {
        if (app.abstractQuery[idx].type !== 'query') {
            newSubsets = true;
            break
        }
    }

    console.log(JSON.stringify(app.abstractQuery));

    if (!newSubsets && !datasetChanged) {
        alert("Nothing has been staged yet! Stage your preferences before subset.");
        return;
    }

    function submitQueryCallback(jsondata) {
        // If no records match, then don't lock the preferences behind a query
        if (Array.isArray(jsondata['total'])) jsondata['total'] = jsondata['total'][0];
        if (jsondata['total'] === 0) {
            alert("No records match your subset. Plots will not be updated.");
            app.laddaStop();
            return;
        }

        // clear all subset data. Note this is intentionally mutating the object, not rebinding it
        for (let member in app.subsetData) delete app.subsetData[member];

        app.pageSetup(jsondata);

        // when requerying for switching datasets, don't make right panel edits
        if (datasetChanged) return;

        // True for adding a query group, all existing preferences are grouped under a 'query group'
        app.addGroup(true);

        // Add all nodes to selection
        let nodeList = [...Array(app.nodeId).keys()];

        let subsetTree = $('#subsetTree');
        nodeList.forEach(
            function (node_id) {
                const node = subsetTree.tree("getNodeById", node_id);

                if (node) {
                    subsetTree.tree("addToSelection", node);
                    if (node.type !== 'query') node.editable = false;
                }
            }
        );

        // Redraw tree
        app.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', app.abstractQuery);
        subsetTree.tree('setState', state);

        // TAGGED: LOCALSTORE
        // // Store user preferences in local data
        // localStorage.setItem('selectedVariables', JSON.stringify([...app.selectedVariables]));
        //
        // localStorage.setItem('abstractQuery', subsetTree.tree('toJson'));
        // localStorage.setItem('nodeId', String(app.nodeId));
        // localStorage.setItem('groupId', String(app.groupId));
        // localStorage.setItem('queryId', String(app.queryId));
    }

    let subsetQuery = buildSubset(app.abstractQuery);
    console.log("Query: " + JSON.stringify(subsetQuery));

    if (datasetChanged) app.laddaReset.start();
    else app.laddaUpdate.start();

    m.request({
        url: app.subsetURL,
        data: {
            'type': 'summary',
            'query': escape(JSON.stringify(subsetQuery)),
            'dataset': app.selectedDataset,
            'subset': app.selectedSubsetName,
            'countRecords': true
        },
        method: 'POST'
    }).then(submitQueryCallback).catch(app.laddaStop)
}

// Recursively traverse the tree in the right panel. For each node, call processNode
export function buildSubset(tree) {
    // Base case
    if (tree.length === 0) return {};

    let queryStack = [];
    let stagedSubsetData = [];
    for (let child of tree) {
        if (child.type === 'query') {
            queryStack.push(child)
        } else {
            stagedSubsetData.push(child)
        }
    }

    // Treat staged subset data as just another query on the query stack
    queryStack.push({'children': stagedSubsetData, 'operation': 'and', 'name': 'New Query', type: 'query'});
    return processGroup({'children': queryStack})
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

    } else {
        group_query['$or'].push(processNode(group.children[group.children.length - 1]));
    }

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

    let query = JSON.stringify(buildAggregation(app.abstractQuery, app.subsetPreferences));
    console.log("Aggregation Query: " + query);

    m.request({
        url: app.subsetURL,
        data: {
            'type': 'aggregate',
            'query': escape(query),
            'dataset': app.selectedDataset,
            'subset': app.selectedSubsetName
        },
        method: 'POST'
    }).then(reformatAggregation).then(({data, headersUnit, headersEvent}) => {
        app.setAggregationData(data);
        app.setAggregationHeadersUnit(headersUnit);
        app.setAggregationHeadersEvent(headersEvent);
    });
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
                    unit[subset + '-Quarterly'] = {
                        '$concat': [
                            {'$year': '$' + dateColumn}, '-', {'$trunc': {'$div': [{'$month': '$' + dateColumn}, 4]}}]
                    }
                }
            },
            'dyad': (subset) => {
                if (!app.unitMeasure[subset] || !(subset in preferences) || !('edges' in preferences[subset])) return;

                let [leftTab, rightTab] = Object.keys(tempSubsets[subset]['tabs']);
                let filteredLinks = preferences[subset]['edges']
                    .filter(link => link.source.actor === leftTab && link.target.actor === rightTab);

                for (let idx in filteredLinks) {
                    let link = filteredLinks[idx];
                    let leftTabColumn = tempSubsets[subset]['tabs'][link.source.actor]['full'];
                    let rightTabColumn = tempSubsets[subset]['tabs'][link.target.actor]['full'];
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

    return [
        {"$match": buildSubset(tree)},
        {"$group": Object.assign({"_id": unit}, event)}
    ];
}

// almost pure- the function mutates the argument
export function reformatAggregation(jsondata) {
    console.log(jsondata);
    if (jsondata.length === 0) return {data: jsondata, headers: []};

    let headers = new Set(Object.keys(jsondata[0]._id).map(id => id.split('-')[0]));

    headers.forEach(unit => {
        if (app.genericMetadata[app.selectedDataset]['subsets'][unit]['type'] === 'dyad') {

            let jsondataMerged = [];
            let mergeAggEntry = (newEntry) => {
                let matches = jsondataMerged.filter(entry => entry._id[unit] === newEntry._id[unit]);
                if (matches.length === 1)
                    Object.keys(matches[0]).forEach(attribute => matches[0][attribute] += newEntry[attribute]);
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
        else if (app.genericMetadata[app.selectedDataset]['subsets'][unit]['type'] === 'date') {
            // date ids are of the format: '[unit]-[dateFormat]'; grab the dateFormat from the id:
            let format = Object.keys(jsondata[0]._id).filter(id => id.split('-')[0] === unit)[0].split('-')[1];

            jsondata.forEach(entry => {
                    if (entry._id[unit + '-' + format] === undefined) return;
                    entry._id[unit] = {
                        'Weekly': dateStr => {
                            let [year, week] = dateStr.split('-');
                            return new Date(new Date(year, 0).setDate(week * 7));
                        },
                        'Monthly': (dateStr) => {
                            let [year, month] = dateStr.split('-');
                            return new Date(year, month);
                        },
                        'Yearly': (dateStr) => new Date(dateStr),
                        'Quarterly': (dateStr) => {
                            let [year, quarter] = dateStr.split('-');
                            return new Date(year, quarter * 4);
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
                'string': () => a[header].localeCompare(b[header]),
                'object': () => a[header].getTime() - b[header].getTime()
            }[typeof a[header]]();
            if (compare) return compare;
        }
    });

    return {
        data: jsondata,
        headersUnit: headers,
        headersEvent: events
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
export function realignQuery(source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

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

                let sourceFull = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['full']);
                let targetFull = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['full']);

                let sourceFormats = sourceFull.map(column => app.genericMetadata[source]['formats'][column]);
                let targetFormats = targetFull.map(column => app.genericMetadata[target]['formats'][column]);

                if ([sourceFormats, targetFormats].some(formats => !formats.every(format => format))) {
                    log.push('Removed ' + branch.name + ', because column formats are missing, hence the dyads are not comparable.');
                    return;
                }

                let sourceAlignment = app.genericMetadata[source]['alignments'][sourceFull];
                let targetAlignment = app.genericMetadata[target]['alignments'][targetFull];

                let relabelDyad = () => branch.children.forEach((monad, i) => monad['column'] = targetFull[i]);
                if (sourceFormats.every((format, i) => format === targetFormats[i])) {
                    relabelDyad();
                    log.push('Relabeled dyad columns in ' + branch.name + '.');
                    return branch;
                }
                else if ((!sourceAlignment || !targetAlignment || sourceAlignment !== targetAlignment)
                    && targetFormats.some((format, i) => format !== sourceFormats[i])) {
                    log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats))
                    return;
                }

                if (sourceAlignment && targetAlignment && sourceAlignment === targetAlignment) {
                    relabelDyad();
                    // TODO must also realign based on token length for phoenix/icews
                    log.push('Realigned dyad columns in ' + branch.name + '.');
                }
                return branch;
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
                let targetColumns = app.coerceArray(sourceSubsets[subsetName]['columns']);
                if (branch.children.some((handle, i) => handle['column'] !== targetColumns[i % targetColumns.length]))
                    log.push('Relabeled column intervals in ' + branch.name + '.');

                // the modular indexing is for handling conversions between point and interval date structures
                branch.children.forEach((handle, i) => handle['column'] = targetColumns[i % targetColumns.length]);
                return branch;
            }

            if (branch.subset === 'coordinates') {
                let targetColumns = sourceSubsets[subsetName]['columns'];
                if (branch.children.some((orient, i) => orient['column'] !== targetColumns[i]))
                    log.push('Relabeled column in ' + branch.name + '.');
                branch.children.forEach((orient, i) => orient['column'] = targetColumns[i]);
                return branch;
            }

            if (branch.subset === 'custom') {
                log.push('Removed ' + branch.name + ', because custom queries do not have ontological alignments.');
                return;
            }

        }).filter(branch => branch !== undefined) // prune subsets and groups that didn't transfer
    };
    app.setAbstractQuery(realignBranch(app.abstractQuery));
    return log;
}

export function realignPreferences(source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

    Object.keys(app.subsetPreferences).forEach(subset => {
        if (!(subset in targetSubsets)) {
            if (Object.keys(app.subsetPreferences[subset]) !== 0) {
                log.push(subset + ' is not available for ' + target + ', but subset preferences have been cached.')
            }
            return;
        }

        let subsetType = targetSubsets[subset]['type'];

        // TODO dyad menu

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