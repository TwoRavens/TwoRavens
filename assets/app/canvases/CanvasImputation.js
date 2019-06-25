import m from 'mithril';
import * as common from "../../common/common";
import {getData} from "../manipulations/manipulate";
import TextField from "../../common/views/TextField";
import ButtonRadio from "../../common/views/ButtonRadio";
import Dropdown from "../../common/views/Dropdown";
import Table from "../../common/views/Table";


let setDefault = (obj, id, value) => obj[id] = id in obj ? obj[id] : value;

let labelOffset = '15em';

export default class CanvasImputation {
    oninit({attrs}) {
        let {preferences, pipeline, metadata} = attrs;

        this.data = [];
        this.limit = 100;
        this.offset = 0;

        setDefault(preferences, 'selectedVariables', new Set());
        setDefault(preferences, 'variableSummary', metadata.variables);

        setDefault(preferences, 'nullValue', '');
        setDefault(preferences, 'nullValueType', 'character');

        setDefault(preferences, 'imputationMode', 'Replace');
        setDefault(preferences, 'replacementMode', 'Nullify');

        setDefault(preferences, 'customValue', '');
        setDefault(preferences, 'customValueType', 'character');

        setDefault(preferences, 'statisticMode', 'Mean');

        preferences.select = async variable => {
            this.data = [];
            this.offset = 0;

            preferences.selectedVariables.has(variable)
                ? preferences.selectedVariables.delete(variable)
                : preferences.selectedVariables.add(variable);

            this.loadData(preferences.selectedVariables, pipeline);
        };

        preferences.selectAll = async state => {
            this.data = [];
            this.offset = 0;

            if (!state) {
                preferences.selectedVariables = new Set();
                return;
            }

            preferences.selectedVariables = new Set(Object.keys(metadata.variables));
            this.loadData(preferences.selectedVariables, pipeline)
        };

        preferences.getReplacementValue = prefs => {
            if (prefs.replacementMode === 'Nullify') {
                return [...prefs.selectedVariables].reduce((out, variable) => {
                    out[variable] = null;
                    return out;
                }, {})
            }
            if (prefs.replacementMode === 'Custom') {
                let replacementValue = prefs.customValueType === 'numeric'
                    ? parseFloat(prefs.customValue)
                    : IS_D3M_DOMAIN
                        ? 'missing_value'
                        : prefs.customValue;

                return [...prefs.selectedVariables].reduce((out, variable) => {
                    out[variable] = replacementValue;
                    return out;
                }, {})
            }
            if (prefs.replacementMode === 'Statistic') {
                return [...prefs.selectedVariables].reduce((out, variable) => {
                    out[variable] = prefs.variableSummary[variable][{
                        'Mean': 'mean', 'Minimum': 'min', 'Maximum': 'max', 'Median': 'median', 'Most Frequent': 'mode'
                    }[prefs.statisticMode]];
                    return out;
                }, {})
            }
        }
    }

    async loadData(variables, pipeline) {
        if (this.loadPending) return;
        this.loadPending = true;

        this.data = this.data.concat(await getData({
            method: 'aggregate',
            query: JSON.stringify(pipeline.concat([
                {$skip: this.offset},
                {$limit: this.limit},
                {
                    $project: [...variables].reduce((out, variable) => {
                        out[variable] = 1;
                        return out;
                    }, {_id: 0})
                }
            ]))
        }));

        this.offset += this.limit;
        this.loadPending = false;
        m.redraw();
    }

