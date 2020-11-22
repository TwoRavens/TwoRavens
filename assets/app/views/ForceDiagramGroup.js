import m from "mithril";
import {hexToRgba} from "../app";
import {add, italicize, remove} from "../utils";
import TextField from "../../common/views/TextField";
import * as common from "../../common/common";
import ListTags from "../../common/views/ListTags";
import Button from "../../common/views/Button";
import Icon from "../../common/views/Icon";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import {forceDiagramMode, prepareGroupData, toggleTag} from "../modes/model";


export default class ForceDiagramGroup {
    view(vnode) {
        let {group, i, variables} = vnode.attrs;

        let meta = prepareGroupData(group, i);
        return m('div.card', {
            style: {margin: '.5em', padding: '1em', width: 'calc(100% - 1em)', background: hexToRgba(meta.color, meta.opacity)},
        }, [
            m(TextField, {
                style: {background: common.lightGrayColor, 'font-weight': 'bold'},
                id: group.name.replace(/\W/g, '_') + 'TextField',
                oninput: forceDiagramMode === 'causalLinks' && (value => group.name = value),
                onblur: forceDiagramMode === 'causalLinks' && (value => group.name = value),
                value: group.name
            }),
            m('div',
                m(ListTags, {
                    tags: group.nodes,
                    ondelete: {
                        predictorLinks: value => {
                            console.log(group.name, value);
                            toggleTag(selectedProblem, group.name, value)
                        },
                        causalLinks: value => remove(group.nodes, value)
                    }[forceDiagramMode]
                })),
            this.pending === undefined && m(Button,
                {onclick: () => this.pending = ''}, // , style: {width: 'fit-content'}
                m(Icon, {name: 'plus'})),
            this.pending !== undefined && m(TextFieldSuggestion, {
                id: `pending${group.name}TextField`,
                isDropped: true,
                attrsAll: {style: {background: common.lightGrayColor, 'font-weight': 'bold'}, placeholder: 'Add Variable'},
                value: this.pending,
                suggestions: variables.filter(variable => !group.nodes.includes(variable)),
                enforce: true,
                oninput: value => this.pending = value,
                onblur: value => {
                    ({
                        predictorLinks: value => toggleTag(selectedProblem, group.name, value),
                        causalLinks: value => add(group.nodes, value)
                    })[forceDiagramMode](value);

                    this.pending = undefined;
                }
            }),
        ])
    }
}