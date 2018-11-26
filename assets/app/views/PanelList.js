import m from 'mithril';

import * as app from '../app';
import * as plots from '../plots';

import {searchIndex} from './Search';

class PanelList {
    view(vnode) {
        let {items, content, title, probDesc, onclick} = vnode.attrs;
        return m(
            '#varList[style=display: block]',
            items.map((v, i) =>
                      m(`p#${v.replace(/\W/g, '_')}`, {
                          class: probDesc ?
                              (app.d3mProblemDescription[probDesc] === v ? 'item-select' :
                               app.lockToggle ? 'item-default item-lineout' :
                               'item-default') : '',
                          style: {
                              'background-color': probDesc ? '' :
                                  app.zparams.zdv.includes(v) ? app.hexToRgba(app.dvColor) :
                                  app.zparams.znom.includes(v) ? app.hexToRgba(app.nomColor) :
                                  app.nodes.map(n => n.name).includes(v) ? app.hexToRgba(plots.selVarColor) :
                                  app.varColor,
                              'border-color': '#000000',
                              'border-style': !probDesc && searchIndex && i < searchIndex ? 'solid' : 'none',
                              'text-align': 'center'
                          },
                          onclick: onclick || probDesc || app.clickVar,
                          onmouseover: function() {
                              $(this).popover('toggle');
                              if (probDesc) return;
                              $("body div.popover")
                                  .addClass("variables");
                              $("body div.popover div.popover-content")
                                  .addClass("form-horizontal");
                          },
                          onmouseout: "$(this).popover('toggle');",
                          'data-container': 'body',
                          'data-content': content ? content(v) : app.popoverContent(app.findNode(v)),
                          'data-html': 'true',
                          'data-original-title': title + ' for <b>' + v,
                          'data-placement': probDesc ? 'top' : 'right',
                          'data-toggle': 'popover',
                          'data-trigger': 'hover'},
                        v)));
    }
}

export default PanelList;
