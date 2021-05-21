import m from 'mithril';
import * as d3 from "d3";
import $ from 'jquery'

import "jquery-ui/ui/widgets/datepicker"
// Used for rendering date calendar
import '../../../node_modules/jquery-ui/themes/base/datepicker.css'
import '../../../node_modules/jquery-ui-dist/jquery-ui.theme.min.css'

import {panelMargin} from "../../common/common";
import ButtonRadio from '../../common/views/ButtonRadio';
import PlotContinuous from './views/PlotContinuous';
import TextField from '../../common/views/TextField';


export function interpolate(data, date) {
    let allDatesInt = data.map(entry => entry['Label']);
    let lower = allDatesInt[0];
    let upper = allDatesInt[allDatesInt.length - 1];

    for (let candidate in allDatesInt) {
        if (allDatesInt[candidate] > lower && allDatesInt[candidate] < date) lower = allDatesInt[candidate];
        if (allDatesInt[candidate] < upper && allDatesInt[candidate] > date) upper = allDatesInt[candidate];
    }

    let lowerFreq = data[0]['Freq'];
    let upperFreq = data[data.length - 1]['Freq'];

    for (let candidate of data) {
        if (candidate['Label'] === lower) lowerFreq = candidate['Freq'];
        if (candidate['Label'] === upper) upperFreq = candidate['Freq'];
    }

    let interval_lower = date.getTime() - lower.getTime();
    let timespan = upper.getTime() - lower.getTime();

    let weight = interval_lower / timespan;
    return (1 - weight) * lowerFreq + weight * upperFreq;
}

export default class CanvasDate {
    oncreate(vnode) {
        let {data, preferences, setRedraw} = vnode.attrs;

        let minDate = data[0]['Label'];
        let maxDate = data[data.length - 1]['Label'];

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
                setRedraw(true);
                m.redraw();

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
                setRedraw(true);
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
            handles = handles.map(x => new Date(x));

            preferences['handleLower'] = handles[0];
            preferences['handleUpper'] = handles[1];
        };

        // only draw the graph if there are multiple datapoints
        let drawGraph = data.length > 1;
        let dataProcessed;
        if (redraw && drawGraph) {
            setRedraw(false);
            let allDates = [...data.sort(comparableSort)];

            preferences['userLower'] = preferences['userLower'] || data[0]['Label'];
            preferences['userUpper'] = preferences['userUpper'] || data[data.length - 1]['Label'];

            preferences['handleLower'] = preferences['handleLower'] || data[0]['Label'];
            preferences['handleUpper'] = preferences['handleUpper'] || data[data.length - 1]['Label'];

            preferences['minDate'] = data[0]['Label'];
            preferences['maxDate'] = data[data.length - 1]['Label'];

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
                return row.Label >= preferences['userLower'] && row.Label <= preferences['userUpper'];
            });

            if (preferences['userLower'] !== data[0]['Label']) {
                let interpolatedMin = {
                    Label: preferences['userLower'],
                    Freq: interpolate(allDates, preferences['userLower'])
                };

                selectedDates.unshift(interpolatedMin);
                allDates.push(interpolatedMin);
            }

            if (preferences['userUpper'] !== data[data.length - 1]['Label']) {
                let interpolatedMax = {
                    Label: preferences['userUpper'],
                    Freq: interpolate(allDates, preferences['userUpper'])
                };
                selectedDates.push(interpolatedMax);
                allDates.push(interpolatedMax);
            }

            allDates = allDates.sort(comparableSort);

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
                        m(TextField, {
                            id: 'fromDate',
                            type: 'text',
                            class: 'form-control',
                            onblur: value => {
                                setRedraw(true);
                                let parts = value.split(/[- ]/);
                                preferences['userLower'] = new Date(parts[0], parts[1] - 1, parts[2]);
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
                        m(TextField, {
                            id: 'toDate',
                            type: 'text',
                            class: 'form-control',
                            onblur: value => {
                                setRedraw(true);
                                let parts = value.split(/[- ]/);
                                preferences['userUpper'] = new Date(parts[0], parts[1] - 1, parts[2]);
                            },
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
                    !IS_EVENTDATA_DOMAIN && {value: 'Weekly'},
                    {value: 'Monthly'},
                    !IS_EVENTDATA_DOMAIN && {value: 'Quarterly'},
                    {value: 'Yearly'},
                ].filter(_=>_)
            }))
        ];

        return m("#canvasDate", {style: {'height': '100%', 'width': '100%', 'padding-top': panelMargin}},

            m("[id='dateSVGdiv']", {
                    style: {
                        "height": "550px",
                        "width": "500px",
                        "display": "inline-block"
                    }
                },
                drawGraph && m(PlotContinuous, {
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
        );
    }
}


export function comparableSort(a, b) {
    if (a['Label'] === b['Label']) return 0;
    return (a['Label'] < b['Label']) ? -1 : 1;
}
