import m from 'mithril';

import ButtonRadio from '../../common/app/views/ButtonRadio';
import TextFieldSuggestion from "../../common/app/views/TextFieldSuggestion";
import TextField from "../../common/app/views/TextField";
import ListTags from "../../common/app/views/ListTags";
import Button from '../../common/app/views/Button';
import PanelList from '../../common/app/views/PanelList';

import {italicize} from '../index';

import * as subset from '../../EventData/app/app';
import * as query from '../../EventData/app/queryMongo';
import * as transform from '../transform';
import * as common from '../../common/app/common';

let setDefault = (obj, id, value) => obj[id] = obj[id] || value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);


export default class AddTransform {
    oninit({attrs}) {
        let {preferences} = attrs;
        let {name} = transform.pendingConstraintMenu;

        if (name === 'Transform') {
            setDefault(preferences, 'transformName', '');
            setDefault(preferences, 'transformEquation', '');
            setDefault(preferences, 'usedTerms', {
                variables: new Set(),
                unaryFunctions: new Set(),
                binaryFunctions: new Set(),
                variadicFunctions: new Set(),
                unaryOperators: new Set(),
                binaryOperators: new Set()
            })
        }

        else {
            setDefault(preferences, 'constraintType', transform.constraintTypes[0]);
            setDefault(preferences, 'columns', new Set());
            setDefault(preferences, 'pendingColumn', '');

            // specific to certain constraints
            setDefault(preferences, 'tabs', {
                source: {full: '', pendingFilter: '', filters: new Set()},
                target: {full: '', pendingFilter: '', filters: new Set()}
            });
            setDefault(preferences, 'structure', 'Point');
        }
    }

