import m from 'mithril';

import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";


export default class PlotVegaLiteConfigure {
    view(vnode) {
        let {configuration, variables} = vnode.attrs;

        return layerEditor(configuration, variables);
    }
}

let layerEditor = (configuration, variables) => {

    configuration.channels = configuration.channels || [];

    let allChannels = ['primary axis', 'secondary axis', 'size', 'color', 'shape', 'row', 'column', 'group'];

    let unusedChannels = allChannels
        .filter(channelName => !configuration.channels
            .find(channel => channel.name === channelName && !channel.delete));

    return [
        m('h4', 'Mark'),
        m(Table, {
            data: [
                [
                    'Type', m(Dropdown, {
                    items: ["bar", "circle", "square", "tick", "line", "area", "point"],
                    activeItem: configuration.mark,
                    onclickChild: value => configuration.mark = value
                })]
            ]
        }),
        m('h4', 'Channels'),
        m(Table, {
            headers: ['channel', 'variable', 'options', ''],
            data: [
                ...configuration.channels
                    .filter(channel => !channel.deleted)
                    .map(channel => channelEditor(channel, variables)),
                unusedChannels.length > 0 && [
                    m(Dropdown, {
                        items: unusedChannels,
                        activeItem: 'Add Channel',
                        onclickChild: value => {
                            let priorChannel = configuration.channels.find(channel => channel.name === value);
                            if (priorChannel) delete priorChannel.delete;
                            else configuration.channels.push({name: value})
                        }
                    })]
            ]
        })
    ];
};

let channelEditor = (channel, variables) => {
    if (channel.name === 'primary axis') {
        console.log(variables);
        return [
            channel.name,
            m(TextFieldSuggestion, {
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
        return [
            channel.name,
            m(Table, {
                data: [
                    ...channel.variables.map(variable => [
                        variable,
                        m('div', {onclick: () => remove(channel.variables, variable)}, m(Icon, {name: 'x'}))
                    ]),
                    m(TextFieldSuggestion, {
                        suggestions: variables,
                        enforce: true,
                        onblur: value => channel.variables.push(value)
                    })
                ]
            }),
            undefined,
            m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
        ]
    }
    return [
        channel.name,
        m(TextFieldSuggestion, {
            suggestions: variables,
            enforce: true,
            oninput: value => channel.variable = value,
            onblur: value => channel.variable = value
        }),
        undefined,
        m('div', {onclick: () => channel.delete = true}, m(Icon, {name: 'x'}))
    ]
};

export let remove = (arr, obj) => {
    let idx = arr.indexOf(obj);
    idx !== -1 && arr.splice(idx, 1);
};