import m from 'mithril';
import {grayColor} from "../../../common/common";
import TextField from '../../../common/views/TextField';
import * as app from "../app";

let searchLag = 500;

export default class MonadSelection {
    oninit() {
        this.defaultPageSize = 200;
        this.waitForQuery = 0;
        this.searchTimeout = null;
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
        for (let child of app.abstractQuery) {
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
            this.waitForQuery--;
            preferences['full_limit'] = this.defaultPageSize;
            app.pageSetup(data);
        }

        let failedUpdateActorListing = () => this.waitForQuery--;

        this.waitForQuery++;
        m.request({
            url: app.subsetURL,
            data: query,
            method: 'POST'
        }).then(updateActorListing).catch(failedUpdateActorListing);
    }

    view(vnode) {
        let {subsetName, data, metadata, preferences} = vnode.attrs;

        let toggleFull = (actor) => preferences['node']['selected'].has(actor)
            ? preferences['node']['selected'].add(actor)
            : preferences['node']['selected'].delete(actor);

        let toggleFilter = (filter, actor) => {
            filter = app.ontologyAlign(filter);
            preferences['filters'][filter]
                ? preferences['filters'][filter]['selected'].add(actor)
                : preferences['filters'][filter]['selected'].delete(actor);

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.search(subsetName, metadata, preferences), searchLag);
        };

        return [
            m(`.actorLeft#allActors`,
                m(TextField, {
                    placeholder: `Search ${preferences['current_tab']} actors`,
                    oninput: (value) => {
                        preferences['search'] = value;
                        clearTimeout(this.searchTimeout);
                        this.searchTimeout = setTimeout(() => this.search(subsetName, metadata, preferences), searchLag);
                    }
                }),
                m(`.actorFullList#searchListActors`, {
                        style: Object.assign({"text-align": "left"},
                            this.waitForQuery && {'pointer-events': 'none', 'background': grayColor}),
                        onscroll: () => {
                            // don't apply infinite scrolling when actor list is empty
                            if (data.length === 0) return;

                            let container = document.querySelector('#searchListActors');
                            let scrollHeight = container.scrollHeight - container.scrollTop;
                            if (scrollHeight < container.offsetHeight) preferences['full_limit'] += this.defaultPageSize;
                        }
                    },
                    this.waitForQuery && data['full']
                        .filter(actor => !preferences['show_selected'] || preferences['node']['selected'].has(actor))
                        .slice(preferences['full_limit'])
                        .map(actor =>
                            m('div',
                                preferences['format'].indexOf('phoenix') !== -1 && {
                                    'data-container': 'body',
                                    'data-toggle': 'popover',
                                    'data-placement': 'right',
                                    'data-trigger': 'hover',
                                    'data-content': actor.match(new RegExp(`.{${metadata['token_length']}}`, 'g'))
                                        .map(token => app.formattingData['phoenix'][token] || '?').join(' ')
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
                            Object.keys(preferences['filters']).map(filter => preferences['filters'][filter]['selected'] = new Set());
                            clearTimeout(this.searchTimeout);
                            this.searchTimeout = setTimeout(() => this.search(subsetName, metadata, preferences), searchLag);
                        }
                    },
                    "Clear All Filters"
                ),
                m(`.actorFilterList#actorFilter`, {style: {"text-align": "left"}},
                    m(`label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip']`, {
                            title: `Show selected ${preferences['current_tab']}s`
                        },
                        m("input.actorChk.actorShowSelected#actorShowSelected[name='actorShowSelected'][type='checkbox']", {
                            checked: preferences['show_selected'],
                            onchange: m.withAttr('checked', (state) => preferences['show_selected'] = state)
                        }),
                        "Show Selected"
                    ),
                    Object.keys(data).map(filter => [
                        m(".separator"),
                        m("button.filterBase" + (preferences['filters'][filter]['expanded'] ? '.filterExpand' : '.filterCollapse'), {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }),
                        m("label.actorHead4", {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }, m("b", filter)),
                        preferences['filters'][filter]['expanded'] && m(".filterContainer", data['filters'][filter]['selected'].map(actor => m('div',
                            preferences['format'].indexOf('phoenix') !== -1 && {
                                'data-container': 'body',
                                'data-toggle': 'popover',
                                'data-placement': 'right',
                                'data-trigger': 'hover',
                                'data-content': app.formattingData['phoenix'][actor] || '?'
                            },
                            m(`input.actorChk[type=checkbox]`, {
                                checked: preferences['filters'][filter]['selected'].has(actor),
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