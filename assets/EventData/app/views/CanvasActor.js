import m from 'mithril';
import {dataset} from "../app.js"
import * as appActor from "../subsets/Actor.js"

export default class CanvasActor {

    oncreate() {
        // ICEWS does not use the right panel, so hide it!
        if (dataset === "icews") {
            document.getElementById('sourceRight').style.visibility = 'hidden';
            document.getElementById('targetRight').style.visibility = 'hidden';
        }

        appActor.actorSVG = d3.select("#actorLinkSVG");

        appActor.actorWidth = appActor.actorSVG.node().getBoundingClientRect().width;		//not yet set since window has not yet been displayed; defaults to 0
        appActor.actorHeight = appActor.actorSVG.node().getBoundingClientRect().height;	//this code is here to remind what is under subset.js

        appActor.boundaryLeft = Math.floor(appActor.actorWidth / 2) - 20;		//max x coordinate source nodes can move
        appActor.boundaryRight = Math.ceil(appActor.actorWidth / 2) + 20;		//max x coordinate target nodes can move

        appActor.actorForce = d3.forceSimulation()
            .force("link", d3.forceLink().distance(100).strength(0.5))	//link force to keep nodes together
            .force("x", d3.forceX().x(function (d) {					//grouping by nodes
                if (d.actor === "source")
                    return Math.floor(appActor.actorWidth / 4);
                return Math.floor(3 * appActor.actorWidth / 4);
            }).strength(0.06))
            .force("y", d3.forceY().y(function (d) {					//cluster nodes
                return Math.floor(appActor.actorHeight / 2);
            }).strength(0.05))
            .force('charge', d3.forceManyBody().strength(-100));	//prevent tight clustering


        //define arrow markers
        appActor.actorSVG.append('svg:defs').append('svg:marker').attr('id', 'end-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 6).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M0,-5L10,0L0,5').style('fill', '#000');
        appActor.actorSVG.append('svg:defs').append('svg:marker').attr('id', 'start-arrow').attr('viewBox', '0 -5 10 10').attr('refX', 4).attr('markerWidth', 3).attr('markerHeight', 3).attr('orient', 'auto').append('svg:path').attr('d', 'M10,-5L0,0L10,5').style('fill', '#000');

        //define SVG mouse actions
        appActor.actorSVG.on("mouseup", function (d) {		//cancel draw line
            appActor.lineMouseup();
        }).on("contextmenu", function (d) {		//prevent right click on svg
            d3.event.preventDefault();
        });

        appActor.linkGroup = appActor.actorSVG.append("svg:g").attr("class", "allLinksGroup").selectAll("path");
        appActor.nodeGroup = appActor.actorSVG.append("svg:g").attr("class", "allNodesGroup").selectAll("g");
        appActor.drag_line = appActor.actorSVG.append('svg:path').attr('class', 'link dragline hidden').attr('d', 'M0,0L0,0')
        appActor.tooltipSVG = d3.select(appActor.actorSVG.node().parentNode).append("div").attr("class", "SVGtooltip").style("opacity", 0);

        appActor.updateSVG();						//updates SVG elements

        appActor.actorForce.on("tick", appActor.actorTick);		//custom tick function

        //clears search and filter selections
        $(".clearActorBtn").click(function (event) {
            appActor.clearChecks();
            appActor.actorSearch(appActor.currentTab);
            $(this).blur();
        });


        //clear search box when reloading page
        $(".actorSearch").ready(function () {
            $(".actorSearch").val("");
        });

        //when typing in search box
        $(".actorSearch").on("keyup", function (event) {
            $(".actorChkLbl").popover("hide");
            const searchText = $("#" + appActor.currentTab + "Search").val().toUpperCase();
            if (searchText.length % 3 === 0) {
                appActor.actorSearch(appActor.currentTab);
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
            const currentElement = (currentEntityType === "Org") ? $("#" + appActor.currentTab + currentEntityType + "AllCheck") : $("#" + appActor.currentTab + "CountryAllCheck");

            currentElement.prop("indeterminate", false);

            let entityDiv;
            if (currentEntityType === "Org") {
                entityDiv = $("#org" + appActor.capitalizeFirst(appActor.currentTab) + "sList input:checkbox");
            } else {
                entityDiv = $("#country" + appActor.capitalizeFirst(appActor.currentTab) + "sList input:checkbox");
            }

            if (currentElement.prop("checked")) {
                entityDiv.each(function () {
                    appActor.filterSet[appActor.currentTab]['entities'].add(this.value);
                    $(this).prop("checked", true);
                });
            } else {
                entityDiv.each(function () {
                    appActor.filterSet[appActor.currentTab]['entities'].delete(this.value);
                    $(this).prop("checked", false);
                });
            }
            appActor.actorSearch(appActor.currentTab);
        });

        //adds all of the current matched items into the current selection
        $(".actorSelectAll").click(function (event) {
            $("#searchList" + appActor.capitalizeFirst(appActor.currentTab) + "s").children().each(function () {
                appActor.filterSet[appActor.currentTab]["full"].add(this.value);
                this.checked = true;
            });
            // Lose focus so that popover goes away
            $(this).blur();
        });

        //clears all of the current matched items from the current selection
        $(".actorClearAll").click(function (event) {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            $("#searchList" + appActor.capitalizeFirst(appActor.currentTab) + "s").children().each(function () {
                appActor.filterSet[appActor.currentTab]["full"].delete(this.value);
                this.checked = false;
            });
            $(this).blur();
        });

        //adds a new group for source/target
        $(".actorNewGroup").click(function (event) {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            var newName = appActor.capitalizeFirst(appActor.currentTab) + " " + window[appActor.currentTab + "Size"];
            var nameCount = 1;
            while (appActor.actorNodeNames.indexOf(newName) > -1) {
                newName = appActor.capitalizeFirst(appActor.currentTab) + " " + (window[appActor.currentTab + "Size"] + nameCount);
                nameCount++;
            }
            appActor.actorNodes.push(new appActor.NodeObj(newName, [], [], appActor.actorColors(appActor.currentSize), appActor.currentTab, appActor.changeID));
            appActor.actorNodeNames.push(appActor.actorNodes[appActor.actorNodes.length - 1].name);
            window[appActor.currentTab + "Size"]++;
            window[appActor.currentTab + "ActualSize"]++;
            appActor.currentSize++;
            appActor.changeID++;

            // Save values to the current node
            window[appActor.currentTab + "CurrentNode"].group = [...appActor.filterSet[appActor.currentTab]["full"]];

            // Set current node to new node
            window[appActor.currentTab + "CurrentNode"] = appActor.actorNodes[appActor.actorNodes.length - 1];
            appActor.updateGroupName(window[appActor.currentTab + "CurrentNode"].name);

            //update gui
            $("#clearAll" + appActor.capitalizeFirst(appActor.currentTab) + "s").click();
            appActor.filterSet[appActor.currentTab]["full"] = new Set();
            appActor.actorSearch(appActor.currentTab);

            //update svg
            //change dimensions of SVG if needed (exceeds half of the space)
            if (window[appActor.currentTab + "ActualSize"] > appActor.calcCircleNum(appActor.actorHeight)) {
                appActor.actorHeight += appActor.actorNodeR;
                $("#actorLinkDiv").height(function (n, c) {
                    return c + appActor.actorNodeR;
                });
                appActor.actorSVG.attr("height", appActor.actorHeight);
                d3.select("#centerLine").attr("d", function () {
                    return "M" + appActor.actorWidth / 2 + "," + 0 + "V" + appActor.actorHeight;
                });
            }
            appActor.updateAll();
            if (opMode === "aggreg")
                updateAggregTable();
            appActor.actorTick();
            appActor.actorForce.alpha(1).restart();

            $(this).blur();
        });

        //remove a group if possible
        $("#deleteGroup").click(function () {
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").popover("hide");
            const cur = appActor.actorNodes.indexOf(window[appActor.currentTab + "CurrentNode"]);
            let prev = cur - 1;
            let next = cur + 1;
            while (true) {
                if (appActor.actorNodes[prev] && appActor.actorNodes[prev].actor === appActor.currentTab) {
                    performUpdate(prev);
                    $(this).blur();
                    return;
                }
                else if (appActor.actorNodes[next] && appActor.actorNodes[next].actor === appActor.currentTab) {
                    performUpdate(next);
                    $(this).blur();
                    return;
                }
                else {
                    //update search in both directions
                    if (prev > -1)
                        prev--;
                    if (next < appActor.actorNodes.length)
                        next++;
                    if (prev === -1 && next === appActor.actorNodes.length)
                        break;
                }
            }
            alert("Need at least one " + appActor.currentTab + " node!");

            function performUpdate(index) {
                //set index node to current
                window[appActor.currentTab + "CurrentNode"] = appActor.actorNodes[index];
                appActor.updateGroupName(appActor.actorNodes[index].name);

                $("#clearAll" + appActor.capitalizeFirst(appActor.currentTab) + "s").click();
                //update actor selection checks
                $("." + appActor.currentTab + "Chk:checked").prop("checked", false);
                for (var x = 0; x < appActor.actorNodes[index].groupIndices.length; x++)
                    $("#" + appActor.actorNodes[index].groupIndices[x]).prop("checked", true);
                $("#" + appActor.currentTab + "ShowSelected").trigger("click");

                //update links
                for (var x = 0; x < appActor.actorLinks.length; x++) {
                    if (appActor.actorLinks[x].source === appActor.actorNodes[cur]) {
                        appActor.actorLinks.splice(x, 1);
                        x--;
                    }
                    else if (appActor.actorLinks[x].target === appActor.actorNodes[cur]) {
                        appActor.actorLinks.splice(x, 1);
                        x--;
                    }
                }
                appActor.actorNodeNames.splice(appActor.actorNodes[cur].name, 1);
                appActor.actorNodes.splice(cur, 1);
                window[appActor.currentTab + "ActualSize"]--;

                const curHeight = $("#actorContainer").height();		//this is the height of the container
                const titleHeight = $("#linkTitle").height();			//this is the height of the title div above the SVG

                if (appActor.sourceActualSize <= appActor.calcCircleNum(curHeight - titleHeight) && appActor.targetActualSize <= appActor.calcCircleNum(curHeight - titleHeight)) {		//if link div is empty enough, maintain height alignment
                    $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);
                    appActor.actorHeight = appActor.actorSVG.node().getBoundingClientRect().height;
                    appActor.actorSVG.attr("height", appActor.actorHeight);
                    d3.select("#centerLine").attr("d", function () {
                        return "M" + appActor.actorWidth / 2 + "," + 0 + "V" + appActor.actorHeight;
                    });
                }
                else {	//if deleting the element and shrinking the SVG will cause the height of the SVG to be less than the height of the container, do nothing; else shrink SVG
                    if (appActor.actorHeight - appActor.actorNodeR < curHeight - titleHeight)
                        return;

                    if (window[appActor.currentTab + "ActualSize"] <= appActor.calcCircleNum(appActor.actorHeight - appActor.actorNodeR)) {
                        appActor.actorHeight -= appActor.actorNodeR;
                        $("#actorLinkDiv").height(function (n, c) {
                            return c - appActor.actorNodeR;
                        });
                        appActor.actorSVG.attr("height", appActor.actorHeight);
                        d3.select("#centerLine").attr("d", function () {
                            return "M" + appActor.actorWidth / 2 + "," + 0 + "V" + appActor.actorHeight;
                        });
                    }
                }
                appActor.updateAll();

                if (opMode === "aggreg")
                    updateAggregTable();
            }
        });


        $(document).ready(function () {
            //update display variables
            $("#actorLinkDiv").css("height", $("#actorSelectionDiv").height() + 2);

            appActor.actorWidth = appActor.actorSVG.node().getBoundingClientRect().width;
            appActor.actorHeight = appActor.actorSVG.node().getBoundingClientRect().height;

            appActor.boundaryLeft = Math.floor(appActor.actorWidth / 2) - 40;
            appActor.boundaryRight = Math.ceil(appActor.actorWidth / 2) + 40;

            appActor.actorSVG.append("path").attr("id", "centerLine").attr("d", function () {
                return "M" + appActor.actorWidth / 2 + "," + 0 + "V" + appActor.actorHeight;
            }).attr("stroke", "black");

            appActor.actorForce.force("x", d3.forceX().x(function (d) {
                if (d.actor === "source")
                    return Math.floor(appActor.actorWidth / 3);
                return Math.floor(2 * appActor.actorWidth / 3);
            }).strength(0.06))
                .force("y", d3.forceY().y(function (d) {
                    return Math.floor(appActor.actorHeight / 2);
                }).strength(0.05));
            appActor.updateAll();
            appActor.actorDisplayed = true;
        });

        //some preparation and activation for gui display
        $(document).ready(function () {
            //expands divs with filters
            $(".filterExpand").click(function () {
                if (this.value === "expand") {
                    this.value = "collapse";
                    $(this).css("background-image", "url(../images/collapse.png)");
                    $(this).next().next("div.filterContainer").show("fast");
                }
                else {
                    this.value = "expand";
                    $(this).css("background-image", "url(../images/expand.png)");
                    $(this).next().next("div.filterContainer").hide("fast");
                }
            });

            //enable jquery hover text for various gui elements
            $(".actorBottom, .clearActorBtn, #deleteGroup, .actorShowSelectedLbl, #editGroupName").tooltip({container: "body"});
        });

        //rename group on click, initialize groups
        $(document).ready(function () {
            //visual feedback for name changing
            $("#editGroupName").click(function () {
                $("#editGroupName").css("background-color", "white").css("border", "1px solid black");
            });

            //catch enter and escape key
            $("#editGroupName").keydown(function (e) {
                if (e.keyCode == 13 || e.keyCode == 27) {       //enter or escape key pressed
                    $("#editGroupName").focusout();
                    $("#" + appActor.currentTab + "TabBtn").focus();     //remove focus
                }
            });

            //save changes to group name
            $("#editGroupName").focusout(function () {
                let newGroupName = $("#editGroupName").val().trim();
                if (newGroupName === "") {       //revert to previous name if none entered
                    newGroupName = window[appActor.currentTab + "CurrentNode"].name;
                }
                //remove visual feedback
                $("#editGroupName").css("background-color", "#F9F9F9").css("border", "none");
                //update in nodes data structure
                window[appActor.currentTab + "CurrentNode"].name = newGroupName;
                //update DOM
                appActor.updateGroupName(newGroupName);

                appActor.updateAll();        //update force

                if (opMode === "aggreg")
                    updateAggregTable();
            });
        });

        //rename group on click, initialize groups
        $(document).ready(function () {

            //visual feedback for name changing
            $("#editGroupName").click(function () {
                $("#editGroupName").css("background-color", "white").css("border", "1px solid black");
            });

            //catch enter and escape key
            $("#editGroupName").keydown(function (e) {
                if (e.keyCode == 13 || e.keyCode == 27) {		//enter or escape key pressed
                    $("#editGroupName").focusout();
                    $("#" + appActor.currentTab + "TabBtn").focus();		//remove focus
                }
            });

            //save changes to group name
            $("#editGroupName").focusout(function () {
                var goodName = true;
                let newGroupName = $("#editGroupName").val().trim();
                if (newGroupName === "") {		//revert to previous name if none entered
                    newGroupName = window[appActor.currentTab + "CurrentNode"].name;
                    goodName = false;
                }
                else if (newGroupName !== window[appActor.currentTab + "CurrentNode"].name && appActor.actorNodeNames.indexOf(newGroupName) > -1) {
                    alert("This name has already been used");
                    newGroupName = window[appActor.currentTab + "CurrentNode"].name;
                    goodName = false;
                    $("#editGroupName").focusin();
                }

                //remove visual feedback
                $("#editGroupName").css("background-color", "#F9F9F9").css("border", "none");
                //update in nodes data structure
                if (goodName) {
                    appActor.actorNodeNames.splice(appActor.actorNodeNames.indexOf(window[appActor.currentTab + "CurrentNode"].name), 1);
                    appActor.actorNodeNames.push(newGroupName);
                }
                window[appActor.currentTab + "CurrentNode"].name = newGroupName;

                //update DOM
                appActor.updateGroupName(newGroupName);

                appActor.updateAll();		//update force

                if (opMode === "aggreg")
                    updateAggregTable();
            });
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
