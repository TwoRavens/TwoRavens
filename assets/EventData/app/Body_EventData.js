import m from 'mithril';
import * as app from "./app.js"

import Header from "./views/Header"
import Footer from "./views/Footer"
import LeftPanel from "./views/LeftPanel"
import RightPanel from "./views/RightPanel"

import CanvasAction from "./views/CanvasAction"
import CanvasActor from "./views/CanvasActor"
import CanvasAggregation from "./views/CanvasAggregation"
import CanvasCoordinates from "./views/CanvasCoordinates"
import CanvasCustom from "./views/CanvasCustom"
import CanvasDate from "./views/CanvasDate"
import CanvasLocation from "./views/CanvasLocation"

import TableAggregation from "./views/TableAggregation"

export default class Body_EventData {

    oncreate() {

        /* Dataset Selection Popover */
        // Initiate
        $('.optionView').hide();


        // note that .textContent is the new way to write text to a div
        $('#about div.panel-body').text('TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed.  In the Norse, their names were "Thought" and "Memory".  In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cumulative guidance and meta-analysis.');
        //This is the first public release of a new, interactive Web application to explore data, view descriptive statistics, and estimate statistical models.";

        // Open/Close Panels
        $('#leftpanel span').click(app.toggleLeftPanel);
        $('#rightpanel span').click(app.toggleRightPanel);

        // Build list of subsets in left panel
        d3.select("#subsetList").selectAll("p")
            .data(app.subsetKeys)
            .enter()
            .append("p")
            .text(function (d) {
                return d;
            })
            .style("text-align", "center")
            .style('background-color', function () {
                if (d3.select(this).text() === app.subsetKeySelected) return app.selVarColor;
                else return app.varColor;
            })
            .on("click", function () {
                app.showSubset(d3.select(this).text())
            });

        // on load make subset tab in left panel show first
        $("#btnSubset").trigger("click");
        $("#btnSubsetLabel").addClass('active');

        document.getElementById("datasetLabel").innerHTML = app.dataset + " dataset";

        // Close rightpanel if no prior queries have been submitted
        if (app.queryId === 1) {
            app.toggleRightPanel();
        }

        let query = {
            'type': 'formatted',
            'dataset': app.dataset,
            'datasource': app.datasource
        };

        // Load the field names into the left panel
        app.makeCorsRequest(app.subsetURL, query, app.variableSetup);

        // Bind the leftpanel search box to the field name list
        $("#searchvar").keyup(app.reloadLeftpanelVariables);

        app.laddaSubset = Ladda.create(document.getElementById("btnSubmit"));
        app.laddaReset = Ladda.create(document.getElementById("btnReset"));
        app.laddaDownload = Ladda.create(document.getElementById("buttonDownload"));
        app.laddaReset.start();

        query = {
            'subsets': JSON.stringify(app.subsetQuery),
            'variables': JSON.stringify(app.variableQuery),
            'dataset': app.dataset,
            'datasource': app.datasource
        };

        // Initial load of preprocessed data
        app.makeCorsRequest(app.subsetURL, query, app.pageSetup);
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        return m('main',
            [
                m(Header, {mode: mode}),
                m(LeftPanel, {mode: mode}),
                m(RightPanel, {mode: mode}),
                m("button.btn.btn-default[id='stageButton'][onclick='addRule()'][type='button']", "Stage"),
                m(".left[id='main'][onresize='rightpanelMargin()']",
                    [
                        m(CanvasActor, {mode: mode}),
                        m(CanvasDate, {mode: mode}),
                        m(CanvasAction, {mode: mode}),
                        m(CanvasLocation, {mode: mode}),
                        m(CanvasCoordinates, {mode: mode}),
                        m(CanvasCustom, {mode: mode}),
                        m(CanvasAggregation, {mode: mode})
                    ]
                ),
                m(TableAggregation, {mode: mode}),
                m(Footer, {mode: mode})
            ]
        );
    }
}