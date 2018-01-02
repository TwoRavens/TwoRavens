import m from 'mithril';
import {setupBody, toggleLeftPanel, toggleRightPanel, addRule, setupQueryTree} from "./app";
import {setupAggregation} from "./aggreg/aggreg";

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
        $('.optionView').hide();

        // note that .textContent is the new way to write text to a div
        $('#about div.panel-body').text('TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed.  In the Norse, their names were "Thought" and "Memory".  In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cumulative guidance and meta-analysis.');
        //This is the first public release of a new, interactive Web application to explore data, view descriptive statistics, and estimate statistical models.";

        // Open/Close Panels
        $('#leftpanel span').click(toggleLeftPanel);
        $('#rightpanel span').click(toggleRightPanel);

        setupBody();
        setupQueryTree();

        setupAggregation();
    }

    view(vnode) {
        let {mode} = vnode.attrs;

        return m('main',
            [
                m(Header, {mode: mode}),
                m(LeftPanel, {mode: mode}),
                m(RightPanel, {mode: mode}),
                m("button.btn.btn-default[id='stageButton'][type='button']", {
                    onclick: function (e) {
                        addRule();
                        e.redraw = false;
                    }
                }, "Stage"),
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