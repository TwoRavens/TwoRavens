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

export default class AddSubset {
    oninit(vnode) {
        let {preferences} = vnode.attrs;

        setDefault(subset.genericMetadata, app.selectedProblem, {subsets: {}});

        setDefault(preferences, 'columns', new Set());
        setDefault(preferences, 'subsetType', transform.subsetTypes[0]);
        setDefault(preferences, 'structure', 'Point');
        setDefault(preferences, 'subsetName', '');
        setDefault(preferences, 'pendingColumn', '')
    }

    view(vnode) {
        let {preferences, nodes} = vnode.attrs;

        let requiredColumns = 1;
        if (preferences['subsetType'] === 'Date' && preferences['structure'] === 'Interval') requiredColumns = 2;

        let isSubset = preferences['subsetName'].length // has a name
            && !(preferences.subsetName in subset.genericMetadata[app.selectedProblem]['subsets']) // name is not reused
            && preferences['columns'].size === requiredColumns; // has correct number of columns

        return [
            m('[style=width:120px;display:inline-block;]', 'Subset Name'),
            m(TextField, {
                id: 'textFieldSubsetName',
                value: preferences.subsetName,
                oninput: (value) => preferences.subsetName = value,
                onblur: (value) => preferences.subsetName = value,
                class: !preferences.subsetName.length && ['is-invalid'],
                style: {width: 'auto', display: 'inline-block'}
            }), preferences.subsetName in subset.genericMetadata[app.selectedProblem]['subsets'] && warn('cannot use the same name'), m('br'),

            m('[style=width:120px;display:inline-block;]', 'Subset Type'),
            m(ButtonRadio, {
                id: 'subsetType',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.subsetType = section,
                activeSection: preferences.subsetType,
                sections: transform.subsetTypes.map(type => ({value: type})),
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
            }), m('br'),

            preferences.subsetType === 'Date' && [
                m('[style=width:120px;display:inline-block;]', 'Date Structure'),
                m(ButtonRadio, {
                id: 'subsetType',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.structure = section,
                activeSection: preferences.structure,
                sections: [
                    {value: 'Point', title: 'the record has a single timestamp'},
                    {value: 'Interval', title: 'the record spans a time interval, using lower and upper columns'}
                ],
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}}
            }), m('br')],

            m('[style=width:120px;display:inline-block;]', m(Button, {
                    placeholder: 'column to use in transform',
                    disabled: !preferences.pendingColumn,
                    title: 'include this column in the transform',
                    style: {display: 'inline-block'},
                    onclick: () => {
                        preferences.columns.add(preferences.pendingColumn);
                        preferences.pendingColumn = '';
                    }
                },
                'Add Column')),
            m(TextFieldSuggestion, {
                id: 'columnSuggestionTextField',
                suggestions: (nodes || []).map(node => node.name),
                enforce: true,
                value: preferences.pendingColumn,
                oninput: (value) => preferences.pendingColumn = value,
                onblur: (value) => preferences.pendingColumn = value,
                attrsAll: {
                    class: preferences.columns.size === 0 && ['is-invalid'],
                    style: {display: 'inline-block', width: 'auto', margin: '0.5em 0'}
                }
            }), preferences['columns'].size !== requiredColumns && warn(preferences['columns'].size + ' of ' + requiredColumns + ' required columns'), m('br'),
            m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Selected Columns'),
            m(ListTags, {
                tags: [...preferences.columns],
                ondelete: (column) => preferences.columns.delete(column),
            }), m('br'),

            m(Button, {
                id: 'createSubset',
                disabled: !isSubset,
                onclick: () => {
                    if (!isSubset) return;

                    let metadata = {
                        type: {
                            Nominal: 'categorical',
                            Continuous: 'continuous',
                            Date: 'date',
                            Coordinates: 'coordinates'
                        }[preferences.subsetType],
                        columns: [...preferences.columns]
                    };
                    if (preferences['subsetType'] === 'Date') metadata['structure'] = preferences['structure'];

                    subset.genericMetadata[app.selectedProblem]['subsets'][preferences.subsetName] = metadata;

                    transform.setShowModalSubset(false);
                    Object.keys(preferences).map(key => delete preferences[key]);
                }
            }, 'Add Subset')
        ]
    }
}