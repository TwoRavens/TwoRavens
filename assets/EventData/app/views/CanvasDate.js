import m from 'mithril';
import {dateminUser, datemaxUser, setupDate, setDatefromSlider, updateDate} from '../subsets/Date.js';
import * as aggreg from '../aggreg/aggreg';

import {panelMargin} from "../../../common/common";
import ButtonRadio from '../../../common/views/ButtonRadio';
import * as d3 from "d3";

export default class CanvasDate {
    oncreate() {
        setupDate();
    }

    view(vnode) {
        let {mode, display} = vnode.attrs;

        let rightMenu = [
            m("[id='dateOptions']", {
                    style: {display: mode === 'subset' ? 'block' : 'none'}
                },
                m(".form-group[id='dateInterval']",
                    [
                        // Set date from slider
                        m("button.btn.btn-default[type='button']", {
                            style: {
                                "margin-top": "10px",
                                "text-align": "center"
                            },
                            onclick: function (e) {
                                setDatefromSlider();
                                e.redraw = false;
                            }
                        }, "Bring Date from Slider"),

                        // From date
                        m("label[for='fromdate'][id='dateFromLab']", {
                            style: {
                                "text-align": "left",
                                "width": "100%",
                                "margin-top": "10px"
                            }
                        }, "From:"),
                        m("input.form-control[id='fromdate'][type='text']", {
                            onblur: function () {
                                // Update plot, but don't reset slider
                                updateDate(false);
                            },
                            value: d3.timeFormat("%Y-%m-%d")(dateminUser)
                        }),

                        // To date
                        m("label[for='todate'][id='dateToLab']", {
                            style: {
                                "text-align": "left",
                                "width": "100%",
                                "margin-top": "10px"
                            }
                        }, "To:"),
                        m("input.form-control[id='todate'][type='text']", {
                            onblur: function () {
                                // Update plot, but don't reset slider
                                updateDate(false);
                            },
                            value: d3.timeFormat("%Y-%m-%d")(datemaxUser)
                        })
                    ]
                )
            ),
            m('#dateAggreg', {
                style: {display: mode === 'aggregate' ? 'block' : 'none'}
            }, m(ButtonRadio, {
                id: 'dateAggregOption',
                attrsAll: {style: {width: '80px'}},
                vertical: true,
                onclick: aggreg.setDateMeasure,
                activeSection: ['None', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'][aggreg.aggregDateOn],
                sections: [
                    {value: 'None'},
                    {value: 'Weekly'},
                    {value: 'Monthly'},
                    {value: 'Quarterly'},
                    {value: 'Yearly'},
                ]
            }))
        ];

        return (m("#canvasDate", {style: {"display": display, 'padding-top': panelMargin}},
            [
                m("[id='dateSVGdiv']", {style: {"display": "inline-block"}}, m("svg[height='550'][id='dateSVG'][width='500']")),
                m("div",
                    {
                        style: {
                            "display": "inline-block",
                            "vertical-align": "top",
                            "width": "20%",
                            "margin": "20px"
                        }
                    },
                    rightMenu
                )
            ]
        ));
    }
}
