import m from 'mithril';
import {grayColor} from "../../../common/common";
import {currentTab, waitForQuery} from "../subsets/Actor";
import TextField from '../../../common/views/TextField';
import * as app from "../app";


export default class MonadSelection {
    oninit() {
        this.defaultPageSize = 100;
    }

    search(subsetName, metadata, preferences, force = false) {

        const operator = '$and';

        let actorFilters = Object.keys(preferences['filters']).reduce((out, column) => {
            if (preferences['filters'][column].size === 0) return out;
            let filter = {};
            if (column in metadata['deconstruct']) filter[app.ontologyAlign(column)] = {
                '$regex': `^(.*${metadata['deconstruct'][column]})*(${[...preferences['filters'][column]].join('|')})`
            };
            else filter[app.ontologyAlign(column)] = {'$in': [...preferences['filters'][column]]};
            return out.concat([filter]);
        }, []);

        if (preferences['search'].length !== 0) {
            if ('token_length' in metadata && preferences['search'].length % metadata['token_length'] === 0) {
                const tags = preferences['search'].match(new RegExp(`.{${metadata['token_length']}}`, 'g'));
                actorFilters.push({
                    [app.ontologyAlign(metadata['full'])]: {'$regex': tags.map(tag => `(?=^(...)*${tag})`).join() + ".*"}
                })
            }
            if (!('token_length' in metadata)) actorFilters.push({
                [app.ontologyAlign(metadata['full'])]: {
                    '$regex': '.*' + preferences['search'] + '.*',
                    '$options': 'i'
                }
            })
        }

        let actorFiltersOp = {[operator]: actorFilters};

        let stagedSubsetData = [];
        for (let child of app.subsetData) {
            if (child.name.indexOf("Query") !== -1) {
                stagedSubsetData.push(child)
            }
        }

        let stagedQuery = app.buildSubset(stagedSubsetData);

        // If no filters are set, don't add any filtering
        let subsets;
        if (actorFilters.length !== 0) {
            subsets = {'$and': [stagedQuery, actorFiltersOp]};
        } else {
            subsets = stagedQuery;
        }

        if (!force && JSON.stringify(subsets) === this.cachedQuery) return;
        this.cachedQuery = JSON.stringify(subsets);

        console.log("Actor Filter: " + this.cachedQuery);

        // Submit query and update listings
        let query = {
            'query': this.cachedQuery,
            'dataset': app.selectedDataset,
            'datasource': app.datasource,
            'type': 'summary',
            'subsets': [subsetName]
        };

        function updateActorListing(data) {
            waitForQuery--;
            preferences['full_limit'] = this.defaultPageSize;
            app.pageSetup(data);
        }

        let failedUpdateActorListing = () => waitForQuery--;

        waitForQuery++;
        m.request({
            url: app.subsetURL,
            data: query,
            method: 'POST'
        }).then(updateActorListing).catch(failedUpdateActorListing);
    }

    view(vnode) {
        let {subsetName, data, metadata, preferences, formatting} = vnode.attrs;

        let toggleFull = (actor) => preferences['node']['selected'].has(actor)
            ? preferences['node']['selected'].add(actor)
            : preferences['node']['selected'].delete(actor);

        let toggleFilter = (filter, actor) => {
            filter = app.ontologyAlign(filter);
            preferences['filters'][filter]
                ? preferences['filters'][filter].add(actor)
                : preferences['filters'][filter].delete(actor);

            this.search(subsetName, metadata, preferences)
        };

        return [
            m(`.actorLeft#allActors`,
                m(TextField, {
                    placeholder: `Search ${currentTab} actors`,
                    oninput: (value) => {
                        preferences['search'] = value;
                        this.search(subsetName, metadata, preferences);
                    }
                }),
                m(`.actorFullList#searchListActors`, {
                        style: Object.assign({"text-align": "left"},
                            waitForQuery && {'pointer-events': 'none', 'background': grayColor})
                    },
                    waitForQuery && data['full']
                        .filter(actor => !preferences['show_selected'] || preferences['node']['selected'].has(actor))
                        .slice(preferences['full_limit'])
                        .map(actor =>
                            m('div',
                                preferences['format'] === 'phoenix' && {
                                    'data-container': 'body',
                                    'data-toggle': 'popover',
                                    'data-placement': 'right',
                                    'data-trigger': 'hover',
                                    'data-content': actor.match(new RegExp(`.{${metadata['token_length']}}`, 'g'))
                                        .map(token => formatting['phoenix'][token] || '?').join(' ')
                                },
                                m(`input.actorChk[type=checkbox]`, {
                                    checked: preferences['node']['selected'].has(actor),
                                    onclick: () => toggleFull(actor)
                                }),
                                m('label', {onclick: () => toggleFull(actor)}, actor)))
                )
            ),
            m(`.actorRight[id='actorRight']`,

                m(`button#clearAllActors.btn.btn-default.clearActorBtn[data-toggle='tooltip'][type='button']`, {
                        title: 'Clear search text and filters',
                        onclick: () => {
                            preferences['search'] = '';
                            Object.keys(preferences['filters']).map(filter => preferences['filters'][filter] = new Set());
                            this.search(subsetName, metadata, preferences);
                        }
                    },
                    "Clear All Filters"
                ),
                m(`.actorFilterList#actorFilter`, {style: {"text-align": "left"}},
                    m(`label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip']`, {
                            title: `Show selected ${currentTab}s`
                        },
                        m("input.actorChk.actorShowSelected#actorShowSelected[name='actorShowSelected'][type='checkbox']", {
                            checked: preferences['show_selected'],
                            onchange: m.withAttr('checked', (state) => preferences['show_selected'] = state)
                        }),
                        "Show Selected"
                    ),
                    Object.keys(data).map(filter => [
                        m(".separator"),
                        m("button.filterExpand"),
                        m("label.actorHead4", m("b", filter)),
                        m(".filterContainer", data['filters'][filter].map(actor => m('div',
                            preferences['format'] === 'phoenix' && {
                                'data-container': 'body',
                                'data-toggle': 'popover',
                                'data-placement': 'right',
                                'data-trigger': 'hover',
                                'data-content': formatting['phoenix'][actor] || '?'
                            },
                            m(`input.actorChk[type=checkbox]`, {
                                checked: preferences['filters'][filter].has(actor),
                                onclick: () => toggleFilter(filter, actor)
                            }),
                            m('label', {onclick: () => toggleFilter(filter, actor)}, actor)
                        )))
                    ])
                )
            )
        ];
    }
}