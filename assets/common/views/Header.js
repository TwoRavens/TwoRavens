import m from 'mithril';
import {ABOUT, heightHeader, mergeAttributes} from '../common';

// ```
// m(Header, {
//         image: src image,
//         attrsInterface: {optional object of attributes}
//     },
//     m(...))
// ```

// Creates a header bar at the top of the screen
// The TwoRavens logo and hover are baked in
// Resizes automatically for mobile formatting


export default class Header {
    oninit() {
        this.about = false;
        this.mobileHeader = false;
    }

    view(vnode) {
        let {image, attrsInterface} = vnode.attrs;

        // navbar-default is for bootstrap 3 compatibility
        return m('nav.navbar.navbar-expand-lg.fixed-top.bg-light.navbar-default', mergeAttributes(
            {style: {'min-height': heightHeader, 'box-shadow': '0 0 4px #888', 'z-index': 1000, 'height': 'auto'}}, attrsInterface), [
            m("img.navbar-brand[alt=TwoRavens]", {
                style: {height:'100%', 'max-height': heightHeader, 'max-width': '140px'},
                onmouseover: _ => this.about = true,
                onmouseout: _ => this.about = false,
                src: image
            }),
            m(`#about.about[style=display: ${this.about ? 'block' : 'none'}; top: 10px; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                ABOUT),

            // This styling is partially and conditionally overwritten via common.css @media queries for mobile formatting
            m('div#hamburger.show-mobile', {
                onclick: () => this.mobileHeader = !this.mobileHeader,
                style: {
                    display: 'none',
                    float: 'right',
                    'margin-top': `calc(${heightHeader} / 2)`,
                    'margin-bottom': `calc(-${heightHeader} / 2)`,
                    transform: 'translateY(-50%)'
                }
            }, m('div.header-icon', {
                style: {
                    transform: 'scale(1.75, 1.5)',
                    'margin-right': '0.5em'
                }
            }, m.trust('&#9776;'))),

            m('div#headerMenu', {
                    class: !this.mobileHeader && ['hide-mobile'],
                    style: {
                        width: 'calc(100% - 140px)',
                        display: 'inline-grid',
                        float: 'right',
                        'margin-top': `calc(${heightHeader} / 2)`,
                        'margin-bottom': `calc(-${heightHeader} / 2)`,
                        transform: 'translateY(-50%)'
                    }
                },
                m('div#headerContent', {
                        style: {
                            display: 'flex',
                            'justify-content': 'flex-end',
                            'align-items': 'center'
                        }
                    },
                    vnode.children
                ))
        ]);
    }
}
