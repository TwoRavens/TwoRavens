import m from 'mithril';
import {panelMargin} from '../../../common/common';
import {aggregActorOn, setAggregActor} from '../aggreg/aggreg';
import ButtonRadio from "../../../common/views/ButtonRadio";
import Button from "../../../common/views/Button";

import MonadSelection from './MonadSelection';
import PlotDyad from './PlotDyad';

// Width of the actor selection panel
let selectionWidth = '400px';


function actorSelection(vnode) {
    let {mode, subsetName, data, metadata, preferences} = vnode.attrs;
    return [
        m(".panel-heading.text-center[id='actorSelectionTitle']", {style: {"padding-bottom": "5px"}},
            m("[id='actorPanelTitleDiv']", m("h3.panel-title", "Actor Selection")),
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
        m("#groupNameDisplayContainer.panel-heading.text-center", {style: {"padding-bottom": "0px"}},
            // TODO focusout on esc, and TextField wrapper
            m(`input[data-toggle='tooltip'][id='editGroupName'][title='Click to change group name'][type='text']`, {
                placeholder: preferences['tabs'][preferences['current_tab']]['node']['name']
            })
        ),

        m("#fullContainer", m(`.actorTabContent#actorDiv`,
            m(MonadSelection, {
                subsetName: subsetName,
                data: data[preferences['current_tab']],
                preferences: preferences['tabs'][preferences['current_tab']],
                metadata: metadata['tabs'][preferences['current_tab']],
                currentTab: preferences['current_tab']
            }),
            m(".actorBottomTry", {style: {"width": "100%"}},
                m(Button, {
                    id: 'actorSelectAll',
                    onclick: () => preferences['tabs'][preferences['current_tab']]['node']['selected'] = new Set(data[preferences['current_tab']]['full']),
                    title: `Selects all ${preferences['current_tab']}s that match the filter criteria`
                }, 'Select All'),
                m(Button, {
                    id: 'actorClearAll',
                    onclick: () => preferences['tabs'][preferences['current_tab']]['node']['selected'] = new Set(),
                    title: `Clears all ${preferences['current_tab']}s that match the filter criteria`
                }, 'Clear All'),
                m(Button, {
                    id: 'actorNewGroup',
                    onclick: () => {
                        preferences['nodes'].push({}) // TODO
                    },
                    title: `Create new ${preferences['current_tab']} group`,
                    style: {'margin-right': '2px', float: 'right'}
                }, 'New Group'),
                m(Button, {
                    id: 'actorDeleteGroup',
                    onclick: () => preferences[''], // TODO (also make sure there isn't zero groups)
                    title: `Delete current group`,
                    style: {float: 'right'}
                }, 'Delete Group')
            )))
    ]
}

export default class CanvasDyad {

    oninit(vnode) {
        let {metadata, preferences} = vnode.attrs;
        preferences['node_count'] = preferences['node_count'] || 0;

        // initialize preferences with new nodes, if none have been set
        preferences['nodes'] = preferences['nodes'] || Object.keys(metadata['tabs']).map(tab => ({
            name: tab + ' ' + (preferences['nodes'] || []).length,
            actor: tab,
            selected: new Set(),
            id: preferences['node_count']++
        }));

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
        let {preferences} = vnode.attrs;
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
                        preferences: preferences
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
