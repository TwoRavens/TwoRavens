import m from 'mithril';
import * as app from '../app';
import * as common from '../../../common/common';
import Table from '../../../common/views/Table';
import ListTags from "../../../common/views/ListTags";

export default class CanvasDatasets {
    oninit() {
        this.dataset = app.selectedDataset;
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

        let coerceArray = (value) => Array.isArray(value) ? value : [value];

        let tempDataset = this.dataset ? app.genericMetadata[this.dataset] : {};

        let colgroupDataset = () => {
            return m('colgroup',
                m('col', {span: 1}),
                m('col', {span: 1}),
                m('col', {span: 1}),
                m('col', {span: 1, width: '50%'}));
        };

        return m('div#canvasDatasets', {style: {display: display, width: '100%'}}, Object.values(app.genericMetadata).map((dataset) => {
            return m('div', {
                    style: {
                        width: '100%',
                        background: this.dataset === dataset['key'] ? common.menuColor : '#f0f0f0',
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.borderColor
                    },
                    onclick: () => this.dataset = dataset['key']
                },
                m('h4', [
                    dataset['name'],
                    m('button.btn.btn-default[type="button"]', {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: () => {
                            app.setSelectedDataset(dataset['key']);
                            app.setSelectedMode('subset')
                        },
                        disabled: app.selectedDataset === dataset['key']
                    }, 'Load' + (app.selectedDataset === dataset['key'] ? 'ed' : ''))
                ]),
                dataset['description'],
                this.dataset === dataset['key'] && [
                    m(Table, {
                        data: {
                            'API Reference Key': dataset['key'],
                            'Time Interval': dataset['interval']
                        }
                    }),
                    m(Table, {
                        headers: ['label', 'subset', 'format', 'columns'],
                        data: Object.keys(tempDataset['subsets'] || {}).map(label => [
                            label,
                            tempDataset['subsets'][label]['type'],
                            tempDataset['subsets'][label]['format'],
                            m(ListTags, {
                                tags: coerceArray(tempDataset['subsets'][label]['columns']),
                                readonly: true,
                                attrsTags: {style: {padding: '2px 4px'}}
                            })
                        ]),
                        attrsCells: {style: {padding: '0.1em 1em'}},
                        tableTags: colgroupDataset()
                    }),
                    dataset['citations'].map(citation => [m('br'), bold("Citation:"), m('br'), format(citation)])
                ]
            )
        }))
    }
}
