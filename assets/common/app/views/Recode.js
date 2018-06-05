
import '../../css/common.css';
import '../../css/tooltip.css';

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

import {
    borderColor,
    heightHeader,
    heightFooter,
    panelMargin,
    canvasScroll,
    scrollbarWidth,
} from "../common";


let varList = [];
let currentVal = "variable" ;

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
        const Tooltip = {
            view({ attrs, children }) {
              return (
                m('.Tooltip-wrap',
                  children,
                  m('.Tooltip', attrs.value)
                )
              );
            }
          };

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
            }}),
            m('div.container-fluid ',{id: 'recodeDiv'},[

                m('div.container-fluid', {id : 'div1' , style : {'display':'block','height': '220px','padding':'20px'}}, [
                    m('form',{ onsubmit: calculate},[
                        m('div',{style :{'display': 'block','overflow': 'hidden'}},[
                            m('input[type=text]', {id: 'variable', placeholder: 'Variable', style : {'width': '100%','box-sizing':'border-box'}}),
                            m('span',{ onmouseover:_=> showTooltip() , onmouseout:_=> hideTooltip(),style: {'position': 'absolute','display': 'inline','top': '25px','color': 'grey','padding-left': '5px', 'font-size':'17px'}},"?"),
                            m('div',{id:'tooltip', style: 'display: none; margin-left: 185px;'},[
                                m('table',{style : {'width':'100%'}},[
                                    m('tr',[
                                        m('th','Use..'),
                                        m('th','to do...'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'sqrt('+currentVal+')'),
                                        m('td','square root of a variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'abs('+currentVal+')'),
                                        m('td','absolute value of the variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'exp('+currentVal+')'),
                                        m('td','exponential of the variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'log('+currentVal+')'),
                                        m('td','logarithmic value of a variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'log10('+currentVal+')'),
                                        m('td','logarithmic base 10 value of a variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'factorial('+currentVal+')'),
                                        m('td','factorial of a variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'ceiling('+currentVal+')'),
                                        m('td','ceiling value of a variable'),
                                    ]),
                                    m('tr',[
                                        m('td',{style:{'font-family': 'Courier New'}},'floor('+currentVal+')'),
                                        m('td','floor value of a variable'),
                                    ]),
                                ])
                            ]),                            
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
        currentVal = elem;
    }

    if(document.getElementById('createLink').className === 'active'){
        var text = document.getElementById('variables');
        text.value = text.value + " " + elem;
     }
     
}

function showTooltip(){
    console.log("mouse")
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'block';
    tooltip.style.position ='absolute';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.border = '1px solid black';
    tooltip.style.borderRadius = '5px';
    tooltip.style.padding= "5px";
    tooltip.style.zIndex= "1";
    tooltip.style.backgroundColor= 'white';
    // tooltip.style.overflow = 'scroll';

}
function hideTooltip(){
    console.log('gone')
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
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

