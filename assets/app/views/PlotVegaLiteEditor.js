import m from 'mithril';

import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";
import ButtonRadio from "../../common/views/ButtonRadio";
import Popper from '../../common/views/Popper';

export default class PlotVegaLiteEditor {
    oninit(vnode) {
        this.pendingSecondaryVariable = '';
    }
    view(vnode) {
        let {configuration, variables} = vnode.attrs;

        let multi = 'layers' in configuration
            ? 'layers'
            : ('vconcat' in configuration)
                ? 'vconcat'
                : ('hconcat' in configuration)
                    ? 'hconcat' : undefined;

        return [
            m('div', {
                style: {
                    margin: '1em',
                    padding: '1em',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                }
            }, this.layerEditor(configuration, variables)),

            ([
                // {
                //     key: 'layers',
                //     button: 'Add layer',
                //     name: 'Layers'
                // },
                // {
                //     key: 'vconcat',
                //     button: 'Add plot below',
                //     name: 'Vertical Concatenate'
                // },
                // {
                //     key: 'hconcat',
                //     button: 'Add plot beside',
                //     name: 'Horizontal Stack'
                // }
            ]).map(multiType => [
                (multi === multiType.key || !multi) && [
                    (configuration[multiType.key] || [])
                        .map(layer => m('div', {
                                style: {
                                    margin: '1em',
                                    padding: '1em',
                                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                }
                            },
                            m(Button, {
                                onclick: () => {
                                    remove(configuration[multiType.key], layer);
                                    if (configuration[multiType.key].length === 0) delete configuration[multiType.key];
                                }
                            }, m(Icon, {name: 'x'})),
                            this.layerEditor(layer, variables)
                        )),

                    m('div[style=margin:1em]',
                        m('h4', multiType.name),
                        m(Button, {
                            onclick: () => {
                                configuration[multiType.key] = configuration[multiType.key] || [];
                                configuration[multiType.key].push({
                                    mark: 'point'
                                })
                            }
                        }, multiType.button))
                ],
            ])

        ];
    }

