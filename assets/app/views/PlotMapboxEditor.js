import m from 'mithril';

import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";
import ButtonRadio from "../../common/views/ButtonRadio";
import Popper from '../../common/views/Popper';
import MenuHeaders from "../../common/views/MenuHeaders";

export default class PlotMapboxEditor {
    oninit(vnode) {
        this.pendingSecondaryVariable = '';
    }
    view(vnode) {
        let {configuration, variables} = vnode.attrs;


        let allMarks = [
            // "bar",
            // "text",
            // "circle",
            // "square",
            // "tick",
            // "line",
            // "area",
            "point",
            // 'boxplot',
            'rect',
            // 'rule'
        ];

        return [
            m(Table, {
                data: [
                    ["type", m(Dropdown, {
                        items: allMarks,
                        activeItem: configuration.mark,
                        onclickChild: value => configuration.mark = value
                    })],
                    ...['point', 'rect'].includes(configuration.mark) ? [
                        [
                            "latitude", m(TextFieldSuggestion, {
                                id: `channelLatitudeTextField`,
                                value: configuration.latitude,
                                suggestions: variables,
                                enforce: true,
                                oninput: value => configuration.latitude = value,
                                onblur: value => configuration.latitude = value
                            })
                        ],
                        [
                            "longitude", m(TextFieldSuggestion, {
                                id: `channelLongitudeTextField`,
                                value: configuration.longitude,
                                suggestions: variables,
                                enforce: true,
                                oninput: value => configuration.longitude = value,
                                onblur: value => configuration.longitude = value
                            })
                        ],
                        [
                            "color", m(TextFieldSuggestion, {
                                id: `channelColorTextField`,
                                value: configuration.color,
                                suggestions: variables,
                                enforce: true,
                                oninput: value => configuration.color = value,
                                onblur: value => configuration.color = value
                            })
                        ]
                    ] : []
                ]
            }),

        ]
    }
}
