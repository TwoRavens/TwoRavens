import m from 'mithril';

import * as common from '../../common/common';
import TextField from "../../common/views/TextField";
import PanelList from '../../common/views/PanelList';
import ButtonRadio from "../../common/views/ButtonRadio";
import PlotBars from '../views/PlotBars';

import * as queryMongo from '../manipulations/queryMongo';
import hopscotch from "hopscotch";
import Dropdown from "../../common/views/Dropdown";
import Table from "../../common/views/Table";

import {getData} from "../manipulations/manipulate";

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

        // Delegate variable select function to child menu
        preferences.select = (...values) => (preferences.menus[preferences.type].select || Function)(...values)
    }


    view({attrs}) {
        let {preferences, pipeline, variables} = attrs;

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
                    pipeline,
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
            let response = queryMongo.buildEquation(preferences.transformEquation, new Set(variables));
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
            m('div#expansionVariables',
                Object.keys(preferences.variables).map(variable => this.variableMenu(variable, preferences.variables[variable]))
            )
        ]
    }
}

class MenuBinning {
    oninit({attrs}) {
        let {preferences} = attrs;

    }

    view({attrs}) {
        let {preferences} = attrs;

        return [
            m('div')
        ]
    }
}

class MenuManual {
    oninit({attrs}) {
        let {preferences, pipeline} = attrs;
        setDefault(preferences, 'variableNameError', true);
        setDefault(preferences, 'variableName', '');
        setDefault(preferences, 'variableType', 'Nominal');
        setDefault(preferences, 'variableIndicator', undefined);
        setDefault(preferences, 'indicatorKeys', []);
        setDefault(preferences, 'userValues', []);

        preferences.select = async variable => {
            if (variable === preferences.variableIndicator) return;
            preferences.variableIndicator = variable;

            preferences.indicatorKeys = (await getData({
                method: 'aggregate',
                query: JSON.stringify(pipeline.concat([{$group: {_id: null, distinct: {$addToSet: "$" + preferences.variableIndicator}}}]))
            }))[0]['distinct'];

            preferences.userValues = Array(preferences.indicatorKeys.length).fill(undefined);
        }
    }


    view({attrs}) {
        let {preferences} = attrs;

        let userInput = i => {
            if (preferences.variableType === 'Boolean') return m(ButtonRadio, {
                attrsAll: {style: {'max-width': '10em'}},
                sections: [{value: 'true'}, {value: 'false'}],
                activeSection: String(!!preferences.userValues[i]),
                onclick: response => preferences.userValues[i] = response === 'true'
            });

            if (['Nominal', 'Numchar'].includes(preferences.variableType)) return m(TextField, {
                value: String(preferences.userValues[i] === undefined ? '' : preferences.userValues[i]),
                oninput: response => preferences.userValues[i] = response
            })
        };

        return [
            m('label#labelVariableName[style=width:10em;display:inline-block]', 'Variable Name'),
            m(TextField, {
                id: 'textFieldVariableName',
                class: preferences.variableNameError && ['is-invalid'],
                style: {display: 'inline-block', width: 'calc(100% - 10em)'},
                value: preferences.variableName,
                oninput: name => {
                    preferences.variableNameError = name.length === 0 || name.includes('-');
                    preferences.variableName = name;
                }
            }),
            m('br'),

            m('label#labelVariableType[style=width:10em;display:inline-block]', 'Variable Type'),
            m('[style=display:inline-block]', m(Dropdown, {
                style: {display: 'inline-block'},
                id: 'dropdownVariableType',
                items: ['Boolean', 'Nominal', 'Numchar'],
                activeItem: preferences.variableType,
                onclickChild: child => preferences.variableType = child
            })),
            m('br'),

            m('label#labelVariableDescription[style=width:10em;display:inline-block]', 'Variable Description'),
            m(TextField, {
                id: 'textFieldVariableDescription',
                style: {display: 'inline-block', width: 'calc(100% - 10em)'},
                oninput: description => preferences.variableDescription = description,
                value: preferences.variableDescription
            }),
            m('br'),

            preferences.indicatorKeys.length > 0 && m(Table, {
                id: 'tableManualVariable',
                headers: [preferences.variableIndicator, preferences.variableName],
                data: preferences.indicatorKeys.map((key, i) => [
                    key, userInput(i)
                ])
            })
        ]
    }
}


export function tourStartEquation() {
    hopscotch.endTour(false);
    hopscotch.startTour(equationTour);
}

let equationTour = {
    id: "equation-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Create an Equation",
            content: "The equation editor is used to create a new variable defined by combinations of other variables.",
            target: "btnEquation",
            placement: "left"
        },
        {
            title: "Variable Name",
            content: "Enter the name of the new variable here. This variable be used in the next step of the pipeline.",
            target: "textFieldName",
            placement: "bottom"
        },
        {
            title: "Equation",
            content: "The equation may be typed in, or built by clicking on variables and function names below. Either a preview of the query, or guidance about syntax errors, is shown below.",
            target: "textFieldEquation",
            placement: "bottom"
        },
        {
            title: "Functions",
            content: "Unary functions take one argument. Binary functions take two arguments. Variadic functions take any number of arguments.",
            target: "unaryFunctionsList",
            placement: "left"
        },
        {
            title: "Operators",
            content: "Operators are similar to function calls, but provide a more natural syntax: add(1, 1) can be rewritten 1 + 1.",
            target: "unaryOperatorsList",
            placement: "left"
        }
    ]
};


export function tourStartExpansion() {
    hopscotch.endTour(false);
    hopscotch.startTour(expansionTour);
}

let expansionTour = {
    id: "expansion-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Create an Expansion",
            content: "The expansion builder is used for dummy coding, polynomial expansions, and interaction terms.",
            target: "btnExpansion",
            placement: "bottom"
        },
        {
            title: "View new expansion terms",
            content: "All expansion terms that will be added to the modeling space are listed here.",
            target: "termPreview",
            placement: "left"
        },
        {
            title: "Degree of interaction",
            content: "This is a limit on the degree of interaction terms. To ignore all interaction terms, set this to one. If three variables are selected and the interaction degree is 2, then the term a*b*c would not be included in the expansion.",
            target: "textFieldDegreeInteraction",
            placement: "bottom"
        },
        {
            title: "Variables",
            content: "Select variables in the left panel to add them here.",
            target: "expansionVariables",
            placement: "top"
        }
    ]
};


export function tourStartManual() {
    hopscotch.endTour(false);
    hopscotch.startTour(manualTour);
}

let manualTour = {
    id: "manual-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Manually construct a new column.",
            content: "Manually add the values for a new column.",
            target: "btnManual",
            placement: "bottom"
        }
    ]
};
