import m from 'mithril';
import {colors, panelMargin} from '../../common/common';
import ButtonRadio from "../../common/views/ButtonRadio";
import Button from "../../common/views/Button";
import TextField from '../../common/views/TextField';
import Popper from '../../common/views/Popper';

import PlotDyad from './views/PlotDyad';
import * as eventdata from "../eventdata/eventdata";
import {alertError, formattingData} from "../app";

// Width of the dyad selection panel
let selectionWidth = '400px';
// milliseconds before sending a query request when searching
let searchLag = 500;

// determine if a particular dyad matches criteria
export let entryContains = (entry, search, token) => {
    if (search.length === 0) return true;
    if (token) {
        const tags = search
            .replace(/[\-\[\]\/\{\}\(\)\*\+\?\\\^\$\|]/g, ".")
            .match(new RegExp(token, 'g')) || [];
        return new RegExp(tags.map(tag => `(?=^(...)*${tag})`).join('') + ".*", 'i').test(entry);
    }
    if (!entry) return;

    return entry.match(new RegExp('.*' + search.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + '.*', 'i'));
};

export default class CanvasDyad {

    oninit(vnode) {
        let {metadata, preferences} = vnode.attrs;
        preferences['node_count'] = preferences['node_count'] || 0;

        // if a tab has no nodes, then add one
        preferences['nodes'] = preferences['nodes'] || [];
        let hasNode = Object.keys(metadata['tabs']).reduce((out, entry) => {
            out[entry] = false;
            return out;
        }, {});
        preferences['nodes'].forEach(node => hasNode[node['tab']] = true);

        preferences['tabs'] = preferences['tabs'] || {};

        Object.keys(hasNode).forEach(tab => {
            if (!hasNode[tab]) {
                preferences['nodes'].push({
                    name: tab + ' 0',
                    tab: tab,
                    selected: new Set(),
                    id: preferences['node_count']++
                });

                preferences['tabs'][tab] = {
                    show_selected: false,
                    filters: metadata['tabs'][tab]['filters'].reduce((out, filter) => {
                        out[filter] = {expanded: false, selected: new Set()};
                        return out;
                    }, {}),
                    search: '',
                    visible_elements: 0,
                    node: preferences['nodes'].filter(node => node['tab'] === tab)[0]
                }
            }
        });

        preferences['edges'] = preferences['edges'] || [{
            source: preferences['nodes'][0],
            target: preferences['nodes'][1],
            rev: false,
            dup: false
        }];

        if (!(preferences['current_tab'] in Object.keys(metadata['tabs'])))
            preferences['current_tab'] = Object.keys(metadata['tabs'])[0];

        this.defaultPageSize = 200;
        this.waitForQuery = 0;
        this.searchTimeout = null;
    }

    async search(pipeline, subsetName, currentTab, preferences, metadata) {

        let failedUpdateMonadListing = () => {
            console.warn("Network Issue: Update to monad listing failed");
            this.waitForQuery--;
        };

        this.waitForQuery++;
        m.redraw(); // makes the full list turn grey while waiting for the query to complete

        let monadUpdate = {
            type: 'menu',
            name: subsetName,
            metadata: Object.assign({}, metadata, {type: 'dyadSearch', currentTab}), // edit the metadata to be a search
            preferences
        };
        let data = await eventdata.loadMenu(pipeline, monadUpdate).catch(failedUpdateMonadListing);
        data[0][currentTab].full = data[0][currentTab].full || [];
        eventdata.subsetData[subsetName][currentTab].full = data[0][currentTab].full;
        this.waitForQuery--;
        m.redraw();
    }

