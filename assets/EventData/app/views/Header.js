import m from 'mithril';
import {about, closeabout, submitQuery, setDataset, reset} from "../app";
import {updateToAggreg} from "../aggreg/aggreg";

export default class Header {

    view(vnode) {
        return (m("nav.navbar.navbar-default.navbar-fixed-top[id='navbar'][role='navigation']",
            [
                m("a.navbar-brand", {style: {"margin-left": "0"}},
                    m("img[alt='TwoRavens'][src='/static/images/TwoRavens.png'][width='100']", {
                        style: {
                            "margin-left": "2em",
                            "margin-top": "-0.5em"
                        },
                        onmouseover: function (e) {
                            $('#about').show();
                            e.redraw = false;
                        },
                        onmouseout: function (e) {
                            $('#about').hide();
                            e.redraw = false;
                        }
                    })
                ),
                m("[id='navbarNav']", {style: {"margin-top": "11px"}},

                    ]
                ),
                m(".panel.panel-default[id='about']", {
                        style: {
                            "margin-top": "62px",
                            "width": "500px",
                            "display": "None",
                            "z-index": "50"
                        }
                    },
                    m(".panel-body")
                )
            ]
        ));
    }
}