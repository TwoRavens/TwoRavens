import m from 'mithril';

import * as common from '../common';
import {mergeAttributes} from "../common";

// ```
// m(ListTags, {
//     tags: ['value 1', 'value 2', 'value 3'],
//     attrsTags: {}, (attributes to apply to each tag)
//     ondelete: (tag) => console.log(tag + " was deleted"),
//     readonly: boolean
// })
// ```

// Returns an inline array of elements with bubbles around them
// Each bubble contains the tag and a cancel button (if not readonly)

export default class ListTags {
    view(vnode) {
        let {tags, attrsTags, ondelete, readonly} = vnode.attrs;

        return tags.map((tag) => m('div', mergeAttributes({
                style: {
                    display: 'inline-block',
                    margin: '5px',
                    'border-radius': '5px',
                    padding: '4px 8px',
                    background: common.grayColor
                }
            }, attrsTags), [
                !readonly && m('div', {
                    onclick: () => ondelete(tag),
                    style: {
                        display: 'inline-block',
                        'margin-right': '0.5em',
                        transform: 'scale(1.3, 1.3)'
                    }
                }, '×'),
                m('div', {style: {display: 'inline-block'}}, tag)
            ])
        )
    }
}