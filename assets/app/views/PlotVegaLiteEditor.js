// UI for making/editing a plot configuration

import m from 'mithril';

import Button from "../../common/views/Button";
import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";
import TextField from "../../common/views/TextField";
import ButtonRadio from "../../common/views/ButtonRadio";
import Popper from '../../common/views/Popper';
import * as app from "../app";
import {getSelectedProblem, getTargetVariables} from "../problem";
import {setDeep} from "../utils";
import {mapStyles} from "./PlotMapbox";
import * as common from "../../common/common";
import Subpanel from "../../common/views/Subpanel";
import {makeSubsetTreeMenu} from "../manipulations/manipulate";

export default class PlotVegaLiteEditor {
    oninit() {
        this.pendingSecondaryVariable = '';
    }
    view(vnode) {
        let {configuration, variables, mapping, summaries, setSummaryAttr, categoricals, abstractQuery} = vnode.attrs;

        let multi = 'layer' in configuration
            ? 'layer'
            : ('vconcat' in configuration)
                ? 'vconcat'
                : ('hconcat' in configuration)
                    ? 'hconcat' : undefined;

        return [
            m(Subpanel, {
                header: 'Global Options', defaultShown: false
            },
            m(Table, {
                keyed: true,
                data: [
                    !mapping && ["zero", m(Popper, {
                        content: () => configuration.zero
                            ? "Zero is enabled, so axes are extended to include zero. "
                            : "Zero is disabled, so axes are not extended to include zero. "
                    }, m(ButtonRadio, {
                        id: 'zeroOption',
                        attrsAll: {style: {width: '150px'}},
                        onclick: zero => configuration.zero = zero === "True",
                        activeSection: configuration.zero ? "True" : "False",
                        sections: [
                            {value: 'True'},
                            {value: 'False'},
                        ]
                    }))],
                    ["nice", m(Popper, {
                        content: () => configuration.nice
                            ? "Nice is enabled, so axes are extended to significant numbers. "
                            : "Nice is disabled, so axes are not extended to significant numbers. "
                    }, m(ButtonRadio, {
                        id: 'niceOption',
                        attrsAll: {style: {width: '150px'}},
                        onclick: nice => configuration.nice = nice === "True",
                        activeSection: configuration.nice ? "True" : "False",
                        sections: [
                            {value: 'True'},
                            {value: 'False'},
                        ]
                    }))],
                    configuration.mark !== 'bar' && ["interactive", m(Popper, {
                        content: () => configuration.interactive
                            ? "Interactive is enabled, so plots may be dragged/panned to change scales. "
                            : "Interactive is disabled to make scrolling easier. "
                    }, m(ButtonRadio, {
                        id: 'interactiveOption',
                        attrsAll: {style: {width: '150px'}},
                        onclick: interactive => configuration.interactive = interactive === "True",
                        activeSection: configuration.interactive ? "True" : "False",
                        sections: [{value: 'True'}, {value: 'False'}]
                    }))],
                    // "bin": m(Popper, {
                    //     content: () => configuration.bin
                    //         ? "Bin is enabled, so the x axis is binned. "
                    //         : "Bin is disabled, so a sampling is made along the x axis. "
                    // }, m(ButtonRadio, {
                    //     id: 'binOption',
                    //     attrsAll: {style: {width: '150px'}},
                    //     onclick: bin => configuration.bin = bin === "True",
                    //     activeSection: configuration.bin ? "True" : "False",
                    //     sections: [
                    //         {value: 'True'},
                    //         {value: 'False'},
                    //     ]
                    // }))
                    mapping && ["style", m(TextFieldSuggestion, {
                        id: `mapboxStyleTextField`,
                        value: (configuration.pendingMapboxStyle ?? configuration.mapboxStyle) || {light: 'streets', dark: 'dark'}[common.theme],
                        suggestions: Object.keys(mapStyles),
                        enforce: true,
                        oninput: value => configuration.pendingMapboxStyle = value,
                        onblur: value => {
                            delete configuration.pendingMapboxStyle;
                            configuration.mapboxStyle = value
                        }
                    })],
                    multi && [
                        "resolve x", m(ButtonRadio, {
                            id: 'resolveXButtonBar',
                            onclick: resolve => configuration.resolve_x = resolve,
                            activeSection: configuration.resolve_x || 'shared',
                            sections: [
                                {value: 'shared'},
                                {value: 'independent'},
                            ]
                        })
                    ],
                    multi && [
                        "resolve y", m(ButtonRadio, {
                            id: 'resolveYButtonBar',
                            onclick: resolve => configuration.resolve_y = resolve,
                            activeSection: configuration.resolve_y || 'shared',
                            sections: [
                                {value: 'shared'},
                                {value: 'independent'},
                            ]
                        })
                    ]
                ]
            })),
            m('div', {
                style: {
                    margin: '1em',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                }
            }, this.layerEditor(configuration, variables, mapping, summaries, setSummaryAttr, categoricals, abstractQuery, multi && common.colorPalette[0])),

            ([
                {
                    key: 'layer',
                    button: 'Add layer',
                    name: 'Layer'
                },
                // !mapping && {
                //     key: 'vconcat',
                //     button: 'Add plot below',
                //     name: 'Vertical Concatenate'
                // },
                // !mapping && {
                //     key: 'hconcat',
                //     button: 'Add plot beside',
                //     name: 'Horizontal Stack'
                // }
            ]).map(multiType => [
                (multi === multiType.key || !multi) && [
                    (configuration[multiType.key] || [])
                        .map((layer, i) => m('div', {
                                style: {
                                    margin: '1em',
                                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                }
                            },
                            m(Button, {
                                onclick: () => {
                                    remove(configuration[multiType.key], layer);
                                    if (configuration[multiType.key].length === 0) delete configuration[multiType.key];
                                }
                            }, m(Icon, {name: 'x'})),
                            this.layerEditor(layer, variables, mapping, summaries, setSummaryAttr, categoricals, abstractQuery, multi && common.colorPalette[i % common.colorPalette.length + 1])
                        )),

                    m('div[style=margin:1em]',
                        m('h4', multiType.name),
                        m(Button, {
                            onclick: () => {
                                configuration[multiType.key] = configuration[multiType.key] || [];
                                configuration[multiType.key].push({mark: 'point'})
                            }
                        }, multiType.button))
                ],
            ])

        ];
    }

