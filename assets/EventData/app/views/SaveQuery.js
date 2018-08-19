import m from 'mithril';

import * as app from '../app';
import * as query from '../query';
import Table from '../../../common-eventdata/views/Table';
import TextField from '../../../common-eventdata/views/TextField'
import Button from "../../../common-eventdata/views/Button";
// import ButtonRadio from '../../../common-eventdata/views/ButtonRadio';

export default class SaveQuery {
    oninit(vnode) {

        let stagedSubsetData = [];
        for (let child of app.abstractQuery) {
            if (child.type === 'query') {
                stagedSubsetData.push(child)
            }
        }

        let queryMongo;
        if (app.selectedMode === 'subset') {
            let variables = app.selectedVariables.size === 0
                ? [...app.genericMetadata[app.selectedDataset]['columns'], ...app.genericMetadata[app.selectedDataset]['columns_constructed']]
                : [...app.selectedVariables, ...app.selectedConstructedVariables];
            queryMongo = [
                {"$match": query.buildSubset(app.abstractQuery)},
                {
                    "$project": variables.reduce((out, variable) => {
                        out[variable] = 1;
                        return out;
                    }, {'_id': 0})
                }
            ];
        }
        else if (app.selectedMode === 'aggregate')
            queryMongo = query.buildAggregation(stagedSubsetData, app.subsetPreferences);

        let {preferences} = vnode.attrs;
        // set the static preferences upon initialization
        Object.assign(preferences, {
            'query': queryMongo,
            'username': app.username,
            'collection_name': app.selectedDataset,
            'collection_type': app.selectedMode,
            'result_count': {
                'subset': app.totalSubsetRecords,
                'aggregate': (app.aggregationData || []).length
            }[app.selectedMode]
        });
        // if (!('saved_to_dataverse' in preferences)) preferences['saved_to_dataverse'] = false;
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
            // 'Save to Dataverse': m(ButtonRadio, {
            //     id: 'modeButtonBar',
            //     attrsAll: {style: {width: 'auto', margin: '.25em 1em', float: 'left'}},
            //     onclick: (value) => {
            //         if (preferences['saved_to_dataverse'] === (value === 'true')) return;
            //         preferences['saved_to_dataverse'] = value === 'true';
            //         this.saved = false;
            //     },
            //     activeSection: (preferences['saved_to_dataverse'] || 'false') + '',
            //     sections: [{value: 'true'}, {value: 'false'}]
            // }),
            'Username': format([
                preferences['username'],
                preferences['username'] === undefined && warn('Please log in to save queries.')]),
            'Dataset': format(preferences['collection_name']),
            'Result Count': format([
                preferences['result_count'],
                preferences['result_count'] === 0 && warn('The query does not match any data.')]),
            'Query': format([
                JSON.stringify(preferences['query']),
                app.abstractQuery.filter(branch => branch.type !== 'query').length !== 0 && warn('Take note that subsets that are not grouped under a query are not included. Click update in the query summary to group them under a query.')])
        };

        let invalids = {
            'query': '',
            'username': '',
            'collection_name': '',
            'collection_type': '',
            'result_count': 0,
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
                    if (response.success) {
                        this.status = 'Saved as query ID ' + response.data.id;
                        this.saved = true;
                    }
                    else this.status = response.message;
                }
            }, this.saved ? 'Saved' : 'Save Query'),
            this.status && m('[style=display:inline-block;margin-left:1em;]', this.status),
            m(Table, {id: 'saveQueryTable', data: tableData}))
    }
}