    view(vnode) {
        let {nodes, preferences} = vnode.attrs;
        let {name, step} = transform.pendingConstraintMenu;

        let requiredColumns = 1;
        if (preferences.constraintType === 'Date' && preferences.structure === 'Interval') requiredColumns = 2;
        if (preferences.constraintType === 'Coordinates') requiredColumns = 2;

        let vars = new Set((nodes || []).map(node => node.name));
        // simulate the pipeline until the n-1th step to determine available variables
        let propagatedVariables = query.buildPipeline(subset.transformPipeline.slice(0, -1), vars)['variables'];

        if (name === 'Transform') {

            let style = {
                width: '14.666%',
                display: 'inline-block',
                'vertical-align': 'top',
                margin: '1%',
                padding: '1em',
                background: 'rgba(0,0,0,0.05)',
                'box-shadow': '0px 5px 5px rgba(0,0,0,.1)'
            };

            let transformQuery;
            let transformError;

            try {
                let response = query.buildTransform(preferences.transformEquation, vars);
                transformQuery = JSON.stringify(response.query, null, 2);
                preferences.usedTerms = response.usedTerms;
            }
            catch (err) {
                transformError = String(err)
            }

            return [
                m('h4', 'Add ' + name + ' for Step ' + subset.transformPipeline.indexOf(step)),
                m(TextField, {
                    id: 'textFieldName',
                    placeholder: 'Transformation Name',
                    value: preferences.transformName,
                    class: (!preferences.transformName || preferences.transformName.match(/[ -]/)) && ['is-invalid'],
                    oninput: (value) => preferences.transformName = value,
                    onblur: (value) => preferences.transformName = value,
                    style: {width: '165px', display: 'inline-block'}
                }), ' = ',
                m(TextField, {
                    id: 'textFieldEquation',
                    placeholder: '1 + ' + nodes[0].name,
                    class: !preferences.transformEquation && ['is-invalid'],
                    oninput: (value) => preferences.transformEquation = value,
                    onblur: (value) => preferences.transformEquation = value,
                    style: {display: 'inline-block', width: 'calc(100% - 190px)'}
                }), m('br'),

                preferences.transformName.match(/[ -]/) && warn('spaces and dashes are not permitted in the variable name'),

                preferences.transformEquation && m('div', {style: {width: '100%'}},
                    transformQuery || warn(transformError)), m('br'),

                m(Button, {
                    id: 'btnAddTransform',
                    disabled: !preferences.transformName || preferences.transformName.match(/[ -]/) || !transformQuery,
                    onclick: () => {
                        step.transforms.push({
                            name: preferences.transformName,
                            equation: preferences.transformEquation
                        });
                        transform.setPendingConstraintMenu(undefined);
                        Object.keys(transform.modalPreferences).forEach(key => delete transform.modalPreferences[key]);
                    }
                }, 'Add Transform'), m('br'),

                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Variables'),
                    m(PanelList, {
                        id: 'varList',
                        items: [...propagatedVariables],
                        colors: {[common.selVarColor]: [...preferences.usedTerms.variables]}
                    })
                ),
                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Unary Functions'),
                    m(PanelList, {
                        id: 'unaryFunctionsList',
                        items: [...query.unaryFunctions],
                        colors: {[common.selVarColor]: [...preferences.usedTerms.unaryFunctions]}
                    })),
                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Binary Functions'),
                    m(PanelList, {
                        id: 'binaryFunctionsList',
                        items: [...query.binaryFunctions],
                        colors: {[common.selVarColor]: [...preferences.usedTerms.binaryFunctions]}
                    })),
                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Variadic Functions'),
                    m(PanelList, {
                        id: 'variadicFunctionsList',
                        items: [...query.variadicFunctions],
                        colors: {[common.selVarColor]: [...preferences.usedTerms.variadicFunctions]}
                    })),
                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Unary Operators'),
                    m(PanelList, {
                        id: 'unaryOperatorsList',
                        items: Object.keys(query.unaryOperators).map(key => key + ' ' + query.unaryOperators[key]),
                        colors: {
                            [common.selVarColor]: [...preferences.usedTerms.unaryOperators].map(key => key + ' ' + query.unaryOperators[key])
                        }
                    })),
                m('div', {style},
                    m('h4', {'margin-top': 0}, 'Binary Operators'),
                    m(PanelList, {
                        id: 'binaryOperatorsList',
                        items: Object.keys(query.binaryOperators).map(key => key + ' ' + query.binaryOperators[key]),
                        colors: {
                            [common.selVarColor]: [...preferences.usedTerms.binaryOperators].map(key => key + ' ' + query.binaryOperators[key])
                        }
                    }))
            ]
        }


        let isValid = true;

        if (['Monad', 'Dyad'].indexOf(preferences.constraintType) === -1 && preferences.columns.size !== requiredColumns)
            isValid = false;
        if (preferences.constraintType === 'Monad' && !preferences.tabs.source.full.length)
            isValid = false;
        if (preferences.constraintType === 'Dyad' && Object.values(preferences.tabs).some(tab => !tab.full.length))
            isValid = false;

        let menu = [
            m('h4', 'Add ' + name + ' for Step ' + subset.transformPipeline.indexOf(step)),
            m('[style=width:120px;display:inline-block;]', 'Constraint Type'),
            m(ButtonRadio, {
                id: 'variableType',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.constraintType = section,
                activeSection: preferences.constraintType,
                sections: transform.constraintTypes.map(type => ({value: type})),
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
            }), m('br')
        ];

        if (preferences.constraintType === 'Date') menu.push([
            m('[style=width:120px;display:inline-block;]', 'Date Structure'),
            m(ButtonRadio, {
                id: 'dateStructure',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.structure = section,
                activeSection: preferences.structure,
                sections: [
                    {value: 'Point', title: 'each record has a single timestamp'},
                    {value: 'Interval', title: 'each record spans a time interval, using lower and upper columns'}
                ],
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
            }), m('br')]);

        let tabMenu = (tab, name) => {
            return m('div[style=margin:1em;padding:1em;background:rgba(0,0,0,0.05);box-shadow: 0px 5px 5px rgba(0,0,0,.1)]',
                name && [m('h4[style=margin-bottom:0]', name), m('br')],
                m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Primary Column'),
                m(TextFieldSuggestion, {
                    id: 'fullSuggestionTextField',
                    suggestions: [...propagatedVariables],
                    enforce: true,
                    value: tab.full,
                    oninput: (value) => tab.full = value,
                    onblur: (value) => tab.full = value,
                    attrsAll: {
                        class: !tab.full.length && ['is-invalid'],
                        style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                    }
                }), m('br'),

                m('[style=width:120px;display:inline-block;]', m(Button, {
                        disabled: !tab.pendingFilter,
                        title: 'filter with this column',
                        style: {display: 'inline-block'},
                        onclick: () => {
                            tab.filters.add(tab.pendingFilter);
                            tab.pendingFilter = '';
                        }
                    },
                    'Add Filter')),
                m(TextFieldSuggestion, {
                    id: 'filterSuggestionTextField',
                    suggestions: [...propagatedVariables],
                    enforce: true,
                    value: tab.pendingFilter,
                    oninput: (value) => tab.pendingFilter = value,
                    onblur: (value) => tab.pendingFilter = value,
                    attrsAll: {
                        style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                    }
                }),
                italicize(' any number of filters'), m('br'),
                m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Selected Filters'),
                m(ListTags, {
                    tags: [...tab.filters],
                    ondelete: (column) => tab.filters.delete(column),
                }), m('br')
            )
        };

        if (preferences.constraintType === 'Monad')
            menu.push(tabMenu(preferences.tabs.source));

        if (preferences.constraintType === 'Dyad')
            menu.push(Object.keys(preferences.tabs).map(tab => tabMenu(preferences.tabs[tab], tab)));

        if (['Monad', 'Dyad'].indexOf(preferences.constraintType) === -1) menu.push([
            m('[style=width:120px;display:inline-block;]', m(Button, {
                    disabled: !preferences.pendingColumn,
                    title: 'constrain with this column',
                    style: {display: 'inline-block'},
                    onclick: () => {
                        preferences.columns.add(preferences.pendingColumn);
                        preferences.pendingColumn = '';
                    }
                },
                'Add Column')),
            m(TextFieldSuggestion, {
                id: 'columnSuggestionTextField',
                suggestions: [...propagatedVariables],
                enforce: true,
                value: preferences.pendingColumn,
                oninput: (value) => preferences.pendingColumn = value,
                onblur: (value) => preferences.pendingColumn = value,
                attrsAll: {
                    class: preferences.columns.size === 0 && ['is-invalid'],
                    style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                }
            }),
            preferences.columns.size !== requiredColumns && warn(`${preferences.columns.size} of ${requiredColumns} required columns`), m('br'),
            m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Selected Columns'),
            m(ListTags, {
                tags: [...preferences.columns],
                ondelete: (column) => preferences.columns.delete(column),
            }), m('br'),
        ]);

        menu.push(
            m(Button, {
                id: 'createConstraint',
                disabled: !isValid,
                onclick: () => {
                    if (!isValid) return;

                    if (name === 'Aggregate Unit Measure') preferences.measureType = 'unit';
                    if (name === 'Aggregate Accumulator') preferences.measureType = 'accumulator';

                    // build metadata structure that the eventdata canvases can read
                    let metadata = {
                        type: {
                            Nominal: 'categorical',
                            Continuous: 'continuous',
                            Date: 'date',
                            Coordinates: 'coordinates',
                            Monad: 'monad',
                            Dyad: 'dyad',
                        }[preferences.constraintType],
                    };
                    if (preferences.constraintType === 'Date') metadata['structure'] = preferences.structure;

                    // handle column listings
                    if (['Monad', 'Dyad'].indexOf(preferences.constraintType) === -1)
                        metadata['columns'] = [...preferences.columns];

                    if (preferences.constraintType === 'Monad') metadata['tabs'] = {
                        monad: {
                            full: preferences.tabs.source.full,
                            filters: [...preferences.tabs.source.filters]
                        }
                    };

                    if (preferences.constraintType === 'Dyad') metadata['tabs'] = Object.keys(preferences.tabs).reduce((out, tab) => {
                        out[tab] = {
                            full: preferences.tabs[tab].full,
                            filters: [...preferences.tabs[tab].filters]
                        };
                        return out;
                    }, {});

                    console.log(metadata);
                    transform.setConstraintMetadata(metadata);
                    transform.setConstraintMenu(transform.pendingConstraintMenu);
                    transform.setPendingConstraintMenu(undefined);
                    Object.keys(preferences).forEach(key => delete preferences[key]);
                }
            }, 'Add Constraint')
        );

        return menu;
    }
}