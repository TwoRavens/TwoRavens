import m from 'mithril';

import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";

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
                {
                    key: 'layers',
                    button: 'Add layer',
                    name: 'Layers'
                },
                {
                    key: 'vconcat',
                    button: 'Add plot below',
                    name: 'Vertical Concatenate'
                },
                {
                    key: 'hconcat',
                    button: 'Add plot beside',
                    name: 'Horizontal Stack'
                }
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
            'detail',
            'fillOpacity',
            'strokeWidth',
            'text',
            'tooltip',
        ];

        let allMarks = [
            "bar",
            "circle",
            "square",
            "tick",
            "line",
            "area",
            "point",
            'rect',
            'rule'
        ];

        let unusedChannels = allChannels
            .filter(channelName => !configuration.channels
                .find(channel => channel.name === channelName && !channel.delete));

        if (unusedChannels.includes('primary axis')) {
            configuration.channels.push({name: 'primary axis'});
            remove(unusedChannels, 'primary axis')
        }

        if (!('mark' in configuration))
            configuration.mark = 'point';

        return [
            m('h4', 'Mark'),
            m(Table, {
                data: [
                    [
                        'Type',
                        m(Dropdown, {
                            items: allMarks,
                            activeItem: configuration.mark,
                            onclickChild: value => configuration.mark = value
                        })
                    ]
                ]
            }),
            m('h4', 'Channels'),
            m(Table, {
                headers: ['channel', 'variable(s)', '', ''],
                data: [
                    ...configuration.channels
                        .filter(channel => !channel.deleted)
                        .map(channel => !channel.delete && this.channelEditor(channel, variables)),
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

    channelEditor(channel, variables) {

        let aggregators = [
            'none',
            'count',
            'valid',
            'missing',
            'sum',
            'mean',
            'average',
            'stdDev',
            'min',
            'max',
            'q1',
            'median',
            'q3'
        ];

        if (channel.name === 'primary axis') {
            return [
                channel.name,
                m(TextFieldSuggestion, {
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
                m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
            ]
        }

        if (channel.name === 'secondary axis') {
            if (!channel.variables) channel.variables = [];
            if (!channel.key) channel.key = 'field';
            if (!channel.value) channel.value = 'value';
            if (!channel.aggregation) channel.aggregation = 'none';
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
                                value: this.pendingSecondaryVariable,
                                suggestions: variables,
                                enforce: true,
                                oninput: value => this.pendingSecondaryVariable = value,
                                onblur: value => {
                                    this.pendingSecondaryVariable = '';
                                    channel.variables.push(value)
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
                            oninput: value => channel.key = value,
                            onblur: value => channel.key = value
                        }),
                        m('br'),
                        m('label', 'Value variable:'), m(TextField, {
                            value: channel.value,
                            oninput: value => channel.value = value,
                            onblur: value => channel.value = value
                        })
                    ),
                    m('label', 'Aggregation:'),
                    m(Dropdown, {
                        id: 'loginDropdown',
                        items: aggregators,
                        activeItem: channel.aggregation,
                        onclickChild: child => channel.aggregation = child
                    })
                ),
                m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
            ]
        }
        return [
            channel.name,
            m(TextFieldSuggestion, {
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