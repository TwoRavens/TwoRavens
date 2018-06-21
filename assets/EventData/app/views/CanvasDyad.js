import m from 'mithril';
import {panelMargin} from '../../../common/common';
import {aggregActorOn, setAggregActor} from '../aggreg/aggreg';
import ButtonRadio from "../../../common/views/ButtonRadio";
import Button from "../../../common/views/Button";
import TextField from '../../../common/views/TextField';

import MonadSelection from './MonadSelection';
import PlotDyad from './PlotDyad';

// Width of the actor selection panel
let selectionWidth = '400px';


function actorSelection(vnode) {
    let {mode, subsetName, data, metadata, preferences, setRedraw} = vnode.attrs;
    return [
        m(".panel-heading.text-center[id='actorSelectionTitle']", {style: {"padding-bottom": "5px"}},
            m("[id='actorPanelTitleDiv']",
                m("h3.panel-title", {style: {'padding-top': '2px', 'padding-bottom': '2px'}}, "Dyad Selection")),
            mode === 'aggregate' && [
                m("[id='actorAggToggleDiv']", {
                        style: {
                            "position": "relative",
                            "top": "-2px"
                        }
                    },
                    m("label.aggChkLbl",
                        m('input#aggregActorSelect.aggChk.aggActor[type=checkbox]', {
                            onclick: m.withAttr("checked", setAggregActor),
                            checked: aggregActorOn
                        }),
                        "Use in aggregation"
                    ))
            ]
        ),
        m(ButtonRadio, {
            id: 'actorTab',
            onclick: (tab) => preferences['current_tab'] = tab,
            activeSection: preferences['current_tab'],
            sections: Object.keys(preferences['tabs']).map(entry => ({value: entry})),
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

        m("#fullContainer", m(`.actorTabContent#actorDiv`,
            m(MonadSelection, {
                subsetName: subsetName,
                data: data[preferences['current_tab']],
                preferences: preferences['tabs'][preferences['current_tab']],
                metadata: metadata['tabs'][preferences['current_tab']],
                currentTab: preferences['current_tab']
            }),
            m(".actorBottomTry",
                m(Button, {
                    id: 'actorSelectAll',
                    onclick: () => preferences['tabs'][preferences['current_tab']]['node']['selected'] = new Set(data[preferences['current_tab']]['full']),
                    title: `Selects all ${preferences['tabs'][preferences['current_tab']]['node']['name']}s that match the filter criteria`
                }, 'Select All'),
                m(Button, {
                    id: 'actorClearAll',
                    onclick: () => preferences['tabs'][preferences['current_tab']]['node']['selected'] = new Set(),
                    title: `Clears all ${preferences['tabs'][preferences['current_tab']]['node']['name']} that match the filter criteria`
                }, 'Clear All'),
                m(Button, {
                    id: 'actorNewGroup',
                    onclick: () => {
                        let names = new Set(preferences['nodes'].map(node => node['name']));

                        let count = 0;
                        let foundName = false;
                        while (!foundName) {
                            if (!names.has(preferences['current_tab'] + ' ' + count)) foundName = true;
                            count++;
                        }

                        let newGroup = {
                            name: preferences['current_tab'] + ' ' + count,
                            actor: preferences['current_tab'],
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
                    id: 'actorDeleteGroup',
                    onclick: () => {
                        let filteredNodes = preferences['nodes']
                            .filter(node => node['actor'] === preferences['current_tab']);

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
        preferences['nodes'].forEach(node => hasNode[node['actor']] = true);
        Object.keys(hasNode).forEach(tab => {
            if (!hasNode[tab]) preferences['nodes'].push({
                name: tab + ' ' + (preferences['nodes'] || []).length,
                actor: tab,
                selected: new Set(),
                id: preferences['node_count']++
            })
        });

        // if tab preferences have not been created, then add them
        if (preferences['tabs'] === undefined) {
            preferences['tabs'] = {};
            Object.keys(metadata['tabs']).map(tab => {
                preferences['tabs'][tab] = {
                    show_selected: false,
                    filters: metadata['tabs'][tab]['filters'].reduce((out, filter) => {
                        out[filter] = {expanded: false, selected: new Set()};
                        return out;
                    }, {}),
                    search: '',
                    visible_elements: 0,
                    node: preferences['nodes'].filter(node => node['actor'] === tab)[0]
                }
            });
        }

        preferences['edges'] = preferences['edges'] || [];
        preferences['current_tab'] = preferences['current_tab'] || Object.keys(metadata['tabs'])[0];
    }


    view(vnode) {
        let {preferences, redraw, setRedraw} = vnode.attrs;
        return m("#canvasActor", {style: {height: `calc(100% - ${panelMargin})`}},
            [
                m("div#actorSelectionDiv", {
                    style: {
                        float: "left",
                        height: `calc(100% - ${panelMargin})`,
                        width: selectionWidth,
                        'margin-top': "10px"
                    }
                }, actorSelection(vnode)),
                m("div#actorLinkDiv", {
                    style: {
                        'margin-left': panelMargin,
                        'margin-top': panelMargin,
                        height: `calc(100% - ${panelMargin})`,
                        width: `calc(100% - ${selectionWidth} - ${panelMargin})`
                    }
                }, [
                    m("[id='linkTitle']",
                        [
                            m("h3.panel-title.text-center[id='linkTitleLeft']",
                                "Sources"
                            ),
                            m("h3.panel-title.text-center[id='linkTitleRight']",
                                "Targets"
                            )
                        ]
                    ),
                    m(PlotDyad, {
                        id: 'actorSVG',
                        preferences: preferences,
                        redraw: redraw,
                        setRedraw: setRedraw
                    })
                ]),
                m("div#actorFormatDiv", {
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
}
