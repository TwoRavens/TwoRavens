import m from 'mithril';
import * as app from '../app';
import * as common from '../../../common/common';
import Table from '../../../common/views/Table';

export default class CanvasDatasets {
    oninit() {
        this.dataset = app.datasetKey;
    }

    view(vnode) {
        let {display} = vnode.attrs;

        // styling
        let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
        let italicize = (value) => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
        let quote = (value) => '"' + value + '"';
        let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);

        // create a citation
        let markup = (key) => ({"title": italicize, "note": quote, "url": link}[key] || (_ => _));
        let format = (citation) => Object.keys(citation).map(key => [markup(key)(citation[key]), '. ']);

        return m('div#canvasDatasets', {style: {display: display, width: '100%'}}, app.metadata.map((dataset) => {
            return m('div', {
                    style: {
                        width: '100%',
                        background: this.dataset === dataset['api_key'] ? common.menuColor : '#f0f0f0',
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.borderColor
                    },
                    onclick: () => this.dataset = dataset['api_key']
                },
                m('h4', [
                    dataset['name'],
                    m('button.btn.btn-default[type="button"]', {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: () => {
                            app.setDataset(dataset['api_key'], dataset['name']);
                            app.setOpMode('subset')
                        },
                        disabled: app.datasetKey === dataset['api_key']
                    }, 'Load' + (app.datasetKey === dataset['api_key'] ? 'ed' : ''))
                ]),
                dataset['description'],
                this.dataset === dataset['api_key'] && [
                    m(Table, {
                        data: {
                            'API Reference Key': dataset['api_key'],
                            'Time Interval': dataset['interval']
                        }
                    }),
                    dataset['citations'].map(citation => [m('br'), bold("Citation:"), m('br'), format(citation)])
                ]
            )
        }))
    }
}
