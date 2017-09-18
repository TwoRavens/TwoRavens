import m from 'mithril';

import {bars, barsNode, barsSubset, density, densityNode, selVarColor} from './plots.js';

// hostname default - the app will use it to obtain the variable metadata
// (ddi) and pre-processed data info if the file id is supplied as an
// argument (for ex., gui.html?dfId=17), but hostname isn't.
// Edit it to suit your installation.
// (NOTE that if the file id isn't supplied, the app will default to the
// local files specified below!)
// NEW: it is also possible now to supply complete urls for the ddi and
// the tab-delimited data file; the parameters are ddiurl and dataurl.
// These new parameters are optional. If they are not supplied, the app
// will go the old route - will try to cook standard dataverse urls
// for both the data and metadata, if the file id is supplied; or the
// local files if nothing is supplied.


//-------------------------------------------------
// NOTE: global variables are now set in the index.html file.
//    Developers, see /template/index.html
//-------------------------------------------------

// for debugging - if in production, prints args and returns them
export let cdb = _ => production || console.log.apply(this, arguments) && arguments;

var k = 4; // strength parameter for group attraction/repulsion

// initial color scale used to establish the initial colors of nodes
// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
var colors = d3.scale.category20();
export let csColor = '#419641';
export let dvColor = '#28a4c9';
export let gr1Color = '#24a4c9';//#ccccff';
var gr1Opacity = [0,1];
export let gr2Color = '#ffcccc';
var gr2Opacity = [0,1];

var grayColor = '#c0c0c0';
export let nomColor = '#ff6600';
export let varColor = '#f0f8ff'; // d3.rgb("aliceblue");
var taggedColor = '#f5f5f5'; // d3.rgb("whitesmoke");
export let timeColor = '#2d6ca2';

export let lefttab = 'tab1'; // current tab in left panel
export let subset = false;
export let summaryHold = false;
export let righttab = 'btnModels'; // current tab in right panel

// transformation toolbar options
let t, typeTransform;
let transformList = 'log(d) exp(d) d^2 sqrt(d) interact(d,e)'.split(' ');
let transformVar = '';

// var list for each space contain variables in original data
// plus trans in that space
let trans = [];
let preprocess = {}; // hold pre-processed data
let spaces = [];

// layout function constants
const layoutAdd = "add";
const layoutMove = "move";

// Radius of circle
var allR = 40;

var ind1 = [(allR+30) * Math.cos(1.3), -1*(allR+30) * Math.sin(1.3),5] // cx, cy, r  values for indicator lights
var ind2 = [(allR+30) * Math.cos(1.1), -1*(allR+30) * Math.sin(1.1),5] // cx, cy, r  values for indicator lights


// space index
var myspace = 0;

var forcetoggle = ["true"];
var locktoggle = true;
var priv = true;

export let logArray = [];
export let zparams = {
    zdata: [],
    zedges: [],
    ztime: [],
    znom: [],
    zcross: [],
    zmodel: "",
    zvars: [],
    zdv: [],
    zgroup1: [],
    zgroup2: [],       // hard coding to two groups for present experiments, but will eventually make zgroup array of arrays, with zgroup.lenght the number of groups
    zdataurl: "",
    zsubset: [],
    zsetx: [],
    zmodelcount: 0,
    zplot: [],
    zsessionid: "",
    zdatacite: ""
};

var modelCount = 0;
export let valueKey = [];
export let allNodes = [];
var allResults = [];
export let nodes = [];
var links = [];
var mods = {};
var estimated = false;
var rightClickLast = false;
var selInteract = false;
var callHistory = []; // transform and subset calls
let mytarget = "";


//eventually read this from the schema with real descriptions
// metrics, tasks, and subtasks as specified in D3M schemas
// MEAN SQUARED ERROR IS SET TO SAME AS RMSE. MSE is in schema but not proto
let d3mMetrics = { metricUndefined:["description", "METRIC_UNDEFINED" , 0],
    accuracy : ["description", "ACCURACY" , 1],
f1:["description", "F1" , 2],
f1Micro:["description", "F1_MICRO" , 3],
f1Macro:["description", "F1_MACRO" , 4],
rocAuc:["description", "ROC_AUC" , 5],
rocAucMicro:["description", "ROC_AUC_MICRO" , 6],
rocAucMacro:["description", "ROC_AUC_MACRO" , 7],
meanSquaredError:["description", "MEAN_SQUARED_ERROR", 8],
rootMeanSquaredError:["description", "ROOT_MEAN_SQUARED_ERROR" , 8],
rootMeanSquaredErrorAvg:["description", "ROOT_MEAN_SQUARED_ERROR_AVG" , 9],
meanAbsoluteError:["description", "MEAN_ABSOLUTE_ERROR" , 10],
rSquared:["description", "R_SQUARED" , 11],
normalizedMutualInformation:["description", "NORMALIZED_MUTUAL_INFORMATION" , 12],
    jaccardSimilarityScore:["description", "JACCARD_SIMILARITY_SCORE" , 13],
    executionTime:["description", "EXECUTION_TIME" , 14]};

let d3mTaskType = {taskTypeUndefined:["description","TASK_TYPE_UNDEFINED", 0],classification:["description", "CLASSIFICATION" , 1],
regression:["description", "REGRESSION" , 2],
similarityMatching:["description", "SIMILARITY_MATCHING" , 3],
linkPrediction:["description", "LINK_PREDICTION" , 4],
vertexNomination:["description", "VERTEX_NOMINATION" , 5],
communityDetection:["description", "COMMUNITY_DETECTION" , 6],
graphMatching:["description", "GRAPH_MATCHING" , 7],
timeseriesForecasting:["description", "TIMESERIES_FORECASTING" , 8],
    collaborativeFiltering:["description", "COLLABORATIVE_FILTERING" , 9]};

let d3mTaskSubtype = {taskSubtypeUndefined:["description", "TASK_SUBTYPE_UNDEFINED", 0],
subtypeNone:["description","NONE",1],
    binary:["description", "BINARY" , 2],
multiClass:["description", "MULTICLASS" , 3],
multiLabel:["description", "MULTILABEL" , 4],
uniVariate:["description", "UNIVARIATE" , 5],
multiVariate:["description", "MULTIVARIATE" , 6],
overlapping:["description", "OVERLAPPING" , 7],
    nonOverlapping:["description", "NONOVERLAPPING" , 8]};

let d3mOutputType = {outputUndefined:["description","OUTPUT_TYPE_UNDEFINED ", 0],
classLabel:["description","CLASS_LABEL", 1],
probability:["description","PROBABILITY", 2],
real:["description","REAL", 3],
nodeID:["description","NODE_ID", 4],
vectorClassLabel:["description","VECTOR_CLASS_LABEL", 5],
    vectorStochastic:["description","VECTOR_STOCHASTIC", 6],
    vectorReal:["description","VECTOR_REAL", 7],
    file:["description","FILE",8]};

let UpdateProblemSchemaRequest = {
task_type: [2,"DEFAULT"],
task_subtype: [1,"DEFAFULT"],
output_type: [3,"DEFAULT"],
    metric_type: [4,"DEFAULT"]};





var svg, width, height, div, estimateLadda, selectLadda;
var arc1, arc3, arc4, arcInd1, arcInd2;

var arcInd1Limits = [0,0.3];
var arcInd2Limits = [0.35,0.65];

let byId = id => document.getElementById(id);

// page reload linked to btnReset
export const reset = function reloadPage() {
  location.reload();
}


