import m from 'mithril';
import {dataset} from "../app.js"
import {
    setupActor,
    waitForQuery,
    actorTabSwitch,
    showSelected,
    currentNode,
    currentTab,
} from "../subsets/Actor.js"
import {panelMargin, grayColor} from "../../../common/app/common";
import {aggregActorOn, setAggregActor} from "../aggreg/aggreg";

// Width of the actor selection panel
let selectionWidth = 350;


function actorSelection(mode) {

    // Header text with optional aggregation checkbox
    let headerElements = [
        m("[id='actorPanelTitleDiv']", m("h3.panel-title", "Actor Selection"))
    ];

    if (mode === "aggregate") {
        headerElements.push(m("[id='actorAggToggleDiv']", {
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
            )
        ))
    }

    // Radio buttons for actor/target selection
    let tabSelection = m("[id='tabDiv']", {style: {"overflow": "hidden"}},
        m(".btn-group[data-toggle='buttons'][id='actorRadio']", {style: {width: "100%"}},
            [
                m(`label.btn.btn-default${currentTab === "source" ? ".active" : ""}[title='Select sources']`,
                    {
                        style: {"width": "50%"},
                        onclick: () => actorTabSwitch('source')
                    },
                    [
                        m("input[autocomplete='off'][checked=''][id='sourceTabBtn'][name='actorSet'][type='radio']"),
                        "Sources"
                    ]
                ),
                m(`label.btn.btn-default${currentTab === "target" ? ".active" : ""}[title='Select targets']`,
                    {
                        style: {"width": "50%"},
                        onclick: () => actorTabSwitch('target')
                    },
                    [
                        m("input[autocomplete='off'][id='targetTabBtn'][name='actorSet'][type='radio']"),
                        "Targets"
                    ]
                )
            ]
        )
    );

    let aggregationOffset = (mode === 'subset') ? 0 : 25;

    let actorLists = m(`.actorTabContent#actorDiv`,
        [
            m(`.actorLeft#allActors`, {style: {height: `calc(100% - ${aggregationOffset}px)`}},
                [
                    m(`input.form-control#actorSearch[type='text']`, {
                        placeholder: `Search ${currentTab} actors`
                    }),
                    m(`.actorFullList#searchListActors`, {style: Object.assign({"text-align": "left"},
                            waitForQuery && {'pointer-events': 'none', 'background': grayColor})})
                ]
            ),
            m(`.actorRight[id='actorRight']`, {style: {height: `calc(100% - ${aggregationOffset}px)`}},
                [
                    m(`button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllActors'][title='Clears search text and filters'][type='button']`,
                        "Clear All Filters"
                    ),
                    m(`.actorFilterList#actorFilter`, {style: {"text-align": "left"}},
                        [
                            m(`label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip']`, {
                                    title: `Show selected ${currentTab}s`
                                },
                                [
                                    m("input.actorChk.actorShowSelected#actorShowSelected[name='actorShowSelected'][type='checkbox'][value='show']",
                                        {
                                            onchange: showSelected
                                        }), "Show Selected"
                                ]
                            ),
                            m(".separator"),
                            m("button.filterExpand#entityActorExpand[value='expand']", dataset === 'icews' && {style: {display: 'none'}}),
                            m("label.actorHead4#entityActor[for='entityActorExpand']", dataset === 'icews' && {style: {display: 'none'}},
                                m("b", "Entity")
                            ),
                            m(".filterContainer#wrapEntityActor",
                                [
                                    m("button.filterExpand[id='orgActorExpand'][value='expand']"),
                                    m("label.actorChkLbl",
                                        [
                                            m("input.actorChk.allCheck#actorOrgAllCheck[name='actorOrgAllCheck'][type='checkbox'][value='organizations']"),
                                            "Organization"
                                        ]
                                    ),
                                    m(".filterContainer[id='orgActorList']", {style: {"padding-left": "30px"}}),
                                    m(".separator"),
                                    m("button.filterExpand#countryActorExpand[value='expand']"),
                                    m("label.actorChkLbl",
                                        [
                                            m("input.actorChk.allCheck#actorCountryAllCheck[name='actorCountryAllCheck'][type='checkbox'][value='countries']"),
                                            "Country"
                                        ]
                                    ),
                                    m(".filterContainer[id='countryActorList']", {style: {"padding-left": "30px"}})
                                ]
                            ),
                            m(".separator"),
                            m("button.filterExpand[id='roleActorExpand'][value='expand']"),
                            m("label.actorHead4#roleActors[for='roleActorExpand']",
                                m("b", "Role")
                            ),
                            m(".filterContainer[id='roleActorList']"),
                            m(".separator"),
                            m("button.filterExpand#attributeActorExpand[value='expand']"),
                            m("label.actorHead4#attributeActors[for='attributeActorExpand']",
                                m("b", "Attribute")
                            ),
                            m(".filterContainer#attributeActorList")
                        ]
                    )
                ]
            ),
            m(".actorBottomTry", {style: {"width": "100%"}},
                [
                    m(`button.btn.btn-default.actorBottom#actorSelectAll[data-toggle='tooltip'][type='button']`, {
                            title: `Selects all ${currentTab}s that match the filter criteria`
                        }, "Select All"
                    ),
                    m(`button.btn.btn-default.actorBottom#actorClearAll[data-toggle='tooltip'][type='button']`, {
                            title: `Clears all ${currentTab}s that match the filter criteria`
                        }, "Clear All"
                    ),
                    m(`button.btn.btn-default.actorBottom#actorNewGroup[data-toggle='tooltip'][type='button']`, {
                            title: `Create new ${currentTab} group`,
                            style: {
                                'margin-right': '2px',
                                float: 'right'
                            }
                        },
                        "New Group"
                    )
                ]
            )
        ]
    );

    return [
        m(".panel-heading.text-center[id='actorSelectionTitle']", {style: {"padding-bottom": "5px"}}, headerElements),
        tabSelection,
        m(".panel-heading.text-center[id='groupNameDisplayContainer']", {style: {"padding-bottom": "0px"}},
            [
                m(`input[data-toggle='tooltip'][id='editGroupName'][title='Click to change group name'][type='text']`, {
                    placeholder: currentNode[currentTab].name
                }),
                m("button[data-toggle='tooltip'][id='deleteGroup'][title='Delete current group'][type='button']")
            ]
        ),
        m("[id='fullContainer']", actorLists)
    ]
}


export default class CanvasActor {

    oncreate() {
        setupActor();
    }

    view(vnode) {
        let {mode, display} = vnode.attrs;

        return m("#canvasActor.canvas", {style: {height: `calc(100% - ${panelMargin}px)`, display: display}},
            [
                m("div#actorSelectionDiv", {
                    style: {
                        float: "left",
                        height: `calc(100% - ${panelMargin}px)`,
                        width: selectionWidth + "px",
                        'margin-top': "10px"
                    }
                }, actorSelection(mode)),
                m("div#actorLinkDiv", {
                    style: {
                        'margin-left': panelMargin + 'px',
                        'margin-top': panelMargin + 'px',
                        height: `calc(100% - ${panelMargin}px)`,
                        width: `calc(100% - ${selectionWidth + panelMargin}px)`
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
