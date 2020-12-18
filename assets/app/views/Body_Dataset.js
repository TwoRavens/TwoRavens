import m from 'mithril';
import Table from "../../common/views/Table";
import Header from "../../common/views/Header";
import Canvas from "../../common/views/Canvas";
import {heightHeader} from "../../common/common";
import * as app from '../app';
import * as utils from '../utils';


export default class Body_Dataset {
    async oninit() {
        await app.load({awaitPreprocess: true});

        let response = await m.request({
            method: 'POST',
            url: ROOK_SVC_URL + 'report.app',
            body: {
                metadata: JSON.stringify({
                    dataset: app.datasetSummary,
                    variables: app.variableSummaries
                }),
                timeout: 60 * 3
            }
        });

        this.reportURL = D3M_SVC_URL + '/download-report-file?' + m.buildQueryString({
            data_pointer: response.report_url,
            content_type: 'application/pdf'
        });
        m.redraw()
    }

    view(vnode) {
        let {id, image} = vnode.attrs;

        if (!app.workspace) return;

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
                m('div', {
                    style: {
                        'max-width': '1000px',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                        margin: '1em auto'
                    }
                },
                app.workspace.datasetDoc && m(Table, {
                    data: Object.entries(app.workspace.datasetDoc.about)
                        .map(row => [row[0], utils.preformatted(row[1])])
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
