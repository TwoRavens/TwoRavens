import m from 'mithril';
import * as common from '../../../common-eventdata/common';
import TextField from "../../../common-eventdata/views/TextField";
import Table from "../../../common-eventdata/views/Table";
import Button from "../../../common-eventdata/views/Button";

import * as app from "../app";

let searchLag = 500;


export default class CanvasSavedQueries {
    oninit(vnode) {
        this.searchTimeout = null;
        this.result = undefined;
        let {preferences} = vnode.attrs;

        preferences['search'] = preferences['search'] || {};

        if (preferences['results'] === undefined) {
            preferences['results'] = [];
            this.search(preferences);
        }
    }

    async search(preferences) {
        let search = Object.keys(preferences['search']).reduce((out, entry) => {
            if (entry in preferences['search'] && preferences['search'][entry] !== '')
                out[entry] = preferences['search'][entry];
            return out;
        }, {});

        let url = '/eventdata/api/' + (Object.keys(search).length === 0 ? 'list' : 'search');

        let response = await m.request({
            url: url,
            data: search,
            method: 'POST'
        });

        if (response.success) preferences['results'] = response.data;
        else preferences['results'] = [];
    }

    async getQuery(preferences, id) {

        this.result = id;
        delete preferences['query'];
        let response = await m.request({
            url: '/eventdata/api/get/' + id,
            type: 'GET'
        });
        if (response.success && response.data.id === this.result)
            preferences['query'] = response.data.query;
        else alert(response.message);
    }

    view(vnode) {
        let {preferences} = vnode.attrs;
        let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
        let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);
        let italicize = (value) => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);

        return m('#canvasSavedQueries', {style: {'margin-top': common.panelMargin}},
            ['name', 'description', 'username'].map(searchType =>
                m('div',
                    m(`label#labelSearch${searchType}`, {
                        for: 'search' + searchType,
                        style: {width: '5em', 'text-align': 'right', 'margin-right': '1em'}
                    }, searchType),

                    m(TextField, {
                        id: 'search' + searchType,
                        placeholder: 'Search ' + searchType,
                        value: preferences['search'][searchType] || '',
                        oninput: (search) => {
                            preferences['search'][searchType] = search;
                            clearTimeout(this.searchTimeout);
                            this.searchTimeout = setTimeout(() => this.search(preferences), searchLag);
                        },
                        style: {width: '50%', display: 'inline'}
                    }))),
            preferences['results'].map(result => m('div', {
                    style: {
                        width: '100%',
                        background: this.result === result.id ? common.menuColor : '#f0f0f0',
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.borderColor
                    },
                    onclick: this.result === result.id ? Function : () => this.getQuery(preferences, result.id)
                },
                m('h4', result['name'],
                    m(Button, {
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: async (e) => {
                            e.stopPropagation();
                            if (this.result !== result.id || !preferences['query']) await this.getQuery(preferences, result.id);
                            app.download(result.dataset_type, result.dataset, [{$match: preferences['query']}]);
                        }
                    }, 'Download')
                ),
                result.description,
                this.result === result.id && [
                    m(Table, {
                        data: {
                            'Dataset': result['dataset'],
                            'Result Count': result['result_count'],
                            'Dataset Type': result['dataset_type'],
                            'Username': result['username'],
                            'Created': new Date(result['created']).toLocaleString(),
                            'Modified': new Date(result['modified']).toLocaleString(),
                            'Dataverse Url': result['saved_to_dataverse']
                                ? link(result['dataverse_url'])
                                : italicize('Not saved to dataverse.'),
                            'TwoRavens ID': result['id']
                        },
                        attrsCells: {style: {'padding': '5px'}}
                    }),
                    preferences['query'] && [
                        bold("Query:"), m('br'),
                        JSON.stringify(preferences['query'])
                    ]
                ])
            )
        )
    }
}