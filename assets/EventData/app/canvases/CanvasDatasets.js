import m from 'mithril';
import * as app from '../app';
import * as common from '../../../common-eventdata/common';
import Table from '../../../common-eventdata/views/Table';
import ListTags from "../../../common-eventdata/views/ListTags";
import Button from '../../../common-eventdata/views/Button';

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

        let columnFilter = (columns) => columns.map(column => column.replace('_constructed', ''));

        let tempDataset = this.dataset ? app.genericMetadata[this.dataset] : {};

        let colgroupDataset = () => {
            return m('colgroup',
                m('col', {span: 1}),
                m('col', {span: 1}),
                m('col', {span: 1}),
                m('col', {span: 1, width: '50%'}));
        };

        return m('div#canvasDatasets', {
            style: {
                display: display,
                width: '100%',
                'margin-bottom': common.panelMargin
            }
        }, Object.values(app.genericMetadata).sort((a, b) => a.key.localeCompare(b.key)).map((dataset) => m('div', {
                style: {
                    width: '100%',
                    background: this.dataset === dataset['key'] ? common.menuColor : '#f0f0f0',
                    'box-shadow': '#0003 0px 2px 3px',
                    'margin-top': common.panelMargin,
                    'padding': '10px',
                    'border': common.borderColor
                },
                onclick: () => this.dataset = dataset['key'],
                ondblclick: () => this.dataset = undefined
            },
            m('h4', [
                dataset['name'],
                m(Button, {
                    id: 'btnLoad' + dataset['name'],
                    style: {margin: '0 0.25em', float: 'right'},
                    onclick: () => {
                        app.setSelectedDataset(dataset['key']);
                        app.setSelectedMode('subset')
                    },
                    disabled: app.selectedDataset === dataset['key']
                }, 'Load' + (app.selectedDataset === dataset['key'] ? 'ed' : '')),
                m(Button, {
                    id: 'btnDownload' + dataset['key'],
                    style: {margin: '0 0.25em', float: 'right'},
                    onclick: async () => {
                        if (!(confirm("Warning, this will download the entire dataset. It may take some time."))) return;
                        app.setLaddaSpinner('btnDownload' + dataset['key'], true);
                        let variables = [...app.genericMetadata[dataset.key]['columns'], ...app.genericMetadata[dataset.key]['columns_constructed']];
                        let query = [
                            {"$project": variables.reduce((out, variable) => {out[variable] = 1;return out;}, {_id: 0})}
                        ];
                        await app.download('subset', dataset['key'], query);
                        app.laddaStopAll();
                    }
                }, 'Download')
            ]),
            dataset['description'],
            this.dataset === dataset['key'] && [
                m(Table, {
                    data: {
                        'API Reference Key': dataset['key'],
                        'Time Interval': dataset['interval'],
                        'Codebook': link(dataset['codebook'])
                    },
                    attrsCells: {style: {'padding': '5px'}}
                }),
                bold("Subsets:"),
                m(Table, {
                    headers: ['label', 'subset', 'alignments', 'formats', 'columns'].map(name => m('[style=margin:0 0.5em]', name)),
                    data: Object.keys(tempDataset['subsets'] || {}).map(label => {

                        let {alignments, formats, columns} = app.getSubsetMetadata(this.dataset, label);

                        return [
                            label,
                            tempDataset['subsets'][label]['type'],
                            alignments.length !== 0 && m(ListTags, {
                                tags: alignments,
                                readonly: true,
                                attrsTags: {style: {'padding-left': '4px', background: 'rgba(192, 192, 192, 0.5)'}}
                            }),
                            formats.length !== 0 && m(ListTags, {
                                tags: formats,
                                readonly: true,
                                attrsTags: {style: {'padding-left': '4px', background: 'rgba(192, 192, 192, 0.5)'}}
                            }),
                            columns.length !== 0 && m(ListTags, {
                                tags: columnFilter(columns),
                                readonly: true,
                                attrsTags: {style: {'padding-left': '4px', background: 'rgba(192, 192, 192, 0.5)'}}
                            })
                        ]
                    }),
                    attrsCells: {
                        style: {
                            padding: '0.1em 0.5em 0.1em 0.5em',
                            'border-right': 'dotted 1px rgba(192, 192, 192, 0.5)',
                            'border-left': 'dotted 1px rgba(192, 192, 192, 0.5)'
                        }
                    },
                    tableTags: colgroupDataset()
                }),
                dataset['citations'].map(citation => [m('br'), bold("Citation:"), m('br'), format(citation)])
            ])
        ))
    }
}