    layerEditor(configuration, variables, mapping, summaries, setSummaryAttr, categoricals, abstractQuery, defaultColor) {

        // maps should be interactive by default
        if (mapping && !('interactive' in configuration)) configuration.interactive = true;

        configuration.channels = configuration.channels || [];

        let secondaryAxis = configuration.channels.find(channel => channel.name === 'secondary axis');
        if (secondaryAxis) {
            if (!secondaryAxis.variables) secondaryAxis.variables = [];
            if (secondaryAxis.variables.length > 1)
                variables = variables.concat([secondaryAxis.key, secondaryAxis.value]);
        }

        let allMarks = [
            !mapping && "bar",
            !mapping && "text",
            // "circle",
            // "square",
            !mapping && "tick",
            !mapping && "line",
            !mapping && "area",
            "point",
            !mapping && 'boxplot',
            mapping && 'region'
            // 'rect',
            // 'rule'
        ].filter(_=>_);

        // initial load
        if (mapping && !configuration.mark) {
            configuration.mark = Object.values(summaries)
                .some(summary => ['latitude', 'longitude'].includes(summary.locationUnit)) ? 'point' : 'region'
            let colorVariable = getTargetVariables(getSelectedProblem())[0] || variables.find(variable => summaries[variable].numchar === 'numeric');
            let colorChannel = configuration.channels.find(channel => channel.name === 'color')
            if (colorChannel) colorChannel.variable = colorVariable;
        }

        let allChannels = [
            !mapping && 'primary axis',
            !mapping && 'secondary axis',
            configuration.mark === "point" && mapping && 'longitude',
            configuration.mark === "point" && mapping && 'latitude',
            configuration.mark === "region" && mapping && 'region',
            !mapping && 'size',
            'color',
            !mapping && 'order',
            !mapping && 'shape',
            'opacity',
            !mapping && 'row',
            !mapping && 'column',
            configuration.mark === "line" && 'detail',
            // 'fillOpacity',
            // 'strokeWidth',
            !mapping && configuration.mark === "text" && 'text',
            'tooltip',
        ].filter(_=>_);

        let unusedChannels = allChannels
            .filter(channelName => !configuration.channels
                .find(channel => channel.name === channelName && !channel.delete));

        if (!mapping && unusedChannels.includes('primary axis')) {
            configuration.channels.unshift({name: 'primary axis'});
            remove(unusedChannels, 'primary axis')
        }
        if (!mapping && unusedChannels.includes('secondary axis')) {
            configuration.channels.push({name: 'secondary axis'});
            remove(unusedChannels, 'secondary axis')
        }

        if (mapping && configuration.mark === 'point') {
            ['latitude', 'longitude'].filter(name => unusedChannels.includes(name))
                .forEach(name => {
                    let channel = configuration.channels.find(channel => channel.name === name);
                    if (channel) channel.delete = false
                    else configuration.channels.unshift({
                        name, variable: variables.find(variable => summaries[variable].locationUnit === name)
                    });
                    remove(unusedChannels, name)
                })
            let regionChannel = configuration.channels.find(channel => channel.name === 'region');
            if (regionChannel) regionChannel.delete = true;
        }
        if (mapping && configuration.mark === 'region' && unusedChannels.includes('region')) {
            let regionUnits = Object.keys(app.locationUnits).filter(unit => !['latitude', 'longitude'].includes(unit));
            configuration.channels.unshift({
                name: 'region',
                variable: variables.find(variable => regionUnits.includes(summaries[variable].locationUnit))
            });
            remove(unusedChannels, 'region');
            ['longitude', 'latitude'].forEach(name => configuration.channels
                .filter(channel => channel.name === name)
                .forEach(channel => channel.delete = true));
        }

        let colorChannel = configuration.channels.find(channel => channel.name === 'color');
        if (!colorChannel && defaultColor)
            configuration.channels.push({name: 'color', colorValue: defaultColor})

        if (!('mark' in configuration))
            configuration.mark = 'point';

        configuration.manipulations = configuration.manipulations || [{
            type: 'subset',
            id: 0,
            abstractQuery: [],
            nodeId: 1,
            groupId: 1
        }];

        let warnings = [
            configuration.mark === "text" && "Use the text channel to map text from your dataset to plot points. You may want to use manipulations to create a shortened text column. ",
            ['bar', 'area'].includes(configuration.mark) && "If no aggregation is chosen, the maximum of each category is shown. ",
            mapping && configuration.interactive && "Set interactivity to false to see tooltips.",
        ].filter(_=>_)

        return [
            m(Subpanel, {
                header: 'Mark', attrsBody: {style: {padding: 0, overflow: 'auto'}}
            },
            m(Table, {
                keyed: true,
                data: [
                    ["type", m(Dropdown, {
                        items: allMarks,
                        activeItem: configuration.mark,
                        onclickChild: value => configuration.mark = value
                    })],
                    ['line', 'area'].includes(configuration.mark) && ["interpolation", m(Dropdown, {
                        id: 'interpolationOption',
                        items: [
                            "basis", "cardinal", "catmull-rom", "linear", "monotone", "natural",
                            "step", "step-after", "step-before"
                        ],
                        activeItem: configuration.interpolation || 'linear',
                        onclickChild: child => configuration.interpolation = child
                    })],
                    ['line', 'area'].includes(configuration.mark) && ["point", m(ButtonRadio, {
                        id: 'pointOption',
                        attrsAll: {style: {width: '150px'}},
                        onclick: point => configuration.point = point === "True",
                        activeSection: configuration.point ? "True" : "False",
                        sections: [{value: 'True'}, {value: 'False'}]
                    })],
                ]
            }),
                warnings.length > 0 && m('[style=padding:1em]', warnings)
            ),

            m(Subpanel, {
                header: 'Subset',
                id: 'exploreSubsetManipulations',
                defaultShown: false, attrsBody: {style: {padding: 0, overflow: 'auto'}}
            }, m('[style=margin:1em]', makeSubsetTreeMenu(
                configuration.manipulations[0],
                true,
                [
                    ...abstractQuery,
                    ...configuration.manipulations
                ]))

                // m(manipulate.PipelineFlowchart, {
                //     compoundPipeline: [
                //         ...abstractQuery,
                //         ...configuration.manipulations
                //     ],
                //     pipeline: configuration.manipulations,
                //     editable: true,
                //     subsetOnly: true
                // })
            ),
            m(Subpanel, {
                header: 'Channels', attrsBody: {style: {padding: 0, overflow: 'auto'}}
            },
            m(Table, {
                keyed: true,
                headers: ['channel', 'variables', '', ''],
                data: [
                    ...configuration.channels
                        .filter(channel => !channel.deleted)
                        .map(channel => !channel.delete && this.channelEditor(channel, variables, configuration, summaries, setSummaryAttr, categoricals)),
                    unusedChannels.length > 0 && [
                        m(Dropdown, {
                            items: unusedChannels,
                            activeItem: 'Add Channel',
                            onclickChild: value => {
                                let priorChannel = configuration.channels.find(channel => channel.name === value);
                                if (priorChannel) delete priorChannel.delete;
                                else configuration.channels.push({name: value})
                            }
                        }), undefined, undefined, undefined]
                ]
            })),
        ];
    }

