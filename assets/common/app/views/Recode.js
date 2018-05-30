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
        });
    }
    view() {
        return [
            m('nav.navbar.navbar-default',
                [
                    m('div.container-fluid',[
                        m('ul.nav.navbar-nav',[
                            m('li',
                            m('a',{oncreate: createCreate, onclick: hidePanel},  "Create New Variable")),
                            m('li',
                            m('a',{oncreate:""}, "Formula Builder")),
                            m('li',
                            m('a', {oncreate: ""}, "Recode")),
                            m('li',
                            m('a', {oncreate: ""}, "Reorder")),
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
            m('div.container-fluid ',{id: 'recodeDiv'},[

                m('div.container-fluid', {id : 'div1'}, [
                    m('form',{ onsubmit: calculate},[
                        m('input[type=text]', {id: 'variable', placeholder: 'Variable'}),
                        m("br"),
                        m('button[type="submit"]', 'Customize'),
                    ]),
                    
                    // m('br'),
                    // m('br'),
                    
                ])
            
            ]),
            m('div.container-fluid', {id: 'createDiv'},[

                m('div.container-fluid.align-items-center', {id : 'div1'}, [
                    m('form',{ onsubmit: calculate},[
                        m('input[type=text]', {id: 'variable', placeholder: 'Variable'}),
                        m("br"),
                        m('button[type="submit"]', 'Customize'),
                    ]),                    
                ]),
                m('div.container-fluid', {id : 'div2'}, [
                    m('form',{ onsubmit: calculate},[
                        m('input[type=text]', {id: 'variable', placeholder: 'Variable'}),
                        m("br"),
                        m('button[type="submit"]', 'Customize'),
                    ]),                   
                ])
            ])
        ), 
    ]}
}

function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    m.redraw();
}
function clickVar(elem) {
        
    var text = document.getElementById('variable');
     text.value = elem;
}

function calculate(elem){
    console.log(elem.target[0].value)
    app.callTransform(elem.target[0].value);
}

function hidePanel(){
    var elem = document.getElementById('createDiv');
    // elem.style.visibility = 'visible';
    $(elem).show();
    // jQuery('#recodeDiv').replaceWith(jQuery('#createDiv'));

    // $('div#createDiv').html('<div class ="container-fluid" id ="newDiv"></div>');
    // var elem = document.getElementById('recodeDiv');
    // return elem.parentNode.removeChild(elem);
    // var elem = document.getElementById('leftpanel');
    // elem.style.visibility = 'hidden';
    var elem = document.getElementById('recodeDiv');
    elem.style.visibility = 'hidden';
}
function createCreate(){
    console.log('create created');
    var elem = document.getElementById('createDiv');
    // elem.style.visibility = 'hidden';
    $(elem).hide();

}

$(window).resize(function(){
    $('#rightpanel').css({
    'width':  (window.innerWidth - 300)+'px',
});
});

