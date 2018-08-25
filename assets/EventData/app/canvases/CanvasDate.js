import m from 'mithril';
import * as d3 from "d3";
import $ from 'jquery'
import "jquery-ui/ui/widgets/datepicker"
// Used for rendering date calendar
import '../../../../node_modules/jquery-ui/themes/base/datepicker.css'
import '../../../../node_modules/jquery-ui-dist/jquery-ui.theme.min.css'

import {panelMargin} from "../../../common-eventdata/common";
import ButtonRadio from '../../../common-eventdata/views/ButtonRadio';
import PlotDate from '../views/PlotDate';
import * as app from '../app';


export function interpolate(data, date) {
    let allDatesInt = [];
    for (let entry of data) {
        allDatesInt.push(entry['Date'])
    }

    let lower = allDatesInt[0];
    let upper = allDatesInt[allDatesInt.length - 1];

    for (let candidate in allDatesInt) {
        if (allDatesInt[candidate] > lower && allDatesInt[candidate] < date) {
            lower = allDatesInt[candidate];
        }
        if (allDatesInt[candidate] < upper && allDatesInt[candidate] > date) {
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
        let {subsetName, data, preferences, setRedraw} = vnode.attrs;
        let minDate = data[0]['Date'];
        let maxDate = data[data.length - 1]['Date'];

        $(`#fromDate`).datepicker({
            dateFormat: 'yy-mm-dd',
            changeYear: true,
            changeMonth: true,
            defaultDate: minDate,
            yearRange: minDate.getFullYear() + ':' + maxDate.getFullYear(),
            minDate: minDate,
            maxDate: maxDate,
            orientation: top,
            onSelect: function () {
                preferences['userLower'] = new Date($(this).datepicker('getDate').getTime());
                let toDate = $(`#toDate`);
                toDate.datepicker('option', 'minDate', preferences['userLower']);
                toDate.datepicker('option', 'defaultDate', maxDate);
                toDate.datepicker('option', 'maxDate', maxDate);
                m.redraw();
                // fromdatestring = dateminUser.getFullYear() + "" + ('0' + (dateminUser.getMonth() + 1)).slice(-2) + "" + ('0' + dateminUser.getDate()).slice(-2);
            },
            onClose: function () {
                setTimeout(function () {
                    $(`#toDate`).focus();
                }, 100);

                // Update plot, but don't reset slider
                $(`#toDate`).datepicker("show");
            }
        });


        $(`#toDate`).datepicker({
            changeYear: true,
            changeMonth: true,
            yearRange: minDate.getFullYear() + ':' + maxDate.getFullYear(),
            dateFormat: 'yy-mm-dd',
            defaultDate: maxDate,
            minDate: preferences['userLower'],
            maxDate: maxDate,
            orientation: top,
            onSelect: function () {
                preferences['userUpper'] = new Date($(this).datepicker('getDate').getTime());
                m.redraw();
                // todatestring = datemaxUser.getFullYear() + "" + ('0' + (datemaxUser.getMonth() + 1)).slice(-2) + "" + ('0' + datemaxUser.getDate()).slice(-2);
            }
        });
    }

    view(vnode) {
        let {mode, data, preferences, redraw, setRedraw} = vnode.attrs;
        if (Object.keys(preferences).length === 0) this.oncreate(vnode);

        preferences['measure'] = preferences['measure'] || 'Monthly';

        let setHandleDates = (handles) => {
            preferences['handleLower'] = handles[0];
            preferences['handleUpper'] = handles[1];
        };

        // only draw the graph if there are multiple datapoints
        let drawGraph = data.length > 1;
        let dataProcessed;
        if (redraw && drawGraph) {
            setRedraw(false);
            let allDates = [...data.sort(app.dateSort)];

            preferences['userLower'] = preferences['userLower'] || data[0]['Date'];
            preferences['userUpper'] = preferences['userUpper'] || data[data.length - 1]['Date'];

            preferences['handleLower'] = preferences['handleLower'] || data[0]['Date'];
            preferences['handleUpper'] = preferences['handleUpper'] || data[data.length - 1]['Date'];

            preferences['minDate'] = data[0]['Date'];
            preferences['maxDate'] = data[data.length - 1]['Date'];

            // make sure the handles are valid when switching datasets
            if (preferences['userLower'] < preferences['minDate']) {
                preferences['userLower'] = new Date(preferences['minDate']);
                preferences['handleLower'] = preferences['userLower']
            }
            if (preferences['userLower'] > preferences['maxDate']) {
                preferences['userLower'] = new Date(preferences['minDate']);
                preferences['handleLower'] = preferences['userLower']
            }
            if (preferences['userUpper'] > preferences['maxDate']) {
                preferences['userUpper'] = new Date(preferences['maxDate']);
                preferences['handleUpper'] = preferences['userUpper']
            }
            if (preferences['userUpper'] < preferences['minDate']) {
                preferences['userUpper'] = new Date(preferences['maxDate']);
                preferences['handleUpper'] = preferences['userUpper']
            }

            // Filter highlighted data by date picked
            let selectedDates = data.filter(function (row) {
                return row.Date >= preferences['userLower'] && row.Date <= preferences['userUpper'];
            });

            if (preferences['userLower'] !== data[0]['Date']) {
                let interpolatedMin = {
                    "Date": preferences['userLower'],
                    "Freq": interpolate(allDates, preferences['userLower'])
                };

                selectedDates.unshift(interpolatedMin);
                allDates.push(interpolatedMin);
            }

            if (preferences['userUpper'] !== data[data.length - 1]['Date']) {
                let interpolatedMax = {
                    "Date": preferences['userUpper'],
                    "Freq": interpolate(allDates, preferences['userUpper'])
                };
                selectedDates.push(interpolatedMax);
                allDates.push(interpolatedMax);
            }

            allDates = allDates.sort(app.dateSort);

            dataProcessed = {
                "#ADADAD": allDates,
                "steelblue": selectedDates
            }
        }

        let rightMenu = [
            mode === 'subset' && m("[id='dateOptions']",
                m(".form-group[id='dateInterval']",
                    [
                        // Set date from slider
                        m("button.btn.btn-default[type='button']", {
                            id: 'setDatefromSlider',
                            style: {
                                "margin-top": "10px",
                                "text-align": "center"
                            },
                            onclick: function () {
                                preferences['userLower'] = preferences['handleLower'];
                                preferences['userUpper'] = preferences['handleUpper'];

                                // hard redraw plots
                                setRedraw(true);
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
                        m(`input#fromDate.form-control[type='text']`, {
                            onblur: function () {
                                setRedraw(true);
                            },
                            value: d3.timeFormat("%Y-%m-%d")(preferences['userLower'])
                        }),

                        // To date
                        m("label[for='todate'][id='dateToLab']", {
                            style: {
                                "text-align": "left",
                                "width": "100%",
                                "margin-top": "10px"
                            }
                        }, "To:"),
                        m(`input#toDate.form-control[type='text']`, {
                            onblur: () => setRedraw(true),
                            value: d3.timeFormat("%Y-%m-%d")(preferences['userUpper'])
                        })
                    ]
                )
            ),
            mode === 'aggregate' && m('#dateAggreg', m(ButtonRadio, {
                id: 'dateAggregOption',
                attrsAll: {style: {width: '80px'}},
                vertical: true,
                onclick: (aggregation) => preferences['measure'] = aggregation,
                activeSection: preferences['measure'],
                sections: [
                    {value: 'Weekly'},
                    {value: 'Monthly'},
                    {value: 'Quarterly'},
                    {value: 'Yearly'},
                ]
            }))
        ];

        return (m("#canvasDate", {style: {'height': '100%', 'width': '100%', 'padding-top': panelMargin}},
            [
                m("[id='dateSVGdiv']", {
                        style: {
                            "height": "550px",
                            "width": "500px",
                            "display": "inline-block"
                        }
                    },
                    drawGraph && m(PlotDate, {
                        id: 'dateSVG',
                        data: dataProcessed,
                        handles: [preferences['handleLower'], preferences['handleUpper']],
                        callbackHandles: setHandleDates,
                        dataProcessed,
                        labelY: 'Monthly Frequency'
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
