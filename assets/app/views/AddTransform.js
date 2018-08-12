import m from 'mithril';

import ButtonRadio from '../../common/app/views/ButtonRadio';
import TextFieldSuggestion from "../../common/app/views/TextFieldSuggestion";
import ListTags from "../../common/app/views/ListTags";
import Button from '../../common/app/views/Button';

import * as subset from '../../EventData/app/app';
import * as transform from '../transform';
import * as app from '../app';

let setDefault = (obj, id, value) => obj[id] = obj[id] || value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);


export default class AddTransform {
    oninit({attrs}) {
        let {preferences} = attrs;

        setDefault(preferences, 'columns', new Set());
        setDefault(preferences, 'constraintType', transform.constraintTypes[0]);
        setDefault(preferences, 'structure', 'Point');
        setDefault(preferences, 'pendingColumn', '');
    }

    view(vnode) {
        let {nodes, preferences} = vnode.attrs;
        let {name, step} = transform.pendingConstraintMenu;

        let requiredColumns = 1;
        if (preferences.constraintType === 'Date' && preferences.structure === 'Interval') requiredColumns = 2;

        let isValid = preferences.columns.size === requiredColumns;

        let menu = [
            m('h4', 'Add ' + name + ' Constraint for Step ' + subset.transformPipeline.indexOf(step)),
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

        menu.push([
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
                suggestions: (nodes || []).map(node => node.name),
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

            m(Button, {
                id: 'createConstraint',
                disabled: !isValid,
                onclick: () => {
                    if (!isValid) return;

                    let metadata = {
                        type: {
                            Nominal: 'categorical',
                            Continuous: 'continuous',
                            Date: 'date',
                            Coordinates: 'coordinates'
                        }[preferences.constraintType],
                        columns: [...preferences.columns]
                    };
                    if (preferences.constraintType === 'Date') metadata['structure'] = preferences.structure;

                    setDefault(subset.genericMetadata, app.selectedProblem, {subsets: {}});
                    let subsetName = 'subset ' + Object.keys(subset.genericMetadata[app.selectedProblem]['subsets']).length;

                    subset.genericMetadata[app.selectedProblem]['subsets'][subsetName] = metadata;

                    transform.setConstraintMenu(transform.pendingConstraintMenu);
                    transform.setPendingConstraintMenu(undefined);
                    Object.keys(preferences).forEach(key => delete preferences[key]);
                }
            }, 'Add Constraint')
        ]);

        return menu;
    }
}