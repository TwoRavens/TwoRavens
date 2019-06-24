import m from 'mithril';
import Table from "../../common/views/Table";
import Header from "../../common/views/Header";
import Canvas from "../../common/views/Canvas";
import {heightHeader} from "../../common/common";
import * as app from '../app';


export default class BodyDataset {
    oninit() {
        app.load().then(m.redraw)
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
            }, app.workspace && m('div', {
                style: {
                    'max-width': '1000px',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                    margin: '1em auto'
                }
            }, m(Table, {
                data: app.workspace.datasetDoc.about,
            }))
            )
        ]
    }
}