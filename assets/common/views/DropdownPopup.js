import m from 'mithril';
import *  as common from '../common';


// ```
// m(DropdownPopup, {
//     header: "my header",
//     sections: [
//         {
//             name: "option 1",
//             content: m(...)
//         },
//         {
//             name: "option 2",
//             content: m(...)
//         }
//     ],
//     callback: (value) => console.log(value + " was selected.")
//     attrsAll: {} (optional)
//     })
// ```

// When clicked, a menu pops up with a list of buttons. Click a button to enter a sub-menu.

export default class DropdownPopup {
    oninit() {
        this.selectedSection = undefined;
    }

    view(vnode) {
        let {header, sections, callback, attrsAll} = vnode.attrs;

        return m("div", attrsAll,
            m(".popover-markup", {style: {"display": "inline"}},
                [
                    // This is the entry button, turns on/off visibility
                    m("a.trigger.btn.btn-sm.btn-default", {
                            style: {"height": "30px"},
                            onclick: () => this.visible = !this.visible
                        },
                        m("span.glyphicon.glyphicon-chevron-down", {
                            style: {
                                "margin-top": "3px",
                                "font-size": "1em",
                                "color": "#818181",
                                "pointer-events": "none"
                            }
                        })
                    ),

                    // this is the actual dropdown
                    m('div', {
                        style: {
                            display: this.visible ? 'block' : 'none',
                            width: '250px',
                            background: common.menuColor,
                            border: common.borderColor,
                            'margin-top': '5px',
                            'box-shadow': '0px 4px 5px rgba(0,0,0,0.3)'
                        }
                    }, [
                        m('h4', {style: {'text-align': 'center'}}, header),
                        m('div', this.selectedSection ? m('div', {style: {margin: '5px'}}, [
                                m("button.btn.btn-sm.btn-default", {
                                        onclick: (e) => {e.stopPropagation(); this.selectedSection = undefined;}
                                    },
                                    m("span.glyphicon.glyphicon-chevron-left", {
                                        style: {
                                            "font-size": "1em",
                                            "color": "#818181",
                                            "pointer-events": "none"
                                        }
                                    })
                                ),
                                sections.filter((section) => section.name === this.selectedSection)[0].content,
                                m(`#selectSection.button.btn.btn-primary`, m("span.ladda-label", {
                                    onclick: () => callback(this.selectedSection)
                                }, 'Select'))
                            ]) :
                            // otherwise, no section is selected so show the home menu (one button to each section)
                            sections.map((section) => m(`#option${section.name.replace(/\W/g, '_')}button.btn.btn-default`, {
                                onclick: () => this.selectedSection = section.name,
                                style: {
                                    width: 'calc(100% - 10px)',
                                    margin: '5px'
                                }
                            }, section.name))
                        )
                    ])
                ]
            )
        )
    }
}
