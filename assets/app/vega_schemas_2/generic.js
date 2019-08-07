import m from 'mithril';
import PlotVegaLite from "../views/PlotVegaLite";

import TwoPanel from "../../common/views/TwoPanel";
import Table from "../../common/views/Table";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../../common/views/Icon";

export default class GenericPlotVegaLite {
    view(vnode) {
        let {getData, variables, nominals, preferences} = vnode.attrs;

        this.data = getData(preferences);

        let specification = {
            $schema: "https://vega.github.io/schema/vega-lite/v3.json",
            description: "A scatterplot.",
            mark: "point",
            encoding: {}
        };

        Object.keys(preferences.channels).map(row => specification.encoding[row.channel] = ({
            field: row.variable,
            type: nominals.has(row.variable) ? 'nominal' : 'quantitative'
        }));

        let channelsUsed = new Set(preferences.channels.map(row => row.channel));
        let channelsOpen = ['x', 'y', 'color', 'opacity', 'size', 'shape', 'text']
            .filter(value => !channelsUsed.has(value));

        return m(TwoPanel, {
            left: m(PlotVegaLite, {
                data,
                specification
            }),
            right: [
                m('h4', 'Mark'),
                m(Table, {
                    data: [
                        [
                            'Type', m(Dropdown, {
                            // https://vega.github.io/vega-lite/docs/encoding.html
                            items: ["bar", "circle", "square", "tick", "line", "area", "point"],
                            activeItem: row.channel,
                            onclickChild: value => row.channel = value
                        })]
                    ]
                }),
                m('h4', 'Channels'),
                m(Table, {
                    data: [...preferences.channels.map((row, i) => [
                        m(TextFieldSuggestion, {
                            suggestions: variables,
                            enforce: true,
                            oninput: value => row.variable = value,
                            onblur: value => row.variable = value
                        }),
                        m(Dropdown, {
                            // https://vega.github.io/vega-lite/docs/encoding.html
                            items: channelsOpen,
                            activeItem: row.channel,
                            onclickChild: value => row.channel = value
                        }),
                        m('div', {
                            onclick: preferences.channels.splice(i, 1)
                        }, m(Icon, {name: 'x'}))
                    ]), [
                        m(TextFieldSuggestion, {
                            suggestions: variables,
                            enforce: true,
                            oninput: value => preferences.channels.push({variable: value, channel: 'x'}),
                            onblur: value => preferences.channels.push({variable: value, channel: 'x'})
                        }),
                        undefined,
                        undefined
                    ]]
                })
            ]
        })
    }
}
