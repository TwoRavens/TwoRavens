import m from 'mithril';
import {grayColor} from "../../../common-eventdata/common";
import TextField from '../../../common-eventdata/views/TextField';
import * as app from "../app";
import * as query from '../query';
import {entryContains} from '../canvases/CanvasDyad';

let searchLag = 500;

export default class MonadSelection {
    oninit() {
        this.defaultPageSize = 200;
        this.waitForQuery = 0;
        this.searchTimeout = null;
    }

    search(subsetName, metadata, preferences, currentTab) {

        const operator = '$and';

        let tabFilters = Object.keys(preferences['filters']).reduce((out, column) => {
            if (preferences['filters'][column]['selected'].size === 0) return out;
            let filter = {};
            let deconstruct = app.genericMetadata[app.selectedDataset]['deconstruct'] || {};

            if (column in deconstruct) filter[column] = {
                '$regex': `^(.*${deconstruct[column]})*(${[...preferences['filters'][column]['selected']].join('|')})`,
                "$options": "i"
            };
            else filter[column] = {'$in': [...preferences['filters'][column]['selected']]};
            return out.concat([filter]);
        }, []);

        let tabFiltersOp = {[operator]: tabFilters};

        let stagedSubsetData = [];
        for (let child of app.abstractQuery) {
            if (child.name.indexOf("Query") !== -1) {
                stagedSubsetData.push(child)
            }
        }

        let stagedQuery = query.buildSubset(stagedSubsetData);

        // If no filters are set, don't add any filtering
        let subsets;
        if (tabFilters.length !== 0) {
            subsets = {'$and': [stagedQuery, tabFiltersOp]};
        } else {
            subsets = stagedQuery;
        }

        if (JSON.stringify(subsets) === this.cachedQuery) return;
        this.cachedQuery = JSON.stringify(subsets);

        console.log("Monad Filter: " + this.cachedQuery);

        // Submit query and update listings
        let body = {
            'query': escape(this.cachedQuery),
            'dataset': app.selectedDataset,
            'type': 'summary',
            'subset': subsetName,
            'tab': currentTab,
            'search': true
        };

        let updateMonadListing = (data) => {
            preferences['full_limit'] = this.defaultPageSize;
            app.setupSubset(data);
            this.waitForQuery--;
        };

        let failedUpdateMonadListing = () => {
            console.warn("Network Issue: Update to monad listing failed");
            this.waitForQuery--;
        };

        this.waitForQuery++;
        m.request({
            url: app.subsetURL,
            data: body,
            method: 'POST'
        }).then(updateMonadListing).catch(failedUpdateMonadListing);
    }

    view(vnode) {
        let {subsetName, data, metadata, currentTab, preferences} = vnode.attrs;

        preferences['full_limit'] = preferences['full_limit'] || this.defaultPageSize;

        let toggleFull = (entry) => preferences['node']['selected'].has(entry)
            ? preferences['node']['selected'].delete(entry)
            : preferences['node']['selected'].add(entry);

        let toggleFilter = (filter, entry) => {
            preferences['filters'][filter]['selected'].has(entry)
                ? preferences['filters'][filter]['selected'].delete(entry)
                : preferences['filters'][filter]['selected'].add(entry);

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(
                () => this.search(subsetName, metadata, preferences, currentTab), searchLag);
        };

        let popupAttributes = (column, value) => app.genericMetadata[app.selectedDataset]['formats'][column] && {
            'data-container': 'body',
            'data-toggle': 'popover',
            'data-placement': 'right',
            'data-trigger': 'hover',
            'onmouseover': function (e) {
                e.redraw = false;
                let translation = value === undefined
                    ? ''
                    : 'token_length' in metadata
                        ? value.match(new RegExp(`.{${metadata['token_length']}}`, 'g'))
                            .map(token => app.formattingData[app.genericMetadata[app.selectedDataset]['formats'][column]][token] || '?').join(' ')
                        : app.formattingData[app.genericMetadata[app.selectedDataset]['formats'][column]][value];
                if (translation) {
                    $(this).attr('data-content', translation);
                    setTimeout(() => $(this).popover("show"), 200);
                }
            },
            'onmouseout': function (e) {
                e.redraw = false;
                setTimeout(() => $(".popover").remove(), 200);
            }
        };

        // I avoided the usual declarative filtering constructs here because this loop has a sweet early exit, usually around 100 elements
        let getTopValues = () => {
            let matches = [];
            let idx = 0;
            while (idx < data['full'].length && matches.length < preferences['full_limit']) {
                let selectFilter = !preferences['show_selected'] || preferences['node']['selected'].has(data['full'][idx]);
                let searchFilter = entryContains(data['full'][idx], preferences['search'], metadata['token_length']);

                if (selectFilter && searchFilter) matches.push(data['full'][idx]);
                idx += 1;
            }
            return matches;
        };

        return [
            m('#allEntries.monad-left',
                m(TextField, {
                    value: preferences['search'],
                    placeholder: `Search ${metadata['full']}`,
                    oninput: (value) => preferences['search'] = value
                }),
                m('#searchListMonads.monad-full-list', {
                        style: Object.assign({"text-align": "left"},
                            this.waitForQuery && {'pointer-events': 'none', 'background': grayColor}),
                        onscroll: () => {
                            // don't apply infinite scrolling when monad list is empty
                            if (data.length === 0) return;

                            let container = document.querySelector('#searchListMonads');
                            let scrollHeight = container.scrollHeight - container.scrollTop;
                            if (scrollHeight < container.offsetHeight) preferences['full_limit'] += this.defaultPageSize;
                        }
                    },
                    this.waitForQuery === 0 && getTopValues().map(entry =>
                        m('div', popupAttributes(metadata['full'], entry),
                            m(`input.monad-chk[type=checkbox]`, {
                                checked: preferences['node']['selected'].has(entry),
                                onclick: () => toggleFull(entry)
                            }),
                            m('label', {onclick: () => toggleFull(entry)}, entry)))
                )
            ),
            m('#actorRight.monad-right',

                m(`button#clearAllActors.btn.btn-default.monad-clear[type='button']`, {
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
                m('#actorFilter.monad-filter-list', {style: {"text-align": "left"}},
                    m(`label.monad-show-selected-lbl.monad-chk-lbl[data-toggle='tooltip']`, {
                            title: `Show selected ${metadata['full']}`
                        },
                        m("input#monad-show-selected.monad-chk.monad-show-selected[name='actorShowSelected'][type='checkbox']", {
                            checked: preferences['show_selected'],
                            onchange: m.withAttr('checked', (state) => preferences['show_selected'] = state)
                        }),
                        "Show Selected"
                    ),
                    Object.keys(data['filters']).map(filter => [
                        m(".separator"),
                        m("button.filter-base" + (preferences['filters'][filter]['expanded'] ? '.filter-collapse' : '.filter-expand'), {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }),
                        m("label.monad-filter-heading", {
                            onclick: () => preferences['filters'][filter]['expanded'] = !preferences['filters'][filter]['expanded']
                        }, m("b", filter)),
                        preferences['filters'][filter]['expanded'] && data['filters'][filter]
                            .filter(actor => actor.includes(preferences['search']))
                            .map(actor => m('div',
                                popupAttributes(filter, actor),
                                m(`input.monad-chk[type=checkbox]`, {
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