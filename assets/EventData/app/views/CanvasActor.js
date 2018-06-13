import m from 'mithril';
import {setupActor} from '../subsets/Actor';
import {panelMargin} from '../../../common/common';
import {aggregActorOn, setAggregActor} from '../aggreg/aggreg';
import ButtonRadio from "../../../common/views/ButtonRadio";
import Button from "../../../common/views/Button";

import MonadSelection from './MonadSelection';

// Width of the actor selection panel
let selectionWidth = '350px';


function actorSelection(vnode) {
    let {mode, data, formatting, preferences} = vnode.attrs;

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
            sections: [{value: 'source'}, {value: 'target'}]
        }),
        m("#groupNameDisplayContainer.panel-heading.text-center", {style: {"padding-bottom": "0px"}},
            [
                m(`input[data-toggle='tooltip'][id='editGroupName'][title='Click to change group name'][type='text']`, {
                    placeholder: preferences['current_node'][preferences['current_tab']]['name']
                }),
                m("#deleteGroup.button[data-toggle='tooltip'][title='Delete current group'][type='button']")
            ]
        ),

        m("#fullContainer", m(`.actorTabContent#actorDiv`,
            m(MonadSelection, {preferences: preferences['tabs'][preferences['current_tab']], formatting}),
            m(".actorBottomTry", {style: {"width": "100%"}},
                m(Button, {
                    id: 'actorSelectAll',
                    onclick: () => preferences['current_node'][preferences['current_tab']]['group'] = new Set(data[preferences['current_tab']]),
                    title: `Selects all ${preferences['current_tab']}s that match the filter criteria`,
                    value: 'Select All'
                }),
                m(Button, {
                    id: 'actorClearAll',
                    onclick: () => preferences['current_node'][preferences['current_tab']]['group'] = new Set(),
                    title: `Clears all ${preferences['current_tab']}s that match the filter criteria`,
                    value: 'Clear All'
                }),
                m(Button, {
                    id: 'actorNewGroup',
                    onclick: () => preferences[''], // TODO
                    title: `Create new ${preferences['current_tab']} group`,
                    style: {'margin-right': '2px', float: 'right'},
                    value: 'New Group'
                }),
                m(Button, {
                    id: 'actorDeleteGroup',
                    onclick: () => preferences[''], // TODO
                    title: `Delete current group`,
                    style: {float: 'right'},
                    value: 'Delete Group'
                })
            )))
    ]
}

export default class CanvasActor {

    oncreate() {
        setupActor();
    }

    view(vnode) {
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
                    m("svg[id='actorLinkSVG']")
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
