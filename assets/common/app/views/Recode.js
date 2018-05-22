import m from 'mithril'

import Button from '../../../app/views/PanelButton';
import List from '../../../app/views/PanelList';
import Search from '../../../app/views/Search';
import Subpanel from '../../../app/views/Subpanel';

import Header from './Header';
import Canvas from './Canvas';
import MenuTabbed from './MenuTabbed';
import Modal, {setModal} from './Modal';
import Panel from './Panel';
import PanelList from './PanelList';
import Table from './Table';
import TextField from './TextField';
import * as common from "../common";

import * as app from "../../../app/app";

export default class Recode {
    oncreate() {
       
    }

    oninit() {
        console.log("here..")
        console.log(app.nodes)
    }
    view() {
        return [
            // m(Header, [
            //     m('div', {style: {'flex-grow': 1}}),
            //     m("h4", m("span#headerLabel.label.label-default", this.header)),
            //     m('div', {style: {'flex-grow': 1}}),
            // ]),
            m('nav.navbar.navbar-default',
                [
                    m('div.container-fluid',[
                        m('ul.nav.navbar-nav',[
                            m('li',
                            m('a[href=/try].active',{onclick: m.route.link},  "Create New Variable")),
                            m('li',
                            m('a[href=/formulaBuilder]',{oncreate: m.route.link}, "Formula Builder")),
                            m('li',
                            m('a[href=/change]', {oncreate: m.route.link}, "Recode")),
                            m('li',
                            m('a[href=/reorder]', {oncreate: m.route.link}, "Reorder")),
                        ]),
                    ])
                ]),
            m(Canvas, {
                    attrsAll: {style: {'margin-top': common.heightHeader + 'px', height: `calc(100% - ${common.heightHeader}px)`}}
                },
                
            ),m(Panel, {
                side: 'left',
                label: 'Variables',
                hover: true,
                width: app.modelLeftPanelWidths[app.leftTab],
                attrsAll: {style: {'z-index': 101}}
            },m(PanelList, {
                id: 'varList',
                items: app.valueKey,
                colors: {
                    [app.hexToRgba(common.selVarColor)]: app.nodes.map(n => n.name),
                    [app.hexToRgba(common.nomColor)]: app.zparams.znom,
                    [app.hexToRgba(common.dvColor)]: app.zparams.zdv
                },
                classes: {'item-bordered': app.matchedVariables},
                callback: app.clickVar,
                popup: (variable) => app.popoverContent(app.findNodeIndex(variable, true)),
                attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'}}),
            ),
        ]
    }

}
