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
//data/ traindata.csv
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
                            m('li',{id:'createLink'},
                            m('a',{oncreate: createCreate, onclick: createClick},  "Create New Variable")),
                            m('li',{id:'formulaLink'},
                            m('a',{oncreate: formulaCreate, onclick: formulaClick}, "Formula Builder")),
                            m('li',{id:'recodeLink'},
                            m('a', {oncreate: recodeCreate, onclick: recodeClick}, "Recode")),
                            m('li',{id:'reorderLink'},
                            m('a', {oncreate: reorderCreate, onclick: reorderClick}, "Reorder")),
                        ]),
                    ])
                ]),
            m(Panel, {
                side: 'left',
                label: 'Data Selection',
                hover: true,
                width: app.modelLeftPanelWidths[app.leftTab],
                attrsAll: {style: {'z-index': 101, 'overflow':'scroll'}}
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

                m('div.container-fluid', {id : 'div1' , style : {'display':'block','height': '220px','padding':'20px'}}, [
                    m('form',{ onsubmit: calculate},[
                        m('div',{style :{'display': 'block','overflow': 'hidden'}},[
                            m('input[type=text]', {id: 'variable', placeholder: 'Variable', style : {'width': '100%','box-sizing':'border-box'}}),
                            m('span',{style: {'position': 'absolute',
                                'display': 'inline',
                                'top': '25px',
                                // 'right': -'300px',
                                // 'background-color': 'grey',
                                'color': 'grey',
                                // 'padding-right':'100px',
                                'padding-left': '5px',
                                'z-index':'10'
                                }},"?")
                        ]),
                        m("br"),
                        m('button[type="submit"]',{style: {'float':'right'}}, 'Customize'),
                    ]),]),
                    m('div.container-fluid', {id : 'div2' , style : {'display':'block','height': '250px','padding':'20px'}}, [
                    m('form',{ onsubmit: calculate},[
                        m('span',{style :{'display': 'block','overflow': 'hidden'}},[
                            m('input[type=text]', {id: 'value1', placeholder: 'value 1', style : {'display':'inline-block' , 'margin-right':'10px', 'width':'20%'}}),
                            m('h3',{ style : {'display':'inline-block', 'margin-right':'10px'}},'-'),
                            m('input[type=text]', {id: 'value2', placeholder: 'value 1', style : {'display':'inline-block' , 'margin-right':'10px', 'width':'20%'}}),
                            m('h3',{ style : {'display':'inline-block', 'margin-right':'10px'}},'='),
                            m('input[type=text]', {id: 'newValue', placeholder: 'New Value', style : {'display':'inline-block' , 'width':'20%'}}),
                        ]),
                        
                        m("br"),
                        m('button[type="submit"]',{style: {'float': 'right'}} ,'Customize'),
                    ])
                ])
            
            ]),
            m('div.container-fluid', {id: 'formulaDiv'},[

                m('div.container-fluid', {id : 'div1' , style : {'display':'block','height': '220px','padding':'20px'}}, [
                    m('form',{ onsubmit: createNewCalculate},[
                        m('span',{style :{'display': 'block','overflow': 'hidden'}},[m('input[type=text]', {id: 'variables', placeholder: 'Variable', style : {'width': '100%','box-sizing':'border-box'}}),]),
                        m("br"),
                        m('button[type="submit"]',{style: {'float':'right'}}, 'Customize'),
                    ]),])
            ])
        ), 
    ]}
}

function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    m.redraw();
}
function clickVar(elem) {
    
    if(document.getElementById('recodeLink').className === 'active'){
        var text = document.getElementById('variable');
        text.value = elem;
    }

    if(document.getElementById('createLink').className === 'active'){
        var text = document.getElementById('variables');
        text.value = text.value + " " + elem;
     }
     
}

function createNewCalculate(){

}

function calculate(elem){
    console.log(elem.target[0].value)
    app.callTransform(elem.target[0].value);
}

function createClick(){
    var elem = document.getElementById('formulaDiv');
    elem.style.display="none";

    var elem = document.getElementById('recodeDiv');
    elem.style.display = 'none';

    var elem = document.getElementById('createLink');
    elem.className = 'active';
    var elem = document.getElementById('formulaLink');
    elem.className = '';
    var elem = document.getElementById('recodeLink');
    elem.className = '';
    var elem = document.getElementById('reorderLink');
    elem.className = '';
}
function createCreate(){
    var elem = document.getElementById('formulaDiv');
    elem.style.display = 'none';
}

function recodeCreate(){
    var elem = document.getElementById('recodeLink');
    elem.className = 'active';
}
function recodeClick(){
    var elem = document.getElementById('recodeLink');
    elem.className = 'active';

    var elem = document.getElementById('recodeDiv');
    elem.style.display="block";

    var elem = document.getElementById('formulaDiv');
    elem.style.display="none";

    var elem = document.getElementById('reorderLink');
    elem.className = '';
    var elem = document.getElementById('formulaLink');
    elem.className = '';
    var elem = document.getElementById('createLink');
    elem.className = '';
}

function formulaCreate(){}
function formulaClick(){

    var elem = document.getElementById('formulaDiv');
    elem.style.display="block";

    var elem = document.getElementById('recodeDiv');
    elem.style.display = 'none';
    
    var elem = document.getElementById('formulaLink');
    elem.className = 'active';
    var elem = document.getElementById('reorderLink');
    elem.className = '';
    var elem = document.getElementById('recodeLink');
    elem.className = '';
    var elem = document.getElementById('createLink');
    elem.className = '';
}

function reorderClick(){
    var elem = document.getElementById('reorderLink');
    elem.className = 'active';
    var elem = document.getElementById('formulaLink');
    elem.className = '';
    var elem = document.getElementById('recodeLink');
    elem.className = '';
    var elem = document.getElementById('createLink');
    elem.className = '';
    
}
function reorderCreate(){}

$(window).resize(function(){
    $('#rightpanel').css({
    'width':  (window.innerWidth - 300)+'px',
});
});