    channelEditor(channel, variables, configuration, summaries, setSummaryAttr, categoricals) {

        let numericAggregators = [
            'none',
            'mean',
            'absolute mean',
            'count',
            'valid',
            'missing',
            'sum',
            // 'average',
            'stdDev',
            'variance',
            'min',
            'max',
            'q1',
            'median',
            'q3'
        ]
        let categoricalAggregators = [
            'none',
            'count',
            'valid',
            'missing',
            'first',
            'last',
            'addToSet'
        ];

        if (channel.name === 'primary axis') {
            return [
                channel.name,
                m(TextFieldSuggestion, {
                    id: `channel${channel.name}TextField`,
                    value: channel.pendingVariable ?? channel.variable,
                    suggestions: variables,
                    enforce: true,
                    oninput: value => channel.pendingVariable = value,
                    onblur: value => {
                        delete channel.pendingVariable;
                        channel.variable = value
                    }
                }),
                m(Dropdown, {
                    id: 'targetDropdown',
                    items: ['x', 'y'],
                    activeItem: channel.orientation || 'x',
                    onclickChild: value => channel.orientation = value,
                    style: {'margin-left': '1em'}
                }),
                // m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
                undefined
            ]
        }

        if (channel.name === "color") {
            let getDefaultSchemeCategory = variable => variable && (categoricals.has(variable) ? 'categorical' : 'sequential-single')
            let schemeCategory = channel.schemeCategory || getDefaultSchemeCategory(channel.variable);

            channel.scheme = channel.scheme || {};

            let setSchemeCategory = value => {
                channel.schemeCategory = value;
                if (!channel.scheme?.[value] && (value in schemes))
                    setDeep(channel, ['scheme', value], schemes[value][0])
            };

            let aggregators = categoricals.has(channel.variable) ? categoricalAggregators : numericAggregators;
            if (!aggregators.includes(channel.aggregation)) channel.aggregation = aggregators[1];

            return [
                channel.name,
                m(TextFieldSuggestion, {
                    id: `channel${channel.name}TextField`,
                    value: channel.pendingVariable ?? channel.variable,
                    suggestions: variables,
                    enforce: true,
                    oninput: value => channel.pendingVariable = value,
                    onblur: value => {
                        delete channel.pendingVariable;
                        channel.variable = value;
                        let currentNumchar = channel.schemeCategory === 'categorical' ? 'character' : 'numeric';
                        if (summaries[value]?.numchar !== currentNumchar)
                            setSchemeCategory(getDefaultSchemeCategory(value));
                    }
                }),
                channel.variable ? m('',
                    configuration.mark === "region" && channel.variable && m('',
                        m('label', 'Aggregation:'),
                        m(Dropdown, {
                            id: `aggregate${channel.name}Dropdown`,
                            items: aggregators,
                            activeItem: channel.aggregation,
                            onclickChild: child => channel.aggregation = child
                        })),
                    m('label', 'Scheme Category:'),
                    m(TextFieldSuggestion, {
                        id: 'schemeCategoriesDropdown',
                        value: schemeCategory,
                        suggestions: Object.keys(schemes),
                        enforce: true,
                        oninput: value => channel.schemeCategory = value,
                        onblur: setSchemeCategory,
                        style: {'margin-left': '1em'}
                    }),
                    m('label', 'Scheme:'),
                    m(TextFieldSuggestion, {
                        id: 'schemeDropdown',
                        value: channel.scheme[schemeCategory] ?? schemes[schemeCategory]?.[0],
                        suggestions: schemes[schemeCategory] || [],
                        enforce: true,
                        oninput: value => channel.scheme[schemeCategory] = value,
                        onblur: value => channel.scheme[schemeCategory] = value,
                        style: {'margin-left': '1em'}
                    })
                ) : m('label', {
                    style: {
                        'background-color': channel.colorValue ?? 'transparent',
                        'position': 'relative',
                        'overflow': 'hidden',
                        'width': '40px',
                        'height': '40px',
                        'border': 'solid 2px #ddd',
                        'border-radius': '40px',
                    }
                }, m('input', {
                        type: 'color', id: 'colorValueInput', value: channel.colorValue,
                        style: {
                            'position': 'absolute',
                            'right': '-8px',
                            'top': '-8px',
                            'width': '56px',
                            'height': '56px',
                            'border': 'none',
                        },

                        onchange: function () {
                            channel.colorValue = this.value
                            m.redraw()
                        },
                        oninput: function () {
                            channel.colorValue = this.value
                            m.redraw()
                        }
                    })),
                m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
                // undefined
            ]
        }

        if (channel.name === 'secondary axis') {
            if (!channel.variables) channel.variables = [];
            if (channel.key === undefined) channel.key = 'field';
            if (channel.value === undefined) channel.value = 'value';
            if (!channel.aggregation) channel.aggregation = 'none';
            if (['bar', 'area'].includes(configuration.mark) && channel.aggregation === 'none')
                channel.aggregation = 'max';

            let aggregators = categoricals.has(channel.variable) ? categoricalAggregators : numericAggregators;
            if (!aggregators.includes(channel.aggregation)) channel.aggregation = aggregators[0];

            return [
                channel.name,
                // variables
                m('', channel.variables.length > 0 && m(Table, {
                    keyed: true,
                    attrsAll: {
                        style: {
                            background: 'rgba(0,0,0,.05)',
                            'border-radius': '.5em',
                            'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                            margin: '10px 0'
                        }
                    },
                    data: channel.variables.map(variable => [
                        variable,
                        m('div', {onclick: () => remove(channel.variables, variable)}, m(Icon, {name: 'x'}))
                    ])
                }), m(TextFieldSuggestion, {
                    id: `channel${channel.name}TextField`,
                    value: this.pendingSecondaryVariable,
                    suggestions: variables,
                    enforce: true,
                    oninput: value => this.pendingSecondaryVariable = value,
                    onblur: value => {
                        this.pendingSecondaryVariable = '';
                        if (!variables.includes(value)) return;

                        channel.variables.push(value)

                        if (channel.variables.length > 1) {
                            let colorChannel = configuration.channels.find(channel => channel.name === 'color');
                            if (!colorChannel) configuration.channels.push({name: 'color', variable: channel.key})
                        }
                    }
                })),
                m('div',
                    channel.variables.length > 1 && m('div',
                    m('label', 'Key variable:'), m(TextField, {
                        value: channel.key,
                        oninput: key => {
                            configuration.channels
                                .filter(other => other.variable === channel.key)
                                .map(other => other.variable = key);
                            channel.key = key;
                        },
                        onblur: key => {
                            configuration.channels
                                .filter(other => other.variable === channel.key)
                                .map(other => other.variable = key);
                            channel.key = key;
                        }
                    }),
                    m('br'),
                    m('label', 'Value variable:'), m(TextField, {
                        value: channel.value,
                        oninput: value => {
                            configuration.channels
                                .filter(other => other.variable === channel.value)
                                .map(other => other.variable = value);
                            channel.value = value;
                        },
                        onblur: value => {
                            configuration.channels
                                .filter(other => other.variable === channel.value)
                                .map(other => other.variable = value);
                            channel.value = value;
                        },
                    })),
                    m('label', 'Aggregation:'),
                    m(Dropdown, {
                        id: 'aggregateDropdown',
                        items: aggregators,
                        activeItem: channel.aggregation,
                        onclickChild: child => channel.aggregation = child
                    })
                ),
                // m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
                undefined
            ]
        }

        if (configuration.mark === "region" && channel.name === 'region') return [
            channel.name,
            m(TextFieldSuggestion, {
                id: `channel${channel.name}TextField`,
                value: channel.pendingVariable ?? channel.variable,
                suggestions: variables,
                enforce: true,
                oninput: value => channel.pendingVariable = value,
                onblur: value => {
                    delete channel.pendingVariable;
                    channel.variable = value
                }
            }),
            m('',
                m('label', 'Units:'),
                m(Dropdown, {
                    id: 'locationUnitsDropdown',
                    items: Object.keys(app.locationUnits).filter(unit => !['latitude', 'longitude'].includes(unit)),
                    activeItem: summaries[channel.variable]?.locationUnit || 'unknown',
                    onclickChild: value => {
                        if (value === summaries[channel.variable].locationUnit) return;
                        setSummaryAttr(channel.variable, 'locationUnit', value);
                        setSummaryAttr(channel.variable, 'locationFormat', undefined);
                        app.inferLocationFormat(channel.variable)
                    }
                }),
                summaries[channel.variable]?.locationUnit && m('div',
                    {style: 'margin-bottom: 1em'},
                m('label', 'Format:'),
                    m(Dropdown, {
                        id: 'locationFormatDropdown',
                        items: app.locationUnits[summaries[channel.variable].locationUnit],
                        activeItem: summaries[channel.variable].locationFormat,
                        onclickChild: value => app.setVariableSummaryAttr(channel.variable, 'locationFormat', value)
                    }),
                ),
            ),
            m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
            // undefined
        ]

        if (configuration.mark === "region" && ['latitude', 'longitude'].includes(channel.name))
            return

        let aggregators;
        if (configuration.mark === "region") {
            aggregators = categoricals.has(channel.variable) ? categoricalAggregators : numericAggregators;
            if (!aggregators.includes(channel.aggregation)) channel.aggregation = aggregators[1];
        }
        return [
            channel.name,
            m(TextFieldSuggestion, {
                id: `channel${channel.name}TextField`,
                value: channel.pendingVariable ?? channel.variable,
                suggestions: variables,
                enforce: true,
                oninput: value => channel.pendingVariable = value,
                onblur: value => {
                    delete channel.pendingVariable;
                    channel.variable = value
                }
            }),
            channel.variable && configuration.mark === "region" && m('',
                m('label', 'Aggregation:'),
                m(Dropdown, {
                    id: `aggregate${channel.name}Dropdown`,
                    items: aggregators,
                    activeItem: channel.aggregation || 'mean',
                    onclickChild: child => channel.aggregation = child
                })),
            m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
        ];
    }
}

