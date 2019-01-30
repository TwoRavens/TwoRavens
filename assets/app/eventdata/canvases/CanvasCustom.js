import m from 'mithril';
import * as app from '../../app';
import * as queryMongo from '../../manipulations/queryMongo';
import * as tour from '../tour';
import {panelMargin} from '../../../common/common';

import 'ace-builds';
import 'ace-builds/webpack-resolver';

export default class CanvasCustom {
    oncreate(vnode) {
        let {preferences} = vnode.attrs;
        // The editor menu for the custom subsets
        this.editor = ace.edit("subsetCustomEditor", {mode: "ace/mode/json", fontSize: 16});
        this.editor.$blockScrolling = Infinity;

        this.editor.setOptions({
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        this.editor.setValue(preferences['text'] || '');
        this.editor.on('change', () => preferences['text'] = this.editor.getValue());

        // editor.renderer.$cursorLayer.element.style.opacity = 0;
        // editor.textInput.getElement().disabled = true;
    }

    onupdate(vnode) {
        let {preferences, redraw, setRedraw} = vnode.attrs;
        if (redraw) {
            setRedraw(false);
            this.editor.setValue(preferences['text'] || '')
        }
    }

    view(vnode) {
        let {preferences} = vnode.attrs;

        return m("#canvasCustom", {style: {height: '100%', 'padding-top': panelMargin}},
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
                    onclick: () => {
                        preferences['text'] = JSON.stringify(queryMongo.buildSubset(app.looseSteps['pendingSubset'].abstractQuery), null, '  ');
                        this.editor.setValue(preferences['text'] || '')
                    }
                }, "Show All"),

                // Examples Button
                m("button.btn.btn-default[id='btnExamples']", {
                    style: {
                        "margin-left": "2em",
                        "display": "inline"
                    },
                    onclick: tour.tourStartCustomExamples
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
        );
    }
}