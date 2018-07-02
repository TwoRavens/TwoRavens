import m from 'mithril';
import {panelMargin} from "../../../common-eventdata/common";

export default class CanvasTimeSeries {
    view(vnode) {
        let {display} = vnode.attrs;
        // TODO: Note from Mike, I was making changes in aggreg. I busted the time series plot, but since we will be adding Vega, I didn't make fixes
        return m("#canvasAggregTS", {style: {"display": display, width: '100%'}}, [
            m("#canvasAggregTSBin", {style: {'padding-top': panelMargin, width: '100%'}}, [
                m("svg#aggregTS_SVG[height='100%'][width='100%']", {style: {"background": "none", width: '100%'}}), m(".SVGtooltip")
            ]),
            m("#aggregTSGroupSelect")
            //~ ,
            //~ m("#aggregTSGroupSelect" , [
            //~ m("h3.panel-title", "Group Selection")
            //~ ])
        ]);
        //~ ,
        //~ [
        //~ m("[id='aggregTS_SVGdiv']", {style: {"display": "inline-block"}}, m("svg[height='500'][id='aggregTS_SVG'][width='500']", {style: {"border": "1px black"}}))
        //~ ]
    }
}
