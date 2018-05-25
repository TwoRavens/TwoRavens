import m from 'mithril'

import Button from '../../../app/views/PanelButton';
import List from '../../../app/views/PanelList';
import Search from '../../../app/views/Search';
import Subpanel from '../../../app/views/Subpanel';

import {varColor, mergeAttributes, menuColor} from "../common";

import Header from './Header';
import Canvas from './Canvas';
import MenuTabbed from './MenuTabbed';
import Modal, {setModal} from './Modal';
import Panel from './Panel';
import PanelList from './PanelList';
import Table from './Table';
import TextField from './TextField';
import * as common from "../common";
import * as index from "../../../app/index";
import * as app from "../../../app/app";

let varList = [];

export default class Recode {
    oncreate() {
        window.addEventListener('storage', (e) => onRecodeStorageEvent(this, e));
    }

    oninit() {

        this.configuration = localStorage.getItem('configuration');

        m.request(`rook-custom/rook-files/${this.configuration}/preprocess/preprocess.json`).then(data => {
            for(var variable in data['variables']){
                varList.push(variable);  
            }
            console.log(varList)
        });

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
                            m('a[href=/createVar]',{onclick: m.route.link},  "Create New Variable")),
                            m('li',
                            m('a[href=/formulaBuilder]',{oncreate: m.route.link}, "Formula Builder")),
                            m('li',
                            m('a[href=/recode].active', {oncreate: m.route.link}, "Recode")),
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
            },m(`div#${"varList"}`, varList.map((item) =>
            m(`div#${"varList" + item.replace(/\W/g, '_')}`, mergeAttributes({
                    style: {
                        'margin-top': '5px',
                        'text-align': "center",
                        'background-color':  varColor
                    },
                    // 'class': viewClass[item],
                },
                // add any additional attributes if passed
                ), item)))
            ),
        ]
    }

}

function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    m.redraw();
}