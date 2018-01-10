import m from 'mithril';
import {dataset} from "../app.js"
import {setupActor, actorTabSwitch, showSelected} from "../subsets/Actor.js"

export default class CanvasActor {

    oncreate() {
        // ICEWS does not use the right panel, so hide it!
        if (dataset === "icews") {
            document.getElementById('sourceRight').style.visibility = 'hidden';
            document.getElementById('targetRight').style.visibility = 'hidden';
        }
        setupActor();
    }

    view(vnode) {
        return (m(".subsetDiv[id='subsetActor']", {style: {"display": "none"}},
            m("table[id='actorContainer']",
                m("tbody",
                    m("tr",
                        [
                            m("td[width='350']",
                                m("[id='actorSelectionDiv']",
                                    [
                                        m(".panel-heading.text-center[id='actorSelectionTitle']", {style: {"padding-bottom": "5px"}},
                                            [
                                                // Header
                                                m("[id='actorPanelTitleDiv']", m("h3.panel-title", "Actor Selection")),
                                                m("[id='actorAggToggleDiv']", {
                                                        style: {
                                                            "display": "none",
                                                            "position": "relative",
                                                            "top": "-2px"
                                                        }
                                                    },
                                                    m("label.aggChkLbl",
                                                        [
                                                            m("input.aggChk.aggActor[checked=''][id='aggregActorSelect'][name='aggregActorSelect'][type='checkbox'][value='aggregActorUse']"),
                                                            "Use in aggregation"
                                                        ]
                                                    )
                                                )
                                            ]
                                        ),
                                        m("[id='tabDiv']", {style: {"overflow": "hidden"}},
                                            m(".btn-group[data-toggle='buttons'][id='actorRadio']", {
                                                    style: {"width": "100%"}
                                                },
                                                [
                                                    m("label.btn.btn-default.active[title='Select sources']",
                                                        {
                                                            style: {"width": "50%"},
                                                            onclick: function (e) {
                                                                actorTabSwitch('sourceTabBtn', 'sourceDiv');
                                                                e.redraw = false;
                                                            }
                                                        },
                                                        [
                                                            m("input[autocomplete='off'][checked=''][id='sourceTabBtn'][name='actorSet'][type='radio']"),
                                                            "Sources"
                                                        ]
                                                    ),
                                                    m("label.btn.btn-default[title='Select targets']",
                                                        {
                                                            style: {"width": "50%"},
                                                            onclick: function (e) {
                                                                actorTabSwitch('targetTabBtn', 'targetDiv');
                                                                e.redraw = false;
                                                            }
                                                        },
                                                        [
                                                            m("input[autocomplete='off'][id='targetTabBtn'][name='actorSet'][type='radio']"),
                                                            "Targets"
                                                        ]
                                                    )
                                                ]
                                            )
                                        ),
                                        m(".panel-heading.text-center[id='groupNameDisplayContainer']", {style: {"padding-bottom": "0px"}},
                                            [
                                                m("input[data-toggle='tooltip'][id='editGroupName'][placeholder='Source 0'][title='Click to change group name'][type='text']"),
                                                m("button[data-toggle='tooltip'][id='deleteGroup'][title='Delete current group'][type='button']")
                                            ]
                                        ),
                                        m("[id='fullContainer']",
                                            [
                                                m(".actorTabContent[id='sourceDiv']",
                                                    [
                                                        m(".actorLeft[id='allSources']",
                                                            [
                                                                m("input.form-control.actorSearch[id='sourceSearch'][placeholder='Search source actors'][type='text']"),
                                                                m(".actorFullList[id='searchListSources']", {style: {"text-align": "left"}}
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorRight[id='sourceRight']",
                                                            [
                                                                m("button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllSources'][title='Clears search text and filters'][type='button']",
                                                                    "Clear All Filters"
                                                                ),
                                                                m(".actorFilterList[id='sourceFilter']", {style: {"text-align": "left"}},
                                                                    [
                                                                        m("label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip'][title='Show selected sources']",
                                                                            [
                                                                                m("input.actorChk.actorShowSelected[id='sourceShowSelected'][name='sourceShowSelected'][type='checkbox'][value='show']",
                                                                                {
                                                                                    onchange: function (e) {
                                                                                        showSelected();
                                                                                        e.redraw = false;
                                                                                    }
                                                                                }), "Show Selected"
                                                                            ]
                                                                        ),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='entitySourceExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='entitySourceExpand'][id='entitySources']",
                                                                            m("b",
                                                                                "Entity"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='wrapEntitySource']", {style: {"padding-left": "10px"}},
                                                                            [
                                                                                m("button.filterExpand[id='orgSourceExpand'][value='expand']"),
                                                                                m("label.actorChkLbl",
                                                                                    [
                                                                                        m("input.actorChk.allCheck[id='sourceOrgAllCheck'][name='sourceOrgAllCheck'][type='checkbox'][value='organizations']"),
                                                                                        "Organization"
                                                                                    ]
                                                                                ),
                                                                                m(".filterContainer[id='orgSourcesList']", {style: {"padding-left": "30px"}}),
                                                                                m(".separator"),
                                                                                m("button.filterExpand[id='countrySourceExpand'][value='expand']"),
                                                                                m("label.actorChkLbl",
                                                                                    [
                                                                                        m("input.actorChk.allCheck[id='sourceCountryAllCheck'][name='sourceCountryAllCheck'][type='checkbox'][value='countries']"),
                                                                                        "Country"
                                                                                    ]
                                                                                ),
                                                                                m(".filterContainer[id='countrySourcesList']", {style: {"padding-left": "30px"}})
                                                                            ]
                                                                        ),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='roleSourceExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='roleSourceExpand'][id='roleSources']",
                                                                            m("b",
                                                                                "Role"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='roleSourcesList']"),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='attributeSourceExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='attributeSourceExpand'][id='attributeSources']",
                                                                            m("b",
                                                                                "Attribute"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='attributeSourcesList']")
                                                                    ]
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorBottomTry", {style: {"width": "100%"}},
                                                            [
                                                                m("button.btn.btn-default.actorBottom.actorSelectAll[data-toggle='tooltip'][id='sourceSelectAll'][title='Selects all sources that match the filter criteria'][type='button']",
                                                                    "Select All"
                                                                ),
                                                                m("button.btn.btn-default.actorBottom.actorClearAll[data-toggle='tooltip'][id='sourceClearSel'][title='Clears all sources that match the filter criteria'][type='button']",
                                                                    "Clear All"
                                                                ),
                                                                m("button.btn.btn-default.actorBottom.actorNewGroup[data-toggle='tooltip'][id='sourceNew'][title='Create new source group'][type='button']",
                                                                    "New Group"
                                                                )
                                                            ]
                                                        )
                                                    ]
                                                ),
                                                m(".actorTabContent[id='targetDiv']",
                                                    [
                                                        m(".actorLeft[id='allTargets']",
                                                            [
                                                                m("input.form-control.actorSearch[id='targetSearch'][placeholder='Search target actors'][type='text']"),
                                                                m(".actorFullList[id='searchListTargets']", {style: {"text-align": "left"}}
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorRight[id='targetRight']",
                                                            [
                                                                m("button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllTargets'][title='Clears search text and filters'][type='button']",
                                                                    "Clear All Filters"
                                                                ),
                                                                m(".actorFilterList[id='targetFilter']", {style: {"text-align": "left"}},
                                                                    [
                                                                        m("label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip'][title='Show selected targets']",
                                                                            [
                                                                                m("input.actorChk.actorShowSelected[id='targetShowSelected'][name='targetShowSelected'][type='checkbox'][value='show']",
                                                                                {
                                                                                    onchange: function (e) {
                                                                                        showSelected();
                                                                                        e.redraw = false;
                                                                                    }
                                                                                }), "Show Selected"
                                                                            ]
                                                                        ),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='entityTargetExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='entityTargetExpand'][id='entityTargets']",
                                                                            m("b",
                                                                                "Entity"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='wrapEntityTarget']", {style: {"padding-left": "10px"}},
                                                                            [
                                                                                m("button.filterExpand[id='orgTargetExpand'][value='expand']"),
                                                                                m("label.actorChkLbl",
                                                                                    [
                                                                                        m("input.actorChk.allCheck[id='targetOrgAllCheck'][name='targetOrgAllCheck'][type='checkbox'][value='organizations']"),
                                                                                        "Organization"
                                                                                    ]
                                                                                ),
                                                                                m(".filterContainer[id='orgTargetsList']", {style: {"padding-left": "30px"}}),
                                                                                m(".separator"),
                                                                                m("button.filterExpand[id='countryTargetExpand'][value='expand']"),
                                                                                m("label.actorChkLbl",
                                                                                    [
                                                                                        m("input.actorChk.allCheck[id='targetCountryAllCheck'][name='targetCountryAllCheck'][type='checkbox'][value='countries']"),
                                                                                        "Country"
                                                                                    ]
                                                                                ),
                                                                                m(".filterContainer[id='countryTargetsList']", {style: {"padding-left": "30px"}})
                                                                            ]
                                                                        ),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='roleTargetExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='roleTargetExpand'][id='roleTargets']",
                                                                            m("b",
                                                                                "Role"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='roleTargetsList']"),
                                                                        m(".separator"),
                                                                        m("button.filterExpand[id='attributeTargetExpand'][value='expand']"),
                                                                        m("label.actorHead4[for='attributeTargetExpand'][id='attributeTargets']",
                                                                            m("b",
                                                                                "Attribute"
                                                                            )
                                                                        ),
                                                                        m(".filterContainer[id='attributeTargetsList']")
                                                                    ]
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorBottomTry",
                                                            [
                                                                m("button.btn.btn-default.actorBottom.actorSelectAll[data-toggle='tooltip'][id='targetSelectAll'][title='Selects all targets that match the filter criteria'][type='button']",
                                                                    "Select All"
                                                                ),
                                                                m("button.btn.btn-default.actorBottom.actorClearAll[data-toggle='tooltip'][id='targetClearSel'][title='Clears all targets that match the filter criteria'][type='button']",
                                                                    "Clear All"
                                                                ),
                                                                m("button.btn.btn-default.actorBottom.actorNewGroup[data-toggle='tooltip'][id='targetNew'][title='Create new target group'][type='button']",
                                                                    "New Group"
                                                                )
                                                            ]
                                                        )
                                                    ]
                                                )
                                            ]
                                        )
                                    ]
                                )
                            ),
                            m("td[id='actorLinkDiv']",
                                [
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
                                ]
                            )
                        ]
                    )
                )
            )
        ));
    }
}
