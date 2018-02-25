import m from 'mithril';
import {subsetData, buildSubset, editor} from "../app";
import {panelMargin} from "../../../common/app/common";

export default class CanvasCustom {
    oncreate(){
        editor.$blockScrolling = Infinity;
        editor.session.setMode("ace/mode/json");

        editor.setOptions({
            readOnly: true,
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        editor.renderer.$cursorLayer.element.style.opacity = 0;
        editor.textInput.getElement().disabled = true;
    }

    view(vnode) {
        let {display} = vnode.attrs;
        return (m("#canvasCustom.subsetDiv", {style: {"display": display, height: '100%', 'padding-top': panelMargin + 'px'}},
            [
                // Header
                m(".panel-heading.text-left[id='subsetCustomLabel']", {
                        style: {
                            "width": "14em",
                            "float": "left"
                        }
                    },
                    m("h3.panel-title", "View Query String")
                ),
                // Show rightpanel query
                m("button.btn.btn-default[id='subsetCustomShowAll']", {
                    style: {
                        "display": "inline"
                    },
                    onclick: function(e) {
                        editor.setValue(JSON.stringify(buildSubset(subsetData), null, '	'));
                        e.redraw = false;
                    }
                }, "Show All"),

                // Ace editor
                m("pre[id='subsetCustomEditor']", {
                    style: {
                        "resize": "none",
                        "margin-left": "10px",
                        "margin-top": "5px",
                        "width": "calc(100% - 35px)",
                        "height": "calc(100% - 49px)"
                    }
                })
            ]
        ));
    }
}