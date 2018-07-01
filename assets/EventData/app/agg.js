import * as app from './app';
import * as tour from './tour';
import m from "mithril";

export let aggregationData = [];
export let aggregationHeadersUnit = [];
export let aggregationHeadersEvent = [];

export let unitMeasure = {};
export let eventMeasure;  // string
export let setEventMeasure = (measure) => eventMeasure = measure;

// percent of the canvas to cover with the aggregation table
export let tableHeight = '20%';

export function submitAggregation() {
    if (!eventMeasure) {
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
    }).then(reformatAggregation);
}

function buildAggregation(tree, preferences) {
    // unit of measure
    let unit = {};

    // event measure
    let event = {};

    let tempSubsets = app.genericMetadata[app.selectedDataset]['subsets'];

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
                if (!unitMeasure[subset] || !(subset in preferences) || !('edges' in preferences[subset])) return;

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
                if (eventMeasure !== subset) return;

                let masterFormat = app.genericMetadata[app.selectedDataset]['formats'][app.coerceArray(tempSubsets[subset]['columns'])[0]];
                let targetFormat = preferences[subset]['aggregation'];

                let bins = {};
                if ('alignments' in tempSubsets[subset]) {
                    for (let equivalency of app.alignmentData[app.coerceArray(tempSubsets[subset]['alignments'])[0]]) {
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
                                "$eq": ["$" + app.coerceArray(tempSubsets[subset]['columns'])[0], [...bins[bin]][0]]
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
                                        "in": {"$eq": ["$$el", "$" + app.coerceArray(tempSubsets[subset]['columns'])[0]]}
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
        {"$match": app.buildSubset(tree)},
        {"$group": Object.assign({"_id": unit}, event)}
    ];
}

function reformatAggregation(jsondata) {
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

    aggregationData = jsondata;
    aggregationHeadersUnit = headers;
    aggregationHeadersEvent = events;
}
