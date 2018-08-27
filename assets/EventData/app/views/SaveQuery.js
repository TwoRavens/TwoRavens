import m from 'mithril';

import * as app from '../app';
import * as queryMongo from '../queryMongo';
import Table from '../../../common-eventdata/views/Table';
import TextField from '../../../common-eventdata/views/TextField'
import Button from "../../../common-eventdata/views/Button";
import ButtonRadio from '../../../common-eventdata/views/ButtonRadio';

export default class SaveQuery {
    oninit(vnode) {

        let query;
        if (app.selectedMode === 'subset') {
            let projectStep = {
                type: 'menu',
                metadata: {
                    variables: (app.selectedVariables.size + app.selectedConstructedVariables.size) === 0
                        ? [...app.genericMetadata[app.selectedDataset]['columns'], app.genericMetadata[app.selectedDataset]['columns_constructed']]
                        : [...app.selectedVariables, ...app.selectedConstructedVariables]
                }
            };
            query = queryMongo.buildPipeline(app.abstractManipulations, projectStep)['pipeline'];
        }

        if (app.selectedMode === 'aggregate')
            query = queryMongo.buildPipeline(app.abstractManipulations, app.eventdataAggregateStep)['pipeline'];

        let {preferences} = vnode.attrs;
        // set the static preferences upon initialization
        Object.assign(preferences, {
            'query': query,
            'username': app.username,
            'collection_name': app.selectedDataset,
            'collection_type': app.selectedMode,
            'result_count': {
                'subset': app.totalSubsetRecords,
                'aggregate': (app.aggregationData || []).length
            }[app.selectedMode]
        });
        if (!('save_to_dataverse' in preferences)) preferences['save_to_dataverse'] = false;
    }

    view(vnode) {
        let {preferences} = vnode.attrs;

        let format = (text) => m('[style=margin-left:1em;text-align:left;word-break:break-all;width:100%]', text);
        let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-left:1em;]', text);

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
                preferences['username'] === undefined && warn('Please log in to save queries.')]),
            'Dataset': format(preferences['collection_name']),
            'Result Count': format([
                preferences['result_count'],
                preferences['result_count'] === 0 && warn('The query does not match any data.')]),
            'Query': format([
                JSON.stringify(preferences['query']),
                app.pendingSubset.abstractQuery.length !== 0 && warn('Take note that subsets that are not grouped under a query are not included. Click update in the query summary to group them under a query.')])
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
                        data: preferences,
                        method: 'POST'
                    });
                    if (!response.success) {
                        this.status = response.message;
                        return;
                    }
                    this.status = 'Saved as query ID ' + response.data.id;
                    this.saved = true;

                    if (!preferences['save_to_dataverse']) return;

                    await m.request({
                        url: 'eventdata/api/upload-dataverse/' + response.data.id,
                        method: 'GET'
                    });
                    await m.request({
                        url: 'eventdata/api/publish-dataset/' + response.data.id,
                        method: 'GET'
                    })
                }
            }, this.saved ? 'Saved' : 'Save Query'),
            this.status && m('[style=display:inline-block;margin-left:1em;]', this.status),
            m(Table, {id: 'saveQueryTable', data: tableData}))
    }
}