var dataurl = "";
export function main(fileid, hostname, ddiurl, dataurl, apikey) {
    dataurl = dataurl;
    if (production && fileid == "") {
        alert("Error: No fileid has been provided.");
        throw new Error("Error: No fileid has been provided.");
    }

    let dataverseurl = hostname ? "https://" + hostname :
        production ? DATAVERSE_URL :
        "http://localhost:8080";

    if (fileid && !dataurl) {
        // file id supplied; assume we are dealing with dataverse and cook a standard dataverse data access url
        // with the fileid supplied and the hostname we have supplied or configured
        dataurl = dataverseurl + "/api/access/datafile/" + fileid;
        // rp; temporarily remove this
        dataurl = dataurl + "?key=" + apikey;
    }
    cdb('--dataurl: ' + dataurl);
    cdb('--dataverseurl: ' + dataverseurl);
    svg = d3.select("#whitespace");

    var tempWidth = d3.select("#main.left").style("width");
    width = tempWidth.substring(0, tempWidth.length - 2);
    height = $(window).height() - 120; // Hard coding for header and footer and bottom margin.

    estimateLadda = Ladda.create(byId("btnEstimate"));
    selectLadda = Ladda.create(byId("btnSelect"));

    var colorTime = false;
    var colorCS = false;

    var depVar = false;
    var subsetdiv = false;
    var setxdiv = false;

    // width and height for histgrams
    var barwidth = 1.3 * allR;
    var barheight = 0.5 * allR;
    var barPadding = 0.35;
    var barnumber = 7;

    // arcs for denoting pebble characteristics
    let arc = (start, end) => d3.svg.arc()
        .innerRadius(allR + 5)
        .outerRadius(allR + 20)
        .startAngle(start)
        .endAngle(end);
    let arcInd = (arclimits) => d3.svg.arc()
        .innerRadius(allR + 22)
        .outerRadius(allR + 37)
        .startAngle(arclimits[0])
        .endAngle(arclimits[1]);

    let [arc0, arc2] = [arc(0, 3.2), arc(1.1, 2.2)];
    //arc1 = arc(1.3, 2.3);
    arc1 = arc(0,1);
    arc3 = arc(2.3, 3.3);
    arc4 = arc(4.3, 5.3);

    arcInd1 = arcInd(arcInd1Limits);
    arcInd2 = arcInd(arcInd2Limits);

    // indicators for showing membership above arcs
    // let indicator = (degree) => d3.svg.circle()
    //     .cx( allR )//(allR+35) * Math.sin(degree))
    //     .cy( allR )//(allR+35) * Math.cos(degree))
    //     .r(3);
    // ind1 = indicator(1);
    // ind2 = indicator(1.2);

    // from .csv
    var dataset2 = [];
    var lablArray = [];
    var hold = [];
    var subsetNodes = [];

    // collapsable user log
    $('#collapseLog').on('shown.bs.collapse', () => d3.select("#collapseLog div.panel-body").selectAll("p")
        .data(logArray)
        .enter()
        .append("p")
        .text(d => d));
    $('#collapseLog').on('hidden.bs.collapse', () => d3.select("#collapseLog div.panel-body").selectAll("p")
        .remove());

    //set start from user input, then assume locations are consistent based on d3m directory structure (alternatively can make each of these locations be set by user)
    var start = 'data/d3m/o_196seed';
    let d3mDataName = start.split('/');
    d3mDataName = d3mDataName[d3mDataName.length-1];
    let d3mData = start+'/data/trainData.csv';
    let d3mTarget = start+'/data/trainTargets.csv';
    let d3mPS = start+'/problemSchema.json';
    let d3mDS = start+'/data/dataSchema.json';
    let d3mPreprocess = start+'/preprocess.json';
    let probDesc=start;

    // default to California PUMS subset (should, doesn't actually do that)
    let data = 'data/' + (false ? 'PUMS5small' : 'fearonLaitin');
    let metadataurl = ddiurl || (fileid ? `${dataverseurl}/api/meta/datafile/${fileid}` : data + '.xml');
    // read pre-processed metadata and data
    let pURL = dataurl ? `${dataurl}&format=prep` : data + '.json';
    cdb('pURL: ' + pURL);

    if(d3m_mode) {
        pURL = d3mPreprocess;
        zparams.zdataurl = start+'/data/trainDatamerged.tsv';
        zparams.zdata = d3mDataName;
    } else if(!production)
        zparams.zdataurl = 'data/fearonLaitin.tsv';

    // loads all external data: metadata (DVN's ddi), preprocessed (for plotting distributions), and zeligmodels (produced by Zelig) and initiates the data download to the server
    m.request(pURL)
        // do nothing if preprocess.json already exists, else runPreprocess
        .then(null, _ => runPreprocess(d3mData, d3mTarget, d3mPreprocess))
        .then(_ => readPreprocess(pURL, preprocess))
        .then(() => new Promise((resolve, reject) => d3.xml(metadataurl, 'application/xml', xml => {
            let vars = Object.keys(preprocess); // this doesn't come from xml, but from preprocessed json

            // the labels, citations, and file name come from the 'xml' (metadataurl), which is the file from the data repo
            // however, TwoRavens should function using only the data that comes from our preprocess script, which is the 'json' (pURL)
            // for now the metadataurl is still Fearon & Laitin
            let temp = xml.documentElement.getElementsByTagName("fileName");
            if(!d3m_mode)
                zparams.zdata = temp[0].childNodes[0].nodeValue;

            let cite = xml.documentElement.getElementsByTagName("biblCit");
            // clean citation so POST is valid json
            zparams.zdatacite = cite[0].childNodes[0].nodeValue
                .replace(/\&/g, "and")
                .replace(/\;/g, ",")
                .replace(/\%/g, "-");
            $('#cite div.panel-body').text(zparams.zdatacite);

            // dataset name trimmed to 12 chars
            let dataname = zparams.zdata;
            if(!d3m_mode)
                dataname = zparams.zdata.replace(/\.(.*)/, ''); // drop file extension
            d3.select("#dataName").html(dataname);

            // Put dataset name, from meta-data, into page title
            d3.select("title").html("TwoRavens " + dataname);
            // temporary values for hold that correspond to histogram bins
            hold = [.6, .2, .9, .8, .1, .3, .4];
            for (let i = 0; i < vars.length; i++) {
                // valueKey[i] = vars[i].attributes.name.nodeValue;
                // lablArray[i] = varsXML[i].getElementsByTagName("labl").length == 0 ?
                // "no label" :
                // varsXML[i].getElementsByTagName("labl")[0].childNodes[0].nodeValue;
                // let datasetcount = d3.layout.histogram()
                //     .bins(barnumber).frequency(false)
                //     ([0, 0, 0, 0, 0]);
                valueKey[i] = vars[i];
                lablArray[i] = "no label";
                // contains all the preprocessed data we have for the variable, as well as UI data pertinent to that variable,
                // such as setx values (if the user has selected them) and pebble coordinates
                let obj = {
                    id: i,
                    reflexive: false,
                    name: valueKey[i],
                    labl: lablArray[i],
                    data: [5, 15, 20, 0, 5, 15, 20],
                    count: hold,
                    nodeCol: colors(i),
                    baseCol: colors(i),
                    strokeColor: selVarColor,
                    strokeWidth: "1",
                    subsetplot: false,
                    subsetrange: ["", ""],
                    setxplot: false,
                    setxvals: ["", ""],
                    grayout: false
                };
                jQuery.extend(true, obj, preprocess[valueKey[i]]);
                allNodes.push(obj);
            };
            resolve();
        })))
        .then(() => new Promise((resolve, reject) => {
            // read zelig models and populate model list in right panel
            d3.json("data/zelig5models.json", (err, data) => {
                if (err)
                    return reject(err);
                cdb("zelig models json: ", data);
                for (let key in data.zelig5models)
                    if (data.zelig5models.hasOwnProperty(key))
                        mods[data.zelig5models[key].name[0]] = data.zelig5models[key].description[0];
                resolve();
            });
        }))
        .then(() => new Promise((resolve, reject) => {
            if (d3m_mode)
                return resolve();
            d3.json("data/zelig5choicemodels.json", (err, data) => {
                if (err)
                    return reject(err);
                cdb("zelig choice models json: ", data);
                for (let key in data.zelig5choicemodels)
                    if (data.zelig5choicemodels.hasOwnProperty(key))
                        mods[data.zelig5choicemodels[key].name[0]] = data.zelig5choicemodels[key].description[0];

                scaffolding(layout);
                dataDownload();
                resolve();
            })
        }))
        .then(() => new Promise((resolve, reject) => {
            // read in problem schema and we'll make a call to start the session with TA2. if we get this far, data are guaranteed to exist for the frontend
            if (!d3m_mode)
                return resolve();
            d3.json(d3mPS, (_, data) => {
                console.log("prob schema data: ", data);
                mytarget = data.target.field;
                let aTag = document.createElement('a');
                aTag.setAttribute('href', `${start}/${data.descriptionFile}`);
                aTag.setAttribute('id', "probdesc");
                aTag.setAttribute('target', "_blank");
                aTag.textContent = "Problem Description";
                document.getElementById("ticker").appendChild(aTag);

                if(data.taskType in d3mTaskType) {
                    UpdateProblemSchemaRequest.task_type = data.taskType;//[d3mTaskType[data.taskType][2],d3mTaskType[data.taskType][1]]; console.log(UpdateProblemSchemaRequest);
                } else {
                    UpdateProblemSchemaRequest.task_type = "taskTypeUndefined";
                 //   alert("Specified task type, " + data.taskType + ", is not valid.");
                }

                if(data.taskSubType in d3mTaskSubtype) {
                    UpdateProblemSchemaRequest.task_subtype = data.taskSubType;
                    //[d3mTaskSubtype[data.taskSubType][2],d3mTaskSubtype[data.taskSubType][1]];
                    } else {
                        UpdateProblemSchemaRequest.task_subtype = "taskSubtypeUndefined";
                   //     alert("Specified task subtype, " + data.taskSubType + ", is not valid.")
                    }
                if(data.metric in d3mMetrics) {
                    UpdateProblemSchemaRequest.metric_type = data.metric;//[d3mMetrics[data.metric][2],d3mMetrics[data.metric][1]];
                } else {
                    UpdateProblemSchemaRequest.matric_type = "metricUndefined";
                   // alert("Specified metric type, " + data.metric + ", is not valid.");
                    }
                if(data.outputType in d3mOutputType) {
                    UpdateProblemSchemaRequest.output_type = data.outputType;//[d3mOutputType[data.outputType][2],d3mOutputType[data.outputType][1]];
                } else {
                    UpdateProblemSchemaRequest.output_type = "outputUndefined";
                  //  alert("Specified output type, " + data.outputType + ", is not valid.");
                }

                
                document.getElementById("btnType").click();
                startsession();
                scaffolding(layout);
                dataDownload();
                resolve();
            });
        }))
}

let $fill = (obj, op, d1, d2) => d3.select(obj).transition()
    .attr('fill-opacity', op)
    .delay(d1)
    .duration(d2);
let fill = (d, id, op, d1, d2) => $fill('#' + id + d.id, op, d1, d2);
let fillThis = (self, op, d1, d2) => $fill(self, op, d1, d2);

// scaffolding is called after all external data are guaranteed to have been read to completion. this populates the left panel with variable names, the right panel with model names, the transformation tool, an the associated mouseovers. its callback is layout(), which initializes the modeling space
function scaffolding(callback) {
    // establishing the transformation element
    d3.select("#transformations")
        .append("input")
        .attr("id", "tInput")
        .attr("class", "form-control")
        .attr("type", "text")
        .attr("value", "Variable transformation");

    // variable dropdown
    d3.select("#transformations")
        .append("ul")
        .attr("id", "transSel")
        .style("display", "none")
        .style("background-color", varColor)
        .selectAll('li')
        .data(["a", "b"]) //set to variables in model space as they're added
        .enter()
        .append("li")
        .text(d => d);

    // function dropdown
    d3.select("#transformations")
        .append("ul")
        .attr("id", "transList")
        .style("display", "none")
        .style("background-color", varColor)
        .selectAll('li')
        .data(transformList)
        .enter()
        .append("li")
        .text(d => d);

    $('#tInput').click(() => {
        var t = byId('transSel').style.display;
        if (t !== "none") { // if variable list is displayed when input is clicked...
            $('#transSel').fadeOut(100);
            return false;
        }
        var t1 = byId('transList').style.display;
        if (t1 !== "none") { // if function list is displayed when input is clicked...
            $('#transList').fadeOut(100);
            return false;
        }

        // highlight the text
        $(this).select();
        var pos = $('#tInput').offset();
        pos.top += $('#tInput').width();
        $('#transSel').fadeIn(100);
        return false;
    });

    var n;
    $('#tInput').keyup(evt => {
        var t = byId('transSel').style.display;
        var t1 = byId('transList').style.display;
        if (t != "none") $('#transSel').fadeOut(100);
        else if (t1 != "none") $('#transList').fadeOut(100);

        if (evt.keyCode == 13) { // keyup on Enter
            n = $('#tInput').val();
            var t = transParse(n=n);
            if (!t)
                return;
            transform(n = t.slice(0, t.length - 1), t = t[t.length - 1], typeTransform = false);
        }
    });

    var t;
    $('#transList li').click(function(evt){
        // if interact is selected, show variable list again
        if ($(this).text() == "interact(d,e)") {
            $('#tInput').val(tvar.concat('*'));
            selInteract = true;
            $(this).parent().fandeOut(100);
            $('#transSel').fadeIn(100);
            evt.stopPropagation();
            return;
        }

        var tvar = $('#tInput').val();
        var tfunc = $(this).text().replace("d", "_transvar0");
        var tcall = $(this).text().replace("d", tvar);
        $('#tInput').val(tcall);
        $(this).parent().fadeOut(100);
        evt.stopPropagation();
        transform(n = tvar, t = tfunc, typeTransform = false);
    });

    d3.select("#models")
        .style('height', 2000)
        .style('overfill', 'scroll');

    if(!d3m_mode){
    d3.select("#models").selectAll("p")
        .data(Object.keys(mods))
        .enter()
        .append("p")
        .attr("id", "_model_".concat)
        .text(d => d)
        .style('background-color', d => varColor)
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Model Description")
        .attr("data-content", d => mods[d]);
    }
    if(d3m_mode) {

        //

        toggleRightButtons("tasks");

        d3.select("#types").selectAll("p")
        .data(Object.keys(d3mTaskType))
        .enter()
        .append("p")
        .attr("id", d => d + ".types")
        .text(d => d)
        .attr('class', d=> {
              if (UpdateProblemSchemaRequest.task_type == d.toString()){
              return 'item-select';
              } else {
              if(locktoggle) return 'item-default item-lineout';
              return 'item-default';
              }
              })
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Task Description")
        .attr("data-content", d => d3mTaskType[d][1]);

        d3.select("#subtypes").selectAll("p")
        .data(Object.keys(d3mTaskSubtype))
        .enter()
        .append("p")
        .attr("id", d => d + ".subtypes")
        .text(d => d)
        .attr('class', d=> {
              if (UpdateProblemSchemaRequest.task_subtype == d.toString()){
              return 'item-select';
              } else {
              if(locktoggle) return 'item-default item-lineout';
              return 'item-default';
              }
              })
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Task Subtype Desc.")
        .attr("data-content", d => d3mTaskSubtype[d][1]);

        d3.select("#metrics").selectAll("p")
        .data(Object.keys(d3mMetrics))
        .enter()
        .append("p")
        .attr("id", d => d + ".metrics")
        .text(d => d)
        .attr('class', d=> {
              if (UpdateProblemSchemaRequest.metric_type == d.toString()){
                return 'item-select';
              } else {
                if(locktoggle) return 'item-default item-lineout';
                return 'item-default';
              }
              })
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Metric Description")
        .attr("data-content", d => d3mMetrics[d][1]);

        d3.select("#outputs").selectAll("p")
        .data(Object.keys(d3mOutputType))
        .enter()
        .append("p")
        .attr("id", d => d + ".outputs")
        .text(d => d)
        .attr('class', d=> {
              if (UpdateProblemSchemaRequest.output_type == d.toString()){
              return 'item-select';
              } else {
              if(locktoggle) return 'item-default item-lineout';
              return 'item-default';
              }
              })
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Output Description")
        .attr("data-content", d => d3mOutputType[d][1]);

    }

    // call layout() because at this point all scaffolding is up and ready
    if (typeof callback == "function") {
        callback(false,true);
        m.redraw();
    }
}

