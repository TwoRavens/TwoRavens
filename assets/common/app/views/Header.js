import m from 'mithril'

import {aboutText, menuColor, heightHeader} from '../common'

// ```
// m(Header, {
//     contents: m(...)
//     })
// ```

export default class Header {
    oninit() {
        this.about = false;
    }

    view(vnode) {
        let {contents} = vnode.attrs;

        return m("nav#navbar.navbar.navbar-default.navbar-fixed-top[role=navigation]", {
                style: {
                    background: menuColor,
                    height: heightHeader
                }
            },
            [
                m("a.navbar-brand",
                    m("img[src=/static/images/TwoRavens.png][alt=TwoRavens][width=100][style=margin-left: 1em; margin-top: -0.5em]",
                        {onmouseover: _ => this.about = true, onmouseout: _ => this.about = false})),
                m(`#about.panel.panel-default[style=display: ${this.about ? 'block' : 'none'}; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                    m('.panel-body', aboutText)),
                contents
            ]
        )
    }
}
