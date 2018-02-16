import m from 'mithril'
import ButtonRadio from "./ButtonRadio";
import {mergeAttributes} from "../common";

// ```
// m(MenuTabbed, {
//     id: string,
//     sections: [...,
//         {
//             value: string
//             title: text to use on hover,
//             idSuffix: (optional) suffix to add to generated id strings
//             contents: m(...)
//             display: if 'none', then the button won't be visible on the button bar,
//             selectWidth: int (optional),
//             hoverbonus: int (optional)
//         }],
//     callback: (value) => console.log(value + " was clicked!"),
//     attrsAll: {attributes to apply to the menu, EG height style}
//     })
// ```

// The ids for the generated buttons and content areas are generated via 'idSuffix' passed into sections.
// For example if idSuffix is 'Type', then there will be html objects with 'btnType' and 'tabType' ids. Defaults to value.

export default class MenuTabbed {

    view(vnode) {
        let {id, sections, callback, selectWidth, hoverBonus, currentTab, attrsAll} = vnode.attrs;

        // If a button is not visible, then create the element for the DOM anyways-- but don't let it affect the css
        let visibleButtons = [];
        let invisibleButtons = [];
        for (let section of sections) {
            if (section['display'] === 'none') invisibleButtons.push(section);
            else {
                section['onclick'] = () => callback(section['value']);
                visibleButtons.push(section);
            }
            // Automatically build the id

            section['id'] = 'btn' + (section['idSuffix'] || section['value']);
        }

        // Contents to render for the section
        return m('#' + id, attrsAll, [
            m(ButtonRadio, {
                id: id + 'ButtonBar',
                onclick: callback,
                sections: visibleButtons,
                attrsAll: {style: {'margin-bottom': '5px'}},
                hoverBonus: hoverBonus,
                activeSection: currentTab,
                selectWidth: selectWidth
            }),
            m(ButtonRadio, {
                id: id + 'ButtonBarHidden',
                onclick: callback,
                sections: invisibleButtons,
                attrsAll: {style: {display: 'none'}},
                hoverBonus: hoverBonus,
                selectWidth: selectWidth
            }),
            sections.map((section) => m(`div#tab${section['idSuffix'] || section['value']}`, {
                style: {
                    display: section['value'] === currentTab ? 'block' : 'none',
                    height: '100%',
                    overflow: 'auto'
                }
            }, section.contents))
        ]);
    }
}