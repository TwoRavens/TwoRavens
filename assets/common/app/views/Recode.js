
import '../../css/common.css';

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
let config = '';
let configName = '';
let dataDetails = {};
let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let tableData = [];
let tableHeader = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

export default class Recode {
    oncreate() {
        window.addEventListener('storage', (e) => onRecodeStorageEvent(this, e));
    }

    oninit() {

        this.configuration = localStorage.getItem('configuration');
        this.configName = localStorage.getItem('configName');
        config = this.configuration;
        configName = this.configName
        //data/ traindata.csv
        m.request(config).then(data => {
            
            Object.assign(dataDetails,  data['variables']);

            for(var variable in dataDetails){
                varList.push(variable);  
            }
        });
        

        m.request(`rook-custom/rook-files/${configName}/data/trainData.tsv`, {
            deserialize: x => x.split('\n').map(y => y.split('\t'))
        }).then(data => {
            // console.log(data)
            // simulate only loading some of the data... by just deleting all the other data
            let headers = data[0].map(x => x.replace(/"/g, ''));
            let newData = data.slice(peekSkip + 1, peekSkip + 1 + peekBatchSize);
    
            // stop blocking new requests
            peekIsGetting = false;
    
            // start blocking new requests until peekReset() is called
            if (newData.length === 0) peekAllDataReceived = true;
    
            peekData = peekData.concat(newData);
            peekSkip += newData.length;
            // console.log('data')
            
            for(var val in peekData){
                tableData.push(peekData[val]);  
            }
            for(var val in headers){
                tableHeader.push(headers[val]);  
            }
        });
        console.log(tableData)
        console.log(tableHeader)
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
                m('div.outter',{style:{'padding':'10px'}},[
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
                m(`#rightpanel.container.sidepanel.clearfix`, mergeAttributes({
                    style: {
                        overflow: 'scroll',
                        background: menuColor,
                        border: borderColor,
                        width: (window.innerWidth - 300)+'px' ,
                        height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px)`,
                        position: 'fixed',
                        top: heightHeader + panelMargin  + 'px',
                    }}),
                    m('div.container-fluid ',{id: 'recodeDiv'},[
        
                        m('div.container-fluid', {id : 'div1_recode' , style : {'height': '220px','padding':'20px'}}, [
                            m('form',{ onsubmit: calculate},[
                                m('div',{style :{'display': 'block','overflow': 'hidden'}},[
                                    m('input[type=text]', {id: 'variable', placeholder: 'Variable', style : {'width': '100%','box-sizing':'border-box'}}),
                                    m('span',{ onmouseover:_=> showTooltip() , onmouseout:_=> hideTooltip(),style: {'position': 'absolute','display': 'inline','top': '25px','color': 'grey','padding-left': '5px', 'font-size':'17px'}},"?"),
                                    m('div',{id:'tooltip', style: 'right:0; display: none; margin-right: 35px'},[
                                        m('table',[
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
                            m('form',{ onsubmit: calculate2},[
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
                                m('span',{style :{'display': 'block','overflow': 'hidden'}},[m('input[type=text]', {id: 'variables', placeholder: 'Variable', style : {'width': '100%','box-sizing':'border-box','white-space': 'nowrap;'}}),]),
                                m("br"),
                                m('button[type="submit"]',{style: {'float':'right'}}, 'Customize'),
                            ]),])
                    ])
                ),
                m('#centralPanel.container.sidepanel.clearfix', mergeAttributes({
                    style: {
                        overflow: 'scroll',
                        background: menuColor,
                        border: borderColor,
                        width: (window.innerWidth-25)+'px' ,
                        height: `calc(100% - ${heightHeader + heightFooter}px - ${2 * panelMargin}px - ${canvasScroll['horizontal'] ? scrollbarWidth : 0}px)`,
                        position: 'fixed',
                        display:'block',
                        top: heightHeader + panelMargin  + 'px',
                        
                    }}),[
                        m('div.container', {id : 'createDiv' , style : {'display':'block','height': '250px','overflow':'hidden','width': '100%','height':'100%'}}, [
                            m('form',{ onsubmit: createNewCalculate},[
                                m('div',{style :{'display': 'block','float':'left'  ,'overflow':'hidden','width':'40%'}},[
                                    m('br'),
                                    m('h4',{ style : {'display':'inline-block', 'margin-right':'10px'}},'Variable Name : '),
                                    m('input[type=text]', {id: 'newVar', placeholder: 'New Variable', style : {'display':'inline-block' , 'margin-right':'10px', 'width':'40%'}}),
                                    m('br'),
                                    m('h4',{ style : {'display':'inline-block', 'margin-right':'10px'}},'Variable Type : '),
                                    m('div.dropdown',{ style : {'display':'inline-block'}},[
                                        m('select.form-control',{style:{'display':'inline-block'}, id:'varType'},[
                                            m('option','numchar'),
                                            m('option','boolean'),
                                            m('option','Character')
                                        ])
                                    ])
                                ]),m('div',{style :{'display': 'block','width':'60%','float':'right','height':'1000px' ,'overflow-y': 'auto'}},[
                                    m('table.table#createTable',{style:{ 'overflow': 'scroll'}},[
                                        m('tr',[
                                            (tableHeader.slice(1)).map((header) => m('th.col-xs-2',header))
                                        ]),
                                        tableData.map((row,i)=> m('tr',[
                                            row.filter((item,j) => j !== 0 ).map((item,j) => m('td',item))],
                                            m('td',[])
                                        ))
                                    ])                                                                        
                                ]),
                                
                                m("br"),
                                m('button[type="submit"]' ,'Create New Variable'),
                            ])
                        ])
                    ])
                ]),
            ]}
        }

function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    recode.configName = localStorage.getItem('configName');
    m.redraw();
}
function initialconfig(){
    console.log(dataDetails)
}
function clickVar(elem) {
    
    if(document.getElementById('recodeLink').className === 'active'){
      
        //If the variable is a of the type 'character', cannot apply mathematical transformations on it.
        if(dataDetails[elem]['numchar'] != 'numeric'){
            var transform =  document.getElementById('div1_recode');
            transform.style.display = 'none';
        }
        else {
            var transform =  document.getElementById('div1_recode');
            transform.style.display = 'block';
            var text = document.getElementById('variable');
            text.value = elem;
            currentVal = elem;
        }
    }

    if(document.getElementById('formulaLink').className === 'active'){
        //Only those variables of type "numeric" could be used to build formula
        if(dataDetails[elem]['numchar'] === 'numeric'){
            var text = document.getElementById('variables');
            text.value = text.value + " " + elem;
        }
     }
     
}

function showTooltip(){
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
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function createNewCalculate(elem){
    console.log(elem.target[0].value);
    console.log(elem.target[1].value);
}
function calculate2(elem){
    var json = {
        'configuration': config,
        'variable': currentVal,
        'start': elem.target[0].value,
        'end': elem.target[1].value,
        'replacement': elem.target[2].value
    }
    app.callTransform();
    // console.log(json)
}
function calculate(elem){
    var recodeString = elem.target[0].value;
    var json = {
        'configuration': config,
        'variable': currentVal,
        'formula': recodeString
    }

    console.log(json);

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

    var elem = document.getElementById('leftpanel');
    elem.style.display ='none';
    
    var elem = document.getElementById('rightpanel');
    elem.style.display ='none';
    
    var elem = document.getElementById('centralPanel');
    elem.style.display ='block';
    
}
function createCreate(){
    var elem = document.getElementById('formulaDiv');
    elem.style.display = 'none';
    var elem = document.getElementById('centralPanel');
    elem.style.display ='none';
}

function recodeCreate(){
    var elem = document.getElementById('recodeLink');
    elem.className = 'active';

    var elem = document.getElementById('centralPanel');
    elem.style.display ='none';
}
function recodeClick(){
    var elem = document.getElementById('recodeLink');
    elem.className = 'active';

    var elem = document.getElementById('centralPanel');
    elem.style.display="none"

    var elem = document.getElementById('rightpanel');
    elem.style.display="block"

    var elem = document.getElementById('leftpanel');
    elem.style.display="block"

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

function formulaCreate(){

    var elem = document.getElementById('centralPanel');
    elem.style.display ='none';
}
function formulaClick(){

    var elem = document.getElementById('rightpanel');
    elem.style.display="block"

    var elem = document.getElementById('leftpanel');
    elem.style.display="block"

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
function reorderCreate(){

    var elem = document.getElementById('centralPanel');
    elem.style.display ='none';
}

$(window).resize(function(){
    $('#rightpanel').css({
    'width':  (window.innerWidth - 300)+'px',
});
$('#centralPanel').css({
    'width':  (window.innerWidth-25)+'px',
});
});

