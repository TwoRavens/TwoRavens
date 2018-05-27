import m from 'mithril';
import * as app from '../app';
import * as common from '../../../common/common'

export default class CanvasDatasets {
    view(vnode) {
        let {display} = vnode.attrs;
        let cline_citation = [
            m('div', {style: {'font-weight': 'bold'}}, 'Data citation: '),
            'Althaus, Scott, Joseph Bajjalieh, John F. Carter, Buddy Peyton, and Dan  A. Shalmon. 2017. Cline Center Historical Phoenix Event Data. v.1.0.0. Distributed by Cline Center for Advanced Social Research. June 30. http://www.clinecenter.illinois.edu/data/event/phoenix/.',
            m('div', {style: {'font-weight': 'bold'}}, 'Codebook citation: '),
            'Althaus, Scott, Joseph Bajjalieh, John F. Carter, Buddy Peyton, and Dan A. Shalmon. 2017. "Cline Center Historical Phoenix Event Data Variable Descriptions". Cline Center Historical Phoenix Event Data. v.1.0.0. Cline Center for Advanced Social Research. June 30. http://www.clinecenter.illinois.edu/data/event/phoenix/.'
        ];

        let datasets = [
            {
                name: 'Phoenix - UTDallas',
                key: 'phoenix_rt',
                url: 'http://eventdata.utdallas.edu/',
                content: m("p", "A real-time Phoenix-coded event dataset constructed at The University of Texas at Dallas.")
            },
            {
                name: 'Cline - New York Times',
                key: 'cline_phoenix_nyt',
                url: 'http://www.clinecenter.illinois.edu/data/event/phoenix/',
                content: m("p", "This data is sourced from the New York Times and collected by the Cline Center for Advanced Social Research."),
                citation: cline_citation
            },
            {
                name: 'Cline - CIA Broadcast',
                key: 'cline_phoenix_fbis',
                url: 'http://www.clinecenter.illinois.edu/data/event/phoenix/',
                content: m("p", "This data is sourced from the CIA Foreign Broadcast Information Service and collected by the Cline Center for Advanced Social Research."),
                citation: cline_citation
            },
            {
                name: 'Cline - BBC Summary',
                key: 'cline_phoenix_swb',
                url: 'http://www.clinecenter.illinois.edu/data/event/phoenix/',
                content: m("p", "This data is sourced from the BBC Summary of World Broadcasts and collected by the Cline Center for Advanced Social Research."),
                citation: cline_citation
            },
            {
                name: 'ICEWS',
                key: 'icews',
                url: 'https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/28075',
                content: m("p", "Event data consists of coded interactions between socio-political actors (i.e., cooperative or hostile actions between individuals, groups, sectors and nation states)."),
                citation: [
                    m('div', {style: {'font-weight': 'bold'}}, 'Data citation: '),
                    'Boschee, Elizabeth; Lautenschlager, Jennifer; O\'Brien, Sean; Shellman, Steve; Starz, James; Ward, Michael, 2015, "ICEWS Coded Event Data", https://doi.org/10.7910/DVN/28075, Harvard Dataverse, V22'
                ]
            }
        ];

        return m('div#canvasDatasets', {style: {display: display}}, datasets.map((dataset) => {
            return m('div', {
                    style: {
                        width: '100%',
                        background: dataset.key === app.dataset ? common.grayColor : common.menuColor,
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.borderColor
                    },
                    onclick: () => app.setDataset(dataset.key)
                },
                m('h4', [
                    dataset.name,
                    m('button.btn.btn-default[type="button"]', {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: () => app.setOpMode('subset')
                    }, 'Load'),
                    m('button.btn.btn-default[type="button"]', {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: (e) => {e.stopPropagation(); window.open(dataset.url);}
                    }, 'Origin')
                ]),
                dataset.content,
                app.dataset === dataset.key && dataset.citation
            )
        }))
    }
}
