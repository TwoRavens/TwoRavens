import m from 'mithril';
import * as app from '../app';
import * as common from '../../../common/common';
import Table from '../../../common/views/Table';

export default class CanvasDatasets {
    oninit() {
        this.dataset = app.dataset;
    }

    view(vnode) {
        let {display} = vnode.attrs;
        let bold = (value) => m('div', {style: {'font-weight': 'bold'}}, value);
        let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank'}, url);

        let cline_citation = [
            bold('Data Citation: '),
            'Althaus, Scott, Joseph Bajjalieh, John F. Carter, Buddy Peyton, and Dan  A. Shalmon. 2017. Cline Center Historical Phoenix Event Data. v.1.0.0. Distributed by Cline Center for Advanced Social Research. June 30. ',
            link('http://www.clinecenter.illinois.edu/data/event/phoenix/'), '.',
            bold('Codebook Citation: '),
            'Althaus, Scott, Joseph Bajjalieh, John F. Carter, Buddy Peyton, and Dan A. Shalmon. 2017. "Cline Center Historical Phoenix Event Data Variable Descriptions". Cline Center Historical Phoenix Event Data. v.1.0.0. Cline Center for Advanced Social Research. June 30. ',
            link('http://www.clinecenter.illinois.edu/data/event/phoenix/'), '.',
        ];

        let datasets = [
            {
                name: 'UTDallas - Real Time Phoenix Data',
                key: 'phoenix_rt',
                content: m("p", "A real-time Phoenix-coded event dataset constructed at The University of Texas at Dallas."),
                interval: 'Oct. 2017 - present',
                citation: [
                    bold('Data Citation: '),
                    'Brandt, Patrick T., Vito D’Orazio, Jennifer Holmes, Latifur Khan, Vincent Ng. 2018. "Phoenix real time event data." University of Texas Dallas, ',
                    link('http://eventdata.utdallas.edu'), '.'
                ]
            },
            {
                name: 'Cline - New York Times',
                key: 'cline_phoenix_nyt',
                content: m("p", "This data is sourced from the New York Times and collected by the Cline Center for Advanced Social Research."),
                interval: '1945 - 2005',
                citation: cline_citation
            },
            {
                name: 'Cline - CIA Broadcast',
                key: 'cline_phoenix_fbis',
                content: m("p", "This data is sourced from the CIA Foreign Broadcast Information Service and collected by the Cline Center for Advanced Social Research."),
                interval: '1995 - 2004',
                citation: cline_citation
            },
            {
                name: 'Cline - BBC Summary',
                key: 'cline_phoenix_swb',
                content: m("p", "This data is sourced from the BBC Summary of World Broadcasts and collected by the Cline Center for Advanced Social Research."),
                interval: '1979 - 2015',
                citation: cline_citation
            },
            {
                name: 'ICEWS',
                key: 'icews',
                content: m("p", "Event data consists of coded interactions between socio-political actors (i.e., cooperative or hostile actions between individuals, groups, sectors and nation states)."),
                interval: '1995 - Sep. 2016',
                citation: [
                    bold('Data Citation: '),
                    'Boschee, Elizabeth; Lautenschlager, Jennifer; O\'Brien, Sean; Shellman, Steve; Starz, James; Ward, Michael, 2015, "ICEWS Coded Event Data", ',
                    link('https://doi.org/10.7910/DVN/28075'), ', Harvard Dataverse, V22'
                ]
            }
        ];

        return m('div#canvasDatasets', {style: {display: display, width: '100%'}}, datasets.map((dataset) => {
            return m('div', {
                    style: {
                        width: '100%',
                        background: this.dataset === dataset.key ? common.menuColor : '#f0f0f0',
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.borderColor
                    },
                    onclick: () => this.dataset = dataset.key
                },
                m('h4', [
                    dataset.name,
                    m('button.btn.btn-default[type="button"]', {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: () => {app.setDataset(dataset.key, dataset.name); app.setOpMode('subset')},
                        disabled: app.dataset === dataset.key
                    }, 'Load' + (app.dataset === dataset.key ? 'ed' : ''))
                ]),
                dataset.content,
                this.dataset === dataset.key && [
                    m(Table, {
                       data: {
                           'API Reference Key': dataset.key,
                           'Time Interval': dataset.interval
                       }
                    }),
                    dataset.citation
                ]
            )
        }))
    }
}
