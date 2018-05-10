import m from 'mithril';
import {panelMargin} from "../../../common/app/common";
//~ import * as d3 from "d3";

export default class CanvasAggregTS {
	//on create?

	view(vnode) {
		console.log("in canvas aggreg ts mithril");
		console.log(vnode);
		console.log(vnode.attrs);
		let {display} = vnode.attrs;
		return m("[id='canvasAggregTS']", {style: {"display": display}}, [
			m("#canvasAggregTSBin", {style: {'padding-top': panelMargin + 'px'}}, [
				m("svg[height='100%'][id='aggregTS_SVG'][width='100%']", {style: {"background": "none"}})
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
