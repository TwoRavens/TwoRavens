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

    async search(subsetName, currentTab) {

        let failedUpdateMonadListing = () => {
            console.warn("Network Issue: Update to monad listing failed");
            this.waitForQuery--;
        };

        this.waitForQuery++;
        m.redraw(); // since this.search is async, waitForQuery is incremented after the bound callback completes

        await app.loadSubset(subsetName, {monadSearch: currentTab}).catch(failedUpdateMonadListing);
        this.waitForQuery--;
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
            this.searchTimeout = setTimeout(() => this.search(subsetName, currentTab), searchLag);
        };

        let popupAttributes = (column, value) => app.genericMetadata[app.selectedDataset]['formats'][column] && {
            'data-container': 'body',
            'data-toggle': 'popover',
            'data-placement': 'right',
            'data-trigger': 'hover',
            'onmouseover': function (e) {
                e.redraw = false;
                let translation = (value === undefined || value === '')
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
                            this.searchTimeout = setTimeout(() => this.search(subsetName, currentTab), searchLag);
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