    view(vnode) {
        let {preferences, metadata, redraw, setRedraw} = vnode.attrs;
        if (!Object.keys(preferences).length) this.oninit(vnode);

        return m("#canvasDyad", {style: {height: `calc(100% - ${panelMargin})`}},
            m("div#dyadSelectionDiv", {
                style: {
                    float: "left",
                    height: `calc(100% - ${panelMargin})`,
                    width: selectionWidth,
                    'margin-top': "10px"
                }
            }, this.dyadSelection(vnode)),
            m("div#dyadLinkDiv", {
                    style: {
                        'margin-left': panelMargin,
                        'margin-top': panelMargin,
                        height: `calc(100% - ${panelMargin})`,
                        width: `calc(100% - ${selectionWidth} - ${panelMargin})`
                    }
                },
                m("[id='linkTitle']",
                    [
                        m("h4#linkTitleLeft.panel-title.text-center",
                            "Sources"
                        ),
                        m("h4#linkTitleRight.panel-title.text-center",
                            "Targets"
                        )
                    ]
                ),
                m(PlotDyad, {
                    id: 'dyadSVG',
                    preferences: preferences,
                    redraw: redraw,
                    setRedraw: setRedraw,
                    metadata: metadata
                })),
            m("div#dyadFormatDiv", {
                style: {
                    clear: 'both',
                    height: '1px',
                    overflow: 'hidden',
                    'font-size': '0pt',
                    'margin-top': '-1px'
                }
            })
        );
    }

    // rendering the full and filter lists
    monadSelection(vnode) {
        let {subsetName, data, metadata, preferences, formats, pipeline} = vnode.attrs;
        let dataMonad = data[preferences['current_tab']];
        let preferencesMonad = preferences['tabs'][preferences['current_tab']];
        let metadataMonad = metadata['tabs'][preferences['current_tab']];
        let currentTab = preferences['current_tab'];

        let getTranslation = (column, value) => (value === undefined || value === '')
                ? ''
                : 'full_token' in metadataMonad
                    ? value.match(new RegExp(metadataMonad['full_token'], 'g'))
                        .map(token => (formattingData[formats[column]] || {})[token] || '?').join(' ')
                    : (formattingData[formats[column]] || {})[value];

        preferencesMonad['full_limit'] = preferencesMonad['full_limit'] || this.defaultPageSize;

        let toggleFull = (entry) => preferencesMonad['node']['selected'].has(entry)
            ? preferencesMonad['node']['selected'].delete(entry)
            : preferencesMonad['node']['selected'].add(entry);

        let toggleFilter = (filter, entry) => {
            preferencesMonad['filters'][filter]['selected'].has(entry)
                ? preferencesMonad['filters'][filter]['selected'].delete(entry)
                : preferencesMonad['filters'][filter]['selected'].add(entry);

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.search(pipeline, subsetName, currentTab, preferences, metadata), searchLag);
        };

        // I avoided the usual declarative filtering constructs here because this loop has a sweet early exit, usually around 100 elements
        let getTopValues = () => {
            let matches = [];
            let idx = 0;
            while (idx < dataMonad['full'].length && matches.length < preferencesMonad['full_limit']) {
                let selectFilter = !preferencesMonad['show_selected'] || preferencesMonad['node']['selected'].has(dataMonad['full'][idx]);
                let searchFilter = entryContains(dataMonad['full'][idx], preferencesMonad['search'], metadataMonad['full_token']);

                if (selectFilter && searchFilter) matches.push(dataMonad['full'][idx]);
                idx += 1;
            }
            return matches;
        };