let splice = (color, text, ...args) => {
    args.forEach(x => {
        if (color != x[0])
            return;
        let idx = zparams[x[1]].indexOf(text);
        idx > -1 && zparams[x[1]].splice(idx, 1);
    });
};

export let clickVar;

function layout(v,v2) {
    var myValues = [];
    nodes = [];
    links = [];

    var line = svg.append("line")
        .style('fill', 'none')
        .style('stroke', gr1Color)
        .style('stroke-width', 5);

    var line2 = svg.append("line")
        .style('fill', 'none')
        .style('stroke', gr2Color)
        .style('stroke-width', 5);

    var visbackground = d3.select("#whitespace").append("svg")
        .attr("width", width)
        .attr("height", height);

    visbackground.append("path") // note lines, are behind group hulls of which there is a white and colored semi transparent layer
        .attr("id", 'gr1background')
        .style("fill", '#ffffff')
        .style("stroke", '#ffffff')
        .style("stroke-width", 2.5*allR)
        .style('stroke-linejoin','round')
        .style("opacity", 1);

    var vis2background = d3.select("#whitespace").append("svg")
        .attr("width", width)
        .attr("height", height);

    vis2background.append("path")
        .attr("id", 'gr1background')
        .style("fill", '#ffffff')
        .style("stroke", '#ffffff')
        .style("stroke-width", 2.5*allR)
        .style('stroke-linejoin','round')
        .style("opacity", 1);

    var vis = d3.select("#whitespace").append("svg")
        .attr("width", width)
        .attr("height", height);

    vis.append("path")
        .attr("id", 'gr1hull')
        .style("fill", gr1Color)
        .style("stroke", gr1Color)
        .style("stroke-width", 2.5*allR)
        .style('stroke-linejoin','round');

    var vis2 = d3.select("#whitespace").append("svg")
        .attr("width", width)
        .attr("height", height);

    vis2.append("path")
        .style("fill", gr2Color)
        .style("stroke", gr2Color)
        .style("stroke-width", 2.5*allR)
        .style('stroke-linejoin','round');

    if (v == layoutAdd || v == layoutMove) {
        for (var j = 0; j < zparams.zvars.length; j++) {
            var ii = findNodeIndex(zparams.zvars[j]);
            if (allNodes[ii].grayout)
                continue;
            nodes.push(allNodes[ii]);
            var selectMe = zparams.zvars[j].replace(/\W/g, "_");
            selectMe = "#".concat(selectMe);
            d3.select(selectMe).style('background-color', () => hexToRgba(nodes[j].strokeColor));
        }

        for (var j = 0; j < zparams.zedges.length; j++) {
            var mysrc = nodeIndex(zparams.zedges[j][0]);
            var mytgt = nodeIndex(zparams.zedges[j][1]);
            links.push({
                source: nodes[mysrc],
                target: nodes[mytgt],
                left: false,
                right: true
            });
        }
    } else {
        if(d3m_mode) {
            //nodes = [findNode(mytarget)];               // Only add dependent variable on startup
            nodes = allNodes.slice(1,allNodes.length);    // Add all but first variable on startup (assumes 0 position is d3m index variable)
            for (let j = 0; j < nodes.length; j++) { //populate zvars array
                if (nodes[j].name != mytarget) {
                    zparams.zgroup1.push(nodes[j].name);  // write all names (except d3m index and the dependent variable) to zgroup1 array
                };
            };
        } else if (allNodes.length > 2) {
            nodes = [allNodes[0], allNodes[1], allNodes[2]];
            links = [{
                source: nodes[1],
                target: nodes[0],
                left: false,
                right: true
            }, {
                source: nodes[0],
                target: nodes[2],
                left: false,
                right: true
            }];
        } else if (allNodes.length === 2) {
            nodes = [allNodes[0], allNodes[1]];
            links = [{
                source: nodes[1],
                target: nodes[0],
                left: false,
                right: true
            }];
        } else if (allNodes.length === 1) {
            nodes = [allNodes[0]];
        } else {
            alert("There are zero variables in the metadata.");
            return;
        }
    }

    panelPlots(); // after nodes is populated, add subset and (if !d3m_mode) setx panels


    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-800)
        .on('tick', tick);

    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'end-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .style('fill', '#000');

    svg.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .style('fill', '#000');

    // line displayed when dragging new nodes
    var drag_line = svg.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    var path = svg.append('svg:g').selectAll('path'),
        circle = svg.append('svg:g').selectAll('g');
        //line = svg.append('svg:g').selectAll('line');

    // mouse event vars
    var selected_node = null,
        selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mouseup_node = null;

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
    }

    // update force layout (called automatically each iteration)
    function tick() {

        function findcoords(findnames,allnames,coords,lengthen){
            var fcoords = new Array(findnames.length);   // found coordinates
            var addlocation = 0;
            if(findnames.length>0){
                for (var j = 0; j < findnames.length; j++) {
                    addlocation = allnames.indexOf(findnames[j]);
                    fcoords[j] = coords[addlocation];
                };
            };

            if(lengthen){
                // d3.geom.hull returns null for two points, and fails if three points are in a line,
                // so this puts a couple points slightly off the line for two points, or around a singleton.
                if (fcoords.length == 2){
                    var deltax = fcoords[0][0]- fcoords[1][0];
                    var deltay = fcoords[0][1]- fcoords[1][1];
                    fcoords.push([(fcoords[0][0] + fcoords[1][0])/2 + deltay/20, (fcoords[0][1]+ fcoords[1][1])/2 + deltax/20]);
                    fcoords.push([(fcoords[0][0] + fcoords[1][0])/2 - deltay/20, (fcoords[0][1]+ fcoords[1][1])/2 - deltax/20]);
                }
                if (fcoords.length == 1){
                    var delta = allR * 0.2;
                    fcoords.push([fcoords[0][0] + delta, fcoords[0][1]]);
                    fcoords.push([fcoords[0][0] - delta, fcoords[0][1]]);
                    fcoords.push([fcoords[0][0], fcoords[0][1] + delta]);
                    fcoords.push([fcoords[0][0], fcoords[0][1] - delta]);
                }
            }
            return (fcoords);
        };

        // d3.geom.hull returns null for two points, and fails if three points are in a line,
        // so this puts a couple points slightly off the line for two points, or around a singleton.
        function lengthencoords(coords){
            if (coords.length == 2){
                var deltax = coords[0][0]- coords[1][0];
                var deltay = coords[0][1]- coords[1][1];
                coords.push([(coords[0][0] + coords[1][0])/2 + deltay/20, (coords[0][1]+ coords[1][1])/2 + deltax/20]);
                coords.push([(coords[0][0] + coords[1][0])/2 - deltay/20, (coords[0][1]+ coords[1][1])/2 - deltax/20]);
            }
            if (coords.length == 1){
                var delta = allR * 0.2;
                coords.push([coords[0][0] + delta, coords[0][1]]);
                coords.push([coords[0][0] - delta, coords[0][1]]);
                coords.push([coords[0][0], coords[0][1] + delta]);
                coords.push([coords[0][0], coords[0][1] - delta]);
            }
            return (coords);
        };

        var coords = nodes.map(function(d) {  return [ d.x, d.y]; });
        var gr1coords = findcoords(zparams.zgroup1, zparams.zvars, coords, true);
        var gr2coords = findcoords(zparams.zgroup2, zparams.zvars, coords, true);
        var depcoords = findcoords(zparams.zdv, zparams.zvars, coords, false);

        // draw convex hull around independent variables, if three or more coordinates given
        // note, d3.geom.hull returns null if shorter coordinate set than 3,
        // so findcoords() function has option to lengthen the coordinates returned to bypass this
        if(gr1coords.length > 2){
            visbackground.style("opacity", 1);
            vis.style("opacity", 0.3);
            var myhull = d3.geom.hull(gr1coords);

            vis.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
            visbackground.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

            //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
            var p = jamescentroid(gr1coords);

            if(depcoords.length>0){
                var q = depcoords[0];                         // Note, only using first dep var currently
                //var r = findboundary(p,q,gr1coords);        // An approach to find the exact boundary, not presently working
                var ldeltaX = q[0] - p[0],
                    ldeltaY = q[1] - p[1],
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = 0,
                    lnormY = 0,
                    lsourcePadding = allR + 5,
                    ltargetPadding = allR + 5;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                line.attr("x1", p[0] + (lsourcePadding * lnormX))   // or r[0] if findboundary works
                    .attr("y1", p[1] + (lsourcePadding * lnormY))   // or r[1] if findboundary works
                    .attr("x2", q[0]- (ltargetPadding * lnormX))
                    .attr("y2", q[1]- (ltargetPadding * lnormY));
                //circle.attr("cx", p[0]).attr("cy", p[1]);       // placeholder for arrowhead if not set up as arrow
            };

            // group members attract each other, repulse non-group members
            nodes.forEach(n => {
                var sign = Math.sign( zparams.zgroup1.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                var ldeltaX = p[0] - n.x,
                    ldeltaY = p[1] - n.y,
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY);
                    lnormX = 0,
                    lnormY = 0;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                n.x += Math.min(lnormX , ldeltaX/100 ) * k * sign   * force.alpha();
                n.y += Math.min(lnormY , ldeltaY/100 ) * k * sign   * force.alpha();
            });

        }else{
            visbackground.style("opacity", 0);

            vis.style("opacity", 0);
//            vis.style("opacity", 0);
            line.style("opacity", 0);
        };

        if(gr2coords.length > 2){
            vis2background.style("opacity", 1);
            vis2.style("opacity", 0.3);
            var myhull = d3.geom.hull(gr2coords);
            vis2.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
            vis2background.selectAll("path")
                .data([myhull])   // returns null if less than three coordinates
                .attr("d", function(d) { return "M" + d.join("L") + "Z"; });

            //var p = d3.geom.polygon(indcoords).centroid();  // Seems to go strange sometimes
            var p = jamescentroid(gr2coords);

            if(depcoords.length>0){
                var q = depcoords[0];                             // Note, only using first dep var currently
                var ldeltaX = q[0] - p[0],
                    ldeltaY = q[1] - p[1],
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = ldeltaX / ldist,
                    lnormY = ldeltaY / ldist,
                    lsourcePadding = allR + 5,
                    ltargetPadding = allR + 5;

                line2.attr("x1", p[0] + (lsourcePadding * lnormX))
                    .attr("y1", p[1] + (lsourcePadding * lnormY))
                    .attr("x2", q[0]- (ltargetPadding * lnormX))
                    .attr("y2", q[1]- (ltargetPadding * lnormY));
                //circle.attr("cx", p[0]).attr("cy", p[1]);       // placeholder for arrowhead if not set up as arrow
            };

            // group members attract each other, repulse non-group members
            nodes.forEach(n => {
                var sign = Math.sign( zparams.zgroup2.indexOf(n.name) +0.5 );  // 1 if n in group, -1 if n not in group;
                var ldeltaX = p[0] - n.x,
                    ldeltaY = p[1] - n.y,
                    ldist = Math.sqrt(ldeltaX * ldeltaX + ldeltaY * ldeltaY),
                    lnormX = 0,
                    lnormY = 0;

                if (ldist > 0){
                    lnormX = ldeltaX / ldist;
                    lnormY = ldeltaY / ldist;
                };

                n.x += Math.min(lnormX , ldeltaX/100 ) * k * sign   * force.alpha();
                n.y += Math.min(lnormY , ldeltaY/100 ) * k * sign   * force.alpha();
            });


        }else{
            vis2background.style("opacity", 0);
            vis2.style("opacity", 0);
            line2.style("opacity", 0);
        };

        // draw directed edges with proper padding from node centers
        path.attr('d', d => {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = d.left ? allR + 5 : allR,
                targetPadding = d.right ? allR + 5 : allR,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return `M${sourceX},${sourceY}L${targetX},${targetY}`;
        });
        circle.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

    }

    clickVar = function() {
        // every time a variable in leftpanel is clicked, nodes updates and background color changes
        if (findNodeIndex(this.id, true).grayout)
            return;
        zparams.zvars = [];
        let text = d3.select(this).text();
        let node = findNode(text);
        if (nodes.map(n => n.name).includes(text)) {
            nodes.splice(node.index, 1);
            spliceLinksForNode(node);
            splice(node.strokeColor, text, [dvColor, 'zdv'], [csColor, 'zcross'], [timeColor, 'ztime'], [nomColor, 'znom']);

            if(zparams.zgroup1.indexOf(node.name) > -1){                               // remove node name from group lists (should use adaptation of splice-by-color)
                    zparams.zgroup1.splice(zparams.zgroup1.indexOf(node.name),1);
            };
            if(zparams.zgroup2.indexOf(node.name) > -1){
                    zparams.zgroup2.splice(zparams.zgroup2.indexOf(node.name),1);
            };

            nodeReset(node);
            legend();
        } else {
            nodes.push(node);
            if (nodes.length === 0) nodes[0].reflexive = true;
        }
        zparams.zvars = nodes.map(n => n.name)    // adding this to keep it current (or should we rely on nodes.map(n => n.name) for variable list?)
        panelPlots();
        restart();
    }

    d3.select("#models").selectAll("p") // models tab
        //  d3.select("#Display_content")
        .on("click", function() {
            var myColor = d3.select(this).style('background-color');
            d3.select("#models").selectAll("p")
                .style('background-color', varColor);
            d3.select(this)
                .style('background-color', d => {
                    if (d3.rgb(myColor).toString() === varColor.toString()) {
                        zparams.zmodel = d.toString();
                        return hexToRgba(selVarColor);
                    } else {
                        zparams.zmodel = '';
                        return varColor;
                    }
                });
            restart();
        });

    d3.select("#types").selectAll("p") // models tab
    //  d3.select("#Display_content")
    .on("click", function() {
        if(locktoggle) return;
        if(this.className=="item-select") {
            return;
        } else {
            d3.select("#types").select("p.item-select")
            .attr('class', 'item-default');
            UpdateProblemSchemaRequest.task_type = this.innerHTML.toString();
            d3.select(this).attr('class',"item-select");
        }
        restart();
        updateSchema("task_type", UpdateProblemSchemaRequest, d3mTaskType);
        });

    d3.select("#subtypes").selectAll("p")
    .on("click", function() {
        if(locktoggle) return;
        if(this.className=="item-select") {
            return;
        } else {
            d3.select("#subtypes").select("p.item-select")
            .attr('class', 'item-default');
            UpdateProblemSchemaRequest.task_subtype = this.innerHTML.toString();
            d3.select(this).attr('class',"item-select");
        }
        restart();
        updateSchema("task_subtype", UpdateProblemSchemaRequest, d3mTaskSubtype);
        });

    d3.select("#metrics").selectAll("p")
    .on("click", function() {
        if(locktoggle) return;
        if(this.className=="item-select") {
            return;
   //         UpdateProblemSchemaRequest.metric_type = ["",""];
    //        this.className="item-default";
        } else {
            d3.select("#metrics").select("p.item-select")
            .attr('class', 'item-default');
            UpdateProblemSchemaRequest.metric_type = this.innerHTML.toString();
            d3.select(this).attr('class',"item-select");
        }
        restart();
        updateSchema("metric_type", UpdateProblemSchemaRequest, d3mMetrics);
        });

    d3.select("#outputs").selectAll("p")
    .on("click", function() {
        if(locktoggle) return;
        if(this.className=="item-select") {
            return;
        } else {
            d3.select("#outputs").select("p.item-select")
            .attr('class', 'item-default');
            UpdateProblemSchemaRequest.output_type = this.innerHTML.toString();
            d3.select(this).attr('class',"item-select");
        }
        restart();
        updateSchema("output_type", UpdateProblemSchemaRequest, d3mOutputType);
        });

    // update graph (called when needed)
    function restart() {
        // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
        // nodes.index is floating and depends on updates to nodes.  a variables index changes when new variables are added.
        circle.call(force.drag);
        if (forcetoggle[0] == "true") {
            force.gravity(0.1);
            //force.charge(-800);  // Previous constant value
            force.charge(function(node) {
                return ((zparams.zgroup1.indexOf(node.name) < 0 ) & (zparams.zgroup2.indexOf(node.name) < 0 ))   ? -800 : -400;  // -1 is the value if no index position found
            });
            force.start();
            force.linkStrength(1);
            k = 4;                                            // strength parameter for group attraction/repulsion
            if((zparams.zgroup1.length > 0) & (zparams.zgroup2.length > 0 )){  // scale down by number of active groups
                k = 2.5;
            }
        } else {
            force.gravity(0);
            force.charge(0);
            force.linkStrength(0);
            k = 0;
        }
        force.resume();

        // path (link) group
        path = path.data(links);

        // update existing links
        // VJD: dashed links between pebbles are "selected". this is disabled for now
        path.classed('selected', x => null)
            .style('marker-start', x => x.left ? 'url(#start-arrow)' : '')
            .style('marker-end', x => x.right ? 'url(#end-arrow)' : '');

        // add new links
        path.enter().append('svg:path')
            .attr('class', 'link')
            .classed('selected', x => null)
            .style('marker-start', x => x.left ? 'url(#start-arrow)' : '')
            .style('marker-end', x => x.right ? 'url(#end-arrow)' : '')
            .on('mousedown', function(d) { // do we ever need to select a link? make it delete..
                var obj = JSON.stringify(d);
                for (var j = 0; j < links.length; j++) {
                    if (obj === JSON.stringify(links[j]))
                        links.splice(j, 1);
                }
            });

        // remove old links
        path.exit().remove();

        // circle (node) group
        circle = circle.data(nodes, x => x.id);

        // update existing nodes (reflexive & selected visual states)
        // d3.rgb is the function adjusting the color here
        circle.selectAll('circle')
            .classed('reflexive', x => x.reflexive)
            .style('fill', x => d3.rgb(x.nodeCol))
            .style('stroke', x => d3.rgb(x.strokeColor))
            .style('stroke-width', x => x.strokeWidth);

        // add new nodes
        let g = circle.enter()
            .append('svg:g')
            .attr('id', x => x.name + 'biggroup');

        // add plot
        g.each(function(d) {
            d3.select(this);
            if (d.plottype == 'continuous') densityNode(d, this);
            else if (d.plottype == 'bar') barsNode(d, this);
        });

        let append = (str, attr) => x => str + x[attr || 'id'];

        g.append("path")
            .attr("id", append('dvArc'))
            .attr("d", arc3)
            .style("fill", dvColor)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                fillThis(this, .3, 0, 100);
                fill(d, 'dvText', .9, 0, 100);
            })
            .on('mouseout', function(d) {
                fillThis(this, 0, 100, 500);
                fill(d, 'dvText', 0, 100, 500);
            })
            .on('click', d => {
                setColors(d, dvColor);
                legend(dvColor);
                restart();
            });

        g.append("text")
            .attr("id", append('dvText'))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append('#dvArc'))
            .text("Dep Var");

        g.append("path")
            .attr("id", append('nomArc'))
            .attr("d", arc4)
            .style("fill", nomColor)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                if (d.defaultNumchar == "character") return;
                fillThis(this, .3, 0, 100);
                fill(d, "nomText", .9, 0, 100);
            })
            .on('mouseout', function(d) {
                if (d.defaultNumchar == "character") return;
                fillThis(this, 0, 100, 500);
                fill(d, "nomText", 0, 100, 500);
            })
            .on('click', function(d) {
                if (d.defaultNumchar == "character") return;
                setColors(d, nomColor);
                legend(nomColor);
                restart();
            });

        g.append("text")
            .attr("id", append("nomText"))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append("#nomArc"))
            .text("Nominal");

        g.append("path")
            .attr("id", append('grArc'))
            .attr("d", arc1)
            .style("fill",  gr1Color)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                fill(d, "gr1indicator", .3, 0, 100);
                fill(d, "gr2indicator", .3, 0, 100);
                fillThis(this, .3, 0, 100);
                fill(d, 'grText', .9, 0, 100);
            })
            .on('mouseout', function(d) {
                fill(d, "gr1indicator", 0, 100, 500);
                fill(d, "gr2indicator", 0, 100, 500);
                fillThis(this, 0, 100, 500);
                fill(d, 'grText', 0, 100, 500);
            })
            .on('click', d => {
                setColors(d, gr1Color);
                legend(gr1Color);
                restart();
            });

        g.append("path")
            .attr("id", append('gr1indicator'))
            .attr("d", arcInd1)
            .style("fill", gr1Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                fillThis(this, .3, 0, 100);
                fill(d, "grArc", .1, 0, 100);
                fill(d, 'grText', .9, 0, 100);
            })
            .on('mouseout', function(d) {
                fillThis(this, 0, 100, 500);
                fill(d, "grArc", 0, 100, 500);
                fill(d, 'grText', 0, 100, 500);
            })
            .on('click', d => {
                setColors(d, gr1Color);
                legend(gr1Color);
                restart();
            });

         g.append("path")
            .attr("id", append('gr2indicator'))
            .attr("d", arcInd2)
            .style("fill", gr2Color)  // something like: zparams.zgroup1.indexOf(node.name) > -1  ?  #FFFFFF : gr1Color)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                fillThis(this, .3, 0, 100);
                fill(d, "grArc", .1, 0, 100);
                fill(d, 'grText', .9, 0, 100);
            })
            .on('mouseout', function(d) {
                fillThis(this, 0, 100, 500);
                fill(d, "grArc", 0, 100, 500);
                fill(d, 'grText', 0, 100, 500);
            })
            .on('click', d => {
                setColors(d, gr2Color);
                legend(gr2Color);
                restart();
            });

        g.append("text")
            .attr("id", append('grText'))
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", append('#grArc'))
            .text("Groups");

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', allR)
            .style('pointer-events', 'inherit')
            .style('fill', d => d.nodeCol)
            .style('opacity', "0.5")
            .style('stroke', d => d3.rgb(d.strokeColor).toString())
            .classed('reflexive', d => d.reflexive)
            .on('dblclick', function(_) {
                d3.event.stopPropagation(); // stop click from bubbling
                summaryHold = true;
            })
            .on('contextmenu', function(d) {
                // right click on node
                d3.event.preventDefault();
                d3.event.stopPropagation();

                rightClickLast = true;
                mousedown_node = d;
                selected_node = mousedown_node === selected_node ? null : mousedown_node;
                selected_link = null;

                // reposition drag line
                drag_line
                    .style('marker-end', 'url(#end-arrow)')
                    .classed('hidden', false)
                    .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

                svg.on('mousemove', mousemove);
                restart();
            })
            .on('mouseup', function(d) {
                d3.event.stopPropagation();

                if (rightClickLast) {
                    rightClickLast = false;
                    return;
                }
                if (!mousedown_node) return;

                // needed by FF
                drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');

                // check for drag-to-self
                mouseup_node = d;
                if (mouseup_node === mousedown_node) {
                    resetMouseVars();
                    return;
                }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_node.id < mouseup_node.id) {
                    source = mousedown_node;
                    target = mouseup_node;
                    direction = 'right';
                } else {
                    source = mouseup_node;
                    target = mousedown_node;
                    direction = 'left';
                }

                let link = links.filter(x => x.source == source && x.target == target)[0];
                if (link) {
                    link[direction] = true;
                } else {
                    link = {
                        source: source,
                        target: target,
                        left: false,
                        right: false
                    };
                    link[direction] = true;
                    links.push(link);
                }

                // select new link
                selected_link = link;
                selected_node = null;
                svg.on('mousemove', null);

                resetMouseVars();
                restart();
            });

        // show node names
        g.append('svg:text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('class', 'id')
            .text(d => d.name);

        // show summary stats on mouseover
        // SVG doesn't support text wrapping, use html instead
        g.selectAll("circle.node")
            .on("mouseover", d => {
                tabLeft('tab3');
                varSummary(d);

                byId('transformations').setAttribute('style', 'display:block');
                byId("transSel").selectedIndex = d.id;
                transformVar = valueKey[d.id];

                fill(d, "dvArc", .1, 0, 100);
                fill(d, "dvText", .5, 0, 100);
                fill(d, "grArc", .1, 0, 100);
                fill(d, "grText", .5, 0, 100);
                //fill(d, "gr1indicator", .1, 0, 100);
                //fill(d, "gr1indicatorText", .1, 0, 100);
                //fill(d, "gr2indicator", .1, 0, 100);
                //fill(d, "gr2indicatorText", .1, 0, 100);

                if (d.defaultNumchar == "numeric") {
                    fill(d, "nomArc", .1, 0, 100);
                    fill(d, "nomText", .5, 0, 100);
                }
                fill(d, "csArc", .1, 0, 100);
                fill(d, "csText", .5, 0, 100);
                fill(d, "timeArc", .1, 0, 100);
                fill(d, "timeText", .5, 0, 100);

                m.redraw();
            })
            .on('mouseout', d => {
                summaryHold || tabLeft(subset ? 'tab2' : 'tab1');
                'csArc csText timeArc timeText dvArc dvText nomArc nomText grArc grText'.split(' ').map(x => fill(d, x, 0, 100, 500));
                m.redraw();
            });

        // the transformation variable list is silently updated as pebbles are added/removed
        d3.select("#transSel")
            .selectAll('li')
            .remove();

        d3.select("#transSel")
            .selectAll('li')
            .data(nodes.map(x => x.name)) // set to variables in model space as they're added
            .enter()
            .append("li")
            .text(d => d);

        $('#transSel li').click(function(evt) {
            // if 'interaction' is the selected function, don't show the function list again
            if (selInteract) {
                var n = $('#tInput').val().concat($(this).text());
                $('#tInput').val(n);
                evt.stopPropagation();
                var t = transParse(n = n);
                if (!t) return;
                $(this).parent().fadeOut(100);
                transform(n = t.slice(0, t.length - 1), t = t[t.length - 1], typeTransform = false);
                return;
            }

            $('#tInput').val($(this).text());
            $(this).parent().fadeOut(100);
            $('#transList').fadeIn(100);
            evt.stopPropagation();
        });

        // remove old nodes
        circle.exit().remove();
        force.start();
    }

    function mousedown(d) {
        // prevent I-bar on drag
        d3.event.preventDefault();
        // because :active only works in WebKit?
        svg.classed('active', true);
        if (d3.event.ctrlKey || mousedown_node || mousedown_link) return;
        restart();
    }

    function mousemove(d) {
        if (!mousedown_node)
            return;
        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    }

    function mouseup(d) {
        if (mousedown_node) {
            drag_line
                .classed('hidden', true)
                .style('marker-end', '');
        }
        // because :active only works in WebKit?
        svg.classed('active', false);
        // clear mouse event vars
        resetMouseVars();
    }

    // app starts here
    svg.attr('id', () => "whitespace".concat(myspace))
        .attr('height', height)
        .on('mousedown', function() {mousedown(this);})
        .on('mouseup', function() {mouseup(this);});

    d3.select(window)
        .on('click', () => {
            // all clicks will bubble here unless event.stopPropagation()
            $('#transList').fadeOut(100);
            $('#transSel').fadeOut(100);
        });

    restart(); // initializes force.layout()
    fakeClick();

    if(v2 & d3m_mode) {
        var click_ev = document.createEvent("MouseEvents");
        // initialize the event
        click_ev.initEvent("click", true /* bubble */, true /* cancelable */);
        // trigger the event
        let clickID = "dvArc"+findNodeIndex(mytarget);
        document.getElementById(clickID).dispatchEvent(click_ev);
    }
}


