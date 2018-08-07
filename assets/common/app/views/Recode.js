import m from 'mithril'

import Search from '../../../app/views/Search';

import {varColor, mergeAttributes, menuColor} from "../common";

import Panel from './Panel';
import MenuTabbed from './MenuTabbed';
import * as common from "../common";
import * as index from "../../../app/index";
import * as app from "../../../app/app";
import * as explore from "../../../app/explore";

import {
    borderColor,
    heightHeader,
    heightFooter,
    panelMargin,
    canvasScroll,
    scrollbarWidth,
} from "../common";

const $private = false;
var margin_cross = {top: 30, right: 35, bottom: 40, left: 40},
width_cross = 300 - margin_cross.left - margin_cross.right,
height_cross = 160 - margin_cross.top - margin_cross.bottom;
var padding_cross = 100;

let varList = [];
let currentVal = "variable" ;
let config = '';
let configName = '';
let dataDetails = {};
let transformData = {};
let dataNode = [];
let formulaList = [];
let tableList =[];
let toggle = "open";


let data = [];

let peekSkip = 0;
let peekData = [];

let tableData = [];
let tableHeader = [];

var filterIndex =[];
var filterVars =[];

var operations = ['sqrt()','abs()','exp()','log()','log10()','factorial()','ceiling()','floor()'];

export default class Recode {
    oncreate() {
        window.addEventListener('storage', (e) => onRecodeStorageEvent(this, e));
    }

