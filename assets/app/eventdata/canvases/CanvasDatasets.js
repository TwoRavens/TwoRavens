import m from 'mithril';
import * as eventdata from '../eventdata';

import * as common from '../../../common/common';
import Table from '../../../common/views/Table';
import ListTags from "../../../common/views/ListTags";
import Button from '../../../common/views/Button';

export default class CanvasDatasets {
    oninit() {
        this.dataset = eventdata.selectedDataset;
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

        let columnFilter = (columns) => columns.map(column => column.replace('TwoRavens_', ''));

        let tempDataset = this.dataset ? eventdata.genericMetadata[this.dataset] : {};

        let colgroupDataset = () => {
            return m('colgroup', {key: 'colgrouper'},
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
        }, Object.values(eventdata.genericMetadata).sort((a, b) => a.key.localeCompare(b.key)).map((dataset) => m('div', {
                style: {
                    width: '100%',
                    background: this.dataset === dataset['key'] ? common.colors.menu : '#f0f0f0',
                    'box-shadow': '#0003 0px 2px 3px',
                    'margin-top': common.panelMargin,
                    'padding': '10px',
                    'border': common.colors.border
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
                        eventdata.setSelectedDataset(dataset['key']);
                        eventdata.setSelectedMode('subset');
                        m.redraw();
                    },
                    disabled: eventdata.selectedDataset === dataset['key']
                }, 'Load' + (eventdata.selectedDataset === dataset['key'] ? 'ed' : '')),

                /*
                m(Button, {
                    id: 'btnReturnToSubset' + dataset['name'],
                    style: {margin: '0 0.25em', float: 'right',
                            display: eventdata.selectedDataset === dataset['key'] ? 'inline' : 'none'},
                    onclick: () => {
                        eventdata.setSelectedDataset(dataset['key']);
                        eventdata.setSelectedMode('subset');
                    }
                  }, 'Return to Subset'),
                  */

                // 2/20/2020 - remove download button by adding 'false'
                false && 'download' in dataset && m(Button, {
                    id: 'btnDownload' + dataset['key'],
                    style: {margin: '0 0.25em', float: 'right'},
                    onclick: () => window.open(dataset['download'], '_blank')
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
                    keyed: true,
                    headers: ['label', 'subset', 'alignments', 'formats', 'columns'].map(name => m('[style=margin:0 0.5em]', name)),
                    data: Object.keys(tempDataset['subsets'] || {}).map(label => {

                        let {alignments, formats, columns} = eventdata.getSubsetMetadata(this.dataset, label);

                        return [
                            label,
                            tempDataset['subsets'][label]['type'],
                            alignments.length !== 0 && m(ListTags, {
                                tags: alignments,
                                attrsTags: {style: {'padding-left': '4px', background: 'rgba(192, 192, 192, 0.5)'}}
                            }),
                            formats.length !== 0 && m(ListTags, {
                                tags: formats,
                                attrsTags: {style: {'padding-left': '4px', background: 'rgba(192, 192, 192, 0.5)'}}
                            }),
                            columns.length !== 0 && m(ListTags, {
                                tags: columnFilter(columns),
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
