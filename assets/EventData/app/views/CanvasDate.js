import m from 'mithril';
import * as d3 from "d3";
import $ from 'jquery'
import "jquery-ui/ui/widgets/datepicker"
// Used for rendering date calendar
import '../../../../node_modules/jquery-ui/themes/base/datepicker.css'
import '../../../../node_modules/jquery-ui-dist/jquery-ui.theme.min.css'


import * as aggreg from '../aggreg/aggreg';

import {panelMargin} from "../../../common/common";
import ButtonRadio from '../../../common/views/ButtonRadio';
import PlotDate from './PlotDate';

export function dateSort(a, b) {
    if (a['Date'] === b['Date']) {
        return 0;
    }
    else {
        return (a['Date'] < b['Date']) ? -1 : 1;
    }
}

export function interpolate(data, date) {
    let allDatesInt = [];
    for (let entry of data) {
        allDatesInt.push(entry['Date'])
    }

    let lower = allDatesInt[0];
    let upper = allDatesInt[allDatesInt.length - 1];

    for (let candidate in allDatesInt) {
        if (allDatesInt[candidate] > lower && allDatesInt[candidate] < upper) {
            lower = allDatesInt[candidate];
        }
        if (allDatesInt[candidate] < upper && allDatesInt[candidate] > lower) {
            upper = allDatesInt[candidate];
        }
    }

    let lowerFreq = data[0]['Freq'];
    let upperFreq = data[data.length - 1]['Freq'];

    for (let candidate of data) {
        if (candidate['Date'] === lower) lowerFreq = candidate['Freq'];
        if (candidate['Date'] === upper) upperFreq = candidate['Freq'];
    }

    let interval_lower = upper.getTime() - lower.getTime();
    let timespan = upper.getTime() - lower.getTime();

    let weight = interval_lower / timespan;
    return (1 - weight) * lowerFreq + weight * upperFreq;
}

export default class CanvasDate {
    oncreate(vnode) {
        let {subsetName, data, preferences} = vnode.attrs;

        let minDate = data[0]['Date'];
        let maxDate = data[data.length - 1]['Date'];

        $(`#fromDate${subsetName}`).datepicker({
            dateFormat: 'yy-mm-dd',
            changeYear: true,
            changeMonth: true,
            defaultDate: minDate,
            yearRange: min + ':' + max,
            minDate: minDate,
            maxDate: maxDate,
            orientation: top,
            onSelect: function () {
                preferences['userLower'] = new Date($(this).datepicker('getDate').getTime());
                let toDate = $(`#toDate${subsetName}`);
                toDate.datepicker('option', 'minDate', preferences['userLower']);
                toDate.datepicker('option', 'defaultDate', maxDate);
                toDate.datepicker('option', 'maxDate', maxDate);
                // fromdatestring = dateminUser.getFullYear() + "" + ('0' + (dateminUser.getMonth() + 1)).slice(-2) + "" + ('0' + dateminUser.getDate()).slice(-2);
            },
            onClose: function () {
                setTimeout(function () {
                    $(`#toDate${subsetName}`).focus();
                }, 100);

                // Update plot, but don't reset slider
                $(`#toDate${subsetName}`).datepicker("show");
            }
        });


        $(`#toDate${subsetName}`).datepicker({
            changeYear: true,
            changeMonth: true,
            yearRange: min + ':' + max,
            dateFormat: 'yy-mm-dd',
            defaultDate: maxDate,
            minDate: preferences['userLower'],
            maxDate: maxDate,
            orientation: top,
            onSelect: function () {
                preferences['userUpper'] = new Date($(this).datepicker('getDate').getTime());
                // todatestring = datemaxUser.getFullYear() + "" + ('0' + (datemaxUser.getMonth() + 1)).slice(-2) + "" + ('0' + datemaxUser.getDate()).slice(-2);
            }
        });
    }

    view(vnode) {
        let {mode, subsetName, data, preferences, redraw, setRedraw} = vnode.attrs;

        let setHandleDates = (lower, upper) => {
            preferences['handleLower'] = lower;
            preferences['handleUpper'] = upper;
        };

        // only draw the graph if there are multiple datapoints
        let drawGraph = data.length > 1;
        let dataProcessed;
        if (redraw && drawGraph) {
            setRedraw(subsetName, false);
            let allDates = data.sort(dateSort);

            // Filter highlighted data by date picked
            let selectedDates = data.filter(function (row) {
                return row.Date >= preferences['userLower'] && row.Date <= preferences['userUpper'];
            });

            let interpolatedMin = {
                "Date": preferences['userLower'],
                "Freq": interpolate(allDates, preferences['userLower'])
            };
            let interpolatedMax = {
                "Date": preferences['userUpper'],
                "Freq": interpolate(allDates, preferences['userUpper'])
            };

            selectedDates.unshift(interpolatedMin);
            selectedDates.push(interpolatedMax);

            allDates.push(interpolatedMin);
            allDates.push(interpolatedMax);
            allDates = allDates.sort(dateSort);

            dataProcessed = {
                "#ADADAD": allDates,
                "steelblue": selectedDates
            }
        }

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
                            onclick: function () {
                                preferences['userLower'] = preferences['handleLower'];
                                preferences['userUpper'] = preferences['handleUpper'];

                                // hard redraw plots
                                setRedraw(subsetName, true);
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
                                setRedraw(subsetName, true);
                            },
                            value: d3.timeFormat("%Y-%m-%d")(preferences['userUpper'])
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
                            onblur: () => setRedraw(subsetName, true),
                            value: d3.timeFormat("%Y-%m-%d")(preferences['userUpper'])
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
                m("[id='dateSVGdiv']", {style: {"display": "inline-block"}},
                    m("svg#dateSVG[height='550'][width='500']"),
                    drawGraph && m(PlotDate, {
                        callbackHandles: setHandleDates,
                        dataProcessed,
                        attrsAll: {
                            id: 'dateSVG',
                            height: 550,
                            width: 500
                        }
                    })),
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