let find = ($nodes, name) => {
    for (let i in $nodes)
        if ($nodes[i].name == name) return $nodes[i].id;
};

// returns id
export let findNodeIndex = (name, all) => {
    for (let node of allNodes) {
        if (node.name === name) {
            //cdb('Yes!' + allNodes[i].id);
            return all? node : node.id;
        }
    }
};

let nodeIndex = nodeName => {
    for (let i in nodes)
        if (nodes[i].name == nodeName) return i;
};

export let findNode = nodeName => {
    for (let i in allNodes)
        if (allNodes[i].name == nodeName) return allNodes[i];
};

/*
    Retrieve the variable list from the preprocess data.
    This helps handle the new format and (temporarily)
    the older format in production (rp 8.14.2017)
 */
export function getVariableData(jsonData) {
    /* "new" response:
    {
        "dataset" : {...}
        "variables" : {
            "var1" : {...}, (etc)
        }
    }
    "old" response
    {
         "var1" : {...},
         (etc)
    }*/
    return jsonData.hasOwnProperty('variables') ? jsonData.variables : jsonData;
}

// function called by force button
export function forceSwitch() {
    forcetoggle = [forcetoggle[0] == 'true' ? 'false' : 'true'];
    if (forcetoggle[0] === "false") {
        byId('btnForce').setAttribute("class", "btn active");
    } else {
        byId('btnForce').setAttribute("class", "btn btn-default");
        fakeClick();
    }
}