    layerEditor(configuration, variables) {

        configuration.channels = configuration.channels || [];

        let secondaryAxis = configuration.channels.find(channel => channel.name === 'secondary axis');
        if (secondaryAxis) {
            if (!secondaryAxis.variables) secondaryAxis.variables = [];
            if (secondaryAxis.variables.length > 1)
                variables = variables.concat([secondaryAxis.key, secondaryAxis.value]);
        }

        let allChannels = [
            'primary axis',
            'secondary axis',
            'size',
            'color',
            'order',
            'shape',
            'opacity',
            'row',
            'column',
            configuration.mark === "line" && 'detail',
            // 'fillOpacity',
            // 'strokeWidth',
            configuration.mark === "text" && 'text',
            'tooltip',
        ].filter(_=>_);

        let allMarks = [
            "bar",
            "text",
            // "circle",
            // "square",
            "tick",
            "line",
            "area",
            "point",
            'boxplot',
            // 'rect',
            // 'rule'
        ];

        let unusedChannels = allChannels
            .filter(channelName => !configuration.channels
                .find(channel => channel.name === channelName && !channel.delete));

        if (unusedChannels.includes('primary axis')) {
            configuration.channels.push({name: 'primary axis'});
            remove(unusedChannels, 'primary axis')
        }
        if (unusedChannels.includes('secondary axis')) {
            configuration.channels.push({name: 'secondary axis'});
            remove(unusedChannels, 'secondary axis')
        }

        if (!('mark' in configuration))
            configuration.mark = 'point';

        return [
            m('h4', 'Mark'),
            m(Table, {
                data: [
                    ["type", m(Dropdown, {
                        items: allMarks,
                        activeItem: configuration.mark,
                        onclickChild: value => configuration.mark = value
                    })],
                    // ["nice", m(Popper, {
                    //     content: () => configuration.nice
                    //         ? "Nice is enabled, so axes are extended to significant numbers. "
                    //         : "Nice is disabled, so axes are not extended to significant numbers. "
                    // }, m(ButtonRadio, {
                    //     id: 'niceOption',
                    //     attrsAll: {style: {width: '150px'}},
                    //     onclick: nice => configuration.nice = nice === "True",
                    //     activeSection: configuration.nice ? "True" : "False",
                    //     sections: [
                    //         {value: 'True'},
                    //         {value: 'False'},
                    //     ]
                    // }))],
                    ["zero", m(Popper, {
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
                    })]
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
                ]
            }),
            configuration.mark === "text" && "Use the text channel to map text from your dataset to plot points. You may want to use manipulations to create a shortened text column. ",
            ['bar', 'area'].includes(configuration.mark) && "If no aggregation is chosen, the maximum of each category is shown. ",
            m('h4[style=margin-top:1em]', 'Channels'),
            m(Table, {
                headers: ['channel', 'variables', '', ''],
                data: [
                    ...configuration.channels
                        .filter(channel => !channel.deleted)
                        .map(channel => !channel.delete && this.channelEditor(channel, variables, configuration)),
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
            }),
        ];
    }

    channelEditor(channel, variables, configuration) {

        let aggregators = [
            'none',
            'count',
            'valid',
            'missing',
            'sum',
            'mean',
            // 'average',
            // 'stdDev',
            // 'variance',
            'min',
            'max',
            // 'q1',
            // 'median',
            // 'q3'
        ];

        if (channel.name === 'primary axis') {
            return [
                channel.name,
                m(TextFieldSuggestion, {
                    id: `channel${channel.name}TextField`,
                    value: channel.variable,
                    suggestions: variables,
                    enforce: true,
                    oninput: value => channel.variable = value,
                    onblur: value => channel.variable = value
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

        if (channel.name === 'secondary axis') {
            if (!channel.variables) channel.variables = [];
            if (channel.key === undefined) channel.key = 'field';
            if (channel.value === undefined) channel.value = 'value';
            if (!channel.aggregation) channel.aggregation = 'none';
            if (['bar', 'area'].includes(configuration.mark) && channel.aggregation === 'none')
                channel.aggregation = 'max';
            return [
                channel.name,
                // variables
                m(Table, {
                    attrsAll: {
                        style: {
                            background: 'rgba(0,0,0,.05)',
                            'border-radius': '.5em',
                            'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                            margin: '10px 0'
                        }
                    },
                    data: [
                        ...channel.variables.map(variable => [
                            variable,
                            m('div', {onclick: () => remove(channel.variables, variable)}, m(Icon, {name: 'x'}))
                        ]),
                        [
                            m(TextFieldSuggestion, {
                                id: `channel${channel.name}TextField`,
                                value: this.pendingSecondaryVariable,
                                suggestions: variables,
                                enforce: true,
                                oninput: value => this.pendingSecondaryVariable = value,
                                onblur: value => {
                                    this.pendingSecondaryVariable = '';
                                    if (!variables.includes(value)) return;

                                    if (['bar', 'area'].includes(configuration.mark))
                                        channel.variables = [value]
                                    else
                                        channel.variables.push(value)

                                    if (channel.variables.length > 1) {
                                        let colorChannel = configuration.channels.find(channel => channel.name === 'color');
                                        if (!colorChannel) configuration.channels.push({name: 'color', variable: channel.key})
                                    }
                                }
                            }),
                            undefined
                        ]
                    ]
                }),
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
        return [
            channel.name,
            m(TextFieldSuggestion, {
                id: `channel${channel.name}TextField`,
                value: channel.variable,
                suggestions: variables,
                enforce: true,
                oninput: value => channel.variable = value,
                onblur: value => channel.variable = value
            }),
            undefined,
            m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
        ];
    }
}

export let remove = (arr, obj) => {
    let idx = arr.indexOf(obj);
    idx !== -1 && arr.splice(idx, 1);
};