export default class CanvasActor {

    oncreate(){
        // ICEWS does not use the right panel, so hide it!
        if (dataset === "icews") {
            document.getElementById('sourceRight').style.visibility = 'hidden';
            document.getElementById('targetRight').style.visibility = 'hidden';
        }

        actorSVG = d3.select("#actorLinkSVG");

        actorWidth = actorSVG.node().getBoundingClientRect().width;		//not yet set since window has not yet been displayed; defaults to 0
        actorHeight = actorSVG.node().getBoundingClientRect().height;	//this code is here to remind what is under subset.js

        boundaryLeft = Math.floor(actorWidth / 2) - 20;		//max x coordinate source nodes can move
        boundaryRight = Math.ceil(actorWidth / 2) + 20;		//max x coordinate target nodes can move

        actorForce = d3.forceSimulation()
            .force("link", d3.forceLink().distance(100).strength(0.5))	//link force to keep nodes together
            .force("x", d3.forceX().x(function (d) {					//grouping by nodes
                if (d.actor === "source")
                    return Math.floor(actorWidth / 4);
                return Math.floor(3 * actorWidth / 4);
            }).strength(0.06))
            .force("y", d3.forceY().y(function (d) {					//cluster nodes
                return Math.floor(actorHeight / 2);
            }).strength(0.05))
            .force('charge', d3.forceManyBody().strength(-100));	//prevent tight clustering


        //define arrow markers
        actorSVG.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 6).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').style('fill', '#000');
        actorSVG.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 4).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').style('fill', '#000');

        //define SVG mouse actions
        actorSVG.on("mouseup", function (d) {		//cancel draw line
            lineMouseup();
        }).on("contextmenu", function (d) {		//prevent right click on svg
            d3.event.preventDefault();
        });

        linkGroup = actorSVG.append("svg:g").attr("class", "allLinksGroup").selectAll("path");
        nodeGroup = actorSVG.append("svg:g").attr("class", "allNodesGroup").selectAll("g");
        drag_line = actorSVG.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0')
        tooltipSVG = d3.select(actorSVG.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

        updateSVG();						//updates SVG elements

        actorForce.on("tick", actorTick);		//custom tick function

        //clears search and filter selections
        $(".clearActorBtn").click(function (event) {
            clearChecks();
            actorSearch(currentTab);
            $(this).blur();
        });


        //clear search box when reloading page
        $(".actorSearch").ready(function () {
            $(".actorSearch").val("");
        });

        //when typing in search box
        $(".actorSearch").on("keyup", function (event) {
            $(".actorChkLbl").popover("hide");
            const searchText = $("#" + currentTab + "Search").val().toUpperCase();
            if (searchText.length % 3 === 0) {
                actorSearch(currentTab);
            }
        });

        //on load of page, keep actorShowSelected unchecked
        $(".actorShowSelected").ready(function () {
            $(".actorShowSelected").prop("checked", false);
        });


        //on load of page, keep checkbox for selecting all filters unchecked
        $(".allCheck").ready(function () {
            $(".allCheck").prop("checked", false);
        });

        //selects all checks for specified element, handles indeterminate state of checkboxes
        $(".allCheck").click(function (event) {
            const currentEntityType = event.target.id.substring(6, 9);
            const currentElement = (currentEntityType === "Org") ? $("#" + currentTab + currentEntityType + "AllCheck") : $("#" + currentTab + "CountryAllCheck");

            currentElement.prop("indeterminate", false);

            let entityDiv;
            if (currentEntityType === "Org") {
                entityDiv = $("#org" + capitalizeFirst(currentTab) + "sList input:checkbox");
            } else {
                entityDiv = $("#country" + capitalizeFirst(currentTab) + "sList input:checkbox");
            }

            if (currentElement.prop("checked")) {
                entityDiv.each(function () {
                    filterSet[currentTab]['entities'].add(this.value);
                    $(this).prop("checked", true);
                });
            } else {
                entityDiv.each(function() {
                    filterSet[currentTab]['entities'].delete(this.value);
                    $(this).prop("checked", false);
                });
            }
            actorSearch(currentTab);
        });

        //adds all of the current matched items into the current selection
        $(".actorSelectAll").click(function (event) {
            $("#searchList" + capitalizeFirst(currentTab) + "s").children().each(function () {
                filterSet[currentTab]["full"].add(this.value);
                this.checked = true;
            });
            // Lose focus so that popover goes away
            $(this).blur();
        });

        //clears all of the current matched items from the current selection
        $(".actorClearAll").click(function (event) {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            $("#searchList" + capitalizeFirst(currentTab) + "s").children().each(function () {
                filterSet[currentTab]["full"].delete(this.value);
                this.checked = false;
            });
            $(this).blur();
        });

        //adds a new group for source/target
        $(".actorNewGroup").click(function (event) {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            var newName = capitalizeFirst(currentTab) + " " + window[currentTab + "Size"];
            var nameCount = 1;
            while (actorNodeNames.indexOf(newName) > -1) {
                newName = capitalizeFirst(currentTab) + " " + (window[currentTab + "Size"] + nameCount);
                nameCount ++;
            }
            actorNodes.push(new nodeObj(newName, [], [], actorColors(currentSize), currentTab, changeID));
            actorNodeNames.push(actorNodes[actorNodes.length - 1].name);
            window[currentTab + "Size"]++;
            window[currentTab + "ActualSize"]++;
            currentSize++;
            changeID++;

            // Save values to the current node
            window[currentTab + "CurrentNode"].group = [...filterSet[currentTab]["full"]];

            // Set current node to new node
            window[currentTab + "CurrentNode"] = actorNodes[actorNodes.length - 1];
            updateGroupName(window[currentTab + "CurrentNode"].name);

            //update gui
            $("#clearAll" + capitalizeFirst(currentTab) + "s").click();
            filterSet[currentTab]["full"] = new Set();
            actorSearch(currentTab);

            //update svg
            //change dimensions of SVG if needed (exceeds half of the space)
            if (window[currentTab + "ActualSize"] > calcCircleNum(actorHeight)) {
                actorHeight += actorNodeR;
                $("#actorLinkDiv").height(function (n, c) {
                    return c + actorNodeR;
                });
                actorSVG.attr("height", actorHeight);
                d3.select("#centerLine").attr("d", function () {
                    return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
                });
            }
            updateAll();
            if (opMode == "aggreg")
                updateAggregTable();
            actorTick();
            actorForce.alpha(1).restart();

            $(this).blur();
        });

        //remove a group if possible
        $("#deleteGroup").click(function () {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            const cur = actorNodes.indexOf(window[currentTab + "CurrentNode"]);
            let prev = cur - 1;
            let next = cur + 1;
            while (true) {
                if (actorNodes[prev] && actorNodes[prev].actor == currentTab) {
                    performUpdate(prev);
                    $(this).blur();
                    return;
                }
                else if (actorNodes[next] && actorNodes[next].actor == currentTab) {
                    performUpdate(next);
                    $(this).blur();
                    return;
                }
                else {
                    //update search in both directions
                    if (prev > -1)
                        prev--;
                    if (next < actorNodes.length)
                        next++;
                    if (prev == -1 && next == actorNodes.length)
                        break;
                }
            }
            alert("Need at least one " + currentTab + " node!");

            function performUpdate(index) {
                //set index node to current
                window[currentTab + "CurrentNode"] = actorNodes[index];
                updateGroupName(actorNodes[index].name);

                $("#clearAll" + capitalizeFirst(currentTab) + "s").click();
                //update actor selection checks
                $("." + currentTab + "Chk:checked").prop("checked", false);
                for (var x = 0; x < actorNodes[index].groupIndices.length; x++)
                    $("#" + actorNodes[index].groupIndices[x]).prop("checked", true);
                $("#" + currentTab + "ShowSelected").trigger("click");

                //update links
                for (var x = 0; x < actorLinks.length; x++) {
                    if (actorLinks[x].source == actorNodes[cur]) {
                        actorLinks.splice(x, 1);
                        x--;
                    }
                    else if (actorLinks[x].target == actorNodes[cur]) {
                        actorLinks.splice(x, 1);
                        x--;
                    }
                }
                actorNodeNames.splice(actorNodes[cur].name, 1);
                actorNodes.splice(cur, 1);
                window[currentTab + "ActualSize"]--;

                const curHeight = $("#actorContainer").height();		//this is the height of the container
                const titleHeight = $("#linkTitle").height();			//this is the height of the title div above the SVG

                if (sourceActualSize <= calcCircleNum(curHeight - titleHeight) && targetActualSize <= calcCircleNum(curHeight - titleHeight)) {		//if link div is empty enough, maintain height alignment
                    $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);
                    actorHeight = actorSVG.node().getBoundingClientRect().height;
                    actorSVG.attr("height", actorHeight);
                    d3.select("#centerLine").attr("d", function () {
                        return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
                    });
                }
                else {	//if deleting the element and shrinking the SVG will cause the height of the SVG to be less than the height of the container, do nothing; else shrink SVG
                    if (actorHeight - actorNodeR < curHeight - titleHeight)
                        return;

                    if (window[currentTab + "ActualSize"] <= calcCircleNum(actorHeight - actorNodeR)) {
                        actorHeight -= actorNodeR;
                        $("#actorLinkDiv").height(function (n, c) {
                            return c - actorNodeR;
                        });
                        actorSVG.attr("height", actorHeight);
                        d3.select("#centerLine").attr("d", function () {
                            return "M" + actorWidth / 2 + "," + 0 + "V" + actorHeight;
                        });
                    }
                }
                updateAll();

                if (opMode == "aggreg")
                    updateAggregTable();
            }
        });

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
                                                    style: {
                                                        "margin-left": "6px",
                                                        "width": "calc(100% - 12px)"
                                                    }
                                                },
                                                [
                                                    m("label.btn.btn-default.active[onclick='actorTabSwitch(\'sourceTabBtn\', \'sourceDiv\')'][title='Select sources']", {style: {"width": "50%"}},
                                                        [
                                                            m("input[autocomplete='off'][checked=''][id='sourceTabBtn'][name='actorSet'][type='radio']"),
                                                            "Sources"
                                                        ]
                                                    ),
                                                    m("label.btn.btn-default[onclick='actorTabSwitch(\'targetTabBtn\', \'targetDiv\')'][title='Select targets']", {style: {"width": "50%"}},
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
                                                                m(".actorFullList[id='searchListSources']",
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorRight[id='sourceRight']",
                                                            [
                                                                m("button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllSources'][title='Clears search text and filters'][type='button']",
                                                                    "Clear All Filters"
                                                                ),
                                                                m(".actorFilterList[id='sourceFilter']",
                                                                    [
                                                                        m("label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip'][title='Show selected sources']",
                                                                            [
                                                                                m("input.actorChk.actorShowSelected[id='sourceShowSelected'][name='sourceShowSelected'][onchange='showSelected(this)'][type='checkbox'][value='show']"),
                                                                                "Show Selected"
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
                                                        m(".actorBottomTry",
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
                                                                m(".actorFullList[id='searchListTargets']",
                                                                )
                                                            ]
                                                        ),
                                                        m(".actorRight[id='targetRight']",
                                                            [
                                                                m("button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllTargets'][title='Clears search text and filters'][type='button']",
                                                                    "Clear All Filters"
                                                                ),
                                                                m(".actorFilterList[id='targetFilter']",
                                                                    [
                                                                        m("label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip'][title='Show selected targets']",
                                                                            [
                                                                                m("input.actorChk.actorShowSelected[id='targetShowSelected'][name='targetShowSelected'][onchange='showSelected(this)'][type='checkbox'][value='show']"),
                                                                                "Show Selected"
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