export function lockDescription() {
    locktoggle = locktoggle ? false : true;
    let temp;
    let i;
    if (!locktoggle) {
        document.getElementById('btnLock').setAttribute("class", "btn btn-default");
        temp = document.getElementById('rightContentArea').querySelectorAll("p.item-lineout");
        for (i = 0; i < temp.length; i++) {
            temp[i].classList.remove("item-lineout");
        }
    } else {
        document.getElementById('btnLock').setAttribute("class", "btn active");
        temp = document.getElementById('metrics').querySelectorAll("p.item-default");
        console.log(temp);
        for (i = 0; i < temp.length; i++) {
            temp[i].classList.add("item-lineout");
        }
        temp = document.getElementById('types').querySelectorAll("p.item-default");
        for (i = 0; i < temp.length; i++) {
            temp[i].classList.add("item-lineout");
        }
        temp = document.getElementById('subtypes').querySelectorAll("p.item-default");
        for (i = 0; i < temp.length; i++) {
            temp[i].classList.add("item-lineout");
        }
        temp = document.getElementById('outputs').querySelectorAll("p.item-default");
        for (i = 0; i < temp.length; i++) {
            temp[i].classList.add("item-lineout");
        }
        fakeClick();
    }
}

export let spliceLinksForNode = node => links
    .filter(l => l.source === node || l.target === node)
    .map(x => links.splice(links.indexOf(x), 1));

function zPop() {
    if (dataurl) zparams.zdataurl = dataurl;
    zparams.zmodelcount = modelCount;
    zparams.zedges = [];
    zparams.zvars = [];
    for (let j = 0; j < nodes.length; j++) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        let temp = nodes[j].id;
        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
    }
    for (let j = 0; j < links.length; j++) { //populate zedges array
        //correct the source target ordering for Zelig
        let srctgt = links[j].left == false ?
            [links[j].source.name, links[j].target.name] :
            [links[j].target.name, links[j].source.name];
        zparams.zedges.push(srctgt);
    }
}

export function estimate(btn) {
    if(!d3m_mode){
    if (production && zparams.zsessionid == '') {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }

    zPop();
    // write links to file & run R CMD
    // package the output as JSON
    // add call history and package the zparams object as JSON
    zparams.callHistory = callHistory;
    var jsonout = JSON.stringify(zparams);

    var urlcall = rappURL + "zeligapp"; //base.concat(jsonout);
    var solajsonout = "solaJSON=" + jsonout;
    cdb("urlcall out: ", urlcall);
    cdb("POST out: ", solajsonout);
    console.log("estimate: ", solajsonout);

    zparams.allVars = valueKey.slice(10, 25); // because the URL is too long...
    jsonout = JSON.stringify(zparams);
    var selectorurlcall = rappURL + "selectorapp";

    function estimateSuccess(btn, json) {
        estimateLadda.stop(); // stop spinner
        allResults.push(json);
        cdb("json in: ", json);

        if (!estimated) byId("results").removeChild(byId("resultsHolder"));

        estimated = true;
        d3.select("#results")
            .style("display", "block");

        d3.select("#resultsView")
            .style("display", "block");

        d3.select("#modelView")
            .style("display", "block");

        // programmatic click on Results button
        $("#btnResults").trigger("click");

        let model = "Model".concat(modelCount = modelCount + 1);

        function modCol() {
            d3.select("#modelView")
                .selectAll("p")
                .style('background-color', hexToRgba(varColor));
        }
        modCol();

        d3.select("#modelView")
            .insert("p", ":first-child") // top stack for results
            .attr("id", model)
            .text(model)
            .style('background-color', hexToRgba(selVarColor))
            .on("click", function() {
                var a = this.style.backgroundColor.replace(/\s*/g, "");
                var b = hexToRgba(selVarColor).replace(/\s*/g, "");
                if (a.substr(0, 17) == b.substr(0, 17))
                    return; // escape function if displayed model is clicked
                modCol();
                d3.select(this)
                    .style('background-color', hexToRgba(selVarColor));
                viz(this.id);
            });

        let rCall = [];
        rCall[0] = json.call;
        showLog("estimate", rCall);

        viz(model);
    }

    function estimateFail(btn) {
        estimateLadda.stop(); // stop spinner
        estimated = true;
    }

    function selectorSuccess(btn, json) {
        d3.select("#ticker")
            .text("Suggested variables and percent improvement on RMSE: " + json.vars);
        cdb("selectorSuccess: ", json);
    }

    function selectorFail(btn) {
        alert("Selector Fail");
    }

    estimateLadda.start(); // start spinner
    makeCorsRequest(urlcall, btn, estimateSuccess, estimateFail, solajsonout);
    } else { // we are in d3m_mode
            zPop();
            zparams.callHistory = callHistory;
            var jsonout = JSON.stringify(zparams);
        console.log(jsonout);

            var urlcall = rappURL + "pipelineapp";
            var solajsonout = "solaJSON=" + jsonout;
            cdb("urlcall out: ", urlcall);
            cdb("POST out: ", solajsonout);

            function createPipelineSuccess(btn, json) {
                estimateLadda.stop(); // stop spinner

                let train_features=json.predictors;
                let target_features=json.depvar;
                let task = d3mTaskType[UpdateProblemSchemaRequest.task_type][1];
                let task_subtype = d3mTaskSubtype[UpdateProblemSchemaRequest.task_subtype][1];
                let output = d3mOutputType[UpdateProblemSchemaRequest.output_type][1];
                let metrics = d3mMetrics[UpdateProblemSchemaRequest.metric_type][1];

                let PipelineRequest={train_features, target_features, task, task_subtype, output, metrics};

                let jsonout = JSON.stringify(PipelineRequest);

                let urlcall = d3mURL + "/createpipeline";
                var solajsonout = "CreatePipelines=" + jsonout;
                
                console.log(urlcall);
                console.log(solajsonout);
                function sendPipelineSuccess(btn, json) {
                    console.log(json);
                    toggleRightButtons("all");
                    document.getElementById("btnResults").click();
                    listpipelines();
                }

                function sendPipelineFail(btn) {
                    console.log("pipeline to django failed");
                }

                makeCorsRequest(urlcall, "nobutton", sendPipelineSuccess, sendPipelineFail, solajsonout);
            }

            function createPipelineFail(btn) {
                estimateLadda.stop(); // stop spinner
                estimated = true;
            }

            estimateLadda.start(); // start spinner
            makeCorsRequest(urlcall, btn, createPipelineSuccess, createPipelineFail, solajsonout);
    }
}

export function runPreprocess(dataloc, targetloc, preprocessloc) {
    let url = rappURL + 'preprocessapp';
    let json = JSON.stringify({data: dataloc, target: targetloc, preprocess: preprocessloc});
    cdb('urlcall out: ', url);
    cdb('POST out: ', json);
    let data = new FormData();
    data.append('solaJSON', json);
    return m.request({method: 'POST', url: url, data: data})
        .then(data => {
            console.log('json in: ', data);
            return data;
        }, _ => console.log('preprocess failed'));
}

export let ta2stuff = _ => console.log(UpdateProblemSchemaRequest);

