import m from 'mithril';
import * as common from '../../../common/common';
import TextField from "../../../common/views/TextField";
import Table from "../../../common/views/Table";
import Button from "../../../common/views/Button";

import * as eventdata from "../eventdata";
import {alertError} from "../../app";

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

        let response = await m.request({
            url: '/eventdata/api/' + (Object.keys(search).length === 0 ? 'list' : 'search'),
            body: search,
            method: 'POST'
        });

        if (response.success) preferences['results'] = response.data.query_list;
        else preferences['results'] = [];
    }

    async getQuery(preferences, id) {
        if (this.result === id) return;

        this.result = id;
        delete preferences['query'];
        let response = await m.request({
            url: '/eventdata/api/get/' + id,
            type: 'GET'
        });
        if (response.success && response.data.id === this.result)
            preferences['query'] = response.data.query;
        else alertError(response.message);
    }

    view(vnode) {
        let {preferences} = vnode.attrs;
        let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
        let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);
        let italicize = (value) => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);

        if (!isAuthenticated) {
            return m('#canvasSavedQueries', {
                style: {'margin-top': common.panelMargin, 'margin-bottom': common.panelMargin}
            }, m('h4', 'You must be logged in to view your saved queries.'))
        }


        return m('#canvasSavedQueries', {
                style: {'margin-top': common.panelMargin, 'margin-bottom': common.panelMargin}
            },
            ['name', 'description'].map(searchType =>
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
                        background: this.result === result.id ? common.colors.menu : '#f0f0f0',
                        'box-shadow': '#0003 0px 2px 3px',
                        'margin-top': common.panelMargin,
                        'padding': '10px',
                        'border': common.colors.border
                    },
                    onclick: () => this.getQuery(preferences, result.id),
                    ondblclick: () => this.result = undefined
                },
                m('h4', result['name'],
                    m(Button, {
                        id: 'btnDownload' + result.id,
                        'data-style': 'zoom-in',
                        'data-spinner-color': '#818181',
                        class: 'ladda-button',
                        style: {margin: '0 0.25em', float: 'right'},
                        onclick: async (e) => {
                            e.stopPropagation();
                            eventdata.setLaddaSpinner('btnDownload' + result.id, true);
                            if (this.result !== result.id || !preferences['query']) await this.getQuery(preferences, result.id);
                            await eventdata.download(result.collection_name, JSON.stringify(preferences['query']))
                                .finally(() => eventdata.setLaddaSpinner('btnDownload' + result.id, false));
                        }
                    }, 'Download')
                ),
                result.description,
                this.result === result.id && [
                    m(Table, {
                        data: {
                            'Dataset': result['collection_name'],
                            'Result Count': result['result_count'],
                            'Dataset Type': result['collection_type'],
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
                        m('div', {style: {'word-break': 'break-all'}}, JSON.stringify(preferences['query']))
                    ]
                ])
            )
        )
    }
}