import m from 'mithril';

import ButtonRadio from '../../common/app/views/ButtonRadio';
import TextFieldSuggestion from "../../common/app/views/TextFieldSuggestion";
import ListTags from "../../common/app/views/ListTags";
import Button from '../../common/app/views/Button';
import TextField from '../../common/app/views/TextField';

import * as subset from '../../EventData/app/app';
import * as app from '../app';

let setDefault = (obj, id, value) => {
    obj[id] = obj[id] || value
};

export default class AddSubset {
    oninit(vnode) {
        let {preferences} = vnode.attrs;
        setDefault(preferences, 'columns', new Set());
        setDefault(preferences, 'subsetName', '');
        setDefault(preferences, 'pendingColumn', '')
    }

    view(vnode) {
        let {preferences, nodes} = vnode.attrs;

        return [
            m('[style=width:120px;display:inline-block;]', 'Subset Name'),
            m(TextField, {
                id: 'textFieldSubsetName',
                value: preferences.subsetName,
                oninput: (value) => preferences.subsetName = value,
                onblur: (value) => preferences.subsetName = value,
                class: !preferences.subsetName.length && ['is-invalid'],
                style: {width: 'auto', display: 'inline-block'}
            }), m('br'),

            m('[style=width:120px;display:inline-block;]', 'Subset Type'),
            m(ButtonRadio, {
                id: 'subsetType',
                attrsAll: {style: {width: 'auto'}},
                onclick: (section) => preferences.subsetType = section,
                activeSection: preferences.subsetType,
                sections: [
                    {value: 'Nominal'},
                    {value: 'Continuous'},
                    {value: 'Date'},
                    {value: 'Coordinates'}
                ],
                attrsButtons: {style: {width: 'auto', margin: '1em 0'}},
            }), m('br'),

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
            }), m('br'),

            m('[style=width:120px;display:inline-block; margin: 1em 0]', 'Selected Columns'),
            m(ListTags, {
                tags: [...preferences.columns],
                ondelete: (column) => preferences.columns.delete(column),
            }), m('br'),

            m(Button, {
                id: 'createSubset',
                onclick: () => {
                    setDefault(subset.genericMetadata, app.selectedProblem, {});
                    setDefault(subset.genericMetadata[app.selectedProblem], 'subsets', {});
                    subset.genericMetadata[app.selectedProblem]['subsets'][preferences.subsetName] = {
                        type: {
                            Nominal: 'categorical',
                            Continuous: 'continuous',
                            Date: 'date',
                            Coordinates: 'coordinates'
                        }[preferences.subsetType],
                        columns: [...preferences.columns]
                    };

                    setDefault(subset.genericMetadata[app.selectedProblem], 'columns', (nodes || []).map(node => node.name))
                }
            }, 'Add Subset')
        ]
    }
}