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

import '../../css/common.css';

import {
    borderColor,
    heightHeader,
    heightFooter,
    panelMargin,
    canvasScroll,
    scrollbarWidth,
} from "../common";


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
            // console.log(varList)
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
                            m('a',{onclick: hidePanel},  "Create New Variable")),
                            m('li',
                            m('a[href=/formulaBuilder]',{oncreate: m.route.link}, "Formula Builder")),
                            m('li',
                            m('a[href=/recode].active', {oncreate: m.route.link}, "Recode")),
                            m('li',
                            m('a[href=/reorder]', {oncreate: m.route.link}, "Reorder")),
                        ]),
                    ])
                ]),
            m(Panel, {
                side: 'left',
                label: 'Data Selection',
                hover: true,
                width: app.modelLeftPanelWidths[app.leftTab],
                attrsAll: {style: {'z-index': 101}}
            },  m(PanelList,{
                id: 'varList',
                items: varList,
                callback: clickVar,
                
            }),
        ),
        m(`#${'right'}panel.container.sidepanel.clearfix`, mergeAttributes({
            style: {
                background: menuColor,
                border: borderColor,
                width: (window.innerWidth - 300)+'px' ,
                height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px)`,
                position: 'fixed',
                top: heightHeader + panelMargin  + 'px',
                
                // ['right']: ('right' === 'right' && canvasScroll['vertical'] ? scrollbarWidth : 0) + panelMargin + 'px',
                // ['padding-' + side]: '1px',
                // 'z-index': 100
            }}),
            m('div.container-fluid', [
                m('input[type=text]', {id: 'variable', placeholder: 'Variable'}),
                m('br'),
                m('br'),
                m(Button,{id: 'recode'},'Customize'),
            ])
        ), 
    ]
    }

}

function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    m.redraw();
}
function clickVar(elem) {
    
    var element = document.getElementById("varListsftptv2a5");
    element.style.backgroundColor = "black";

    console.log((window.innerWidth - 300)+'px')
    
    var text = document.getElementById('variable');
     text.value = elem; 
    //  m.redraw();
}

function hidePanel(){
    var elem = document.getElementById('leftpanel');
    elem.style.visibility = 'hidden';
}

$(window).resize(function(){
    $('#rightpanel').css({
    'width':  (window.innerWidth - 300)+'px',
});
});