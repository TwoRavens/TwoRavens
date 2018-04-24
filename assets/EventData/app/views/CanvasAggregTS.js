import m from 'mithril';
import {panelMargin} from "../../../common/app/common";
//~ import * as d3 from "d3";

export default class CanvasAggregTS {
	//on create?

	view(vnode) {
		let {display} = vnode.attrs;
		return (m("#canvasAggregTS", {style: {"display": display, 'padding-top': panelMargin + 'px'}}
		//~ ,
            //~ [
                //~ m("[id='aggregTS_SVGdiv']", {style: {"display": "inline-block"}}, m("svg[height='500'][id='aggregTS_SVG'][width='500']", {style: {"border": "1px black"}}))
			//~ ]
		));
	}
}
