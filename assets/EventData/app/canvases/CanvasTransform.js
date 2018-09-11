import m from 'mithril';

import TextField from "../../../common/app/views/TextField";
import Button from '../../../common/app/views/Button';
import PanelList from '../../../common/app/views/PanelList';

import * as app from '../app';
import * as query from '../queryMongo';
import * as common from '../../../common/app/common';

let setDefault = (obj, id, value) => obj[id] = obj[id] || value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);


export default class CanvasTransform {
    oninit({attrs}) {
        let {preferences} = attrs;

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

    view(vnode) {
        let {preferences, variables, metadata} = vnode.attrs;
        let {name, step} = metadata;

        // simulate the pipeline until the n-1th step to determine available variables
        let propagatedVariables = query.buildPipeline(
            app.abstractManipulations.slice(0, -1),
            new Set(variables))['variables'];

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
            let response = query.buildTransform(preferences.transformEquation, new Set(variables));
            transformQuery = JSON.stringify(response.query, null, 2);
            preferences.usedTerms = response.usedTerms;
        }
        catch (err) {
            transformError = String(err)
        }

        return m("#canvasTransform", {style: {'height': '100%', 'width': '100%', 'padding-top': common.panelMargin}},
            m('h4', 'Add ' + name + ' for Step ' + app.abstractManipulations.indexOf(step)),
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
                placeholder: '1 + ' + variables[0],
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
        );
    }
}