        return [
            m('#allEntries.monad-left',
                m(TextField, {
                    value: preferencesMonad['search'],
                    placeholder: `Search ${metadataMonad['full']}`,
                    oninput: (value) => preferencesMonad['search'] = value
                }),
                m('#searchListMonads.monad-full-list', {
                        style: Object.assign({"text-align": "left"},
                            this.waitForQuery && {'pointer-events': 'none', 'background': colors.gray}),
                        onscroll: () => {
                            // don't apply infinite scrolling when monad list is empty
                            if (dataMonad.length === 0) return;

                            let container = document.querySelector('#searchListMonads');
                            let scrollHeight = container.scrollHeight - container.scrollTop;
                            if (scrollHeight < container.offsetHeight + 100) preferencesMonad['full_limit'] += this.defaultPageSize;
                        }
                    },
                    this.waitForQuery === 0 && getTopValues().map(entry =>
                        m(Popper, {
                                content: () => getTranslation(metadataMonad['full'], entry),
                                // options: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}}
                            },
                            m('div',
                                // popupAttributes(metadataMonad['full'], entry),
                                m(`input.monad-chk[type=checkbox]`, {
                                    checked: preferencesMonad['node']['selected'].has(entry),
                                    onclick: () => toggleFull(entry)
                                }),
                                m('label', {onclick: () => toggleFull(entry)}, entry))))
                )
            ),
            m('#actorRight.monad-right',

                m(`button#clearAllActors.btn.btn-secondary.monad-clear[type='button']`, {
                        title: 'Clear search text and filters',
                        onclick: () => {
                            preferencesMonad['search'] = '';
                            preferencesMonad['show_selected'] = false;
                            Object.keys(preferencesMonad['filters']).map(filter => preferencesMonad['filters'][filter]['selected'] = new Set());
                            clearTimeout(this.searchTimeout);
                            this.searchTimeout = setTimeout(() => this.search(pipeline, subsetName, currentTab, preferences, metadata), searchLag);
                        }
                    },
                    "Clear All Filters"
                ),
                m('#actorFilter.monad-filter-list', {style: {"text-align": "left"}},
                    m(`label.monad-show-selected-lbl.monad-chk-lbl[data-toggle='tooltip']`, {
                            title: `only show selected ${metadataMonad['full']}`
                        },
                        m("input#monad-show-selected.monad-chk.monad-show-selected[name='actorShowSelected'][type='checkbox']", {
                            checked: preferencesMonad['show_selected'],
                            onchange: function() {preferencesMonad['show_selected'] = this.checked} // withAttr
                        }),
                        "Only Show Selected"
                    ),
                    metadataMonad['filters'].map(filter => [
                        m(".separator"),
                        m("button.filter-base" + (preferencesMonad['filters'][filter]['expanded'] ? '.filter-collapse' : '.filter-expand'), {
                            onclick: () => preferencesMonad['filters'][filter]['expanded'] = !preferencesMonad['filters'][filter]['expanded']
                        }),
                        m("label.monad-filter-heading", {
                            onclick: () => preferencesMonad['filters'][filter]['expanded'] = !preferencesMonad['filters'][filter]['expanded']
                        }, m("b", filter)),
                        preferencesMonad['filters'][filter]['expanded'] && dataMonad['filters'][filter]
                            .filter(actor => actor && actor.includes(preferencesMonad['search']))
                            .map(actor => m(Popper, {
                                content: () => getTranslation(filter, actor),
                                // options: {placement: 'right', modifiers: {preventOverflow: {escapeWithReference: true}}}
                            }, m('div#test',
                                // popupAttributes(filter, actor),
                                m(`input.monad-chk[type=checkbox]`, {
                                    checked: preferencesMonad['filters'][filter]['selected'].has(actor),
                                    onclick: () => toggleFilter(filter, actor)
                                }),
                                m('label', {onclick: () => toggleFilter(filter, actor)}, actor)
                            )))
                    ])
                )
            )
        ];
    }

    dyadSelection(vnode) {
        let {data, metadata, preferences, setRedraw} = vnode.attrs;
        return [
            m(".card-header.text-center[id='dyadSelectionTitle']", {style: {"padding-bottom": "5px"}},
                m("[id='dyadPanelTitleDiv']",
                    m("h4.panel-title", {style: {'padding-top': '2px', 'padding-bottom': '2px'}}, "Dyad Selection"))
            ),
            m(ButtonRadio, {
                id: 'dyadTab',
                onclick: (tab) => {
                    preferences['current_tab'] = tab;
                    setRedraw(true);
                },
                activeSection: preferences['current_tab'],
                sections: Object.keys(metadata['tabs']).map(entry => ({value: entry})),
                attrsAll: {"style": {"width": "calc(100% - 10px)", 'margin-left': '5px'}}
            }),
            m(TextField, {
                id: 'editGroupName',
                title: 'Click to change group name',
                value: preferences['tabs'][preferences['current_tab']]['node']['name'],
                oninput: (value) => {
                    preferences['tabs'][preferences['current_tab']]['node']['name'] = value;
                    setRedraw(true);
                },
                style: {"width": "calc(100% - 10px)", 'margin-left': '5px', 'margin-bottom': 0, 'height': '22px'}
            }),

            m("#fullContainer", m(`#dyadDiv.monad-content`,
                this.monadSelection(vnode),
                m(".monad-bottom",
                    m(Button, {
                        id: 'dyadSelectAll',
                        onclick: () => {
                            let tabPref = preferences['tabs'][preferences['current_tab']];
                            let tabMeta = metadata['tabs'][preferences['current_tab']];
                            if (tabPref['show_selected']) return;
                            tabPref['node']['selected'] = new Set([
                                ...tabPref['node']['selected'],
                                ...data[preferences['current_tab']]['full']
                                    .filter(entry => entryContains(entry, tabPref['search'], tabMeta['full_token']))]);
                        },
                        title: `Selects all ${preferences['tabs'][preferences['current_tab']]['node']['name']}s that match the filter criteria`
                    }, 'Select All'),
                    m(Button, {
                        id: 'dyadClearAll',
                        onclick: () => {
                            let tabPref = preferences['tabs'][preferences['current_tab']];
                            let tabMeta = metadata['tabs'][preferences['current_tab']];
                            tabPref['node']['selected'] = new Set([...tabPref['node']['selected']]
                                .filter(entry => !entryContains(entry, tabPref['search'], tabMeta['full_token'])))
                        },
                        title: `Clears all ${preferences['tabs'][preferences['current_tab']]['node']['name']} that match the filter criteria`
                    }, 'Clear All'),
                    m(Button, {
                        id: 'dyadNewGroup',
                        onclick: () => {
                            let names = new Set(preferences['nodes'].map(node => node['name']));

                            let count = -1;
                            let foundName = false;
                            while (!foundName) {
                                count++;
                                if (!names.has(preferences['current_tab'] + ' ' + count)) foundName = true;
                            }

                            let newGroup = {
                                name: preferences['current_tab'] + ' ' + count,
                                tab: preferences['current_tab'],
                                selected: new Set(),
                                id: preferences['node_count']++
                            };
                            preferences['nodes'].push(newGroup);
                            preferences['tabs'][preferences['current_tab']]['node'] = newGroup;
                            setRedraw(true);
                        },
                        title: `Create new ${preferences['current_tab']} group`,
                        style: {'margin-right': '2px', float: 'right'}
                    }, 'New Group'),
                    m(Button, {
                        id: 'dyadDeleteGroup',
                        onclick: () => {
                            let filteredNodes = preferences['nodes']
                                .filter(node => node['tab'] === preferences['current_tab']);

                            if (filteredNodes.length === 1) {
                                alertError('There must be at least one "' + preferences['current_tab'] + '" node.');
                                return;
                            }
                            let deleteNode = preferences['tabs'][preferences['current_tab']]['node'];
                            preferences['nodes'].splice(preferences['nodes'].indexOf(deleteNode), 1);

                            // remove dangling edges
                            for (let idx = preferences['edges'].length; idx--;) {
                                let edge = preferences['edges'][idx];
                                if (edge.source === deleteNode || edge.target === deleteNode)
                                    preferences['edges'].splice(idx, 1)
                            }
                            preferences['tabs'][preferences['current_tab']]['node'] = filteredNodes[0];
                            setRedraw(true);
                        },
                        title: `Delete node: ${preferences['tabs'][preferences['current_tab']]['node']['name']}`,
                        style: {float: 'right'}
                    }, 'Delete Group')
                )))
        ]
    }
}
