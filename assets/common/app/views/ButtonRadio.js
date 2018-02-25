import m from 'mithril'
import {mergeAttributes} from '../common'

// Interface specification
//
// ```
// m(ButtonRadio, {
//     sections: [
//             {
//                 value: 'Button 1',
//                 title: 'Hover text',
//                 attrsInterface: {optional object of attributes}
//             },
//             ...
//         ],
//     defaultSection: string (optional),
//     activeSection: string (optional),
//     onclick: (value) => console.log(value + " was clicked.")
//     attrsAll: {optional object of attributes to apply to the bar}
//     attrsButtons: {optional object of attributes to apply to all buttons}
//     selectWidth: 100 (optional)
//     })
// ```

// The selectWidth option forces the selected button to be n percent wide.
// The other buttons on the bar compensate.
// If not included, then every button has even spacing.

// The hoverBonus option makes the hovered button n percent larger when hovered.
// Both hoverBonus and selectWidth may be used together.

// defaultSection sets which element is selected on page load
// activeSelection forces the selected element. This is for convenience when external events change the selected button

export default class ButtonRadio {
    oninit(vnode) {
        let {activeSection, defaultSection, sections} = vnode.attrs;
        // Attempt to set active on initial load based on options
        this.active = activeSection || defaultSection || sections.length !== 0 ? sections[0].value : undefined;
    }

    view(vnode) {
        let {id, sections, onclick, selectWidth, hoverBonus, attrsAll, attrsButtons, activeSection} = vnode.attrs;

        // Sorry about the complexity here. Got stuck with a lot of cases
        let getWidth = (value) => {
            // Evenly spaced
            if (selectWidth === undefined && (hoverBonus === undefined || this.hovered === undefined)) {
                return 100. / sections.length + '%';
            }

            // Fixed width of selected button
            if (selectWidth !== undefined && (hoverBonus === undefined || this.hovered === undefined)) {
                if (this.active === value) return selectWidth + '%';
                return `calc(${100. / (sections.length - 1)}% - ${selectWidth / (sections.length - 1)}%)`;
            }

            // Hovering is turned on and a button is hovered
            if (selectWidth === undefined && hoverBonus !== undefined && this.hovered !== undefined) {
                if (this.hovered === value) return 100. / sections.length + hoverBonus + '%';
                return 100. / sections.length - (hoverBonus / (sections.length - 1)) + '%';
            }

            // Fixed width of selected button and button resize on hover
            if (selectWidth !== undefined && hoverBonus !== undefined && this.hovered !== undefined) {
                if (this.active === value) return selectWidth + '%';
                if (this.hovered === this.active) return `calc(${100. / (sections.length - 1)}% - ${selectWidth / (sections.length - 1)}%)`;
                if (this.hovered === value) return `calc(${100. / (sections.length - 1) + hoverBonus}% - ${selectWidth / (sections.length - 1)}%)`;
                return `calc(${(100. - (100. / (sections.length - 1) + hoverBonus)) / (sections.length - 2)}% - ${selectWidth / (sections.length - 1)}%)`;
            }
        };

        this.active = activeSection || this.active;

        // Button bar
        return m(`div#${id}.btn-group[data-toggle=buttons]`, mergeAttributes({style: {'width': '100%'}}, attrsAll),
            sections.map((section) =>
                // Individual buttons
                m(`#${section.id || 'btn' + section.value}.btn.btn-default
                    ${section.value.toLowerCase() === (activeSection || this.active).toLowerCase() ? '.active' : ''}`,

                    mergeAttributes({
                        onmouseover: () => this.hovered = section.value,
                        onmouseout: () => this.hovered = undefined,
                        style: {width: getWidth(section.value)},
                        onclick: () => {
                            this.active = section.value;
                            onclick(section.value);
                        }
                    }, attrsButtons, section.attrsInterface),
                    [
                        m(`input#${id}${section.value}`, {'name': id, 'title': section.title, 'type': 'radio'}),
                        section.value
                    ]
                ))
        );
    }
}