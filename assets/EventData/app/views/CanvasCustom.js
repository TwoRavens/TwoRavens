import m from 'mithril';
import {subsetData, buildSubset, editor} from '../app';
import {panelMargin} from '../../../common/common';

import {tourStartCustomExamples} from "../tour";

export default class CanvasCustom {
    oncreate(){
        editor.$blockScrolling = Infinity;
        editor.session.setMode("ace/mode/json");

        editor.setOptions({
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        // editor.renderer.$cursorLayer.element.style.opacity = 0;
        // editor.textInput.getElement().disabled = true;
    }

    view(vnode) {
        console.log("TEST 2");
        let {display} = vnode.attrs;
        return (m("#canvasCustom.subsetDiv", {style: {"display": display, height: '100%', 'padding-top': panelMargin}},
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
                // Show rightpanel query Button
                m("button.btn.btn-default[id='subsetCustomShowAll']", {
                    style: {
                        "display": "inline"
                    },
                    onclick: () => editor.setValue(JSON.stringify(buildSubset(subsetData), null, '	'))
                }, "Show All"),

                // Examples Button
                m("button.btn.btn-default[id='btnExamples']", {
                    style: {
                        "margin-left": "2em",
                        "display": "inline"
                    },
                    onclick: tourStartCustomExamples
                }, "Examples"),

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