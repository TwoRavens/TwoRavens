import m from 'mithril';

import TextField from "../../common/views/TextField";
import PanelList from '../../common/views/PanelList';
import * as query from '../manipulations/queryMongo';
import * as common from '../../common/common';

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
        // the transform step is overloaded, it also contains expansions. This is used to tell them apart
        preferences.type = 'transform';

        setDefault(preferences, 'transformName', '');
        setDefault(preferences, 'transformEquation', '');
        setDefault(preferences, 'usedTerms', usedTermDefaults());
        setDefault(preferences, 'isValid', false);
        setDefault(preferences, 'cursorPosition', 0);

        preferences.select = (value, atCursor) => {

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
            let response = query.buildTransform(preferences.transformEquation, new Set(variables));
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

        if (preferences.transformName === ''  || preferences.transformName.match(/[ -]/) || preferences.transformEquation === '')
            preferences.isValid = false;

        return m("#canvasTransform", {style: {'height': '100%', 'width': '100%', 'padding-top': common.panelMargin}},
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
                    items: [...query.unaryFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.unaryFunctions]},
                    callback: value => preferences.select(value + '(@)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Binary Functions'),
                m(PanelList, {
                    id: 'binaryFunctionsList',
                    items: [...query.binaryFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.binaryFunctions]},
                    callback: value => preferences.select(value + '(@, @)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Variadic Functions'),
                m(PanelList, {
                    id: 'variadicFunctionsList',
                    items: [...query.variadicFunctions],
                    colors: {[common.selVarColor]: [...preferences.usedTerms.variadicFunctions]},
                    callback: value => preferences.select(value + '(@*)')
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Unary Operators'),
                m(PanelList, {
                    id: 'unaryOperatorsList',
                    items: Object.keys(query.unaryOperators).map(key => key + ' ' + query.unaryOperators[key]),
                    colors: {
                        [common.selVarColor]: [...preferences.usedTerms.unaryOperators].map(key => key + ' ' + query.unaryOperators[key])
                    },
                    callback: value => preferences.select(' ' + value.split(' ')[0] + '@', true)
                })),
            m('div', {style},
                m('h4', {'margin-top': 0}, 'Binary Operators'),
                m(PanelList, {
                    id: 'binaryOperatorsList',
                    items: Object.keys(query.binaryOperators).map(key => key + ' ' + query.binaryOperators[key]),
                    colors: {
                        [common.selVarColor]: [...preferences.usedTerms.binaryOperators].map(key => key + ' ' + query.binaryOperators[key])
                    },
                    callback: value => preferences.select(' ' + value.split(' ')[0] + ' ', true)
                }))
        );
    }
}