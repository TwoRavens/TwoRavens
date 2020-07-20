import m from 'mithril';

import * as eventdata from './eventdata';
import {looseSteps} from "../app";

import * as queryMongo from '../manipulations/queryMongo';
import Table from '../../common/views/Table';
import TextField from '../../common/views/TextField'
import Button from "../../common/views/Button";
import ButtonRadio from '../../common/views/ButtonRadio';

export default class SaveQuery {
    oninit(vnode) {

        let {pipeline, preferences} = vnode.attrs;

        let query;
        if (eventdata.selectedMode === 'subset') {
            let projectStep = {
                type: 'menu',
                metadata: {
                    type: 'data',
                    variables: (eventdata.selectedVariables.size + eventdata.selectedConstructedVariables.size) === 0
                        ? [
                            ...eventdata.genericMetadata[eventdata.selectedDataset]['columns'],
                            ...eventdata.genericMetadata[eventdata.selectedDataset]['columns_constructed']
                        ] : [
                            ...eventdata.selectedVariables,
                            ...eventdata.selectedConstructedVariables
                        ]
                }
            };
            query = queryMongo.buildPipeline([...pipeline, projectStep])['pipeline'];
        }

        if (eventdata.selectedMode === 'aggregate')
            query = queryMongo.buildPipeline([...pipeline, looseSteps['eventdataAggregate']])['pipeline'];

        // set the static preferences upon initialization
        Object.assign(preferences, {
            'query': query,
            'username': username,
            'collection_name': eventdata.selectedDataset,
            'collection_type': eventdata.selectedMode,
            'result_count': {
                'subset': eventdata.totalSubsetRecords,
                'aggregate': (eventdata.tableData || []).length
            }[eventdata.selectedMode]
        });
        if (!('save_to_dataverse' in preferences)) preferences['save_to_dataverse'] = false;
    }

    view(vnode) {
        let {preferences} = vnode.attrs;

        let format = (text) => m('[style=margin-left:1em;text-align:left;word-break:break-all;width:100%]', text);
        let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;margin-right:0.5em]', text);

        let tableData = {
            'Query Name': m(TextField, {
                value: preferences['name'] || '',
                class: (preferences['name'] || '').length === 0 && ['required-form'],
                oninput: (value) => {
                    this.saved = false;
                    preferences['name'] = value;
                }
            }),
            'Description': m(TextField, {
                value: preferences['description'] || '',
                class: (preferences['description'] || '').length === 0 && ['required-form'],
                oninput: (value) => {
                    this.saved = false;
                    preferences['description'] = value;
                }
            }),
            'Save to Dataverse': m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {width: 'auto', margin: '.25em 1em', float: 'left'}},
                onclick: (value) => {
                    if (preferences['save_to_dataverse'] === (value === 'true')) return;
                    preferences['save_to_dataverse'] = value === 'true';
                    this.saved = false;
                },
                activeSection: (preferences['save_to_dataverse'] || 'false') + '',
                sections: [{value: 'true'}, {value: 'false'}]
            }),
            'Username': format([
                preferences['username'],
                !isAuthenticated && warn('Please log in to save queries.')]),
            'Dataset': format(preferences['collection_name']),
            'Result Count': format([
                preferences['result_count'],
                preferences['result_count'] === 0 && warn('The query does not match any data.')]),
            'Query': format([
                JSON.stringify(preferences['query']),
                looseSteps['pendingSubset'].abstractQuery.length !== 0 && warn('Take note that subsets that are not grouped under a query are not included. Click update in the query summary to group them under a query.')])
        };

        let invalids = {
            'query': '',
            'username': '',
            'collection_name': '',
            'collection_type': '',
            'result_count': 0,
            'save_to_dataverse': '',
            'name': '',
            'description': ''
        };

        let disabled = this.saved || !Object.keys(invalids).map(key =>
            key in preferences && preferences[key] !== undefined && invalids[key] !== preferences[key]).every(_ => _);

        return m('div',
            m(Button, {
                disabled: disabled,
                onclick: async () => {
                    if (disabled) return;

                    let response = await m.request({
                        url: '/eventdata/api/add-query',
                        body: preferences,
                        method: 'POST'
                    });
                    this.errors = response.errors;
                    if (!response.success) {
                        this.status = response.message;
                        return;
                    }
                    this.status = 'Saved as query ID ' + response.data.id;
                    this.saved = true;
                    m.redraw();

                    if (!preferences['save_to_dataverse']) return;

                    response = await m.request({
                        url: 'eventdata/api/upload-dataverse/' + response.data.id,
                        method: 'GET'
                    });
                    this.status = response.message;
                    this.errors = response.errors;
                    m.redraw();
                    if (!response.success) {
                        return;
                    }

                    response = await m.request({
                        url: 'eventdata/api/publish-dataset/' + response.data.id,
                        method: 'GET'
                    }).catch(err => this.status = err);
                    this.status = response.message;
                    this.errors = response.errors;
                    m.redraw();
                }
            }, this.saved ? 'Saved' : 'Save Query'),
            this.status && m('[style=display:inline-block;margin-left:1em;]', this.status), m('br'),
            this.errors && m('div[style=margin:1em]', Object.keys(this.errors).map(field => [
                warn(`Error related to ${field}: `), this.errors[field].join(' '), m('br')
            ])),
            m(Table, {id: 'saveQueryTable', data: tableData})
        )
    }
}