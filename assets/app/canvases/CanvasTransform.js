import m from 'mithril';

import * as common from '../../common/common';
import TextField from "../../common/views/TextField";
import PanelList from '../../common/views/PanelList';
import ButtonRadio from "../../common/views/ButtonRadio";

import * as queryMongo from '../manipulations/queryMongo';

let setDefault = (obj, id, value) => obj[id] = obj[id] || value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);

let usedTermDefaults = () => ({
    variables: new Set(),
    unaryFunctions: new Set(),
    binaryFunctions: new Set(),
    variadicFunctions: new Set(),
    unaryOperators: new Set(),
    binaryOperators: new Set()
});


export default class CanvasTransform {
    oninit({attrs}) {
        let {preferences} = attrs;

        setDefault(preferences, 'type', 'Equation');
        setDefault(preferences, 'menus', {
            'Equation': {},
            'Expansion': {},
            'Binning': {},
            'Manual': {}
        });

        // Delegate select function to child menu
        setDefault(preferences, 'select', preferences.menus[preferences.type].select || Function)
    }


    view({attrs}) {
        let {preferences, variables} = attrs;
        console.log(preferences);
        return m('div#canvasTransform', {style: {'height': '100%', 'width': '100%', 'padding-top': common.panelMargin}},
            m(ButtonRadio, {
                id: 'canvasTypeButtonBar',
                sections: [
                    {value: 'Equation', attrsInterface: {title: 'Construct a new variable from an equation'}},
                    {value: 'Expansion', attrsInterface: {title: 'Basis expansions, dummy coding and interaction terms'}},
                    {value: 'Binning', attrsInterface: {title: 'Create a categorical variable by binning a continuous variable'}},
                    {value: 'Manual', attrsInterface: {title: 'Manually create a new variable'}}
                ],
                activeSection: preferences.type,
                onclick: type => preferences.type = type
            }),
            m('div', {
                    style: {
                        margin: '1em',
                        padding: '1em',
                        background: common.menuColor,
                        border: common.borderColor
                    }
                }, m({
                    'Equation': MenuEquation,
                    'Expansion': MenuExpansion,
                    'Binning': MenuBinning,
                    'Manual': MenuManual
                }[preferences.type], {
                    preferences: preferences.menus[preferences.type],
                    variables
                })
            ))
    }
}


class MenuEquation {
    oninit({attrs}) {
        let {preferences} = attrs;

        setDefault(preferences, 'transformName', '');
        setDefault(preferences, 'transformEquation', '');
        setDefault(preferences, 'usedTerms', usedTermDefaults());
        setDefault(preferences, 'isValid', false);
        setDefault(preferences, 'cursorPosition', 0);

        preferences.select = (value, atCursor) => {

            console.log(value);

            if (!atCursor && preferences.transformEquation.indexOf('@*') !== -1)
                preferences.transformEquation = preferences.transformEquation.replace('@*', value + ', @*');
            else if (!atCursor && preferences.transformEquation.indexOf('@') !== -1)
                preferences.transformEquation = preferences.transformEquation.replace('@', value);
            else preferences.transformEquation =
                    preferences.transformEquation.slice(0, preferences.cursorPosition) + value +
                    preferences.transformEquation.slice(preferences.cursorPosition);
            document.getElementById('textFieldEquation').focus();
        }
    }

    view(vnode) {
        let {preferences, variables} = vnode.attrs;

        let style = {
            width: '18%',
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
            let response = queryMongo.buildTransform(preferences.transformEquation, new Set(variables));
            transformQuery = JSON.stringify(response.query);
            preferences.usedTerms = response.usedTerms;
            // make the leftpanel variable list update if in d3m. In d3m the leftpanel reads the preferences to highlight variables
            if (!preferences.isValid) {
                preferences.isValid = true;
                m.redraw();
            }
            preferences.isValid = true;
        }
        catch (err) {
            transformError = String(err);
            preferences.isValid = false;
        }

        if (preferences.transformEquation === '') preferences.usedTerms = usedTermDefaults();

        if (preferences.transformName === '' || preferences.transformName.match(/[ -]/) || preferences.transformEquation === '')
            preferences.isValid = false;

        return [
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
                placeholder: '1 + ' + variables.values().next().value,
                value: preferences.transformEquation,
                class: !preferences.transformEquation && ['is-invalid'],
                oninput: value => {
                    preferences.transformEquation = value;
                    preferences.cursorPosition = document.getElementById('textFieldEquation').selectionStart;
                },
                onblur: value => {
                    preferences.transformEquation = value;
                    preferences.cursorPosition = document.getElementById('textFieldEquation').selectionStart;
                },
                style: {display: 'inline-block', width: 'calc(100% - 190px)'}
            }), m('br'),

