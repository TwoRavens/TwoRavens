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

class Body_EventData {
  oncreate() {
  }

  view(vnode) {
    let {mode} = vnode.attrs;

    return m('main',
      [
        m(Header, {mode: mode}),
        m(LeftPanel, {mode: mode}),
        m(RightPanel, {mode: mode}),
        m("button.btn.btn-default[id='stageButton'][onclick='addRule()'][type='button']", "Stage")
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