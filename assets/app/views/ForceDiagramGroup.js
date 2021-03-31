import m from "mithril";
import {hexToRgba} from "../app";
import TextField from "../../common/views/TextField";
import * as common from "../../common/common";
import * as utils from '../utils';
import ListTags from "../../common/views/ListTags";
import Button from "../../common/views/Button";
import Icon from "../../common/views/Icon";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import * as model from "../modes/model";
import {setSelectedPebble, toggleGroup, toggleTag} from "../modes/model";

let getOrigGroup = (problem, group) => problem.groups.find(origGroup => origGroup.id === group.id);

export default class ForceDiagramGroup {
    view(vnode) {
        let {group, problem, variables} = vnode.attrs;

        return m('div.card', {
            style: {margin: '.5em', padding: '1em', width: 'calc(100% - 1em)', background: hexToRgba(group.color, group.opacity)},
        }, [
            m(TextField, {
                autocomplete: "off",
                style: {background: common.lightGrayColor, 'font-weight': 'bold'},
                id: String(group.id).replace(/\W/g, '_') + 'TextField',
                oninput: group.editable && (value => getOrigGroup(problem, group).name = value),
                onblur: group.editable && (value => getOrigGroup(problem, group).name = value),
                value: group.name
            }),
            group.editable && m('div', {
                style: {position: 'absolute', right: '2.2em', top: '2.2em'},
                onclick: () => utils.remove(problem.groups, getOrigGroup(problem, group))
            }, m(Icon, {name: 'x'})),
            m('pre', {
                contenteditable: true,
                oninput: v => getOrigGroup(problem, group).description = v.target.innerHTML
            }, m.trust(group.description || '')),
            m('div',
                m(ListTags, {
                    tags: [...group.nodes],
                    onclick: setSelectedPebble,
                    ondelete: group.id !== "Search" && (value => toggleGroup(problem, group.id, value))
                })),
            this.pending === undefined && m(Button,
                {
                    onclick: () => {
                        if (group.id === "Search") {
                            problem.groups.unshift({
                                id: problem.groupCount++,
                                name: group.name,
                                description: group.description,
                                nodes: group.nodes,
                                color: common.colorPalette[(problem.groupCount + 1) % common.colorPalette.length],
                                opacity: 0.3,
                                editable: true
                            })
                            model.setVariableSearchText()
                        } else this.pending = '';
                        // setTimeout(() => document.getElementById(`pendingGroupId${group.id}TextField`).focus(), 10)
                    }
                }, // , style: {width: 'fit-content'}
                group.id === "Search" ? "Promote to Group" : m(Icon, {name: 'plus'})),
            this.pending !== undefined && m(TextFieldSuggestion, {
                oncreate: ({dom}) => dom.focus(),
                id: `pendingGroupId${group.id}TextField`,
                isDropped: true,
                attrsAll: {style: {background: common.lightGrayColor, 'font-weight': 'bold'}, placeholder: 'Add Variable'},
                value: this.pending,
                limit: 5,
                suggestions: variables.filter(variable => !group.nodes.has(variable)),
                enforce: false,
                oninput: value => this.pending = value,
                onblur: value => {
                    if (!value) return;
                    if (variables.includes(value)) {
                        toggleGroup(problem, group.id, value)
                        this.pending = undefined;
                    }
                }
            }),
        ])
    }
}


export class ForceDiagramLabel {
    view(vnode) {
        let {label, problem, variables} = vnode.attrs;

        return m('div.card', {
            style: {
                margin: '.5em',
                padding: '1em',
                width: 'calc(100% - 1em)',
                border: `4px solid ${hexToRgba(label.color, label.opacity)}`
            },
        }, [
            m(TextField, {
                autocomplete: "off",
                readonly: true,
                style: {background: common.lightGrayColor, 'font-weight': 'bold'},
                id: String(label.id).replace(/\W/g, '_') + 'TextField',
                oninput: _=>_,
                onblur: _=>_,
                value: label.name
            }),
            m('pre', m.trust(label.description || '')),
            m('div',
                m(ListTags, {
                    tags: label.nodes,
                    onclick: setSelectedPebble,
                    ondelete: value => toggleTag(problem, group.id, value)
                })),
            this.pending === undefined && m(Button,
                {onclick: () => this.pending = ''},
                m(Icon, {name: 'plus'})),
            this.pending !== undefined && m(TextFieldSuggestion, {
                oncreate: ({dom}) => dom.focus(),
                id: `pendingLabelId${label.id}TextField`,
                isDropped: true,
                attrsAll: {style: {background: common.lightGrayColor, 'font-weight': 'bold'}, placeholder: 'Add Variable'},
                value: this.pending,
                limit: 5,
                suggestions: variables.filter(variable => !label.nodes.includes(variable)),
                enforce: false,
                oninput: value => this.pending = value,
                onblur: value => {
                    if (!value) return;
                    if (variables.includes(value)) {
                        toggleTag(problem, label.id, value)
                        this.pending = undefined;
                    }
                }
            }),
        ])
    }
}