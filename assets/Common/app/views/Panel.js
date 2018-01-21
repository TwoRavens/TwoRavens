import m from 'mithril';
import ButtonRadio from './ButtonRadio'
import '../../css/common.css'

import {
    panelOpen,
    togglePanelOpen,
    menuColor,
    borderColor,
    heightHeader,
    heightFooter,
    panelMargin,
    canvasScroll,
    scrollbarWidth,
    setPanelOcclusion
} from "../common";

// side = 'left' | 'right'
// layout = 'tabs' | 'headers'
// hover = Bool; if true then canvas is occluded beneath panel. If false, then canvas size is restricted. Defaults to false

// label = string label at top of panel

// sections = [..., {
//     id: id (optional)
//     value: string
//     title: text to use on hover
//     contents: list of mithril elements
//     width: width of panel when focused (tabs only)
// }]

export default class Panel {

    layoutTabs(sections, focusedSection) {
        for (let section of sections) section['onclick'] = (value) => {
            this.currentTab = value
        };

        // Contents to render for the section
        return [m(ButtonRadio, {id: 'panelButtonBar', sections: sections}), focusedSection.contents];
    }

    layoutHeaders(sections) {
        return [sections.map((section) => m(`div#${section.value}`,
            m(`#${section.value}Header.panel-heading`, m("h3.panel-title", section.value)),
            section.contents))
        ]
    }

    oninit(vnode) {
        this.currentTab = vnode.attrs.sections[0].value;
    }

    view(vnode) {
        let {side, label, layout, hover, sections} = vnode.attrs;
        const dot = [m.trust('&#9679;'), m('br')];

        console.log("drawing " + side);

        // Default width
        let currentWidth = 'width' in vnode.attrs ? vnode.attrs.width : 320;

        let focusedSection;
        if (layout === 'tabs') {
            // Find the section data for the current tab
            for (let section of sections) {
                if (section.value === this.currentTab) {
                    focusedSection = section;
                    break;
                }
            }
            if ('width' in focusedSection) currentWidth = focusedSection['width']
        }

        if (!hover) {
            setPanelOcclusion(side, (panelOpen[side] ? currentWidth : 16) + 2 * panelMargin);
        }

        return m(`#${side}panel.container.sidepanel.clearfix`, {
            style: {
                background: menuColor,
                border: borderColor,
                width: panelOpen[side] ? currentWidth + 'px' : 0,
                height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px)`,
                position: 'fixed',
                top: heightHeader + panelMargin + 'px',
                [side]: (side === 'right' && canvasScroll['vertical'] ? scrollbarWidth : 0) + panelMargin + 'px',
                ['padding-' + side]: '1px',
                'z-index': 100
            }
        }, [
            // Panel handle
            m(`#toggle${side === 'left' ? 'L' : 'R'}panelicon.panelbar`, {
                    style: {height: '100%', [side]: 'calc(100% - 16px)'}
                },
                m('span', {onclick: () => togglePanelOpen(side)}, dot, dot, dot, dot)),

            // Panel contents
            m(`div${panelOpen[side] ? '' : '.closepanel'}`, {
                    style: {width: 'calc(100% - 8px)', margin: '0 4px', display: panelOpen[side] ? 'block' : 'none'}
                },
                [
                    m(`#${side}paneltitle.panel-heading.text-center`, m("h3.panel-title", label)),
                    layout === 'tabs' ? this.layoutTabs(sections, focusedSection) : this.layoutHeaders(sections)
                ])
        ])
    }
}