    oninit() {

        this.configuration = localStorage.getItem('configuration');
        this.configName = localStorage.getItem('configName');
        this.transformData =  JSON.parse(localStorage.getItem('transformData'));

        config = this.configuration;
        configName = this.configName
        transformData = this.transformData;
        
        m.request(config).then(data => {
            
            Object.assign(dataDetails,  data['variables']);

            for(var variable in dataDetails){
                varList.push(variable);  
            }
        });
        

        m.request(`rook-custom/rook-files/${configName}/data/trainData.tsv`, {
            deserialize: x => x.split('\n').map(y => y.split('\t'))
        }).then(data => {
            let headers = data[0].map(x => x.replace(/"/g, ''));
            let newData = data.slice(1, data.length-1);
       
            peekData = peekData.concat(newData);
            
            for(var val in peekData){
                tableData.push(peekData[val]);  
            }
            for(var val in headers){
                tableHeader.push(headers[val]);  
            }
        });
    }
    view() {
        return [
            m('nav.navbar.navbar-default',
                [
                    m('div.container-fluid',[
                        m('ul.nav.navbar-nav',[
                            m('li',{id:'createLink',onmouseenter:showTooltip, onmouseleave:hideTooltip},
                            m('a',{oncreate: createCreate, onclick: createClick},  "Manually Create Variable")),
                            m('li',{id:'formulaLink', onmouseenter:showTooltip, onmouseleave:hideTooltip},
                            m('a',{oncreate: formulaCreate, onclick: formulaClick}, "Formula Builder")),
                            m('li',{id:'recodeLink',onmouseenter:showTooltip, onmouseleave:hideTooltip},
                            m('a', {oncreate: recodeCreate, onclick: recodeClick}, "Recode")),
                        ]),
                        m('div',{id:'tooltip',style:{'z-index':'999','margin-left':'450px'}},[

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
                    },
                    m(MenuTabbed,{
                        id: 'leftpanelMenu',
                        attrsAll: {style: {height: 'calc(100% - 39px)'}},
                        currentTab: app.leftTab,
                        callback: app.setLeftTab,
                        sections: [
                            {
                                value: 'Variables',
                                title: '',
                                contents: [
                                    m(`div#varList`, varList.map((item) =>
                                    m(`div#${'varList' + item.replace(/\W/g, '_')}`, mergeAttributes({
                                            style: {
                                                'margin-top': '5px',
                                                'text-align': "center",
                                            },
                                            class: 'var',
                                            onclick: clickVar,
                                            oncreate: createList
                                        }), item)))

                                ]
                            },
                            {
                                value: 'Operations',
                                contents:[
                                    m(`div#operation`, operations.map((item) =>
                                    m(`div#${'operation' + item.replace(/\W/g, '')}`, mergeAttributes({
                                            style: {
                                                'margin-top': '5px',
                                                'text-align': "center",
                                            },
                                            class: 'var',
                                            onclick: addOperations,
                                            oncreate: createList
                                        }), item)))
                                ]
                            }
                        ]
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
                            m('form',{ onsubmit: calculateBin},[
                                m('div',{id:'binInfo',style:{'margin-bottom':'1%'}},[
                                    m('span',{style :{'display': 'block','overflow': 'hidden'}},[m('input[type=text]', {id: 'newBinName', placeholder: 'New Variable Name', style : {'width': '100%','box-sizing':'border-box','white-space': 'nowrap;'}}),]),
                                    m("br"),
                                    m('textarea',{id:'binDescription',cols:"40",rows:'5',placeholder:'New Variable Description'}),
                                    m('br'),
                                ]),
                                m('div',{id:'ordinalDiv',style :{'overflow': 'hidden'}},[
                                    m('input[type=number]',{id:'bin',placeholder:'Number of bins'}),
                                    m('button[type=button]',{onclick: equidistance_btn},'Equidistance'),
                                    m('button[type=button]',{onclick: equimass_btn},'Equimass'),
                                    m('div',{id:'plot_a'}),                         
                                    m('input[type=text]',{id: 'binInterval',style:{'display':'inline-block'},placeholder:'5,10,15,20'}),
                                    m('button[type=button]',{onclick: calculate_bin},'Custom Bin'),                 
                                ]),
                                m("br"),
                                m('div#tableBinDiv',{style :{'overflow-y': 'auto','height': '500px','padding':'10px','border-style':'solid','border-width': 'thin'}},[                                                                       
                                ]),
                                m("br"),
                                m('button[type=submit]',{id:'customRecodeBtn'}, 'Customize'),
                            ]),
                        ]),
                    ]),
                    m('div.container-fluid', {id: 'formulaDiv'},[
        
                        m('div.container-fluid', {id : 'div1' , style : {'display':'block','height': '220px','padding':'20px'}}, [
                            m('form',{ onsubmit: formulaCalculate},[
                                m('span',{style :{'display': 'block','overflow': 'hidden'}},[m('input[type=text]', {id: 'variables', placeholder: 'New Formula', style : {'width': '100%','box-sizing':'border-box','white-space': 'nowrap;'}}),]),
                                m("br"),
                                m('span',{style :{'display': 'block','overflow': 'hidden'}},[m('input[type=text]', {id: 'newVarName', placeholder: 'New Variable Name', style : {'width': '100%','box-sizing':'border-box','white-space': 'nowrap;'}}),]),
                                m("br"),
                                m('textarea',{id:'varDescriptionFormula',cols:"40",rows:'5',placeholder:'New Variable Description'}),
                                m('br'),
                                m('button[type="submit"]',{style: {'float':'right'}}, 'Customize'),
                            ]),])
                    ]),
                    m('div.container-fluid', {id: 'createDiv'},[
                        m('form#createNewForm',{ onsubmit: addValue},[
                        m('div.container-fluid', {id : 'div1' , style : {'display':'block','height': '220px','padding':'20px'}}, [
                            m('button[type=button]',{id:'toggleCollapse','data-target':'#content', class:'btn btn-info btn-block', 'data-toggle':'collapse',onclick: toggleSign},[
                                "New Variable  ",
                                m('span#sign',{style:"font-size: 20px;"},'\u{2193}')
                            ]),
                            m('div',{class:'collapse',id:"content",style:'margin:10px;'},[
                                m('label',{ style : {'display':'inline-block', 'margin-right':'10px'}},'New Variable Name : '),
                                m('input[type=text]', {id: 'newVar', placeholder: ' New Variable', style : {'display':'inline-block' , 'margin':'10px', 'width':'40%'}}),
                                m('br'),
                                m('label',{ style : {'display':'inline-block', 'margin-right':'10px'}},'New Variable Type : '),
                                m('div.dropdown',{style : {'display':'inline-block','margin':'10px'}},[
                                    m('select.form-control#typeSelect',{onchange: someFunction ,style:{'display':'inline-block'}, id:'varType'},[
                                        m('option','Boolean'),
                                        m('option','Nominal'),
                                        m('option','Numchar')
                                    ])
                                ]),
                                m('div#nominalDiv',{style:{'margin':'10px'}},[
                                    m('label',{ style : { 'margin-right':'10px'}},'Class List : '),
                                    m('input[type=text]',{id:'nominalList', placeholder:'Nominal', style:{'margin':'10px'}},),
                                ]),
                                m('label',{ style : {'display':'block', 'margin-right':'10px'}},'New Variable Description : '),
                                m('textarea',{id:'varDescriptionCreate',cols:"40",rows:'5'}),
    
                                m("br"),
                                m('button[type="button"]' ,{id:'createButton',onclick: createNewCalculate,style:"float:left;"},'Create New Variable'),
                                m('button[type="submit"]',{id:'submitButton'},'Add Values'),
                            ]),
                            m('div#tableDiv',{style :{'display': 'block','width':'100%','height':(window.innerHeight-150)+'px' ,'overflow-y': 'auto','border-style': 'solid','border-width': 'thin'}},[
                                
                                m('table.table.table-bordered',{id:'createTable',style:{ 'overflow': 'scroll'}},[
                                    m('tr#colheader',[
                                        (tableHeader.slice(1)).filter((header)=> filterVars.includes(header)).map((header) => m('th.col-xs-4',{style : {'border': '1px solid #ddd','text-align': 'center'}},header)),
                                        
                                    ]),
                                    tableData.map((row,i)=> m('tr#colValues',[
                                        row.filter((item,j) => filterIndex.indexOf(j)>=0 ).map((item,j) => m('td',{style : {'border': '1px solid #ddd','text-align': 'center'}},item)),
                                        
                                    ],
                                        
                                    ))
                                ])                                                                        
                            ]),

                        ]),
                    ]),
                    ])
                ),
                ]),
            ]}
        }

function equidistance_btn(){
    var bin = document.getElementById('bin').value;
    var varName = currentVal;
    equidistance(varName,bin);
}

function equimass_btn(){
    var bin = document.getElementById('bin').value;
    var varName = currentVal;
    equimass(varName,bin);
}
function onRecodeStorageEvent(recode, e){
    recode.configuration = localStorage.getItem('configuration');
    recode.configName = localStorage.getItem('configName');
    recode.transformData =  JSON.parse(localStorage.getItem('transformData'));
    m.redraw();
}

function createList(elem){
    if(elem.dom.id !== "varList"){
        document.getElementById(elem.dom.id).setAttribute("style", "background-color:"+app.hexToRgba("#FA8072"));
    }
}
function someFunction(elem){
    if(elem.target[1].selected){
        document.getElementById("nominalDiv").setAttribute("style", "display:block");
        
    }else{
        document.getElementById("nominalDiv").setAttribute("style", "display:none");
    }
}

function selectAllVars(){
    $(':checkbox').prop("checked", true);
}

function unselectAllVars(){
    $(':checkbox').prop("checked", false);
}

function addOperations(elem){
    if(document.getElementById('formulaLink').className === 'active'){
        formulaList.push(currentVal);
        var text = document.getElementById('variables');
        if(text.value === ""){
            text.value += this.textContent.split("(")[0]+"("+currentVal+")";
        }else{
            text.value += "*"+this.textContent.split("(")[0]+"("+currentVal+")";
        }
        document.getElementById('leftpanelMenuButtonBarVariables').click()
    }
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function clickVar(elem) {

    $('#customRecodeBtn').css('display','block');
    $('#binInfo').css('display','block');
    document.getElementById('customRecodeBtn').disabled = true; 
    
    var list = document.getElementsByClassName('var');
    for (var i = 0; i < list.length; i++ ) {
        list[i].setAttribute("style", "background:"+app.hexToRgba("#FA8072"));
    }
    document.getElementById(this.id).setAttribute("style", "background:"+app.hexToRgba("#28a4c9"));
            
    

    if(document.getElementById('recodeLink').className === 'active'){
        
        // if(this.textContent !== currentVal){
            currentVal = this.textContent;
            document.getElementById('bin').value = "";
            document.getElementById('binInterval').value = "";

            document.getElementById('customRecodeBtn').disabled = true;
            
            //Updating the dataNode
            $( "#binTable" ).remove();

            dataNode = [];
            var index = tableHeader.indexOf(currentVal);
            tableData.map((row,i) => dataNode.push(row[index]))
            dataNode = dataNode.filter( onlyUnique )

            var tableDiv =document.getElementById('tableBinDiv');
            var tbl = document.createElement('table')
            tbl.id = 'binTable'
            tbl.className = "table";
    
            
            for(var rownum = -1; rownum < dataNode.length;rownum++){
                var tr = tbl.insertRow();
                if(rownum == -1){
                    tr.id ="binheader"
                }else{
                    tr.id = "binValues"
                }

                for(var j = 0; j < 2; j++){
                    var td = tr.insertCell();
                    td.style = "border: 1px solid rgb(221, 221, 221); text-align: center;"
                    if(rownum === -1){
                        if(j === 0){
                            td.appendChild(document.createTextNode(currentVal));
                        }else{
                            td.appendChild(document.createTextNode('New Bin Value'));
                        }
                    }else{
                        if(j === 0){
                            td.appendChild(document.createTextNode(dataNode[rownum]));
                        }else{
                            var input = document.createElement('input');
                            input.type = 'text';
                            td.appendChild(input);
                        }
                    }
                   
                    td.style.border = '1px solid black';

                }
            }
            tableDiv.appendChild(tbl)
            //----------------------------------------------------------
            
            document.getElementById('plot_a').innerHTML ="";
            
            var transform =  document.getElementById('div1_recode');
            transform.style.display = 'block';
            
            var node = dataDetails[currentVal];
            console.log('node')
            console.log(node)
            if(node.nature === "nominal"){
                $('#tableBinDiv').css('display', 'block');
                $('#ordinalDiv').css('display','none');
                document.getElementById('customRecodeBtn').disabled = false;
                
            }else if (node.plottype === "continuous") {
                $('#ordinalDiv').css('display','block');
                $('#tableBinDiv').css('display', 'none');
                density_cross(node);    
            }else if (node.plottype === "bar") {
                $('#ordinalDiv').css('display','block');
                $('#tableBinDiv').css('display', 'none  ');
                bar_cross(node);
            }  
        // }
    }

    else if(document.getElementById('formulaLink').className === 'active'){
        
        // document.getElementById(this.id).setAttribute("style", "background:"+app.hexToRgba("#28a4c9"));
        document.getElementById('leftpanelMenuButtonBarOperations').click();

        //Only those variables of type "numeric" could be used to build formula
        if(dataDetails[this.textContent]['numchar'] === 'numeric'){
            currentVal = this.textContent;
        }
     }

     else if(document.getElementById('createLink').className === 'active'){

        currentVal = this.textContent;
        dataNode = [];
        var index = tableHeader.indexOf(currentVal);
        tableData.map((row,i) => dataNode.push(row[index]))
        
        if(!tableList.includes(currentVal)){

            tableList.push(currentVal);
            
            var iter = 0;
            $('#createNewForm').find('tr').each(function(){
                var trow = $(this);   
                if(iter == 0){
                    trow.append('<th style ="border: 1px solid #ddd; text-align: center;">'+currentVal+'</th>');
                    iter++;
                }else{
                    trow.append('<td style ="border: 1px solid #ddd;text-align: center;">'+ dataNode[iter-1]+'</td>');              
                    iter++
                }
            });
        }else{
            var pos = tableList.indexOf(currentVal);
            tableList.splice(pos, 1);
            for(var i = 0;i<= dataNode.length;i++){
                $('#createTable tr')[i].childNodes[pos].remove();
            }
        }
    }
}
function addValue(elem){
    console.log(elem.target)
    var newVarValue = [];

    if(document.getElementById('typeSelect').selectedIndex === 0){
        newVarValue = [];
        for(var i = 0;i<tableData.length;i++){
            if(elem.target[7+i].checked){
                newVarValue.push({row:i,value:'yes'})
            }else{
                newVarValue.push({row:i,value:'no'})
            }
        }
    }else if(document.getElementById('typeSelect').selectedIndex === 1){
        for(var i =0;i<tableData.length;i++){
            newVarValue.push({row:i,value:elem.target[7+i].value})
        }
    }else if(document.getElementById('typeSelect').selectedIndex === 2){
        for(var i =0;i<tableData.length;i++){
            newVarValue.push({row:i,value:elem.target[7+i].value})
        }
    }
    console.log(newVarValue);
    transformData.transform_type.manual_transform = true;
    transformData.transform_type.functional_transform = false;
    transformData.transform_data = newVarValue;
    localStorage.setItem('transformData',JSON.stringify(transformData));
}

function filterTable(elem){
    if($("input[type=checkbox]:checked").size()<1){
        alert('Select atleast one variable')
    }
    else{
        for(var i =0; i< varList.length-1;i++){
            if(elem.target[i].checked){
                filterIndex.push(++(elem.target[i].value.split(',')[1]));
                filterVars.push(elem.target[i].value.split(',')[0]);
            }
        }
    
        // document.getElementById("createTableDiv").setAttribute("style", "display:block");
        // document.getElementById("filterTableDiv").setAttribute("style", "display:none");
    }
}

function formulaCalculate(elem){
    console.log(elem.target[0])
    console.log(formulaList);
    transformData.transform_type.manual_transform = false;
    transformData.transform_type.functional_transform = true;
    transformData.transform_variable = formulaList;
    transformData.current_variable = elem.target[0].value;
    transformData.description =elem.target[2].value;
    transformData.transform_data = elem.target[1].value;
    localStorage.setItem('transformData',JSON.stringify(transformData));
    location.reload();
}

function showTooltip(){
    if(this.id === 'createLink'){
        document.getElementById('tooltip').innerHTML = 
        "<b>Create a new variable without any transformation on the existing variable(s).</b>"+
        "<br>How to create new variable"+
        "<ul>"+
        "<li>Select the existing variable(s) to be added to the table.</li>"+
        "<li>Manually creating new variable,by specifying name, type and description.</li>"+
        "<li>Click on 'Create New Variable'.</li>"+
        "<li>Manually enter/select the new value for the corrsponding row.</li>"+
        "<li>By clicking on 'Add Values', new variable is created with the associated values.</li>"+
        " </ul>";
    }
    else if(this.id === 'formulaLink'){
        document.getElementById('tooltip').innerHTML = 
        "<b>Create a new variable by formulating the existing variable(s).</b>"+
        "<br>How to achieve a formula transformation"+
        "<ul>"+
        "<li>Select the existing variable from the left panel which propmts a list of <br> transformation to appear on the left panel.</li>"+
        "<li>Select one of the transformation to be applies on the selected variable.</li>"+
        "<li>Muliple variables with various transformation can be applied to the formula.</li>"+
        "<li>Specify the name and description of the transformation (formula)</li>"+
        "<li>By clicking on 'Customize', new variable is created with the values derived <br>from the transformation.</li>"+
        " </ul>";
        
    }
    else if(this.id === 'recodeLink'){
        document.getElementById('tooltip').innerHTML = 
        "<b>Create a new variable by applying equidistance/equimass/custom binning <br> on the existinig variable .</b>"+
        "<br>How to bin an existing variable"+
        "<ul>"+
        "<li>Select the existing variable from the left panel.</li>"+
        "<li>This displays the distribution of the variable</li>"+
        "<li>Equidistance and equimass binning can be applied by entering the number <br>of bins and clicking on the associated bin button</li>"+
        "<li>Custom bin can be created by entering comma seperated break points to <br>create the bins</li>"+
        "<li>Specify the name and description of the binning applied</li>"+
        "<li>By clicking on 'Customize', new variable is created with the values derived <br>from the binning.</li>"+
        " </ul>";
    }
    
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'block';
    tooltip.style.position ='absolute';
    tooltip.style.whiteSpace = 'nowrap';
    tooltip.style.border = '1px solid black';
    tooltip.style.borderRadius = '5px';
    tooltip.style.padding= "5px";
    tooltip.style.zIndex= "9999";
    tooltip.style.backgroundColor= 'white';

    if(toggle === "close"){
        document.getElementById ("spanToggle").click();
        toggle = "open";
    }
}
function hideTooltip(){
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function createNewCalculate(){
    if(document.getElementById('newVar').value===""){
        alert("Enter Variable Name!");
    }
    else{
        transformData.current_variable = document.getElementById('newVar').value;
        transformData.description = document.getElementById('varDescriptionCreate').value;
        document.getElementById("createButton").setAttribute("style", "display:none");


        
        var iter = 0;
    //createNewForm
    $('#createNewForm').find('tr').each(function(){
        var trow = $(this);

        if(iter == 0){
            trow.append('<th style ="border: 1px solid #ddd; text-align: center;">'+document.getElementById('newVar').value +' <button id ="buttonDelete" type="button" style="float:right;"> <span style="color:red;">&#10060;</span></button> </th>');
            iter++;
            tableList.push(document.getElementById('newVar').value);
            document.getElementById ("buttonDelete").addEventListener ("click", deleteNewVar, false);
        }else{
            if(document.getElementById('typeSelect').selectedIndex === 0){
                trow.append('<td style ="border: 1px solid #ddd;text-align: center;"><input type="checkbox" name="newVarVal" id ="newVarVal'+(iter-1)+'" value = 1 /></td>');
            }else if(document.getElementById('typeSelect').selectedIndex === 1){

                var classList = document.getElementById('nominalList').value.split(",");
                trow.append('<td style ="border: 1px solid #ddd;text-align: center;"><select id ="newVarVal'+(iter-1)+'"></select></td>');
                
                var selectBox = document.getElementById("newVarVal"+(iter-1))
                for(var i =0 ;i<classList.length;i++){
                    selectBox.options.add(new Option(classList[i],classList[i]))
                }

            }else if(document.getElementById('typeSelect').selectedIndex === 2){
                trow.append('<td style ="border: 1px solid #ddd;text-align: center;"><input type="text" name="newVarVal" style = "width:100%" id ="newVarVal'+(iter-1)+'"/></td>');
            }
            
            iter++
        }
        
    });
    var elem = document.getElementById('submitButton');
    elem.style.visibility="visible";


    }
    $('#tableDiv').animate({scrollLeft:'+=1500'},500);
    
}
function calculate_bin(){
    document.getElementById('customRecodeBtn').disabled = false;

        var method_name= "custom";
        var bin = document.getElementById('binInterval').value.split(',').length;
        console.log(bin)
        if(currentVal != "variable"){
            var node = dataDetails[currentVal];
            if (node.plottype === "continuous") {
                document.getElementById('plot_a').innerHTML ="";
                density_cross(node,bin,method_name);
            }else if (node.plottype === "bar") {
                document.getElementById('plot_a').innerHTML ="";
                bar_cross(node,bin,method_name);
            }
        }
        
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

    

    var elem = document.getElementById('recodeLink');
    elem.className = 'active';
    $('#btnOperations').css('display', 'none');
    document.getElementById('leftpanelMenuButtonBarVariables').click();
    document.getElementById('toggleLpanelicon').click();
    document.getElementById("nominalDiv").setAttribute("style", "display:none");
    
    var elem = document.getElementById('formulaDiv');
    elem.style.display="none";

    // var elem = document.getElementById('createTableDiv');
    // elem.style.display="none";

    var elem = document.getElementById('createDiv');
    elem.style.display="block";

    var elem = document.getElementById('nominalDiv');
    elem.style.visibility="hidden";
    
    var elem = document.getElementById('submitButton');
    elem.style.visibility="hidden";

    var elem = document.getElementById('recodeDiv');
    elem.style.display = 'none';

    var elem = document.getElementById('createLink');
    elem.className = 'active';
    var elem = document.getElementById('formulaLink');
    elem.className = '';
    var elem = document.getElementById('recodeLink');
    elem.className = '';
    
   
    var first = document.getElementById('varList').firstChild.textContent
    if(!tableList.includes(first)){
        document.getElementById('varList').firstChild.click()
    }
    document.getElementById('toggleCollapse').click()
    // toggleCollapse

   
    
}
function createCreate(){

    var elem = document.getElementById('createDiv');
    elem.style.display="block";

    var elem = document.getElementById('formulaDiv');
    elem.style.display = 'none';
}

function recodeCreate(){
    var elem = document.getElementById('createDiv');
    elem.style.display="none";

    var elem = document.getElementById('recodeLink');
    elem.className = 'active';
    $('#btnOperations').css('display', 'none');
    $('#tableBinDiv').css('display', 'none');
    $('#ordinalDiv').css('display','none');
    $('#binInfo').css('display','none');
    $('#customRecodeBtn').css('display','none');
    document.getElementById('customRecodeBtn').disabled = true;

    document.getElementById('btnOperations').disabled = 'disabled';

    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none'

    setTimeout( function(){ 
        document.getElementById('varList').firstChild.click();
        document.getElementById ("spanToggle").addEventListener ("click", toggleWidth, false);
      }  , 500 );


    
}
function recodeClick(){

    var elem = document.getElementById('createDiv');
    elem.style.display="none";

    var elem = document.getElementById('recodeLink');
    elem.className = 'active';
    $('#btnOperations').css('display', 'none');
    $('#tableBinDiv').css('display', 'none');
    $('#ordinalDiv').css('display','none');
    $('#binInfo').css('display','none');
    $('#customRecodeBtn').css('display','none');
    document.getElementById('leftpanelMenuButtonBarVariables').click();
   

    var list = document.getElementsByClassName('var');
    for (var i = 0; i < list.length; i++ ) {
        list[i].setAttribute("style", "background:"+app.hexToRgba("#FA8072"));
    }
    document.getElementById('plot_a').innerHTML ="";

    var elem = document.getElementById('rightpanel');
    elem.style.display="block"

    var elem = document.getElementById('leftpanel');
    elem.style.display="block"

    var elem = document.getElementById('recodeDiv');
    elem.style.display="block";

    var elem = document.getElementById('formulaDiv');
    elem.style.display="none";

    var elem = document.getElementById('formulaLink');
    elem.className = '';
    var elem = document.getElementById('createLink');
    elem.className = '';

    document.getElementById('varList').firstChild.click();
}

function formulaCreate(){

    var elem = document.getElementById('createDiv');
    elem.style.display="none";

}
function formulaClick(){

    var elem = document.getElementById('createDiv');
    elem.style.display="none";

    $('#btnOperations').css('display', 'block');

    var list = document.getElementsByClassName('var');
    for (var i = 0; i < list.length; i++ ) {
        list[i].setAttribute("style", "background:"+app.hexToRgba("#FA8072"));
    }
    
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
    
    var elem = document.getElementById('recodeLink');
    elem.className = '';
    var elem = document.getElementById('createLink');
    elem.className = '';
}

    // this is the function to add  the density plot if any
    function density_cross(density_env,a,method_name) {
        // setup the x_cord according to the size given by user
        var yVals = density_env.ploty;
        var xVals = density_env.plotx;

        // an array of objects
        var data2 = [];
        for (var i = 0; i < density_env.plotx.length; i++) {
            data2.push({x: density_env.plotx[i], y: density_env.ploty[i]});
        }
        data2.forEach(function (d) {
            d.x = +d.x;
            d.y = +d.y;
        });

        var min_x = d3.min(data2, function (d, i) {
            return data2[i].x;
        });
        var max_x = d3.max(data2, function (d, i) {
            return data2[i].x;
        });
        var avg_x = (max_x - min_x) / 10;
        var min_y = d3.min(data2, function (d, i) {
            return data2[i].y;
        });
        var max_y = d3.max(data2, function (d, i) {
            return data2[i].y;
        });
        var avg_y = (max_y - min_y) / 10;
        var x = d3.scale.linear()
            .domain([d3.min(xVals), d3.max(xVals)])
            .range([0, width_cross]);
        var invx = d3.scale.linear()
            .range([d3.min(data2.map(function (d) {
                return d.x;
            })), d3.max(data2.map(function (d) {
                return d.x;
            }))])
            .domain([0, width_cross]);
        var y = d3.scale.linear()
            .domain([d3.min(data2.map(function (d) {
                return d.y;
            })), d3.max(data2.map(function (d) {
                return d.y;
            }))])
            .range([height_cross, 0]);
        var xAxis = d3.svg.axis()
            .scale(x)
            .ticks(5)
            .orient("bottom");
        var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");
        var area = d3.svg.area()
            .interpolate("monotone")
            .x(function (d) {
                return x(d.x);
            })
            .y0(height_cross - avg_y)
            .y1(function (d) {
                return y(d.y);
            });
        var line = d3.svg.line()
            .x(function (d) {
                return x(d.x);
            })
            .y(function (d) {
                return y(d.y);
            })
            .interpolate("monotone");

        var plotsvg = d3.select("#plot_a")
            .append("svg")
            .attr("id", "plotsvg_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left","20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");
        plotsvg.append("path")
            .attr("id", "path1")
            .datum(data2)
            .attr("class", "area")
            .attr("d", area);
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + (height_cross  ) + ")")
            .call(xAxis);
        plotsvg.append("text")
            .attr("x", (width_cross / 2))
            .attr("y", (margin_cross.top + padding_cross -10))
            .attr("text-anchor", "middle")
            .text(density_env.name)
            .style("text-indent","20px")
            .style("font-size","12px")
            .style("font-weight","bold");
        

        if (isNaN(a) || a === 0) {
            var upper_limit = d3.max(xVals);
            var lower_limit = d3.min(xVals);
            var z = 10;
            var diff = upper_limit - lower_limit;
            var buffer = diff / z;
            var x_cord = [];
            var push_data = lower_limit;
            for (var i = 0; i < z - 1; i++) {
                push_data = push_data + buffer;
                x_cord.push(push_data);
                plotsvg.append("line")
                    .attr("id", "line1")
                    .attr("x1", x(x_cord[i]))
                    .attr("x2", x(x_cord[i]))
                    .attr("y1", y(d3.min(yVals)))
                    .attr("y2", y(d3.max(yVals)))
                    .style("stroke", "#0D47A1")
                    .style("stroke-dasharray", "3");
            }
        } else {
            if (method_name === "equidistance") {
                var upper_limit = d3.max(xVals);
                var lower_limit = d3.min(xVals);
                var diff = upper_limit - lower_limit;
                var buffer = diff / a;
                var x_cord = [];
                data = [];
                var push_data = lower_limit;
                for (var i = 0; i < a - 1; i++) {
                    push_data = push_data + buffer;
                    x_cord.push(push_data);
                    data.push([push_data, i]);
                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(x_cord[i]))
                        .attr("x2", x(x_cord[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
                var last_index = a-1;
                data.push([upper_limit,last_index]);
            } else if (method_name === "equimass") {
                // here we use the data from equimassCalculation to draw lines
                var temp = [];
                data = [];
                temp = equimassCalculation(density_env, a);
                console.log(d3.max(xVals))
                for (var i = 1; i < a; i++) {
                    data.push([temp[i],i-1])
                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(temp[i]))
                        .attr("x2", x(temp[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
                data.push([d3.max(xVals),a-1]);
            }
            else if (method_name === 'custom'){
                var intervals = document.getElementById('binInterval').value.split(',').map(function(x){return parseInt(x)}).sort();
                var upper_limit = d3.max(xVals);
                var lower_limit = d3.min(xVals);
                var diff = upper_limit - lower_limit;
                var buffer = diff / a;
                var x_cord = [];
                data = [];
                var push_data = lower_limit;
                for (var i = 0; i < a; i++) {
                    if(intervals[i] > upper_limit){
                        break;
                    }
                    push_data = intervals[i];
                    x_cord.push(push_data);
                    data.push([push_data, i]);
                    plotsvg.append("line")
                        .attr("id", "line1")
                        .attr("x1", x(x_cord[i]))
                        .attr("x2", x(x_cord[i]))
                        .attr("y1", y(d3.min(yVals)))
                        .attr("y2", y(d3.max(yVals)))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
                var last_index = a-1;
                data.push([upper_limit,last_index]);
                console.log('data');
                console.log(data);

            }
        }
    }
    // this is the function to add the bar plot if any
    function bar_cross(bar_env,a,method_name) {
        var barPadding = .015;  // Space between bars
        var topScale = 1.2;      // Multiplicative factor to assign space at top within graph - currently removed from implementation
        var plotXaxis = true;

        // Data
        var keys = Object.keys(bar_env.plotvalues);
        var yVals = new Array;
        var ciUpperVals = new Array;
        var ciLowerVals = new Array;
        var ciSize;

        var xVals = new Array;
        var yValKey = new Array;

        if (bar_env.nature === "nominal") {
            var xi = 0;
            for (var i = 0; i < keys.length; i++) {
                if (bar_env.plotvalues[keys[i]] == 0) {
                    continue;
                }
                yVals[xi] = bar_env.plotvalues[keys[i]];
                xVals[xi] = xi;
                if ($private) {
                    if (bar_env.plotvaluesCI) {
                        ciLowerVals[xi] = bar_env.plotValuesCI.lowerBound[keys[i]];
                        ciUpperVals[xi] = bar_env.plotValuesCI.upperBound[keys[i]];
                    }
                    ciSize = ciUpperVals[xi] - ciLowerVals[xi];
                }
                yValKey.push({y: yVals[xi], x: keys[i]});
                xi = xi + 1;
            }
            yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
            yVals.sort((a, b) => b - a); // array of y values, the height of the bars
            ciUpperVals.sort((a, b) => b.y - a.y); // ?
            ciLowerVals.sort((a, b) => b.y - a.y); // ?
        } else {
            for (var i = 0; i < keys.length; i++) {
                yVals[i] = bar_env.plotvalues[keys[i]];
                xVals[i] = Number(keys[i]);
                if ($private) {
                    if (bar_env.plotvaluesCI) {
                        ciLowerVals[i] = bar_env.plotvaluesCI.lowerBound[keys[i]];
                        ciUpperVals[i] = bar_env.plotvaluesCI.upperBound[keys[i]];
                    }
                    ciSize = ciUpperVals[i] - ciLowerVals[i];
                }
            }
        }

        if ((yVals.length > 15 & bar_env.numchar === "numeric") | (yVals.length > 5 & bar_env.numchar === "character")) {
            plotXaxis = false;
        }
        var minY=d3.min(yVals);
        var  maxY = d3.max(yVals); // in the future, set maxY to the value of the maximum confidence limit
        var  minX = d3.min(xVals);
        var  maxX = d3.max(xVals);
        var   x_1 = d3.scale.linear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width_cross]);

        var invx = d3.scale.linear()
            .range([minX - 0.5, maxX + 0.5])
            .domain([0, width_cross]);

        var  y_1 = d3.scale.linear()
        // .domain([0, maxY])
            .domain([0, maxY])
            .range([0, height_cross]);

        var xAxis = d3.svg.axis()
            .scale(x_1)
            .ticks(yVals.length)
            .orient("bottom");

        var yAxis = d3.svg.axis()
            .scale(y_1)
            .orient("left");

        var plotsvg1 = d3.select('#plot_a')
            .append("svg")
            .attr("id","plotsvg1_id")
            .style("width", width_cross + margin_cross.left + margin_cross.right) //setting height to the height of #main.left
            .style("height", height_cross + margin_cross.top + margin_cross.bottom)
            .style("margin-left","20px")
            .append("g")
            .attr("transform", "translate(0," + margin_cross.top + ")");

        var rectWidth = x_1(minX + 0.5 - 2 * barPadding); //the "width" is the coordinate of the end of the first bar
        plotsvg1.selectAll("rect")
            .data(yVals)
            .enter()
            .append("rect")
            .attr("id","path2")
            .attr("x", function (d, i) {
                return x_1(xVals[i] - 0.5 + barPadding);
            })
            .attr("y", function (d) {
                return y_1(maxY - d);
            })
            .attr("width", rectWidth)
            .attr("height", function (d) {
                return y_1(d);
            })
            .attr("fill", "#fa8072");

        if (plotXaxis) {
            plotsvg1.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height_cross + ")")
                .call(xAxis);
        }

        plotsvg1.append("text")
            .attr("x", (width_cross / 2))
            .attr("y", margin_cross.top + padding_cross-10)
            .attr("text-anchor", "middle")
            .text(bar_env.name)
            .style("text-indent","20px")
            .style("font-size","12px")
            .style("font-weight","bold");

        if(isNaN(a)|| a===0) {
            var x_coor2 = [];
            x_cord2 = equimass_bar(bar_env, keys.length)
            for (var i = 0; i < keys.length - 1; i++) {
                plotsvg1.append("line")
                    .attr("id", "line2")
                    .attr("x1", x_1(x_cord2[i] ))
                    .attr("x2", x_1(x_cord2[i] ))
                    .attr("y1", y_1(0))
                    .attr("y2", y_1(maxY))
                    .style("stroke", "#212121")
                    .style("stroke-dasharray", "4");
            }
        }
        else {
            if (method_name === "equidistance") {
                var upper_limit1 = maxX;
                var lower_limit1 = minX;
                var diff1 = upper_limit1 - lower_limit1;
                var buffer1 = diff1 / a;
                var x_cord1 = [];
                var push_data1 = lower_limit1;
                for (var i = 0; i < a - 1; i++) {
                    push_data1 = push_data1 + buffer1;
                    x_cord1.push(push_data1);
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord1[i]))
                        .attr("x2", x_1(x_cord1[i]))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            } else if (method_name==="equimass") {
                var x_cord2 = [];
                x_cord2 = equimass_bar(bar_env, a);
                for (var i = 0; i < a - 1; i++) {
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord2[i] ))
                        .attr("x2", x_1(x_cord2[i] ))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
            }
            else if (method_name === 'custom'){
                var intervals = document.getElementById('binInterval').value.split(',').sort();
                console.log('intervals');
                console.log(intervals);
                var upper_limit1 = maxX;
                var lower_limit1 = minX;
                var diff1 = upper_limit1 - lower_limit1;
                var buffer1 = diff1 / a;
                var x_cord1 = [];
                var push_data1 = lower_limit1;
                
                data = [];
                for (var i = 0; i < a; i++) {
                    if(intervals[i] > upper_limit1){
                        break;
                    }
                    push_data1 = intervals[i];
                    x_cord1.push(push_data1);
                    data.push([push_data1, i]);
                    plotsvg1.append("line")
                        .attr("id", "line2")
                        .attr("x1", x_1(x_cord1[i]))
                        .attr("x2", x_1(x_cord1[i]))
                        .attr("y1", y_1(0))
                        .attr("y2", y_1(maxY))
                        .style("stroke", "#0D47A1")
                        .style("stroke-dasharray", "4");
                }
                var last_index = a-1;
                data.push([upper_limit1,last_index]);
                console.log('data');
                console.log(data);

            }
        }
    }

    function calculateBin(elem){

        console.log(elem.target)

        var node = dataDetails[currentVal];

        if(node.nature === "nominal"){
            var empty = true;
            data = []
            for(var i = 0; i< dataNode.length;i++){
                if(elem.target[7+i].value !== ""){
                    data.push([dataNode[i],elem.target[7+i].value]);
                    empty = false;
                }
            }
            if(empty){
                alert('Enter new Bin Value!')
            }
        }

        transformData.transform_type.manual_transform = true;
        transformData.transform_type.functional_transform = false;
        transformData.transform_variable = [];
        transformData.current_variable = currentVal;
        transformData.description = elem.target[1].value;
        transformData.transform_data = data;
        localStorage.setItem('transformData',JSON.stringify(transformData));
        location.reload();
    }
    function equidistance(varName,bin) {
        document.getElementById('customRecodeBtn').disabled = false;
        var method_name= "equidistance";
        var obj = new Object();
        obj.plotNameA = varName;
        obj.equidistance = bin;
        var string = JSON.stringify(obj);
        if(varName != "variable"){
            var node = dataDetails[varName];
            if (node.plottype === "continuous") {
                document.getElementById('plot_a').innerHTML ="";
                density_cross(node,bin,method_name);
            }else if (node.plottype === "bar") {
                document.getElementById('plot_a').innerHTML ="";
                bar_cross(node,bin,method_name);
            }
        }
    }
    function equimass(varName,bin) {
        document.getElementById('customRecodeBtn').disabled = false;
        //equimass function to call the plot function
        var method_name= "equimass";
        var obj = new Object();
        obj.plotNameA = varName;
        obj.equidistance = bin;
        var string = JSON.stringify(obj);
        if(varName != "variable"){
            var node = dataDetails[varName];
            if (node.plottype === "continuous") {
                document.getElementById('plot_a').innerHTML ="";
                density_cross(node,bin,method_name);
            }
            else if (node.plottype === "bar") {
                document.getElementById('plot_a').innerHTML ="";
                bar_cross(node,bin,method_name);
            }
        }        
    }
    function equimassCalculation(plot_ev,n) {
        // here we find the coordinates using CDF values
        //var n =v-1;
        var arr_y=[];
        var arr_x=[];

        arr_y=plot_ev.cdfploty;// cdfploty data stored
        arr_x=plot_ev.cdfplotx;// cdfplotx data stored

        var Upper_limitY= d3.max(arr_y);
        var Lower_limitY=d3.min(arr_y);
        var diffy=Upper_limitY-Lower_limitY;
        var e=(diffy)/n; // e is the variable to store the average distance between the points in the cdfy in order to divide the cdfy

        var arr_c=[]; //array to store the cdfy divided coordinates data
        var push_data=arr_y[0];
        for(var i=0;i<n;i++) {
            push_data=push_data+e;
            arr_c.push(push_data);
        }

        var temp_cdfx=[];
        var temp=[];
        var store=[];

        for (var i=0; i<n; i++)//to get through each arr_c
        {
            for (var j = 0; j < 50; j++)// to compare with cdfy or arr_y
            {
                if (arr_c[i] === arr_y[j]) {
                    store.push({val: i, coor1: j, coor2: j, diff1: 0.34, diff2: 0});// for testing purpose
                }
            }
        }
        for(var i=0; i<n;i++) {
            var diff_val1, diff_val2;// here the diff is not actual difference, it is the fraction of the distance from the two points
            var x1, x2, x3,x4;
            for (var j = 0; j < 50; j++) {
                if (arr_y[j] < arr_c[i] && arr_c[i] < arr_y[j + 1]) {
                    x1 = arr_c[i];
                    x2 = arr_c[i]-arr_y[j];
                    x3 = arr_y[j+1]-arr_c[i];
                    x4=arr_y[j+1]-arr_y[j];
                    diff_val1 = x2/ x4;
                    diff_val2 = x3 / x4;
                    store.push({val: i, coor1: j, coor2: j + 1, diff1: diff_val1, diff2: diff_val2});
                }
            }
        }

        for(var i=0; i<n; i++) {
            var y1,y2,y3,diffy1,diffy2;
            y1=store[i].val;
            y2= store[i].coor1;
            y3= store[i].coor2;
            diffy1=store[i].diff1;
            diffy2=store[i].diff2;
            var x_coor1= arr_x[y2];
            var x_coor2=arr_x[y3];
            var x_diff=x_coor2-x_coor1;
            var distance1= x_diff*diffy1;
            var val_x=x_coor1+distance1;
            temp.push(val_x);
        }
        return temp;
    }
    function equimass_bar(plot_ev,n) {
        var keys = Object.keys(plot_ev.plotvalues);
        var k = keys.length;
        var temp = [];
        var count = 0;

        if (k < n) {
            alert("error enter vaild size");
        } else {
            while (k > 0) {
                temp.push({pos: count, val: k});
                count++;
                k--;
                if (count >= n) {
                    count = 0;
                }
            }

            var temp2 = new Array(n);
            for (var i = 0; i < temp2.length; i++) {
                temp2[i] = 0;
            }
            for (var i = 0; i < keys.length; i++) {
                keys[i] = (keys[i] + 5) / 10;// to get the increase in the actual values by 0.5 according to the xaxis in plot
            }
            for (var i = 0; i < n; i++) {
                for (var j = 0; j < temp.length; j++) {
                    if (temp[j].pos === i) {
                        temp2[i] = temp2[i] + 1;
                    }
                }
            }

            var j = 0, k = 0;
            var temp_final = new Array(n);
            for (var i = 0; i < keys.length; i++) {
                temp2[j] = temp2[j] - 1;
                if (temp2[j] === 0) {
                    j++;
                    temp_final[k] = keys[i];
                    k++;
                }
            }
            return temp_final;
        }
    }

$(window).resize(function(){
    $('#rightpanel').css({
        'width':  (window.innerWidth - 300)+'px',
    });
    $('#tableDiv').css({
        'height': (window.innerHeight-150)+'px',
    });
});

function deleteNewVar(){
    var pos = tableList.indexOf(document.getElementById('newVar').value);
    tableList.splice(pos, 1);
    console.log($('#createTable tr')[0].childNodes[pos])
    for(var i = 0;i<= dataNode.length;i++){
        $('#createTable tr')[i].childNodes[pos].remove();
    }

    console.log(document.getElementById('varDescriptionCreate').value)

    document.getElementById("createButton").setAttribute("style", "display:block");
    var elem = document.getElementById('submitButton');
    elem.style.visibility="hidden";

    document.getElementById('newVar').value = "";
    document.getElementById('nominalList').value = "";
    document.getElementById('varDescriptionCreate').value = "";

}

function toggleWidth(){
    if(toggle === "open"){
        $("#rightpanel").css({
            'width':  (window.innerWidth - 50)+'px',
        });
        toggle = "close";
    }else if(toggle == "close"){
        toggle = "open";
        $("#rightpanel").css({
            'width':  (window.innerWidth - 300)+'px',
        });
    }
    
}

function toggleSign(){
    if(document.getElementById('sign').textContent === '\u{2193}'){
        document.getElementById('sign').textContent = '\u{2191}'
    }
    else if(document.getElementById('sign').textContent === '\u{2191}'){
        document.getElementById('sign').textContent = '\u{2193}'
    }
}