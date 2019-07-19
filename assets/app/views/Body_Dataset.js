import m from 'mithril';
import Table from "../../common/views/Table";
import Header from "../../common/views/Header";
import Canvas from "../../common/views/Canvas";
import {heightHeader} from "../../common/common";
import * as app from '../app';
import {preformatted} from "../index";


export default class Body_Dataset {
    async oninit() {
        await app.load();

        let response = await m.request({
            method: 'POST',
            url: ROOK_SVC_URL + 'reportGeneratorApp',
            data: {
                dataset: app.datasetSummary,
                variables: app.variableSummaries
            }
        });

        this.reportURL = ROOK_SVC_URL + response.report_url;
        m.redraw()
    }

    view(vnode) {
        let {id, image} = vnode.attrs;

        return [
            m(Header, {image}, app.workspace && [
                m('div', {style: {'flex-grow': 1}}),
                m("h4#dataName", app.workspace.d3m_config.name),
                m('div', {style: {'flex-grow': 1}}),
            ]),
            m(Canvas, {
                    attrsAll: {
                        id: 'canvas' + id,
                        style: {
                            'padding-left': 0,
                            'padding-right': 0,
                            'margin-top': heightHeader + 'px',
                            height: `calc(100% - ${heightHeader})`
                        }
                    }
                },
                app.workspace && m('div', {
                    style: {
                        'max-width': '1000px',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                        margin: '1em auto'
                    }
                },
                m(Table, {
                    data: Object.entries(app.workspace.datasetDoc.about)
                        .map(row => [row[0], preformatted(row[1])])
                })),


                this.error,
                this.reportURL && m("object", {
                    "id": "pdf-viewer-object",
                    "type": "application/pdf",
                    "alt": "pdf",
                    "pluginspage": "http://www.adobe.com/products/acrobat/readstep2.html",
                    "width": "100%",
                    "height": "100%",
                    data: this.reportURL
                },
                m("p", "It appears you don't have a PDF plugin for this browser.",
                    m("a", {"id": "pdf-alternate-url", href: this.reportURL},
                        "Click here to download the PDF file.")
                )))
        ]
    }
}