export let remove = (arr, obj) => {
    let idx = arr.indexOf(obj);
    idx !== -1 && arr.splice(idx, 1);
};

export let schemes = {
    categorical: [
        'tableau10',
        'tableau20',
        'accent',
        'category10',
        'category20',
        'category20b',
        'category20c',
        'dark2',
        'paired',
        'pastel1',
        'pastel2',
        'set1',
        'set2',
        'set3',
    ],
    'sequential-single': [
        'blues',
        'tealblues',
        'teals',
        'greens',
        'browns',
        'oranges',
        'reds',
        'purples',
        'warmgreys',
        'greys',
    ],
    'sequential-multi': [
        'viridis',
        'magma',
        'inferno',
        'plasma',
        'cividis',
        'turbo',
        'bluegreen',
        'bluepurple',
        'goldgreen',
        'goldorange',
        'goldred',
        'greenblue',
        'orangered',
        'purplebluegreen',
        'purpleblue',
        'purplered',
        'redpurple',
        'yellowgreenblue',
        'yellowgreen',
        'yelloworangebrown',
        'yelloworangered'
    ],
    dark: [
        'darkblue',
        'darkgold',
        'darkgreen',
        'darkmulti',
        'darkred',
    ],
    light: [
        'lightgreyred',
        'lightgreyteal',
        'lightmulti',
        'lightorange',
        'lighttealblue',
    ],
    diverging: [
        'blueorange',
        'brownbluegreen',
        'purplegreen',
        'pinkyellowgreen',
        'purpleorange',
        'redblue',
        'redgrey',
        'redyellowblue',
        'redyellowgreen',
        'spectral',
    ],
    rainbow: [
        'rainbow',
        'sinebow'
    ]
}