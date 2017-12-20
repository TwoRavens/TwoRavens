
export default class CanvasAction {
  view(vnode) {
  	return(m(".subsetDiv[id='subsetAction']", {style: {"display": "none"}}, 
	  m("[id='actionSVGbin']", {style: {"display": "inline-block", "margin-top": "10px", "margin-left": "10px", "height": "calc(100% - 20px)", "width": "calc(100% - 46px)"}},
	    [
	      m(".action_graph_config[id='pentaclass_container']", {style: {"float": "left", "display": "inline-block", "vertical-align": "top", "height": "100%", "width": "calc(35% - 10px)"}},
	        [
	          m(".panel-heading.text-center[id='pentaclassLabel']", {style: {"float": "left", "padding-top": "9px"}}, 
	            m("h3.panel-title", "Penta Classes")
	          ),
	          m("br"),
	          m("svg[height='100%'][id='actionMainGraph'][width='100%']", {style: {"background": "none"}})
	        ]
	      ),
	      m(".action_graph_config[id='rootcode_container']", {style: {"float": "right", "display": "inline-block", "vertical-align": "top", "height": "100%", "width": "calc(65%)"}},
	        [
	          m(".panel-heading.text-center[id='rootclassLabel']", {style: {"float": "left", "padding-top": "9px"}}, 
	            m("h3.panel-title", "Root Classes")
	          ),
	          m("br"),
	          m("svg[height='100%'][id='actionSubGraph'][width='100%']", {style: {"background": "none"}})
	        ]
	      ),
	      m(".SVGtooltip")
	    ]
	  )
	));
  }
}