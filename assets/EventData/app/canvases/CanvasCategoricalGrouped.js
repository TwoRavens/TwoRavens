import m from 'mithril';
import * as common from '../../../common-eventdata/common';
import * as app from '../app';

import PlotBars from "../views/PlotBars";

let getLabel = (format, key) => {
    if (!(format in app.formattingData)) return '';
    let title = app.formattingData[format][key];
    if (Array.isArray(app.formattingData[format][key])) title = title[0];
    else if (title !== undefined && typeof title === 'object') title = title['name'];
    return title || '';
};

// data
// list of objects: {formatName: 'categoryName', total: 23}

// metadata
// alignments - a singleton list containing the alignment
// formats - a singleton list containing the format of the data
// columns - a singleton list containing the colummn name of the data
// group_by - a string containing the key in each alignment equivalency to group data by

// preferences
// plotted_grouped - if set, then the group_by accumulation plot is open
// plotted_subgroups - if not undefined, then the specific subplot is drawn. If set, then the plot is open
// selections - set of selected categories

export default class CanvasCategoricalGrouped {
    view(vnode) {
        let {subsetName, data, metadata, preferences} = vnode.attrs;

        let masterFormat = app.genericMetadata[app.selectedDataset]['formats'][app.coerceArray(metadata['columns'])[0]];
        preferences['selections'] = preferences['selections'] || new Set();
        preferences['format'] = preferences['format'] || metadata['formats'][0];
        preferences['plotted_subgroups'] = preferences['plotted_subgroups'] || {};
        if (!('plotted_grouped' in preferences)) preferences['plotted_grouped'] = true;

        if (data.length === 0) return 'No data from "' + metadata['group_by'] + '" is matched.';

        let flattenedData = data.reduce((out, entry) => {
            out[entry[masterFormat.replace('-', '.')]] = entry['total'];
            return out;
        }, {});

        let groupPrep = {};
        let groupSelected = {};

        let subGroupPrep = {};

        app.alignmentData[app.coerceArray(metadata['alignments'])[0]].forEach(equivalency => {
            if (!(masterFormat in equivalency && metadata['group_by'])) return;
            let isSet = preferences['selections'].has(equivalency[masterFormat]);
            if (equivalency in groupSelected)
                groupSelected[equivalency[metadata['group_by']]].push(isSet);
            else
                groupSelected[equivalency[metadata['group_by']]] = [isSet];

            groupPrep[equivalency[metadata['group_by']]] =
                (groupPrep[equivalency[metadata['group_by']]] || 0) +  // preserve the existing value, or 0 if new
                (flattenedData[equivalency[masterFormat]] || 0);       // add the equivalent sum from the data, or 0 if no data matched

            subGroupPrep[equivalency[metadata['group_by']]] = {};
        });

        app.alignmentData[app.coerceArray(metadata['alignments'])[0]].forEach(equivalency => {
            if (!(masterFormat in equivalency)) return;
            if (equivalency[masterFormat] in flattenedData)
                subGroupPrep[equivalency[metadata['group_by']]][equivalency[masterFormat]] = flattenedData[equivalency[masterFormat]]
        });

        let totalRecords = Object.values(groupPrep).reduce((total, entry) => total + entry);

        // reformat into presentation data
        let groupData = Object.keys(groupPrep).map(groupName => ({
            key: groupName,
            value: groupPrep[groupName] / totalRecords,
            'class': groupSelected[groupName].every(_ => _) ? 'bar-selected'
                : groupSelected[groupName].some(_ => _) ? 'bar-some' : 'bar',
            title: groupPrep[groupName] + ' ' + groupName + ' ' + getLabel(metadata['group_by'], groupName)
        }));

        let subGroupData = {};
        Object.keys(subGroupPrep).forEach(subGroupName =>
            subGroupData[subGroupName] = Object.keys(subGroupPrep[subGroupName]).map(category => ({
                key: category,
                value: subGroupPrep[subGroupName][category] / groupPrep[subGroupName],
                'class': preferences['selections'].has(category) ? 'bar-selected' : 'bar',
                title: subGroupPrep[subGroupName][category] + ' ' + category + ' ' + getLabel(masterFormat, category)
            })));

        let groupMaxChars = Object.keys(groupPrep).reduce((max, entry) => Math.max(max, entry.length), 0);

        let subGroupMaxChars = {};
        Object.keys(subGroupPrep).forEach(subGroupName =>
            subGroupMaxChars[subGroupName] = Object.keys(subGroupPrep[subGroupName])
                .reduce((max, entry) => Math.max(max, entry.length), 0));

        let graphContainer = (name, graph, buttons, shown) =>
            m(`#subGraphContainer${name.replace(/[^A-Za-z0-9]/g, "")}`, {
                    style: {
                        "width": "480px",
                        "border": "1px solid #ADADAD",
                        "padding-top": "3px",
                        'margin-bottom': common.panelMargin,
                        "background": "rgb(249, 249, 249)",
                        'overflow': 'hidden'
                    }
                },

                m('#topBar', {style: {height: '34px'}},
                    m(".panel-heading.text-center[id='regionLabel']", {style: {"float": "left", "padding-top": "9px"}},
                        m("h3.panel-title", name)
                    ),
                    buttons),
                shown && graph
            );

        return m("#canvasLocation", {style: {'padding-top': common.panelMargin}},
            m("#locationPlotsDiv[tabindex='0']", {
                    style: {
                        "outline": "none",
                        "width": "480px",
                        "float": "left"
                    }
                },

                // Global Graph
                graphContainer(metadata['group_by'],
                    preferences['plotted_grouped'] && m(PlotBars, {
                        id: 'barPlotGroups' + subsetName.replace(/[^A-Za-z0-9]/g, ""),
                        margin: {top: 10, right: 30, bottom: 50, left: groupMaxChars * 6 + 20},
                        data: groupData,
                        callbackBar: (bar) => {
                            if (bar.key in preferences['plotted_subgroups'])
                                delete preferences['plotted_subgroups'][bar.key];
                            else {
                                preferences['plotted_subgroups'][bar.key] = true;
                                setTimeout(() =>
                                    document.getElementById('subGraphContainer' + bar.key.replace(/[^A-Za-z0-9]/g, "")).scrollIntoView(), 100)
                            }
                        },
                        orient: 'vertical',
                        yLabel: 'Frequency'
                    }),
                    m("button#expandButton.btn.btn-default", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => preferences['plotted_grouped'] = !preferences['plotted_grouped']
                        },
                        m(`span.glyphicon.glyphicon-resize-${preferences['plotted_grouped'] ? 'small' : 'full'}`,
                            {style: {"color": "#818181"}})),

                    m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                        style: {
                            "float": "right",
                            "margin-right": "5px"
                        },
                        onclick: () => Object.keys(groupData).forEach(key => preferences['plotted_subgroups'][key] = true)
                    }, "Plot All"),

                    m("button.btn.btn-default[data-toggle='tooltip'][id='Collapse_All'][type='button']", {
                        style: {
                            "float": "right",
                            "margin-right": "5px"
                        },
                        onclick: () => preferences['plotted_subgroups'] = {}
                    }, "Plot None"),
                    // determines if div is collapsed
                    preferences['plotted_grouped']),