    view({attrs}) {
        let {preferences, pipeline} = attrs;

        let nullValue = preferences.nullValueType === 'numeric'
            ? parseFloat(preferences.nullValue) : preferences.nullValue;

        let replacementValue = preferences.imputationMode === 'Replace' && preferences.getReplacementValue(preferences);

        return m('div#canvasTransform', {
                style: {
                    height: '100%', width: '100%', 'padding-top': common.panelMargin,
                    display: 'flex',
                    'flex-direction': 'column'
                }
            },

            m('div',
                m(`label#nullValueLabel[style=width:${labelOffset}]`, 'Missing value:'),
                m(TextField, {
                    id: 'nullValueTextField',
                    oninput: value => preferences.nullValue = value,
                    style: {width: `calc(100% - ${labelOffset})`, display: 'inline-block'}
                })),

            m('div',
                m(`label#nullValueTypeLabel[style=width:${labelOffset}]`, 'Missing value type:'),
                m('[style=display:inline-block]', m(Dropdown, {
                    id: 'nullValueType',
                    items: ['character', 'numeric'],
                    activeItem: preferences.nullValueType,
                    onclickChild: value => preferences.nullValueType = value
                }))),

            // D3M sklearn imputer doesn't support listwise deletion
            !IS_D3M_DOMAIN && m('div',
                m(`label#imputationModeLabel[style=width:${labelOffset}]`, 'Action to take:'),
                m(ButtonRadio, {
                    id: 'imputationModeButtonBar',
                    onclick: mode => preferences.imputationMode = mode,
                    activeSection: preferences.imputationMode,
                    sections: [
                        {value: 'Replace', title: 'replace missing values'},
                        {value: 'Delete', title: 'listwise deletion of any rows containing missing values'}
                    ],
                    attrsAll: {style: {'margin-top': '1em', width: 'auto', display: 'inline-block'}},
                })),

            preferences.imputationMode === 'Replace' && [
                m('div',
                    m(`label#imputationModeLabel[style=width:${labelOffset}]`, 'Replace with:'),
                    m(ButtonRadio, {
                        id: 'replacementModeButtonBar',
                        onclick: mode => preferences.replacementMode = mode,
                        activeSection: preferences.replacementMode,
                        sections: [
                            {value: 'Nullify', title: 'replace the null value with actual null'},
                            {value: 'Custom', title: 'replace the null value with a custom value'},
                            {value: 'Statistic', title: 'replace the null value with a statistic'}
                        ],
                        attrsAll: {style: {'margin-top': '1em', width: 'auto', display: 'inline-block'}},
                    })),

                preferences.replacementMode === 'Custom' && [
                    // D3M sklearn imputer doesn't support custom string replacements
                    (!IS_D3M_DOMAIN || preferences.customValueType !== 'character') &&  m('div',
                        m(`label#nullValueLabel[style=width:${labelOffset}]`, 'Replacement value:'),
                        m(TextField, {
                            id: 'customValueTextField',
                            oninput: value => preferences.customValue = value,
                            style: {width: `calc(100% - ${labelOffset})`, display: 'inline-block'}
                        })),
                    !IS_D3M_DOMAIN && m('div',
                        m(`label#customValueTypeLabel[style=width:${labelOffset}]`, 'Replacement type:'),
                        m('[style=display:inline-block]', m(Dropdown, {
                            id: 'customValueType',
                            items: ['character', 'numeric'],
                            activeItem: preferences.customValueType,
                            onclickChild: value => preferences.customValueType = value
                        })))
                ],

                preferences.replacementMode === 'Statistic' && [
                    m('div',
                        m(`label#nullValueLabel[style=width:${labelOffset}]`, 'Replacement statistic:'),
                        m(ButtonRadio, {
                            id: 'statisticModeButtonBar',
                            onclick: mode => preferences.statisticMode = mode,
                            activeSection: preferences.statisticMode,
                            sections: IS_D3M_DOMAIN ? [
                                    {value: 'Mean', title: 'replace the null value with the mean of the column'},
                                    {value: 'Median', title: 'replace the null value with the median of the column'},
                                    {value: 'Most Frequent', title: 'replace the null value with the most frequent value of the column'},
                                ] : [
                                    {value: 'Mean', title: 'replace the null value with the mean of the column'},
                                    {value: 'Minimum', title: 'replace the null value with the minimum of the column'},
                                    {value: 'Maximum', title: 'replace the null value with the maximum of the column'}
                                ],
                            attrsAll: {style: {'margin-top': '1em', width: 'auto', display: 'inline-block'}},
                        })),
                ]
            ],

            this.data && m('div#imputationTableContainer', {
                onscroll: () => {
                    // don't apply infinite scrolling when list is empty
                    if (this.data.length === 0) return;

                    let container = document.querySelector('#imputationTableContainer');
                    let scrollHeight = container.scrollHeight - container.scrollTop;
                    if (scrollHeight < container.offsetHeight + 100) this.loadData(preferences.selectedVariables, pipeline);
                },
                style: {
                    flex: 1,
                    overflow: 'auto',
                }
            }, m(Table, {
                id: 'imputationTable',
                data: {
                    'Replace': replaceMissing,
                    'Delete': deleteMissing
                }[preferences.imputationMode](this.data, nullValue, replacementValue),
                attrsAll: {
                    style: {
                        margin: '1em auto', width: 'auto',
                        border: common.borderColor,
                        'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)'
                    }
                }
            }))
        )
    }
}

let replaceMissing = (data, missing, replacement) => data.map(row => Object.keys(row).reduce((out, col) => {
    out[col] = row[col] === missing
        ? m(`[style=background-color:${common.gr2Color};min-width:1em;min-height:1em]`, replacement[col])
        : row[col];
    return out;
}, {}));

let deleteMissing = (data, missing) => data.map(row => Object.values(row).some(val => val === missing)
    ? Object.keys(row).reduce((out, col) => {
        out[col] = m(`[style=text-decoration:line-through;${row[col] === missing ? 'background-color:' +
            common.gr2Color : ''}]`, row[col]);
        return out;
    }, {})
    : row);