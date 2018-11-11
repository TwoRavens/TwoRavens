import m from 'mithril';

import TextField from '../../../common/app/views/TextField';
import ButtonRadio from '../../../common/app/views/ButtonRadio';
import * as common from '../../../common/app/common';

import * as queryMongo from '../queryMongo';

export default class CanvasExpansion {
    oninit({attrs}) {
        let {preferences} = attrs;
        // the transform step is overloaded, it also contains expansions. This is used to tell them apart
        preferences.type = 'expansion';
        preferences.isValid = true;

        if (preferences.degreeInteraction === undefined) preferences.degreeInteraction = 1;

        preferences.variablePreferences = preferences.variablePreferences || {};

        preferences.variables = preferences.variables || new Set();
        preferences.select = variable => {
            if (preferences.variables.has(variable)) preferences.variables.delete(variable);
            else {
                preferences.variables.add(variable);
                preferences.variablePreferences[variable] = preferences.variablePreferences[variable] || {
                    type: 'None',
                    powers: '1 2 3'
                }
            }
        }
    }

    variableMenu(variable, varPreferences) {
        varPreferences.powers = varPreferences.powers || '1 2 3';

        return m(`div#variable${variable}`, {
                style: {
                    background: common.menuColor,
                    border: common.borderColor,
                    margin: '1em',
                    padding: '1em',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)'
                }
            },
            m('h4', variable),
            m(ButtonRadio, {
                id: 'expansionTypeButtonBar' + variable,
                onclick: type => varPreferences.type = type,
                activeSection: varPreferences.type,
                sections: ['None', 'Polynomial', 'Dummy'].map(type => ({value: type}))
            }),
            varPreferences.type === 'Polynomial' && [
                m('label#powerLabel[style=width:4em]', 'Powers'),
                m(TextField, {
                    id: 'textFieldPowers',
                    style: {width: 'calc(100% - 4em)', display: 'inline-block'},
                    value: varPreferences.powers,
                    oninput: value => varPreferences.powers = value.replace(/[^ \d.-]/, '')
                })
            ],
            // varPreferences.type === 'Dummy' && [
            //     m('label#codingLabel', 'Coding Method'),
            //     m(ButtonRadio, {
            //         id: 'codingTypeButtonBar' + variable,
            //         onclick: type => varPreferences.coding = type,
            //         activeSection: varPreferences.coding,
            //         sections: ['Dummy', 'Contrast', 'Effects'].map(type => ({value: type}))
            //     })
            // ]
        )
    }

    view({attrs}) {
        let {preferences} = attrs;

        return m("#canvasExpansion", {style: {'height': '100%', 'width': '100%', 'padding-top': common.panelMargin}},
            m('div#termPreview', {
                    style: {
                        background: common.menuColor,
                        border: common.borderColor,
                        margin: '1em',
                        padding: '1em',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)'
                    }
                },
                m('h4', 'Term Preview'),
                m.trust(queryMongo.expansionTerms(preferences).map((term, i) => `β${String(i).sub()}*${term.replace(/\^[\d.-]+/, snip => snip.substr(1).sup())}`).join(' + '))
            ),
            m('br'),
            m('label#labelDegreeInteraction[style=width:10em;display:inline-block]', 'Interaction Degree'),

            m(TextField, {
                id: 'textFieldDegreeInteraction',
                class: preferences.degreeInteractionError && ['is-invalid'],
                style: {display: 'inline-block', width: 'calc(100% - 10em)', 'margin-bottom': '4em'},
                title: 'highest degree of interaction term to keep',
                oninput: degree => {
                    if (degree.length === 0) {
                        preferences.degreeInteraction = '';
                        preferences.degreeInteractionError = true;
                    }
                    if (parseInt(degree.replace(/\D/g, '')) > 0) {
                        preferences.degreeInteraction = parseInt(degree.replace(/\D/g, ''));
                        preferences.degreeInteractionError = false;
                    }
                },
                value: preferences.degreeInteraction
            }),
            [...preferences.variables].map(variable => this.variableMenu(variable, preferences.variablePreferences[variable]))
        );
    }
}