export default class Rightpanel {
  view(vnode) {
    return(m(".sidepanel.container.clearfix[id='rightpanel']",
      [
        m(".panelbar[id='toggleRpanelicon']", m.trust("<span>&#9679;<br/>&#9679;<br/>&#9679;<br/>&#9679;</span>")),
        m(".panel-heading.text-center[id='rightpaneltitle']", 
          m("h3.panel-title", "Query Summary")
        ),
        m("[id='queryVariables']", {style: {"margin-left": "5px", "width": "232px", "height": "calc(35% - 39px)", "overflow-y": "auto"}},
          [
            m("h4.panel-title", "Variables"),
            m("[id='variableTree']", {style: {"margin-left": "10px", "width": "calc(100% - 15px)", "height": "calc(100% - 19px)", "overflow-y": "auto"}})
          ]
        ),
        m("[id='querySubsets']", {style: {"width": "232px", "height": "calc(65% - 39px)"}},
          [
            m("h4.panel-title", {style: {"margin-left": "5px"}}, "Subsets"),
            m("[id='subsetTree']", {style: {"height": "calc(100% - 19px)", "overflow-y": "auto"}})
          ]
        ),
        m("[id='rightpanelButtonBar']", {style: {"width": "232px", "position": "absolute", "bottom": "5px"}},
          [
            m("button.btn.btn-default[id='buttonAddGroup'][onclick='addGroup()'][type='button']", {style: {"float": "left", "margin-left": "6px"}}, "Group"),
            m("button.btn.btn-default.ladda-button[data-spinner-color='#818181'][id='buttonDownload'][onclick='download()'][type='button'][zoom-in""='']", {style: {"float": "right", "margin-right": "6px", "data-style="}}, 
              m("span.ladda-label", "Download")
            )
          ]
        )
      ]
    ));
  }
}