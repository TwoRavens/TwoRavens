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

    search(subsetName, metadata, preferences, currentTab, force = false) {

        const operator = '$and';

        let actorFilters = Object.keys(preferences['filters']).reduce((out, column) => {
            if (preferences['filters'][column]['selected'].size === 0) return out;
            let filter = {};
            let deconstruct = app.genericMetadata[app.selectedDataset]['deconstruct'] || {};

            if (column in deconstruct) filter[app.ontologyAlign(column)] = {
                '$regex': `^(.*${deconstruct[column]})*(${[...preferences['filters'][column]['selected']].join('|')})`
            };
            else filter[column] = {'$in': [...preferences['filters'][column]['selected']]};
            return out.concat([filter]);
        }, []);

        if (preferences['search'].length !== 0) {
            if ('token_length' in metadata && preferences['search'].length % metadata['token_length'] === 0) {
                const tags = preferences['search'].match(new RegExp(`.{${metadata['token_length']}}`, 'g'));
                actorFilters.push({
                    [metadata['full']]: {
                        '$regex': tags.map(tag => `(?=^(...)*${tag})`).join() + ".*",
                        '$options': 'i'
                    }
                })
            }
            if (!('token_length' in metadata)) actorFilters.push({
                [metadata['full']]: {
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
            'type': 'summary',
            'subset': subsetName,
            'tab': currentTab,
            'search': true
        };

        let updateActorListing = (data) => {
            this.waitForQuery--;
            preferences['full_limit'] = this.defaultPageSize;
            app.pageSetup(data);
        };

        let failedUpdateActorListing = () => {
            console.log("UPDATE TO ACTOR LISTING FAILED");
            this.waitForQuery--;
        };

        this.waitForQuery++;
        m.request({
            url: app.subsetURL,
            data: query,
            method: 'POST'
        }).then(updateActorListing).catch(failedUpdateActorListing);
    }

    view(vnode) {
        let {subsetName, data, metadata, currentTab, preferences} = vnode.attrs;

        preferences['full_limit'] = preferences['full_limit'] || this.defaultPageSize;

        let toggleFull = (actor) => preferences['node']['selected'].has(actor)
            ? preferences['node']['selected'].delete(actor)
            : preferences['node']['selected'].add(actor);

        let toggleFilter = (filter, actor) => {
            preferences['filters'][filter]['selected'].has(actor)
                ? preferences['filters'][filter]['selected'].delete(actor)
                : preferences['filters'][filter]['selected'].add(actor);

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(
                () => this.search(subsetName, metadata, preferences, currentTab), searchLag);
        };

        let popupAttributes = (column, value) => app.genericMetadata[app.selectedDataset]['formats'][column] && {
            'data-container': 'body',
            'data-toggle': 'popover',
            'data-placement': 'right',
            'data-trigger': 'hover',
            'onmouseover': function(e) {
                e.redraw = false;
                let translation = metadata['token_length']
                    ? value.match(new RegExp(`.{${metadata['token_length']}}`, 'g'))
                        .map(token => app.formattingData[app.genericMetadata[app.selectedDataset]['formats'][column]][token] || '?').join(' ')
                    : app.formattingData[app.genericMetadata[app.selectedDataset]['formats'][column]][value];
                if (translation) {
                    $(this).attr('data-content', translation);
                    setTimeout(() => $(this).popover("show"), 200);
                }
            },
            'onmouseout': function(e) {
                e.redraw = false;
                setTimeout(() => $(".popover").remove(), 200);
            }
        };

        return [
            m(`.actorLeft#allActors`,
                m(TextField, {
                    placeholder: `Search ${metadata['full']}`,
                    oninput: (value) => {
                        preferences['search'] = value;
                        clearTimeout(this.searchTimeout);
                        this.searchTimeout = setTimeout(
                            () => this.search(subsetName, metadata, preferences, currentTab), searchLag);
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
                    this.waitForQuery === 0 && data['full']
                        .filter(actor => !preferences['show_selected'] || preferences['node']['selected'].has(actor))
                        .slice(0, preferences['full_limit'])
                        .map(actor =>
                            m('div', popupAttributes(metadata['full'], actor),
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
                            this.searchTimeout = setTimeout(
                                () => this.search(subsetName, metadata, preferences, currentTab), searchLag);
                        }
                    },
                    "Clear All Filters"
                ),
                m(`.actorFilterList#actorFilter`, {style: {"text-align": "left"}},
                    m(`label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip']`, {
                            title: `Show selected ${metadata['full']}`
                        },
                        m("input.actorChk.actorShowSelected#actorShowSelected[name='actorShowSelected'][type='checkbox']", {
                            checked: preferences['show_selected'],
                            onchange: m.withAttr('checked', (state) => preferences['show_selected'] = state)
                        }),
                        "Show Selected"
                    ),
                    Object.keys(data['filters']).map(filter => [
                        m(".separator"),
                        m("button.filterBase" + (preferences['filters'][filter]['expanded'] ? '.filterCollapse' : '.filterExpand'), {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }),
                        m("label.actorHead4", {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }, m("b", filter)),
                        preferences['filters'][filter]['expanded'] && data['filters'][filter].map(actor => m('div',
                            popupAttributes(filter, actor),
                            m(`input.actorChk[type=checkbox]`, {
                                checked: preferences['filters'][filter]['selected'].has(actor),
                                onclick: () => toggleFilter(filter, actor)
                            }),
                            m('label', {onclick: () => toggleFilter(filter, actor)}, actor)
                        ))
                    ])
                )
            )
        ];
    }
}