                Object.keys(preferences['plotted_subgroups']).map(subGroupName => graphContainer(subGroupName,
                    m(PlotBars, {
                        id: ('barPlotSubGroup' + subsetName + subGroupName).replace(/[^A-Za-z0-9]/g, ""),
                        margin: {top: 10, right: 30, bottom: 50, left: subGroupMaxChars[subGroupName] * 6 + 20},
                        data: subGroupData[subGroupName],
                        callbackBar: (bar) => preferences['selections'].has(bar.key)
                            ? preferences['selections'].delete(bar.key)
                            : preferences['selections'].add(bar.key),
                        orient: 'vertical',
                        yLabel: 'Frequency'
                    }), [
                        m("button#expandButton.btn.btn-default", {
                                style: {
                                    "float": "right",
                                    "margin-right": "5px"
                                },
                                onclick: () => preferences['plotted_subgroups'][subGroupName] = !preferences['plotted_subgroups'][subGroupName]
                            },
                            m(`span.glyphicon.glyphicon-resize-${preferences['plotted_subgroups'][subGroupName] ? 'small' : 'full'}`,
                                {style: {"color": "#818181"}})),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => subGroupData[subGroupName].forEach(category => preferences['selections'].add(category['key']))
                        }, "Select All"),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => subGroupData[subGroupName].forEach(category => preferences['selections'].delete(category['key']))
                        }, "Select None")
                    ],
                    // determines if div is collapsed
                    preferences['plotted_subgroups'][subGroupName]))
            ),

            // Country Table
            m("[id='country_table']", {
                    style: {
                        "position": "fixed",
                        "margin-left": "10px",
                        "width": "250px",
                        "height": "calc(100% - 122px)",
                        "max-height": "432px",
                        "display": "inline-block",
                        "background": "rgb(249, 249, 249)",
                        "border": "1px solid #ADADAD"
                    }
                },
                [
                    m("[id='countryTableHeader']", {style: {"width": "250px", "display": "inline-block"}},
                        [

                            m("h3.panel-title", {
                                style: {
                                    "padding-left": "10px",
                                    "padding-top": "12px",
                                    "float": "left",
                                    "width": "calc(100% - 100px)"
                                }
                            }, "Selected"),

                            m("button.btn.btn-default", {
                                style: {
                                    "cursor": "pointer",
                                    "float": "right",
                                    "margin-top": "5px",
                                    "margin-right": "7px"
                                },
                                onclick: () => {
                                    preferences['selections'] = new Set();
                                    preferences['plotted_subgroups'] = {};
                                    preferences['plotted_grouped'] = true;
                                }
                            }, "Reset")
                        ]
                    ),

                    m("div", {
                            style: {
                                "position": "fixed",
                                "height": "calc(100% - 168px)",
                                "max-height": "386px",
                                "overflow-y": "scroll",
                                "margin-left": "5px",
                                "width": "243px"
                            }
                        },
                        [...preferences['selections']].map(code => m('.location-entry', {
                            onclick: () => preferences['selections'].delete(code)
                        }, code + ' ' + getLabel(masterFormat, code)))
                    )
                ]
            )
        );
    }
}