function dataDownload() {
    zPop();
    // write links to file & run R CMD

    //package the output as JSON
    // add call history and package the zparams object as JSON
    var jsonout = JSON.stringify(zparams);
    var btn = "nobutton";

    var urlcall = rappURL + "dataapp";
    var solajsonout = "solaJSON=" + jsonout;
    cdb("urlcall out: ", urlcall);
    cdb("POST out: ", solajsonout);

    let downloadSuccess = (btn, json) => {
        console.log('datadownload: ', json);
        cdb('dataDownload json in: ', json);
        zparams.zsessionid = json.sessionid[0];
        // set link URL
        byId("logID").href = `${production ? rappURL + 'log_dir/log_' : 'rook/log_' }${zparams.zsessionid}.txt`;
    };
    let downloadFail = _ => cdb('Data have not been downloaded');
    makeCorsRequest(urlcall, btn, downloadSuccess, downloadFail, solajsonout);
}

function viz(mym) {
    var mym = +mym.substr(5, 5) - 1;

    function removeKids(parent) {
        while (parent.firstChild)
            parent.removeChild(parent.firstChild);
    }

    removeKids(byId("resultsView"));

    let json = allResults[mym];

    // pipe in figures to right panel
    var filelist = new Array;
    for (var i in json.images) {
        var zfig = document.createElement("img");
        zfig.setAttribute("src", json.images[i]);
        zfig.setAttribute('width', 200);
        zfig.setAttribute('height', 200);
        byId("resultsView").appendChild(zfig);
    }

    // write the results table
    var resultsArray = [];
    for (var key in json.sumInfo) {
        if (key == 'colnames')
            continue;
        resultsArray.push(json.sumInfo[key]);
    }

    var table = d3.select("#resultsView")
        .append("p")
        .append("table");

    var thead = table.append("thead");
    thead.append("tr")
        .selectAll("th")
        .data(json.sumInfo.colnames)
        .enter()
        .append("th")
        .text(d => d);

    var tbody = table.append("tbody");
    tbody.selectAll("tr")
        .data(resultsArray)
        .enter().append("tr")
        .selectAll("td")
        .data(d => d)
        .enter().append("td")
        .text(function(d) {
            var myNum = Number(d);
            if (isNaN(myNum))
                return d;
            return myNum.toPrecision(3);
        })
        .on("mouseover", function() {
            d3.select(this).style("background-color", "aliceblue");
        }) // for no discernable reason
        .on("mouseout", function() {
            d3.select(this).style("background-color", "#F9F9F9");
        }); //(but maybe we'll think of one)

    d3.select("#resultsView")
        .append("p")
        .html(() => "<b>Formula: </b>".concat(json.call[0]));

    m.redraw();
}

// parses the transformation input. variable names are often nested inside one another, e.g., ethwar, war, wars, and so this is handled
function transParse(n) {
    var out2 = [];
    var t2 = n;
    var k2 = 0;
    var subMe2 = "_transvar".concat(k2);
    var indexed = [];

    // out2 is all matched variables, indexed is an array, each element is an object that contains the matched variables starting index and finishing index.  e.g., n="wars+2", out2=[war, wars], indexed=[{0,2},{0,3}]
    for (var i in valueKey) {
        var m2 = n.match(valueKey[i]);
        if (m2 != null)
            out2.push(m2[0]);

        var re = new RegExp(valueKey[i], "g");
        var s = n.search(re);
        if (s != -1)
            indexed.push({from: s, to: s + valueKey[i].length});
    }

    // nested loop not good, but indexed is not likely to be very large.
    // if a variable is nested, it is removed from out2
    // notice, loop is backwards so that index changes don't affect the splice
    cdb("indexed ", indexed);
    for (var i = indexed.length - 1; i > -1; i--) {
        for (var j = indexed.length - 1; j > -1; j--) {
            if (i === j)
                continue;
            if ((indexed[i].from >= indexed[j].from) & (indexed[i].to <= indexed[j].to)) {
                cdb(i, " is nested in ", j);
                out2.splice(i, 1);
            }
        }
    }

    for (var i in out2) {
        t2 = t2.replace(out2[i], subMe2); //something that'll never be a variable name
        k2 = k2 + 1;
        subMe2 = "_transvar".concat(k2);
    }

    if (out2.length > 0) {
        out2.push(t2);
        cdb("new out ", out2);
        return (out2);
    } else {
        alert("No variable name found. Perhaps check your spelling?");
        return null;
    }
}

/**
  n = name of column/node
  t = selected transformation
 */
function transform(n, t, typeTransform) {
    if (production && zparams.zsessionid == "") {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }
    if (!typeTransform)
        t = t.replace("+", "_plus_"); // can't send the plus operator

    cdb('name of col: ' + n);
    cdb('transformation: ' + t);

    var btn = byId('btnEstimate');

    // find the node by name
    var myn = findNodeIndex(n[0], true);

    if (typeof myn === "undefined") {
        myn = findNodeIndex(n, true);
    }

    var outtypes = {
        varnamesTypes: n,
        interval: myn.interval,
        numchar: myn.numchar,
        nature: myn.nature,
        binary: myn.binary
    };

    cdb(myn);
    // if typeTransform but we already have the metadata
    if (typeTransform) {
        if (myn.nature == "nominal" & typeof myn.plotvalues !== "undefined") {
            myn.plottype = "bar";
            barsNode(myn);
            panelPlots();
            return;
        } else if (myn.nature != "nominal" & typeof myn.plotx !== "undefined") {
            myn.plottype = "continuous";
            densityNode(myn);
            panelPlots();
            return;
        }
    }

    //package the output as JSON
    var transformstuff = {
        zdataurl: dataurl,
        zvars: myn.name,
        zsessionid: zparams.zsessionid,
        transform: t,
        callHistory: callHistory,
        typeTransform: typeTransform,
        typeStuff: outtypes
    };
    var jsonout = JSON.stringify(transformstuff);
    var urlcall = rappURL + "transformapp";
    var solajsonout = "solaJSON=" + jsonout;
    cdb("urlcall out: " + urlcall);
    cdb("POST out: " + solajsonout);

    function transformSuccess(btn, json) {
        estimateLadda.stop();
        cdb("json in: " + JSON.stringify(json));

        // Is this a typeTransform?
        if (json.typeTransform[0]) {
            // Yes. We're updating an existing node
            d3.json(json.url, (err, data) => {
                if (err)
                    return console.warn(err);
                let node;
                for (let key in data) {
                    node = findNodeIndex(key, true);
		    if (!node)
		        continue;
                    jQuery.extend(true, node, data[key]);
                    node.plottype === "continuous" ? densityNode(node) :
                        node.plottype === "bar" ? barsNode(node) : null;
                }
                fakeClick();
                panelPlots();
                node && cdb(node);
            });
        } else {
          /* No, we have a new node here--e.g. the transformed column
               example response: {
               "call":["t_year_2"],
               "url":["data/preprocessSubset_BACCBC78-7DD9-4482-B31D-6EB01C3A0C95.txt"],
               "trans":["year","_transvar0^2"],
               "typeTransform":[false]
             }
          */
            callHistory.push({
                func: "transform",
                zvars: n,
                transform: t
            });

            var subseted = false;
            var rCall = [];

            rCall[0] = json.call;
            var newVar = rCall[0][0];

            trans.push(newVar);

            // Read the preprocess file containing values
            // for the transformed variable
            //
            d3.json(json.url, function(error, json) {
                if (error) return console.warn(error);

                var jsondata = getVariableData(json);

                for (var key in jsondata) {
                    var myIndex = findNodeIndex(key);
                    if (typeof myIndex !== "undefined") {
                        alert("Invalid transformation: this variable name already exists.");
                        return;
                    }
                    // add transformed variable to the current space
                    var i = allNodes.length;  // get new index
                    var obj1 = {
                        id: i,
                        reflexive: false,
                        name: key,
                        labl: "transformlabel",
                        data: [5, 15, 20, 0, 5, 15, 20],
                        count: [.6, .2, .9, .8, .1, .3, .4],
                        nodeCol: colors(i),
                        baseCol: colors(i),
                        strokeColor: selVarColor,
                        strokeWidth: "1",
                        subsetplot: false,
                        subsetrange: ["", ""],
                        setxplot: false,
                        setxvals: ["", ""],
                        grayout: false,
                        defaultInterval: jsondata[key].interval,
                        defaultNumchar: jsondata[key].numchar,
                        defaultNature: jsondata[key].nature,
                        defaultBinary: jsondata[key].binary
                    };

                    jQuery.extend(true, obj1, jsondata[key]);
                    allNodes.push(obj1);

                    valueKey.push(newVar);
                    nodes.push(allNodes[i]);
                    fakeClick();
                    panelPlots();

                    if (allNodes[i].plottype === "continuous") {
                        densityNode(allNodes[i]);
                    } else if (allNodes[i].plottype === "bar") {
                        barsNode(allNodes[i]);
                    }

                    m.redraw();
                }
            });

            showLog('transform', rCall);
        }
    }

    function transformFail(btn) {
        alert("transform fail");
        estimateLadda.stop();
    }

    estimateLadda.start(); // start spinner
    makeCorsRequest(urlcall, btn, transformSuccess, transformFail, solajsonout);
}

// below from http://www.html5rocks.com/en/tutorials/cors/ for cross-origin resource sharing
// Create the XHR object.
function createCORSRequest(method, url, callback) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        // XDomainRequest for IE.
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        // CORS not supported.
        xhr = null;
    }
    // xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    return xhr;
}

// Make the actual CORS request.
function makeCorsRequest(url, btn, callback, warningcallback, jsonstring) {
    var xhr = createCORSRequest('POST', url);
    if (!xhr) {
        alert('CORS not supported');
        return;
    }
    // Response handlers for asynchronous load
    // onload or onreadystatechange?

    xhr.onload = function() {
        var text = xhr.responseText;
        cdb("text ", text);

        try {
            var json = JSON.parse(text); // should wrap in try / catch
            var names = Object.keys(json);
        } catch (err) {
            estimateLadda.stop();
            selectLadda.stop();
            cdb(err);
            alert('Error: Could not parse incoming JSON.');
        }

        if (names[0] == "warning") {
            warningcallback(btn);
            alert("Warning: " + json.warning);
        } else {
            callback(btn, json);
        }
    };
    xhr.onerror = function() {
        // note: xhr.readystate should be 4 and status should be 200. a status of 0 occurs when the url is too large
        xhr.status == 0 ? alert('There was an error making the request. xmlhttprequest status is 0.') :
            xhr.readyState != 4 ? alert('There was an error making the request. xmlhttprequest readystate is not 4.') :
            alert('Woops, there was an error making the request.');
        cdb(xhr);
        estimateLadda.stop();
        selectLadda.stop();
    };
    xhr.send(jsonstring);
}

export let legend = _ => {
    borderState();
    m.redraw();
};

// programmatically deselect every selected variable
export function erase() {
    leftpanelMedium();
    rightpanelMedium();
    tabLeft('tab1');
    jQuery.fn.d3Click = function() {
        this.children().each(function(i, e) {
            var mycol = d3.rgb(this.style.backgroundColor);
            if (mycol.toString() === varColor.toString())
                return;
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            e.dispatchEvent(evt);
        });
    };
    $("#varList").d3Click();
}

// http://www.tutorials2learn.com/tutorials/scripts/javascript/xml-parser-javascript.html
function loadXMLDoc(XMLname) {
    var xmlDoc;
    if (window.XMLHttpRequest) {
        xmlDoc = new window.XMLHttpRequest();
        xmlDoc.open("GET", XMLname, false);
        xmlDoc.send("");
        return xmlDoc.responseXML;
    }
    // IE 5 and IE 6
    else if (ActiveXObject("Microsoft.XMLDOM")) {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = false;
        xmlDoc.load(XMLname);
        return xmlDoc;
    }
    alert("Error loading document!");
}

export function tabLeft(tab) {
    byId('tab1').style.display = 'none';
    byId('tab2').style.display = 'none';
    byId('tab3').style.display = 'none';
    byId(tab).style.display = 'block';
    if (tab != 'tab3') {
        subset = tab == 'tab2';
        summaryHold = false;
    }
    lefttab = tab;
}

