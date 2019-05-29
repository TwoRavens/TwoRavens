import m from 'mithril';
import * as app from '../../app';
import * as queryMongo from '../../manipulations/queryMongo';
import * as tour from '../tour';
import {panelMargin} from '../../../common/common';

import '../../../../node_modules/ace-builds/src-min-noconflict/ace.js';


export default class CanvasCustom {
    oncreate(vnode) {
        let {preferences} = vnode.attrs;
        // The editor menu for the custom subsets
        this.editor = ace.edit("subsetCustomEditor");

        this.editor.$blockScrolling = Infinity;
        this.editor.session.setMode("ace/mode/json");

        this.editor.setOptions({
            highlightActiveLine: false,
            highlightGutterLine: false
        });
        this.editor.setValue(preferences['text'] || '')

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
                m(".card-header.text-left[id='subsetCustomLabel']", {
                        style: {
                            "width": "14em",
                            "float": "left"
                        }
                    },
                    m("h3.card-title", "View Query String")
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