import m from 'mithril';
import * as common from '../../../common/common';

import PlotBars from "./PlotBars";

export default class CanvasCategoricalGrouped {
    view(vnode) {
        let {subsetName, data, preferences, formatting} = vnode.attrs;

        // defaults
        preferences['selected_codes'] = preferences['selected_codes'] || new Set();
        preferences['plotted_regions'] = preferences['plotted_regions'] || {};
        if (preferences['plotted_world'] === undefined) preferences['plotted_world'] = true;

        let getFullname = (code) => formatting.filter(entry => entry['ISO-3'] === code)[0]['fullname'];

        let worldPrep = {};
        let regionData = {};
        formatting.forEach(country => {
            if (!(country['ISO-3'] in data)) return;

            // defaults
            if (!(country['region'] in worldPrep)) worldPrep[country['region']] = {
                total: 0,
                members: 0,
                members_selected: 0
            };

            // rollup
            worldPrep[country['region']]['total'] += data[country['ISO-3']];
            worldPrep[country['region']]['members']++;
            if (preferences['selected_codes'].has(country['ISO-3']))
                worldPrep[country['region']]['members_selected']++;

            // collect data for region plots
            if (!(country['region'] in regionData)) regionData[country['region']] = [];
            regionData[country['region']].push({
                key: country['ISO-3'],
                value: data[country['ISO-3']],
                'class': preferences['selected_codes'].has(country['ISO-3']) ? 'bar-selected' : 'bar',
                title: data[country['ISO-3']] + ' ' + country['fullname']
            })
        });

        // reformat into presentation data
        let worldData = Object.keys(worldPrep).map(regionName => ({
            key: regionName,
            value: worldPrep[regionName]['total'],
            'class': worldPrep[regionName]['members_selected'] === worldPrep[regionName]['members'] ? 'bar-selected' :
                worldPrep[regionName]['members_selected'] !== 0 ? 'bar-some' : 'bar',
            title: worldPrep[regionName]['total']
        }));

        let graphContainer = (name, graph, buttons, shown) =>
            m(`#regionGraphContainer${name}`, {
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

        return (m("#canvasLocation", {style: {'padding-top': common.panelMargin}},
            m("#locationPlotsDiv[tabindex='0']", {
                    style: {
                        "outline": "none",
                        "width": "480px",
                        "float": "left"
                    }
                },

                // Global Graph
                graphContainer('World Regions',
                    m(PlotBars, {
                        id: 'barPlotRegions' + subsetName,
                        margin: {top: 10, right: 30, bottom: 50, left: 120},
                        data: worldData,
                        callbackBar: (bar) => {
                            if (Object.keys(preferences['plotted_regions']).indexOf(bar.key) !== -1)
                                delete preferences['plotted_regions'][bar.key];
                            else {
                                preferences['plotted_regions'][bar.key] = true;
                                setTimeout(() => document.getElementById('regionGraphContainer' + bar.key).scrollIntoView(), 100)
                            }},
                        orient: 'vertical',
                        yLabel: 'Frequency'
                    }), [
                        m("button#expandButton.btn.btn-default", {
                                style: {
                                    "float": "right",
                                    "margin-right": "5px"
                                },
                                onclick: () => preferences['plotted_world'] = !preferences['plotted_world']
                            },
                            m(`span.glyphicon.glyphicon-resize-${preferences['plotted_world'] ? 'small' : 'full'}`,
                                {style: {"color": "#818181"}})),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => Object.keys(regionData).forEach(key => preferences['plotted_regions'][key] = true)
                        }, "Plot All"),

                        m("button.btn.btn-default[data-toggle='tooltip'][id='Collapse_All'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => preferences['plotted_regions'] = {}
                        }, "Plot None")
                    ],
                    // determines if div is collapsed
                    preferences['plotted_world']),

                Object.keys(preferences['plotted_regions']).map(regionName => graphContainer(regionName,
                    m(PlotBars, {
                        id: 'barPlotRegions' + subsetName + regionName,
                        margin: {top: 10, right: 30, bottom: 50, left: 40},
                        data: regionData[regionName],
                        callbackBar: (bar) => preferences['selected_codes'].has(bar.key)
                            ? preferences['selected_codes'].delete(bar.key)
                            : preferences['selected_codes'].add(bar.key),
                        orient: 'vertical',
                        yLabel: 'Frequency'
                    }), [
                        m("button#expandButton.btn.btn-default", {
                                style: {
                                    "float": "right",
                                    "margin-right": "5px"
                                },
                                onclick: () => preferences['plotted_regions'][regionName] = !preferences['plotted_regions'][regionName]
                            },
                            m(`span.glyphicon.glyphicon-resize-${preferences['plotted_regions'][regionName] ? 'small' : 'full'}`,
                                {style: {"color": "#818181"}})),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => regionData[regionName].forEach(country => preferences['selected_codes'].add(country['key']))
                        }, "Select All"),

                        m("button.btn.btn-default[data-toggle='tooltip'][type='button']", {
                            style: {
                                "float": "right",
                                "margin-right": "5px"
                            },
                            onclick: () => regionData[regionName].forEach(country => preferences['selected_codes'].delete(country['key']))
                        }, "Select None")
                    ],
                    // determines if div is collapsed
                    preferences['plotted_regions'][regionName]))
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
                            }, "Selected Countries"),

                            m("button.btn.btn-default", {
                                style: {
                                    "cursor": "pointer",
                                    "float": "right",
                                    "margin-top": "5px",
                                    "margin-right": "7px"
                                },
                                onclick: () => {
                                    preferences['selected_codes'] = new Set();
                                    preferences['plotted_regions'] = {};
                                    preferences['plotted_world'] = true;
                                }
                            }, "Reset")
                        ]
                    ),

                    // Contains list of countries
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
                        [...preferences['selected_codes']].map(code =>
                            m('.location-entry', {
                                onclick: () => preferences['selected_codes'].delete(code)
                            }, code + ' ' + getFullname(code)))
                    )
                ]
            )
        ));
    }
}