export function tabRight(tab) {
    let select = cls => {
        let panel = d3.select("#rightpanel");
        return cls ? panel.attr('class', cls) : panel.attr('class');
    };
    let cls = "sidepanel container clearfix";
    let toggleR = () => {
        select(function() {
            let expand = cls + ' expandpanel';
            return this.getAttribute("class") === expand ? cls : expand;
        });
    };
    if (tab === "btnModels") select(cls);
    else if (tab === "btnSetx") righttab === "btnSetx" || select() === cls && toggleR();
    else if (tab === "btnResults") !estimated ? select(cls) :
        righttab === "btnResults" || select() === cls && toggleR();
    righttab = tab;
}

export let summary = {data: []};

function varSummary(d) {
    let t1 = 'Mean:, Median:, Most Freq:, Occurrences:, Median Freq:, Occurrences:, Least Freq:, Occurrences:, Std Dev:, Minimum:, Maximum:, Invalid:, Valid:, Uniques:, Herfindahl'.split(', ');

    let rint = d3.format('r');
    let str = (x, p) => (+x).toPrecision(p || 4).toString();
    let t2 = priv && d.meanCI ?
        [str(d.mean, 2) + ' (' + str(d.meanCI.lowerBound, 2) + ' - ' + str(d.meanCI.upperBound, 2) + ')',
         str(d.median), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest),
         str(d.sd), str(d.min), str(d.max), rint(d.invalid), rint(d.valid), rint(d.uniques), str(d.herfindahl)] :
        [str(d.mean), str(d.median), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest),
         str(d.sd), str(d.min), str(d.max), rint(d.invalid), rint(d.valid), rint(d.uniques), str(d.herfindahl)];

    summary.data = [];
    t1.forEach((e, i) => !t2[i].includes('NaN') && t2[i] != 'NA' && t2[i] != '' && summary.data.push([e, t2[i]]));

    summary.name = d.name;
    summary.labl = d.labl;

    d3.select('#tab3')
        .selectAll('svg')
        .remove();

    if (!d.plottype)
        return;
    d.plottype == 'continuous' ? density(d, 'varSummary', priv) :
        d.plottype == "bar" ? bars(d, 'varSummary', priv) :
        d3.select("#tab3") // no graph to draw, but still need to remove previous graph
        .selectAll("svg")
        .remove();
}

export let popoverContent = d => {
    let text = '';
    let [rint, prec] = [d3.format('r'), (val, int) => (+val).toPrecision(int).toString()];
    let div = (field, name, val) => {
        if (field != 'NA') text += `<div class='form-group'><label class='col-sm-4 control-label'>${name}</label><div class='col-sm-6'><p class='form-control-static'>${val || field}</p></div></div>`;
    };
    d.labl != '' && div(d.labl, 'Label');
    div(d.mean, 'Mean', priv && d.meanCI ?
        `${prec(d.mean, 2)} (${prec(d.meanCI.lowerBound, 2)} - ${prec(d.meanCI.upperBound, 2)})` :
        prec(d.mean, 4));
    div(d.median, 'Median', prec(d.median, 4));
    div(d.mode, 'Most Freq');
    div(d.freqmode, 'Occurrences',  rint(d.freqmode));
    div(d.mid, 'Median Freq');
    div(d.freqmid, 'Occurrences', rint(d.freqmid));
    div(d.fewest, 'Least Freq');
    div(d.freqfewest, 'Occurrences', rint(d.freqfewest));
    div(d.sd, 'Stand Dev', prec(d.sd, 4));
    div(d.max, 'Maximum', prec(d.max, 4));
    div(d.min, 'Minimum', prec(d.min, 4));
    div(d.invalid, 'Invalid', rint(d.invalid));
    div(d.valid, 'Valid', rint(d.valid));
    div(d.uniques, 'Uniques', rint(d.uniques));
    div(d.herfindahl, 'Herfindahl', prec(d.herfindahl, 4));
    return text;
}

function popupX(d) {
    var tsf = d3.format(".4r");
    var rint = d3.format("r");
    //Create the tooltip label
    d3.select("#tooltip")
        .style("left", tempX + "px")
        .style("top", tempY + "px")
        .select("#tooltiptext")
        .html("<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.mean) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.median) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + d.mode + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.sd) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.max) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.min) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>"
        );
}

export function panelPlots() {
    // build arrays from nodes in main
    let vars = [];
    let ids = [];
    nodes.forEach(n => {
        vars.push(n.name.replace(/\(|\)/g, ''));
        ids.push(n.id);
    });

    //remove all plots, could be smarter here
    d3.select('#setx').selectAll('svg').remove();
    d3.select('#tab2').selectAll('svg').remove();
    for (var i = 0; i < vars.length; i++) {
        let node = allNodes[ids[i]];
        node.setxplot = false;
        node.subsetplot = false;
        if (node.plottype === "continuous" & node.setxplot == false) {
            node.setxplot = true;
            density(node, div = "setx", priv);
            node.subsetplot = true;
            density(node, div = "subset", priv);
        } else if (node.plottype === "bar" & node.setxplot == false) {
            node.setxplot = true;
            bars(node, div = "setx", priv);
            node.subsetplot = true;
            barsSubset(node);
        }
    }

        d3.select("#setx").selectAll("svg")
        .each(function () {
              d3.select(this);
              var regstr = /(.+)_setx_(\d+)/;
              var myname = regstr.exec(this.id);
              var nodeid = myname[2];
              myname = myname[1];
              if (!vars.includes(myname)) {
              allNodes[nodeid].setxplot = false;
              let temp = "#".concat(myname, "_setx_", nodeid);
              d3.select(temp)
              .remove();
              allNodes[nodeid].subsetplot = false;
              temp = "#".concat(myname, "_tab2_", nodeid);
              d3.select(temp)
              .remove();
              }
              });
}


// easy functions to collapse panels to base
function rightpanelMedium() {
    d3.select("#rightpanel")
        .attr("class", "sidepanel container clearfix");
}

function leftpanelMedium() {
    d3.select("#leftpanel")
        .attr("class", "sidepanel container clearfix");
}

// converts color codes
export let hexToRgba = hex => {
    let int = parseInt(hex.replace('#', ''), 16);
    return `rgba(${[(int >> 16) & 255, (int >> 8) & 255, int & 255, '0.5'].join(',')})`;
};

// takes node and color and updates zparams
function setColors(n, c) {
    if (n.strokeWidth == '1') {
        if (c == gr1Color){
            var tempindex = zparams.zgroup1.indexOf(n.name);
            if (tempindex > -1){
                zparams.zgroup1.splice(tempindex,1);
            } else {
                zparams.zgroup1.push(n.name);
            };
        } else if (c == gr2Color){
            var tempindex = zparams.zgroup2.indexOf(n.name);
            if (tempindex > -1){
                zparams.zgroup2.splice(tempindex,1);
            } else {
                zparams.zgroup2.push(n.name);
            };
        } else {
        // adding time, cs, dv, nom to node with no stroke
        n.strokeWidth = '4';
        n.strokeColor = c;
        n.nodeCol = taggedColor;
        let push = ([color, key]) => {
            if (color != c)
                return;
            zparams[key] = Array.isArray(zparams[key]) ? zparams[key] : [];
            zparams[key].push(n.name);
            if (key == 'znom') {
                findNodeIndex(n.name, true).nature = "nominal";
                transform(n.name, t = null, typeTransform = true);
            }
            if (key == 'zdv'){                                              // remove group memberships from dv's
                if(zparams.zgroup1.indexOf(n.name) > -1){
                    zparams.zgroup1.splice(zparams.zgroup1.indexOf(n.name),1);
                };
                if(zparams.zgroup2.indexOf(n.name) > -1){
                    zparams.zgroup2.splice(zparams.zgroup2.indexOf(n.name),1);
                };
            }
        };
        [[dvColor, 'zdv'], [csColor, 'zcross'], [timeColor, 'ztime'], [nomColor, 'znom']].forEach(push);
        }
    } else if (n.strokeWidth == '4') {
        if (c == n.strokeColor) { // deselecting time, cs, dv, nom
            n.strokeWidth = '1';
            n.strokeColor = selVarColor;
            n.nodeCol = colors(n.id);
            splice(c, n.name, [dvColor, 'zdv'], [csColor, 'zcross'], [timeColor, 'ztime'], [nomColor, 'znom']);
            if (nomColor == c && zparams.znom.includes(n.name)) {
                findNodeIndex(n.name, true).nature = findNodeIndex(n.name, true).defaultNature;
                transform(n.name, t = null, typeTransform = true);
            }
        } else { // deselecting time, cs, dv, nom AND changing it to time, cs, dv, nom
            splice(n.strokeColor, n.name, [dvColor, 'zdv'], [csColor, 'zcross'], [timeColor, 'ztime'], [nomColor, 'znom']);
            if (nomColor == n.strokeColor && zparams.znom.includes(n.name)) {
                findNodeIndex(n.name, true).nature = findNodeIndex(n.name, true).defaultNature;
                transform(n.name, t = null, typeTransform = true);
            }
            n.strokeColor = c;
            if (dvColor == c){
                var dvname = n.name;
                zparams.zdv.push(dvname);
                if(zparams.zgroup1.indexOf(dvname) > -1){                     // remove group memberships from dv's
                    zparams.zgroup1.splice(zparams.zgroup1.indexOf(dvname),1);
                };
                if(zparams.zgroup2.indexOf(dvname) > -1){
                    zparams.zgroup2.splice(zparams.zgroup2.indexOf(dvname),1);
                };
            }
            else if (csColor == c) zparams.zcross.push(n.name);
            else if (timeColor == c) zparams.ztime.push(n.name);
            else if (nomColor == c) {
                zparams.znom.push(n.name);
                findNodeIndex(n.name, true).nature = "nominal";
                transform(n.name, t = null, typeTransform = true);
            }
        }
    }
}

export function borderState() {
    zparams.zdv.length > 0 ?
        $('#dvButton .rectColor svg circle').attr('stroke', dvColor) :
        $('#dvButton').css('border-color', '#ccc');
    zparams.zcross.length > 0 ?
        $('#csButton .rectColor svg circle').attr('stroke', csColor) :
        $('#csButton').css('border-color', '#ccc');
    zparams.ztime.length > 0 ?
        $('#timeButton .rectColor svg circle').attr('stroke', timeColor) :
        $('#timeButton').css('border-color', '#ccc');
    zparams.znom.length > 0 ?
        $('#nomButton .rectColor svg circle').attr('stroke', nomColor) :
        $('#nomButton').css('border-color', '#ccc');
    zparams.zgroup1.length > 0 ?
        $('#gr1Button .rectColor svg circle').attr('stroke', gr1Color).attr('fill', gr1Color).attr('fill-opacity', 0.6).attr('stroke-opacity', 0) :
        $('#gr1Button').css('border-color', '#ccc');
    zparams.zgroup2.length > 0 ?
        $('#gr2Button .rectColor svg circle').attr('stroke', gr2Color).attr('fill', gr2Color).attr('fill-opacity', 0.6).attr('stroke-opacity', 0) :
        $('#gr2Button').css('border-color', '#ccc');
}

// small appearance resets, but perhaps this will become a hard reset back to all original allNode values?
function nodeReset(n) {
    n.strokeColor = selVarColor;
    n.strokeWidth = "1";
    n.nodeCol = n.baseCol;
}

