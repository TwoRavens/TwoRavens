import m from 'mithril';
import * as common from '../../common/common';

import PlotBars from "./views/PlotBars";
import {alignmentData, formattingData} from "../app";
import Icon from "../../common/views/Icon";

let getLabel = (format, key) => {
    if (!(format in formattingData)) return '';
    let title = formattingData[format][key];
    if (Array.isArray(formattingData[format][key])) title = title[0];
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

export default class CanvasDiscreteGrouped {
    view(vnode) {
        let {data, metadata, preferences, formats, alignments} = vnode.attrs;

        let masterColumn = metadata['columns'][0];
        let format = (formats || {})[masterColumn];
        let alignment = (alignments || {})[masterColumn];

        preferences['selections'] = preferences['selections'] || new Set();
        preferences['format'] = preferences['format'] || format;
        preferences['plotted_subgroups'] = preferences['plotted_subgroups'] || {};
        if (!('plotted_grouped' in preferences)) preferences['plotted_grouped'] = true;

        if (data.length === 0) return 'No data from "' + metadata['group_by'] + '" is matched.';

        let flattenedData = data.reduce((out, entry) => {
            out[entry[metadata.columns[0]]] = entry['total'];
            return out;
        }, {});

        let groupPrep = {};
        let groupSelected = {};

        let subGroupPrep = {};

        alignmentData[alignment].forEach(equivalency => {
            if (!(format in equivalency) || !(equivalency[format] in flattenedData)) return;
            let isSet = preferences['selections'].has(equivalency[format]);
            if (equivalency[metadata['group_by']] in groupSelected)
                groupSelected[equivalency[metadata['group_by']]].push(isSet);
            else
                groupSelected[equivalency[metadata['group_by']]] = [isSet];

            groupPrep[equivalency[metadata['group_by']]] =
                (groupPrep[equivalency[metadata['group_by']]] || 0) +  // preserve the existing value, or 0 if new
                (flattenedData[equivalency[format]] || 0);       // add the equivalent sum from the data, or 0 if no data matched

            subGroupPrep[equivalency[metadata['group_by']]] = {};
        });

        alignmentData[alignment].forEach(equivalency => {
            if (!(format in equivalency)) return;
            if (equivalency[format] in flattenedData)
                subGroupPrep[equivalency[metadata['group_by']]][equivalency[format]] = flattenedData[equivalency[format]]
        });

        let totalRecords = Object.values(groupPrep).reduce((total, entry) => total + entry);

        // reformat into presentation data
        let groupData = Object.keys(groupPrep)
            .filter(groupName => groupPrep[groupName] !== 0)
            .map(groupName => ({
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
                title: subGroupPrep[subGroupName][category] + ' ' + category + ' ' + getLabel(format, category)
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
                    m(".card-header.text-center[id='regionLabel']", {style: {"float": "left", "padding-top": "9px"}},
                        m("h4.card-title", name)
                    ),
                    buttons),
                shown && graph
            );

        return m("#canvasDiscreteGrouped", {style: {'padding-top': common.panelMargin}},
            m("#graphContainer[tabindex='0']", {
                    style: {
                        "outline": "none",
                        "width": "480px",
                        "float": "left"
                    }
                },

                // Global Graph
                graphContainer(metadata['group_by'],
                    preferences['plotted_grouped'] && m(PlotBars, {
                        id: 'barPlotGroups',
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
                        yLabel: 'Frequency',
                        attrsAll: {style: {height: '386px'}}
                    }),
                    [
                        m("button#expandButton.btn.btn-default", {
                                style: {
                                    "float": "right",
                                    "margin-right": "5px"
                                },
                                onclick: () => preferences['plotted_grouped'] = !preferences['plotted_grouped']
                            },
                            m(Icon, {name: preferences['plotted_grouped'] ? 'chevron-up' : 'chevron-down'})),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => groupData.forEach(entry => preferences['plotted_subgroups'][entry['key']] = true)
                        }, "Plot All"),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => preferences['plotted_subgroups'] = {}
                        }, "Plot None")
                    ],
                    // determines if div is collapsed
                    preferences['plotted_grouped']),

                Object.keys(preferences['plotted_subgroups']).map(subGroupName => graphContainer(subGroupName,
                    m(PlotBars, {
                        id: ('barPlotSubGroup' + subGroupName).replace(/[^A-Za-z0-9]/g, ""),
                        margin: {top: 10, right: 30, bottom: 50, left: subGroupMaxChars[subGroupName] * 6 + 20},
                        data: subGroupData[subGroupName],
                        callbackBar: (bar) => preferences['selections'].has(bar.key)
                            ? preferences['selections'].delete(bar.key)
                            : preferences['selections'].add(bar.key),
                        orient: 'vertical',
                        yLabel: 'Frequency',
                        attrsAll: {style: {height: '386px'}}
                    }), [
                        m("button#expandButton.btn.btn-default", {
                                style: {
                                    "float": "right",
                                    "margin-right": "5px"
                                },
                                onclick: () => preferences['plotted_subgroups'][subGroupName] = !preferences['plotted_subgroups'][subGroupName]
                            },
                            m(Icon, {name: preferences['plotted_subgroups'][subGroupName] ? 'chevron-up' : 'chevron-down'})),

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
            m("#selectedCategoriesTable", {
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
                    m("#selectedCategoriesHeader", {style: {"width": "250px", "display": "inline-block"}},
                        [

                            m("h4.card-title", {
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
                                "height": "calc(100% - 58px)",
                                "max-height": "386px",
                                "overflow-y": "auto",
                                "margin-left": "5px",
                                "width": "243px"
                            }
                        },
                        [...preferences['selections']].map(code => m('.selected-entry', {
                            onclick: () => preferences['selections'].delete(code)
                        }, code + ' ' + getLabel(format, code)))
                    )
                ]
            )
        );
    }
}
