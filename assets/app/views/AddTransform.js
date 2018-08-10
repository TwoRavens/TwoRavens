import m from 'mithril';

import ButtonRadio from '../../common/app/views/ButtonRadio';
import TextFieldSuggestion from "../../common/app/views/TextFieldSuggestion";
import ListTags from "../../common/app/views/ListTags";
import Button from '../../common/app/views/Button';
import TextField from '../../common/app/views/TextField';

import * as subset from '../../EventData/app/app';
import * as transform from '../transform';
import * as app from '../app';

let setDefault = (obj, id, value) => obj[id] = obj[id] || value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);

export default class AddTransform {
    oninit(vnode) {
        let {preferences} = vnode.attrs;


        setDefault(subset.genericMetadata, app.selectedProblem, {subsets: {}});
        setDefault(preferences, 'name', '');
        setDefault(preferences, 'stepType', 'Transform');
        setDefault(preferences, 'subsets', {});
    }

    view(vnode) {
        let {preferences, nodes} = vnode.attrs;

        let subsetMenu = name => {
            setDefault(preferences['subsets'], name, {
                columns: new Set(),
                subsetType: transform.subsetTypes[0],
                structure: 'Point',
                pending: ''
            });

            let subsetPreferences = preferences['subsets'][name];

            let requiredColumns = 1;
            if (subsetPreferences.subsetType === 'Date' && subsetPreferences.structure === 'Interval') requiredColumns = 2;

            let menu = [
                m('[style=width:120px;display:inline-block;]', 'Subset Type'),
                m(ButtonRadio, {
                    id: 'variableType',
                    attrsAll: {style: {width: 'auto'}},
                    onclick: (section) => subsetPreferences.subsetType = section,
                    activeSection: subsetPreferences.subsetType,
                    sections: transform.subsetTypes.map(type => ({value: type})),
                    attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
                }), m('br')
            ];

            if (subsetPreferences.subsetType === 'Date') menu.push([
                m('[style=width:120px;display:inline-block;]', 'Date Structure'),
                m(ButtonRadio, {
                    id: 'dateStructure',
                    attrsAll: {style: {width: 'auto'}},
                    onclick: (section) => subsetPreferences.structure = section,
                    activeSection: subsetPreferences.structure,
                    sections: [
                        {value: 'Point', title: 'each record has a single timestamp'},
                        {value: 'Interval', title: 'each record spans a time interval, using lower and upper columns'}
                    ],
                    attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
                }), m('br')]);

            menu.push([
                m('[style=width:120px;display:inline-block;]', m(Button, {
                        disabled: !subsetPreferences.pendingColumn,
                        title: 'subset with this column',
                        style: {display: 'inline-block'},
                        onclick: () => {
                            subsetPreferences.columns.add(subsetPreferences.pendingColumn);
                            subsetPreferences.pendingColumn = '';
                        }
                    },
                    'Add Column')),
                m(TextFieldSuggestion, {
                    id: 'columnSuggestionTextField',
                    suggestions: (nodes || []).map(node => node.name),
                    enforce: true,
                    value: subsetPreferences.pendingColumn,
                    oninput: (value) => subsetPreferences.pendingColumn = value,
                    onblur: (value) => subsetPreferences.pendingColumn = value,
                    attrsAll: {
                        class: subsetPreferences.columns.size === 0 && ['is-invalid'],
                        style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                    }
                }),
                subsetPreferences.columns.size !== requiredColumns && warn(`${subsetPreferences.columns.size} of ${requiredColumns} required columns`), m('br'),
                m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Selected Columns'),
                m(ListTags, {
                    tags: [...subsetPreferences.columns],
                    ondelete: (column) => subsetPreferences.columns.delete(column),
                }), m('br'),
            ]);

            return menu;
        };

        let isValidSubset = subsetName => {
            let subsetPreferences = preferences['subsets'][subsetName];
            let requiredColumns = 1;
            if (subsetPreferences.subsetType === 'Date' && subsetPreferences.structure === 'Interval') requiredColumns = 2;

            return preferences.name.length // has a name
                && !(preferences.name in subset.genericMetadata[app.selectedProblem]['subsets']) // name is not reused
                && subsetPreferences.columns.size === requiredColumns; // has correct number of columns
        };

        return [
            m('[style=width:120px;display:inline-block;]', 'Step Name'),
            m(TextField, {
                id: 'textFieldSubsetName',
                value: preferences.name,
                oninput: (value) => preferences.name = value,
                onblur: (value) => preferences.name = value,
                class: !preferences.name.length && ['is-invalid'],
                style: {width: 'auto', display: 'inline-block'}
            }), preferences.name in subset.genericMetadata[app.selectedProblem]['subsets'] && warn('cannot reuse the step name'), m('br'),

            m('[style=width:120px;display:inline-block;]', 'Step Type'),
            m(ButtonRadio, {
                id: 'stepType',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.stepType = section,
                activeSection: preferences.stepType,
                sections: ['Transform', 'Subset', 'Aggregate'].map(type => ({value: type})),
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
            }), m('br'),

            preferences.name && preferences.stepType === 'Transform' && [
                'Build transformation menu'
            ],

            preferences.name && preferences.stepType === 'Subset' && [
                subsetMenu(preferences.name),
                m(Button, {
                    id: 'createSubset',
                    disabled: !isValidSubset(preferences.name),
                    onclick: () => {
                        if (!isValidSubset(preferences.name)) return;

                        let preferencesSubset = preferences['subsets'][preferences.name];

                        let metadata = {
                            type: {
                                Nominal: 'categorical',
                                Continuous: 'continuous',
                                Date: 'date',
                                Coordinates: 'coordinates'
                            }[preferencesSubset.subsetType],
                            columns: [...preferencesSubset.columns]
                        };
                        if (preferencesSubset.subsetType === 'Date') metadata['structure'] = preferencesSubset['structure'];

                        subset.genericMetadata[app.selectedProblem]['subsets'][preferences.name] = metadata;

                        transform.setShowModalTransform(false);
                        Object.keys(preferences).map(key => delete preferences[key]);
                    }
                }, 'Add Subset')
            ],

            preferences.name && preferences.stepType === 'Aggregate' && [

                m('[style=width:200px;display:inline-block;]', m(Button, {
                        disabled: !preferences.pendingColumn,
                        style: {display: 'inline-block'},
                        onclick: () => {
                            preferences.columns.add(preferences.pendingColumn);
                            preferences.pendingColumn = '';
                        }
                    },
                    'Add Grouping Unit')),
                m(TextFieldSuggestion, {
                    id: 'columnSuggestionTextFieldGroup',
                    suggestions: (nodes || []).map(node => node.name),
                    enforce: true,
                    value: preferences.pendingColumn,
                    oninput: (value) => preferences.pendingColumn = value,
                    onblur: (value) => preferences.pendingColumn = value,
                    attrsAll: {
                        class: preferences.columns.size === 0 && ['is-invalid'],
                        style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                    }
                }), preferences['columns'].size === 0 && warn('at least 1 column is required'), m('br'),
                m('[style=width:200px;display:inline-block; margin: 1em 0]', 'Selected Grouping Columns'),
                m(ListTags, {
                    tags: [...preferences.columns],
                    ondelete: (column) => preferences.columns.delete(column),
                }), m('br'),

                m('[style=width:200px;display:inline-block;]', m(Button, {
                        disabled: !preferences.pendingColumnAccum,
                        title: 'accumulate counts from ' + preferences.pendingColumnAccum || ' this column',
                        style: {display: 'inline-block'},
                        onclick: () => {
                            preferences.columnsAccum.add(preferences.pendingColumnAccum);
                            preferences.pendingColumnAccum = '';
                        }
                    },
                    'Add Accumulation Column')),
                m(TextFieldSuggestion, {
                    id: 'columnSuggestionTextFieldAccum',
                    suggestions: (nodes || []).map(node => node.name),
                    enforce: true,
                    value: preferences.pendingColumnAccum,
                    oninput: (value) => preferences.pendingColumnAccum = value,
                    onblur: (value) => preferences.pendingColumnAccum = value,
                    attrsAll: {
                        class: preferences['columnsAccum'].size === 0 && ['is-invalid'],
                        style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                    }
                }), preferences['columnsAccum'].size !== 1 && warn(preferences['columnsAccum'].size + ' of 1 required columns'), m('br'),
                m('[style=width:200px;display:inline-block; margin: 1em 0]', 'Selected Accumulation Columns'),
                m(ListTags, {
                    tags: [...preferences.columnsAccum],
                    ondelete: (column) => preferences.columnsAccum.delete(column),
                })
            ]
        ]
    }
}