            preferences.transformName.match(/[ -]/) && warn('spaces and dashes are not permitted in the variable name'),

            preferences.transformEquation && [
                transformQuery && m('div#transformQuery', {style: {width: '100%'}}, transformQuery),
                !transformQuery && m('div#transformError', {style: {width: '100%'}}, warn(transformError))
            ], m('br'),

            m('div', {style},
                m('h4', {'margin-top': 0}, 'Unary Functions'),
                m(PanelList, {
                    id: 'unaryFunctionsList',
                    items: [...queryMongo.unaryFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.unaryFunctions]},
                    callback: value => preferences.select(value + '(@)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Binary Functions'),
                m(PanelList, {
                    id: 'binaryFunctionsList',
                    items: [...queryMongo.binaryFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.binaryFunctions]},
                    callback: value => preferences.select(value + '(@, @)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Variadic Functions'),
                m(PanelList, {
                    id: 'variadicFunctionsList',
                    items: [...queryMongo.variadicFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.variadicFunctions]},
                    callback: value => preferences.select(value + '(@*)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Unary Operators'),
                m(PanelList, {
                    id: 'unaryOperatorsList',
                    items: Object.keys(queryMongo.unaryOperators).map(key => key + ' ' + queryMongo.unaryOperators[key]),
                    colors: {
                        [common.selVarColor]: [...preferences.usedTerms.unaryOperators].map(key => key + ' ' + queryMongo.unaryOperators[key])
                    },
                    callback: value => preferences.select(' ' + value.split(' ')[0] + '@', true)
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Binary Operators'),
                m(PanelList, {
                    id: 'binaryOperatorsList',
                    items: Object.keys(queryMongo.binaryOperators).map(key => key + ' ' + queryMongo.binaryOperators[key]),
                    colors: {
                        [common.selVarColor]: [...preferences.usedTerms.binaryOperators].map(key => key + ' ' + queryMongo.binaryOperators[key])
                    },
                    callback: value => preferences.select(' ' + value.split(' ')[0] + ' ', true)
                }))
        ]
    }
}

class MenuExpansion {
    oninit({attrs}) {
        let {preferences} = attrs;
        preferences.isValid = true;

        if (preferences.degreeInteraction === undefined) preferences.degreeInteraction = 2;

        preferences.variables = preferences.variables || {};

        preferences.select = variable => {
            if (variable in preferences.variables) delete preferences.variables[variable];
            else preferences.variables[variable] = {type: 'None', powers: '1 2 3'}
        }
    }

    variableMenu(variable, varPreferences) {

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

        let terms = queryMongo.expansionTerms(preferences);

        preferences.numberTerms = terms.length;

        return [
            m('div#termPreview', {
                    style: {
                        background: common.menuColor,
                        border: common.borderColor,
                        margin: '1em',
                        padding: '1em',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)'
                    }
                },
                m('h4', 'New Expansion Terms'),
                m.trust(terms.map((term, i) => `γ${String(i).sub()}*${term.replace(/\^[\d.-]+/, snip => snip.substr(1).sup())}`).join(' + '))
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
            Object.keys(preferences.variables).map(variable => this.variableMenu(variable, preferences.variables[variable]))
        ]
    }
}

class MenuBinning {
    oninit(vnode) {
    }

    view(vnode) {
    }
}

class MenuManual {
    oninit(vnode) {
    }

    view(vnode) {
    }
}