export function subsetSelect(btn) {
    if (dataurl)
        zparams.zdataurl = dataurl;
    if (production && zparams.zsessionid == "") {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }
    zparams.zvars = [];
    zparams.zplot = [];
    var subsetEmpty = true;
    // is this the same as zPop()?
    for (var j = 0; j < nodes.length; j++) { // populate zvars and zsubset arrays
        zparams.zvars.push(nodes[j].name);
        var temp = nodes[j].id;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        if (zparams.zsubset[j].length > 0) {
            if (zparams.zsubset[j][0] != "")
                zparams.zsubset[j][0] = Number(zparams.zsubset[j][0]);
            if (zparams.zsubset[j][1] != "")
                zparams.zsubset[j][1] = Number(zparams.zsubset[j][1]);
        }
        zparams.zplot.push(allNodes[temp].plottype);
        if (zparams.zsubset[j][1] != "")
            subsetEmpty = false; // only need to check one
    }

    if (subsetEmpty == true) {
        alert("Warning: No new subset selected.");
        return;
    }

    var outtypes = [];
    for (var j = 0; j < allNodes.length; j++) {
        outtypes.push({
            varnamesTypes: allNodes[j].name,
            nature: allNodes[j].nature,
            numchar: allNodes[j].numchar,
            binary: allNodes[j].binary,
            interval: allNodes[j].interval
        });
    }

    var subsetstuff = {
        zdataurl: zparams.zdataurl,
        zvars: zparams.zvars,
        zsubset: zparams.zsubset,
        zsessionid: zparams.zsessionid,
        zplot: zparams.zplot,
        callHistory: callHistory,
        typeStuff: outtypes
    };

    var jsonout = JSON.stringify(subsetstuff);
    var urlcall = rappURL + "subsetapp";
    var solajsonout = "solaJSON=" + jsonout;
    cdb("urlcall out: ", urlcall);
    cdb("POST out: ", solajsonout);

    function subsetSelectSuccess(btn, json) {
        selectLadda.stop(); // stop motion
        $("#btnVariables").trigger("click"); // programmatic clicks
        $("#btnModels").trigger("click");

        var grayOuts = [];
        var rCall = [];
        rCall[0] = json.call;

        // store contents of the pre-subset space
        zPop();
        var myNodes = jQuery.extend(true, [], allNodes);
        var myParams = jQuery.extend(true, {}, zparams);
        var myTrans = jQuery.extend(true, [], trans);
        var myForce = jQuery.extend(true, [], forcetoggle);
        var myPreprocess = jQuery.extend(true, {}, preprocess);
        var myLog = jQuery.extend(true, [], logArray);
        var myHistory = jQuery.extend(true, [], callHistory);

        spaces[myspace] = {
            "allNodes": myNodes,
            "zparams": myParams,
            "trans": myTrans,
            "force": myForce,
            "preprocess": myPreprocess,
            "logArray": myLog,
            "callHistory": myHistory
        };

        // remove pre-subset svg
        var selectMe = "#m".concat(myspace);
        d3.select(selectMe).attr('class', 'item');
        selectMe = "#whitespace".concat(myspace);
        d3.select(selectMe).remove();

        myspace = spaces.length;
        callHistory.push({
            func: "subset",
            zvars: jQuery.extend(true, [], zparams.zvars),
            zsubset: jQuery.extend(true, [], zparams.zsubset),
            zplot: jQuery.extend(true, [], zparams.zplot)
        });

        // this is to be used to gray out and remove listeners for variables that have been subsetted out of the data
        function varOut(v) {
            // if in nodes, remove gray out in left panel
            // make unclickable in left panel
            for (var i = 0; i < v.length; i++) {
                var selectMe = v[i].replace(/\W/g, "_");
                byId(selectMe).style.color = hexToRgba(grayColor);
                selectMe = "p#".concat(selectMe);
                d3.select(selectMe)
                    .on("click", null);
            }
        }

        showLog('subset', rCall);
        reWriteLog();

        d3.select("#innercarousel")
            .append('div')
            .attr('class', 'item active')
            .attr('id', () => "m".concat(myspace.toString()))
            .append('svg')
            .attr('id', 'whitespace');
        svg = d3.select("#whitespace");

        d3.json(json.url, function(error, json) {
            if (error){
                return console.warn(error);
            }
            var jsondata = getVariableData(json);

            for (var key in jsondata) {
                var myIndex = findNodeIndex(key);

                allNodes[myIndex].plotx = undefined;
                allNodes[myIndex].ploty = undefined;
                allNodes[myIndex].plotvalues = undefined;
                allNodes[myIndex].plottype = "";

                jQuery.extend(true, allNodes[myIndex], jsondata[key]);
                allNodes[myIndex].subsetplot = false;
                allNodes[myIndex].subsetrange = ["", ""];
                allNodes[myIndex].setxplot = false;
                allNodes[myIndex].setxvals = ["", ""];

                if (allNodes[myIndex].valid == 0) {
                    grayOuts.push(allNodes[myIndex].name);
                    allNodes[myIndex].grayout = true;
                }
            }
            rePlot();

            layout(layoutAdd);
        });

        varOut(grayOuts);
    }

    selectLadda.start(); //start button motion
    makeCorsRequest(urlcall, btn, subsetSelectSuccess, btn => selectLadda.stop(), solajsonout);
}

function readPreprocess(url) {
    return new Promise((resolve, reject) => {
        cdb('readPreprocess: ' + url);
        d3.json(url, (err, res) => {
            if (err)
                return reject(err);
            cdb('readPreprocess result: ' + res);
            priv = res.dataset.private || priv;
            Object.keys(res.variables).forEach(k => preprocess[k] = res.variables[k]);
            resolve();
        });
    });
}

// removes all the children svgs inside subset and setx divs
function rePlot() {
    d3.select('#tab2')
        .selectAll('svg')
        .remove();
    d3.select('#setx')
        .selectAll('svg')
        .remove();
    allNodes.forEach(n => n.setxplot = n.subsetplot = false);
}

let showLog = (val, rCall) => {
    logArray.push((val + ': ').concat(rCall[0]));
    m.redraw();
}

function reWriteLog() {
    d3.select("#collapseLog div.panel-body").selectAll("p")
        .remove();
    d3.select("#collapseLog div.panel-body").selectAll("p")
        .data(logArray)
        .enter()
        .append("p")
        .text(d => d);
}

// acts as if the user clicked in whitespace. useful when restart() is outside of scope
export let fakeClick = () => {
    let ws = "#whitespace".concat(myspace);
    // d3 and programmatic events don't mesh well, here's a SO workaround that looks good but uses jquery...
    jQuery.fn.d3Click = function() {
        this.each((i, e) => {
            let evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            e.dispatchEvent(evt);
        });
    };
    $(ws).d3Click();
    d3.select(ws)
        .classed('active', false);
};


// this is our call to django to start the session
function startsession() {
    let user_agent = "some agent";
    let version = "some version";
    let SessionRequest={user_agent,version};

    var jsonout = JSON.stringify(SessionRequest);

    var urlcall = d3mURL + "/startsession";
    var solajsonout = "solaJSON=" + jsonout;
    console.log("solajsonout: ", solajsonout);
    console.log("urlcall: ", urlcall);

    function ssSuccess(btn, json) {
        console.log(json);
    }

    function ssFail(btn) {
        console.log("session start failed");
    }

   makeCorsRequest(urlcall, "nobutton", ssSuccess, ssFail, solajsonout);
}

export function endsession() {
    let sessioncontext = "my session context";
    let SessionContext={sessioncontext};
    
    var jsonout = JSON.stringify(SessionContext);
    
    var urlcall = d3mURL + "/endsession";
    var solajsonout = "SessionContext=" + jsonout;
    console.log("solajsonout: ", solajsonout);
    console.log("urlcall: ", urlcall);
    
    function endSuccess(btn, json) {
        console.log(json);
    }
    
    function endFail(btn) {
        console.log("end session failed");
    }
    
    makeCorsRequest(urlcall, "nobutton", endSuccess, endFail, solajsonout);
}

export function listpipelines() {
    let sessioncontext = "my session context";
    let PipeLineListRequest={sessioncontext};
    
    var jsonout = JSON.stringify(PipeLineListRequest);
    
    var urlcall = d3mURL + "/listpipelines";
    var solajsonout = "PipeLineListRequest=" + jsonout;
    console.log("solajsonout: ", solajsonout);
    console.log("urlcall: ", urlcall);
    
    function listPipesSuccess(btn, json) {
        //hardcoded pipes for now
        let pipes = ["","id1", "id2", "id3", "id4", "id5"]
        d3.select("#results").selectAll("p")
        .data(pipes)
        .enter()
        .append("p")
        .attr("id", "_pipe_".concat)
        .text(d => d)
        .attr('class', 'item-default')
        .on("click", function() {
            if(this.className=="item-select") {
                return;
            } else {
                d3.select("#results").select("p.item-select")
                .attr('class', 'item-default');
                d3.select(this).attr('class',"item-select");
            }});
        console.log(json);
    }
    
    function listPipesFail(btn) {
        console.log("list pipelines failed");
    }
    
    makeCorsRequest(urlcall, "nobutton", listPipesSuccess, listPipesFail, solajsonout);
}

// this is our call to django to update the problem schema
function updateSchema(type, updates, lookup) {
    console.log('updateSchema....')
    let ReplaceProblemSchemaField=type;
    let value = lookup[updates[type]][1];
    let valuenum = lookup[updates[type]][2];
    let updateRequest = {ReplaceProblemSchemaField, value, valuenum};

    let jsonout = JSON.stringify(updateRequest);

    let urlcall = d3mURL + "/updateproblemschema";
    let solajsonout = "UpdateProblemSchemaRequest=" + jsonout;
    console.log("solajsonout: ", solajsonout);
    console.log("urlcall: ", urlcall);

    function usSuccess(btn, json) {
        console.log(json);
    }

    function usFail(btn) {
        console.log("update schema failed");
    }

    makeCorsRequest(urlcall, "nobutton", usSuccess, usFail, solajsonout);
}


// Find something centerish to the vertices of a convex hull
// (specifically, the center of the bounding box)
function jamescentroid(coord){
    var minx = coord[0][0],
        maxx = coord[0][0],
        miny = coord[0][1],
        maxy = coord[0][1];
    for(var j = 1; j<coord.length; j++){
        if (coord[j][0] < minx) minx = coord[j][0];
        if (coord[j][1] < miny) miny = coord[j][1];
        if (coord[j][0] > maxx) maxx = coord[j][0];
        if (coord[j][1] > maxy) maxy = coord[j][1];
    };
        return[(minx + maxx)/2, (miny + maxy)/2];
};




function toggleRightButtons(set) {
    
    function setWidths(btns) {
        let mywidth = 100/btns.length;
        mywidth = mywidth.toString() + '%';
        let expandwidth = '35%';
        let shrinkwidth = 65/(btns.length-1);
        shrinkwidth = shrinkwidth.toString() + '%';
        let mylis = document.getElementById('rightpanel').querySelectorAll(".accordian li");
        // hardly ever runs on the page
        for (let i = 0; i < mylis.length; i++) {
            mylis[i].style.width=mywidth;
            mylis[i].addEventListener('mouseover', function() {
                                      for(let j = 0; j < mylis.length; j++) {
                                      mylis[j].style.width=shrinkwidth;
                                      }
                                      this.style.width=expandwidth;
                                      });
            mylis[i].addEventListener('mouseout', function() {
                                      for(let j = 0; j < mylis.length; j++) {
                                      mylis[j].style.width=mywidth;
                                      }
                                      });
        }
        
    }

    if(set=="tasks") {

        document.getElementById('btnModels').classList.add("noshow");
        document.getElementById('btnSetx').classList.add("noshow");
        document.getElementById('btnResults').classList.add("noshow");
        
        
        let mybtns = document.getElementById('rightpanelbuttons').querySelectorAll(".btn:not(.noshow)");
        setWidths(mybtns);
        
        
    } else if (set=="all") {
        // first remove noshow class
        let mybtns = document.getElementById('rightpanelbuttons').querySelectorAll(".noshow");
        for (let i = 0; i < mybtns.length; i++) {
            mybtns[i].classList.remove("noshow");
        }
        // then select all the buttons
        mybtns = document.getElementById('rightpanelbuttons').querySelectorAll(".btn:not(.noshow)");
        setWidths(mybtns);

    }
    if(set=="models") {
        document.getElementById('btnModels').style.display = 'inline';
        document.getElementById('btnSetx').style.display = 'inline';
        document.getElementById('btnResults').style.display = 'inline';

        document.getElementById('btnType').style.display = 'none';
        document.getElementById('btnSubtype').style.display = 'none';
        document.getElementById('btnMetrics').style.display = 'none';
        document.getElementById('btnOutputs').style.display = 'none';
    }
}
