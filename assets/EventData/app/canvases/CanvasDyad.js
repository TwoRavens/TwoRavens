import m from 'mithril';
import {panelMargin} from '../../../common-eventdata/common';
import ButtonRadio from "../../../common-eventdata/views/ButtonRadio";
import Button from "../../../common-eventdata/views/Button";
import TextField from '../../../common-eventdata/views/TextField';

import MonadSelection from '../views/MonadSelection';
import PlotDyad from '../views/PlotDyad';
import {unitMeasure} from "../app";

// Width of the dyad selection panel
let selectionWidth = '400px';

// determine if a particular dyad matches criteria
export let entryContains = (entry, search, token_length) => {
    if (search.length === 0) return true;
    if (token_length) {
        const tags = search
            .replace(/[\-\[\]\/\{\}\(\)\*\+\?\\\^\$\|]/g, ".")
            .match(new RegExp(`.{${token_length}}`, 'g')) || [];
        return new RegExp(tags.map(tag => `(?=^(...)*${tag})`).join('') + ".*", 'i').test(entry);
    }
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

        preferences['edges'] = preferences['edges'] || [];
        if (!(preferences['current_tab'] in Object.keys(metadata['tabs'])))
            preferences['current_tab'] = Object.keys(metadata['tabs'])[0];
    }


    view(vnode) {
        let {preferences, metadata, redraw, setRedraw} = vnode.attrs;
        if (!Object.keys(preferences).length) this.oninit(vnode);

        return m("#canvasDyad", {style: {height: `calc(100% - ${panelMargin})`}},
            [
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
                }, [
                    m("[id='linkTitle']",
                        [
                            m("h3#linkTitleLeft.panel-title.text-center",
                                "Sources"
                            ),
                            m("h3#linkTitleRight.panel-title.text-center",
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
                    })
                ]),
                m("div#dyadFormatDiv", {
                    style: {
                        clear: 'both',
                        height: '1px',
                        overflow: 'hidden',
                        'font-size': '0pt',
                        'margin-top': '-1px'
                    }
                })
            ]);
    }

    dyadSelection(vnode) {
        let {mode, subsetName, data, metadata, preferences, setRedraw} = vnode.attrs;
        return [
            m(".panel-heading.text-center[id='dyadSelectionTitle']", {style: {"padding-bottom": "5px"}},
                m("[id='dyadPanelTitleDiv']",
                    m("h3.panel-title", {style: {'padding-top': '2px', 'padding-bottom': '2px'}}, "Dyad Selection")),
                mode === 'aggregate' && [
                    m("[id='dyadAggToggleDiv']", {
                            style: {
                                "position": "relative",
                                "top": "-2px"
                            }
                        },
                        m("label.agg-chk-lbl",
                            m('input#aggregDyadSelect.agg-chk[type=checkbox]', {
                                onclick: m.withAttr("checked", (state) => unitMeasure[subsetName] = state),
                                checked: unitMeasure[subsetName]
                            }),
                            "Use in aggregation"
                        ))
                ]
            ),
            m(ButtonRadio, {
                id: 'dyadTab',
                onclick: (tab) => preferences['current_tab'] = tab,
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

            m("#fullContainer", m(`#dyadDiv.monad-content`, {
                    style: {height: mode === 'subset' ? '100%' : 'calc(100% - 25px)'}
                },
                m(MonadSelection, {
                    subsetName: subsetName,
                    data: data[preferences['current_tab']],
                    preferences: preferences['tabs'][preferences['current_tab']],
                    metadata: metadata['tabs'][preferences['current_tab']],
                    currentTab: preferences['current_tab']
                }),
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
                                    .filter(entry => entryContains(entry, tabPref['search'], tabMeta['token_length']))]);
                        },
                        title: `Selects all ${preferences['tabs'][preferences['current_tab']]['node']['name']}s that match the filter criteria`
                    }, 'Select All'),
                    m(Button, {
                        id: 'dyadClearAll',
                        onclick: () => {
                            let tabPref = preferences['tabs'][preferences['current_tab']];
                            let tabMeta = metadata['tabs'][preferences['current_tab']];
                            tabPref['node']['selected'] = new Set([...tabPref['node']['selected']]
                                .filter(entry => !entryContains(entry, tabPref['search'], tabMeta['token_length'])))},
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
                                alert('There must be at least one "' + preferences['current_tab'] + '" node.');
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
