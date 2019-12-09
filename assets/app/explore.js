import vegaEmbed from 'vega-embed';
import m from "mithril";
import * as d3 from 'd3';


import * as app from './app';

import * as common from "../common/common";
import ButtonRadio from "../common/views/ButtonRadio";
import Popper from "../common/views/Popper";

import Button from "../common/views/Button";
import Icon from "../common/views/Icon";

import {alertLog, alertWarn, alertError} from "./app";
import * as queryMongo from "./manipulations/queryMongo";
import {abbreviate} from "./index";
let recordLimit = 5000;


// adds some padding, sets the size so the content fills nicely in the page
let wrapCanvas = (...contents) => m('div#canvasExplore', {
        style: {
            height: '100%',
            'padding-top': common.panelMargin,
            width: `calc(100% + ${common.panelMargin})`
        }
    },
    contents
);
export class CanvasExplore {
    view(vnode) {
        let {variables, variate} = vnode.attrs;

        let nodes = variables.map(variable => app.variableSummaries[variable]);

        let selectedProblem = app.getSelectedProblem();


        if (!variate) return wrapCanvas(
            m(ButtonRadio, {
                id: 'exploreButtonBar',
                attrsAll: {style: {width: '400px'}},
                attrsButtons: {class: ['btn-sm']},
                onclick: x => {
                    setExploreVariate(x);
                    if (exploreVariate === 'Multivariate') return;
                    let maxVariables = {
                        Univariate: 1,
                        Bivariate: 2,
                        Trivariate: 3
                    }[exploreVariate];
                    exploreVariables = exploreVariables
                        .slice(Math.max(0, exploreVariables.length - maxVariables));
                },
                activeSection: exploreVariate,
                sections: app.leftTab === 'Discover' ? [{value: 'Problem'}] : [{value: 'Univariate'}, {value: 'Bivariate'}, {value: 'Trivariate'}, {value: 'Multivariate'}]
            }),
            m(Button, {
                id: 'exploreGo',
                class: 'btn-sm btn-success',
                style: 'margin-left:10px',
                onclick: () => {
                    let variate = exploreVariate.toLowerCase();
                    let selected = app.leftTab === 'Discover' ? [app.workspace.raven_config.selectedProblem] : exploreVariables;
                    let len = selected.length;
                    if (variate === 'univariate' && len !== 1
                        || variate === 'problem' && len !== 1
                        || variate === 'bivariate' && len !== 2
                        || variate === 'trivariate' && len !== 3
                        || variate === 'multivariate' && len < 2) {
                        return;
                    }

                    // behavioral logging
                    let logParams = {
                                  feature_id: 'EXPLORE_MAKE_PLOTS',
                                  activity_l1: 'MODEL_SELECTION',
                                  activity_l2: 'MODEL_SEARCH',
                                  other: {variate: variate}

                                };
                    app.saveSystemLogEntry(logParams);

                    m.route.set(`/explore/${variate}/${selected.join('/')}`);
                }
            }, 'go'),

            m('br'),

            m('', {style: 'display: flex; flex-direction: row; flex-wrap: wrap'},
                // x could either be a problemID or a variable name
                (app.leftTab === 'Discover' ? Object.keys(app.workspace.raven_config.problems) : Object.keys(app.variableSummaries)).map(x => {
                    let selected = app.leftTab === 'Discover'
                        ? x === selectedProblem.problemID
                        : exploreVariables.includes(x);

                    let targetName = app.leftTab === 'Discover'
                        ? app.workspace.raven_config.problems[x].targets[0]
                        : x;

                    let show = exploreVariate === 'Bivariate' || exploreVariate === 'Trivariate';
                    let [n0, n1, n2] = exploreVariables.map(variable => app.variableSummaries[variable]);
                    let exploreProblem = 'problems' in app.workspace.raven_config && app.workspace.raven_config.problems[x];
                    let predictorVariables = app.getPredictorVariables(exploreProblem);
                    let problemText = predictorVariables && [exploreProblem.targets.join(','), m(Icon, {style: 'margin:.5em;margin-top:.25em', name: 'arrow-left'}), abbreviate(predictorVariables.join(', '), 100)];

                    // tile for each variable or problem
                    let tile = m('span#exploreNodeBox', {
                            onclick: _ => {
                                if (app.leftTab === 'Discover') {
                                    app.setSelectedProblem(x);
                                    exploreVariables = [x];
                                    return;
                                }

                                if (exploreVariate === 'Multivariate') {
                                    exploreVariables.includes(x)
                                        ? app.remove(exploreVariables, x)
                                        : exploreVariables.push(x);
                                    return;
                                }

                                let maxVariables = {
                                    'Univariate': 1,
                                    'Bivariate': 2,
                                    'Trivariate': 3
                                }[exploreVariate];

                                if (exploreVariables.includes(x)) app.remove(exploreVariables, x);
                                exploreVariables.push(x);
                                exploreVariables = exploreVariables
                                    .slice(Math.max(0, exploreVariables.length - maxVariables));
                                exploreVariables = [...new Set(exploreVariables)];

                            },
                            style: {
                                // border: '1px solid rgba(0, 0, 0, .2)',
                                'border-radius': '5px',
                                'box-shadow': '1px 1px 4px rgba(0, 0, 0, 0.4)',
                                display: 'flex',
                                'flex-direction': 'column',
                                height: '250px',
                                margin: '.5em',
                                width: '250px',
                                'align-items': 'center',
                                'background-color': selected ? app.hexToRgba(common.selVarColor) : common.menuColor
                            }
                        },
                        m('#exploreNodePlot', {
                            oninit() {
                                this.node = app.variableSummaries[x];
                            },
                            oncreate(vnode) {
                                let plot = (this.node || {}).pdfPlotType === 'continuous' ? densityNode : barsNode;
                                this.node && plot(this.node, vnode.dom, 110, true);
                            },
                            onupdate(vnode) {
                                let targetName = app.leftTab === 'Discover'
                                    ? app.workspace.raven_config.problems[x].targets[0]
                                    : x;
                                let node = app.variableSummaries[targetName];
                                if (node && node !== this.node) {
                                    let plot = node.pdfPlotType === 'continuous' ? densityNode : barsNode;
                                    plot(node, vnode.dom, 110, true);
                                    this.node = node;
                                }
                            },
                            style: 'height: 65%'
                        }),
                        m('#exploreNodeLabel', {
                                style: {
                                    margin: '.5em',
                                    'max-width': '230px',
                                    'overflow-wrap': 'break-word',
                                    overflow: 'auto'
                                }
                            },
                            show && n0 && n0.name === x ? `${x} (x)`
                                : show && n1 && n1.name === x ? `${x} (y)`
                                : show && n2 && n2.name === x ? `${x} (z)`
                                    : app.leftTab === 'Discover' && problemText
                                        ? [m('b', x), m('p', {style: {overflow: 'auto', 'max-height': '60px'}}, problemText)]
                                        : x)
                    );

                    if (app.variableSummaries[targetName].labl)
                        return m(Popper, {content: () => app.variableSummaries[targetName].labl}, tile);
                    return tile;
                }))
        );

        let getPlot = () => {

            if (variate === "problem") return m('#plot', {
                style: 'display: block',
                oncreate: () => plotVega([], "", selectedProblem)
            });

            if (nodes.length === 0) return;
            let plotNode = nodes[0] && nodes[0].pdfPlotType === 'continuous' ? density : bars;

            return m('div',
                m('div#explorePlotBar', {
                        style: {
                            'margin-bottom': '1em',
                            'overflow-x': 'scroll',
                            'white-space': 'nowrap',
                            width: '100%'
                        }
                    },
                    getRelevantPlots(nodes, variate).map(x => m("figure", {style: 'display: inline-block'}, [
                            m(`img#${x}_img[alt=${x}][height=140px][width=260px][src=/static/images/${x}.png]`, {
                                onclick: _ => plotVega(nodes, x, selectedProblem),
                                style: thumbsty(nodes, x)
                            }),
                            m("figcaption", {style: {"text-align": "center"}}, plotMap[x])
                        ])
                    )),
                m('#plot', {
                    style: 'display: block;height:500px',
                    oncreate: innerVnode => nodes.length > 1
                        ? plotVega(nodes, getRelevantPlots(nodes, variate)[0])
                        : plotNode(nodes[0], innerVnode.dom, true)
                })
            );
        };

        if (['problem', 'univariate', 'bivariate', 'trivariate', 'multivariate'].includes(variate)) return wrapCanvas(
            m(Button, {
                onclick: () => {
                    m.route.set('/explore');
                    m.redraw()
                },
                style: {margin: '1em'}},
                m(Icon, {name: 'chevron-left', style: 'margin-right:.5em;transform:scale(1.5)'}),
                'back to variables'),
            m('br'),
            getPlot()
        );
    }
}

export let getRelevantPlots = (nodes, variate) => {
    let filtered = schemas[variate];
    if (variate === 'bivariate' || variate === 'trivariate')
        filtered = `${filtered} ${schemas.multivariate}`;

    let plotGroups = {
        'recommended': [],
        'unknown': [],
        'discouraged': []
    };
    filtered.split(' ').forEach(schemaName => {
        let isRecommended = getIsRecommended(nodes, schemaName);
        plotGroups[isRecommended === undefined ? 'unknown' : isRecommended ? 'recommended' : 'discouraged'].push(schemaName)
    });
    return Object.values(plotGroups).flatMap(_=>_);
};

export let exploreVariables = [];

let plotMap = {
    scatter: "Scatter Plot",
    tableheat: "Heatmap",
    line: "Line Chart",
    stackedbar: "Stacked Bar",
    box: "Box Plot",
    groupedbar: "Grouped Bar",
    strip: "Strip Plot",
    aggbar: "Aggregate Bar",
    binnedscatter: "Binned Scatter",
    step: "Step Chart",
    area: "Area Chart",
    binnedtableheat: "Binned Heatmap",
    averagediff: "Diff. from Avg.",
    scattermeansd: "Scatter with Overlays",
    scattermatrix: "Scatter Matrix",
    simplebar: "Simple Bar Uni",
    histogram: "Histogram Uni",
    areauni: "Area Chart Uni",
    histogrammean: "Histogram with Mean Uni",
    trellishist: "Histogram Trellis",
    interactivebarmean: "Interactive Bar with Mean",
    dot: "Simple Dot Plot",
    horizon: "Horizon Plot",
    binnedcrossfilter: "Binned Cross Filter",
    scattertri: "Scatterplot with Groups",
    groupedbartri: "Grouped Bar",
    horizgroupbar: "Horizontal Grouped Bar",
    bubbletri: "Bubble Plot with Groups",
    bubbleqqq: "Bubble Plot with Binned Groups",
    scatterqqq: "Interactive Scatterplot with Binned Groups",
    trellisscatterqqn: "Scatterplot Trellis",
    heatmapnnq: "Heatmap with Mean Z",
    dotdashqqn: "Dot-dash Plot",
    tablebubblennq: "Table Bubble Plot",
    stackedbarnnn: "Stacked Bar Plot",
    facetbox: "Faceted Box Plot",
    facetheatmap: "Faceted Heatmap",
    groupedbarnqq: "Grouped Bar with Binned Z"
};

let schemas = {
    univariate: 'areauni dot histogram histogrammean simplebar',
    bivariate: 'aggbar area averagediff binnedscatter binnedtableheat box ' +
        'groupedbar horizon interactivebarmean line scatter scattermatrix ' +
        'scattermeansd stackedbar step strip tableheat trellishist',
    trivariate: 'bubbletri groupedbartri horizgroupbar scattertri bubbleqqq ' +
        'scatterqqq trellisscatterqqn heatmapnnq dotdashqqn tablebubblennq ' +
        'stackedbarnnn facetbox facetheatmap groupedbarnqq',
    multivariate: 'binnedcrossfilter scattermatrix'
};

let approps = {
    qq: ["scatter", "line", "area", "binnedscatter", "binnedtableheat", "horizon", "scattermatrix", "scattermeansd", "step"],
    nn: ["stackedbar", "tableheat",],
    nq: ["box", "interactivebarmean"],
    qn: ["aggbar", "box", "strip", "trellishist"],
    qqq: ["bubbleqqq", "scatterqqq", "scattermatrix"],
    qnn: ["horizgroupbar", "facetbox"],
    qqn: ["scattertri", "trellisscatterqqn", "dotdashqqn"],
    qnq: ["bubbletri"],
    nqn: ["groupedbartri", "facetbox"],
    nqq: ["groupedbarnqq"],
    nnq: ["heatmapnnq", "tablebubblennq"],
    nnn: ["stackedbarnnn", "facetheatmap"]
};

let getPlotType = (pt, pn) => {

    // returns true if uniques is equal to, one less than, or two less than the number of valid observations
    function uniqueValids(pn) {
        return pn.uniqueCount === pn.validCount ? true :
            pn.uniqueCount === pn.validCount - 1 ? true :
                pn.uniqueCount === pn.validCount - 2 ? true : false;
    }

    if (pn.length > 3) return ['scattermatrix', 'aaa'];
    let myCons = [];
    let vt = "";

    for (let i = 0; i < pn.length; i++) {
        myCons[i] = pn[i].pdfPlotType === 'continuous' ? true : false;
        pn[i].pdfPlotType === 'continuous' ? vt = vt + 'q' : vt = vt + 'n';
    }

    if (pt != "") return [pt, vt];

    if (pn.length == 2) {
        // check uniqueValids. if so, make difference from mean the default plot
        let uvs = [uniqueValids(pn[0]), uniqueValids(pn[1])];
        // console.log(uvs);
        if (uvs[0] === true && uvs[1] === false)
            return ['averagediff', 'nq'];
        else if (uvs[0] === false && uvs[1] === true)
            return ['averagediff', 'qn'];

        return myCons[0] && myCons[1] ? ['scatter', 'qq'] :
            myCons[0] && !myCons[1] ? ['box', 'qn'] :
                !myCons[0] && myCons[1] ? ['box', 'nq'] :
                    ['stackedbar', 'nn'];
    }
    if (pn.length == 3) {
        return myCons[0] && myCons[1] && myCons[2] ? ['bubbleqqq', 'qqq'] :
            myCons[0] && !myCons[1] && !myCons[2] ? ['horizgroupbar', 'qnn'] :
                myCons[0] && myCons[1] && !myCons[2] ? ['scattertri', 'qqn'] :
                    myCons[0] && !myCons[1] && myCons[2] ? ['bubbletri', 'qnq'] :
                        !myCons[0] && myCons[1] && !myCons[2] ? ['groupedbartri', 'nqn'] :
                            !myCons[0] && myCons[1] && myCons[2] ? ['groupedbarnqq', 'nqq'] :
                                !myCons[0] && !myCons[1] && myCons[2] ? ['heatmapnnq', 'nnq'] :
                                    !myCons[0] && !myCons[1] && !myCons[2] ? ['stackedbarnnn', 'nnn'] :
                                        ['scattermatrix', 'aaa'];
    }
};

export async function plotVega(plotNodes, plottype = "", problem = {}) {

    const colors = [
        "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4", "#46f0f0",
        "#f032e6", "#d2f53c", "#fabebe", "#008080", "#e6beff", "#aa6e28", "#fffac8",
        "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000080", "#808080"
    ];
    if (app.downloadIncomplete()) {
        return;
    }

    function getNames(arr) {
        let myarr = [];
        for (var i = 0; i < arr.length; i++) {
            if (typeof arr[i] != 'undefined') {
                myarr[i] = arr[i].name;
            }
        }
        return myarr;
    }

    // function returns whether to flip a plot. for example, if plot expects 'nq' and users gives 'qn', flip should return true. this may have to be generalized for 3+ dimension plots
    let plotflip = (pt) => {
        return pt[0] === "box" && pt[1] === "qn" ? true :
            pt[0] === "facetbox" && pt[1] === "qnn" ? true :
                pt[0] === "averagediff" && pt[1] === "nq" ? true : false;
    };

    // function to fill in the contents of the vega schema.
    let fillVega = (data, flip, schema) => {
        let stringified = JSON.stringify(schema);
        if (flip) {
            stringified = stringified.replace(/"x"/g, '"t"');
            stringified = stringified.replace(/"x2"/g, '"t2"');
            stringified = stringified.replace(/"y"/g, '"x"');
            stringified = stringified.replace(/"y2"/g, '"x2"');
            stringified = stringified.replace(/"t"/g, '"y"');
            stringified = stringified.replace(/"t2"/g, '"y2"');

            let temp = data.vars[0];
            data.vars[0] = data.vars[1];
            data.vars[1] = temp;
        }


        if (data["vars"].length > 1) {
            stringified = stringified.replace(/tworavensY/g, data.vars[1]);
        }
        if (data["vars"].length > 2) {
            stringified = stringified.replace(/tworavensZ/g, data.vars[2]);
        }
        stringified = stringified.replace(/tworavensX/g, data.vars[0]);
        stringified = stringified.replace(/"tworavensFilter"/g, null);
        stringified = stringified.replace("url", "values");
        stringified = stringified.replace('"tworavensData"', data.plotdata[0]);
        if (data.uniqueY) {
            let $colors = colors.splice(0, data["uniqueY"].length).map(col => `"${col}"`).join(',');
            let $uniques = data["uniqueY"].map(uni => `"${uni}"`).join(',');
            stringified = stringified.replace(/"tworavensUniqueY"/g, "[" + $uniques + "]");
            stringified = stringified.replace(/"tworavensColors"/g, "[" + $colors + "]");
        }
        if (data.plottype[0] == "groupedbartri") {
            let $colors = colors.splice(0, data["uniqueZ"].length).map(col => `"${col}"`).join(',');
            //  stringified = stringified.replace(/"tworavensUniqueY"/g, "["+data.uniqueY+"]");
            stringified = stringified.replace(/"tworavensColors"/g, "[" + $colors + "]");
        }
        if (data.meanY) {
            stringified = stringified.replace(/"tworavensMeanY"/g, data.meanY);
            stringified = stringified.replace(/tworavensMeanY/g, data.meanY); //both needed in this order
        }
        if (data.plottype[0] == "scattermatrix") {
            let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
            stringified = stringified.replace(/"tworavensRow"/g, $matvars);
            stringified = stringified.replace(/"tworavensCol"/g, $matvars);
        }
        if (data.plottype[0] == "binnedcrossfilter") {
            let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
            stringified = stringified.replace(/"tworavensVars"/g, $matvars);
        }

        // behavioral logging
        let logParams = {
                      feature_id: 'EXPLORE_VIEW_PLOT',
                      activity_l1: 'DATA_PREPARATION',
                      activity_l2: 'DATA_EXPLORE',
                      other: {plottype: plottype}
                    };
        app.saveSystemLogEntry(logParams);

        // VJD: if you enter this console.log into the vega editor https://vega.github.io/editor/#/edited the plot will render
        //console.log(stringified);
        return JSON.parse(stringified);
    };

    let myx = [];
    let myy = {};
    let mypn = [];
    let vegajson = {};
    let jsonarr = [];

    if (plotNodes.length === 0) {
        myy = app.variableSummaries[problem.targets[0]];
        myx = app.getPredictorVariables(problem).map(predictor => app.variableSummaries[predictor]);
    } else {
        myx[0] = "oneshot"; // necessary to work out the looping
        mypn = plotNodes;
    }

    for (var i = 0; i < myx.length; i++) {
        if (plotNodes.length === 0) { // note only drawing bivariate plots
            mypn = [myx[i], myy];
        }
        plottype = i > 0 ? "" : plottype;
        plottype = getPlotType(plottype, mypn); // VJD: second element in array tags the variables for the plot e.g., qq means quantitative,quantitative; qn means quantitative,nominal
        console.log(mypn);
        let plotvars = getNames(mypn);

        let compiled = queryMongo.buildPipeline(
            [...app.workspace.raven_config.hardManipulations || [], ...problem.manipulations || [], {
                type: 'menu',
                metadata: {
                    type: 'data',
                    variables: exploreVariables,
                    sample: recordLimit
                }
            }],
            app.workspace.raven_config.variablesInitial)['pipeline'];

        let json = {
            plotdata: [JSON.stringify(await app.getData({
                method: 'aggregate',
                query: JSON.stringify(compiled)
            }))],
            plottype,
            vars: plotvars
        };

        // write links to file & run R CMD
        if (!json) {
            return;
        }

        let schema = schemaMap[plottype[0]];
        if (!schema) app.alertError("invalid plot type");
        // console.log(schema);
        let flip = plotflip(plottype);
        jsonarr[i] = fillVega(json, flip, schema);
    }

    if (jsonarr.length === 1) vegajson = jsonarr[0];
    else vegajson = {vconcat: jsonarr, config: {axisY: {minExtent: 30}}};

    vegaEmbed('#plot', vegajson, {width: 800, height: 600});
}

export function thumbsty(plotNodes, thumb) {
    if (!approps) return {};

    let isRecommended = getIsRecommended(plotNodes, thumb);
    if (isRecommended === undefined) return {};

    let styling = {
        "border-radius": "3px",
        padding: "5px",
        margin: "3%", cursor: "pointer"
    };

    styling.border = isRecommended
        ? "2px solid " + common.csColor
        : "2px solid " + common.errorColor;

    return styling;
}

export function getIsRecommended(plotNodes, thumb) {
    let plotType = getPlotType("", plotNodes);

    if (!plotType) return;
    return (approps[plotType[1]] || []).indexOf(thumb) > -1;
}

export let exploreVariate = 'Univariate';
export let setExploreVariate = variate => exploreVariate = variate;

// prefer using vegaLite going forward

// function to use d3 to graph density plots with preprocessed data
export function density(node, div, priv) {
    if (!div) return alertError("Error: incorrect div selected for plots: " + div);

    let [xVals, yVals] = [node.pdfPlotX, node.pdfPlotY];
    if (priv && node.plotCI) {
        let [upperError, lowerError] = ['upperBound', 'lowerBound'].map(
            bound => xVals.map((x, i) => ({x: +x, y: +node.plotCI[bound][i]})));
        console.log('upperError\n', upperError);
    }

    let {width, height} = div.getBoundingClientRect();
    var margin = {
        top: 20,
        right: 20,
        bottom: 53,
        left: 10
    };

    width = (width - margin.left - margin.right);
    height = (height - margin.top - margin.bottom);

    var x = d3.scaleLinear()
        .domain([d3.min(xVals), d3.max(xVals)])
        .range([0, width]);
    var y = d3.scaleLinear()
        .domain([d3.min(yVals), d3.max(yVals)])
        .range([height, 0]);
    var xAxis = d3.axisBottom()
        .scale(x)
        .ticks(5);

    var area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.x))
        .y0(height)
        .y1(d => y(d.y));

    var plotsvg = d3.select(div)
        .append("svg")
        .attr("id", () => node.name.toString()
            .replace(/\(|\)/g, "")
            .concat("_", div.id))
        .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    plotsvg.append("path")
        .datum(xVals.map((x, i) => ({x: +x, y: +node.pdfPlotY[i]})))
        .attr("class", "area")
        .style('fill', 'steelblue')
        .attr("d", area);

    plotsvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    plotsvg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(node.name);
}

export function bars(node, div, priv) {
    // Histogram spacing
    var barPadding = .015; // Space between bars
    var plotXaxis = true;

    // Data
    var keys = Object.keys(node.plotValues);
    var yVals = new Array;
    var ciUpperVals = new Array;
    var ciLowerVals = new Array;
    var ciSize;

    var xVals = new Array;
    var yValKey = new Array;

    if (node.nature == "nominal") {
        var xi = 0;
        for (var i = 0; i < keys.length; i++) {
            if (node.plotValues[keys[i]] == 0)
                continue;
            yVals[xi] = node.plotValues[keys[i]];
            xVals[xi] = xi;
            if (priv) {
                if (node.plotValuesCI) {
                    ciLowerVals[xi] = node.plotValuesCI.lowerBound[keys[i]];
                    ciUpperVals[xi] = node.plotValuesCI.upperBound[keys[i]];
                }
                ciSize = ciUpperVals[xi] - ciLowerVals[xi];
            };

            yValKey.push({
                y: yVals[xi],
                x: keys[i]
            });
            xi = xi + 1;
        }
        yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
        yVals.sort((a, b) => b - a); // array of y values, the height of the bars
        ciUpperVals.sort((a, b) => b.y - a.y); // ?
        ciLowerVals.sort((a, b) => b.y - a.y); // ?
    } else {
        for (var i = 0; i < keys.length; i++) {
            // console.log("plotValues in bars");
            yVals[i] = node.plotValues[keys[i]];
            xVals[i] = Number(keys[i]);
            if (priv) {
                if (node.plotValuesCI) {
                    ciLowerVals[i] = node.plotValuesCI.lowerBound[keys[i]];
                    ciUpperVals[i] = node.plotValuesCI.upperBound[keys[i]];
                }
                ciSize = ciUpperVals[i] - ciLowerVals[i];
            }
        }
    }

    if ((yVals.length > 15 & node.numchar == "numeric") || (yVals.length > 5 & node.numchar == "character"))
        plotXaxis = false;
    var maxY = d3.max(yVals); // in the future, set maxY to the value of the maximum confidence limit
    if (priv && node.plotValuesCI) maxY = d3.max(ciUpperVals);
    var minX = d3.min(xVals);
    var maxX = d3.max(xVals);

    let {width, height} = div.getBoundingClientRect();
    var margin = {
        top: 20,
        right: 20,
        bottom: 53,
        left: 10
    };

    if (priv && node.stabilityBin) {
        var x = d3.scaleLinear()
            .domain([minX - 0.5, maxX + 1.5])
            .range([0, width]);
    } else {
        var x = d3.scaleLinear()
            .domain([minX - 0.5, maxX + 0.5])
            .range([0, width]);
    }

    var y = d3.scaleLinear()
        .domain([0, maxY])
        .range([0, height]);

    var xAxis = d3.axisBottom()
        .scale(x)
        .ticks(yVals.length);

    // Create SVG element
    var plotsvg = d3.select(div)
        .append("svg")
        .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
        .style("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var rectWidth = x(minX + 0.5 - 2 * barPadding); //the "width" is the coordinate of the end of the first bar

    plotsvg.selectAll("rect")
        .data(yVals)
        .enter()
        .append("rect")
        .attr("x", (d, i) => x(xVals[i] - 0.5 + barPadding))
        .attr("y", d => y(maxY - d))
        .attr("width", rectWidth)
        .attr("height", y)
        .attr("fill", "#1f77b4");

    if (plotXaxis) {
        plotsvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);
    }

    plotsvg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(node.name);
}

export function densityNode(node, obj, radius, explore) {

    d3.select(obj).selectAll("svg").remove();

    var yVals = node.pdfPlotY;
    var xVals = node.pdfPlotX;
    // array of objects
    let data2 = node.pdfPlotX.map((x, i) => ({x: +x, y: +node.pdfPlotY[i]}));

    // default radius 40

    // width 60
    // height 30
    // top 20
    // l/r 10

    var width = radius * 1.5;
    var height = radius * 0.75;
    var margin = {
        top: 50 - radius * .75,
        right: (80 - width) / 2,
        bottom: 53,
        left: (80 - width) / 2
    };

    var x = d3.scaleLinear()
        .domain([d3.min(xVals), d3.max(xVals)])
        .range([0, width]);

    var y = d3.scaleLinear()
        .domain([d3.min(yVals), d3.max(yVals)])
        .range([height, 0]);

    var area = d3.area()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.x))
        .y0(height)
        .y1(d => y(d.y));

    let {left, top} = margin;
    if (explore) {
        left = 5;
        top = 60;
    }
    var plotsvg = d3.select(obj)
        .insert("svg", ":first-child")
        .attr("x", -40) // NOTE: Not sure exactly why these numbers work, but these hardcoded values seem to position the plot inside g correctly.  this shouldn't be hardcoded in the future
        .attr("y", -45)
        .style("width", width)
        // .style("height", height) // MIKE: I commented this because the plots were getting cut off in explore mode
        .append("g")
        .attr("transform", "translate(" + left + "," + top + ")");

    plotsvg.append("path")
        .datum(data2)
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "#1f77b4");
}

export function barsNode(node, obj, radius, explore) {

    d3.select(obj).selectAll("svg").remove();

    // Histogram spacing
    var barPadding = .015; // Space between bars
    var topScale = 1.2; // Multiplicative factor to assign space at top within graph - currently removed from implementation

    // Data
    var keys = Object.keys(node.plotValues);
    var yVals = new Array;
    var xVals = new Array;
    var yValKey = new Array;

    if (node.nature === "nominal") {
        var xi = 0;
        for (var i = 0; i < keys.length; i++) {
            if (node.plotValues[keys[i]] == 0)
                continue;
            yVals[xi] = node.plotValues[keys[i]];
            xVals[xi] = xi;
            yValKey.push({y: yVals[xi], x: keys[i]});
            xi = xi + 1;
        }
        yValKey.sort((a, b) => b.y - a.y); // array of objects, each object has y, the same as yVals, and x, the category
        yVals.sort((a, b) => b - a); // array of y values, the height of the bars
    } else {
        for (var i = 0; i < keys.length; i++) {
            yVals[i] = node.plotValues[keys[i]];
            xVals[i] = Number(keys[i]);
        }
    }

    var maxY = d3.max(yVals);
    var minX = d3.min(xVals);
    var maxX = d3.max(xVals);

    var width = radius * 1.5;
    var height = radius * 0.75;
    var margin = {
        top: 50 - radius * .75,
        right: (80 - width) / 2,
        bottom: 53,
        left: (80 - width) / 2
    };

    var x = d3.scaleLinear()
        .domain([minX - 0.5, maxX + 0.5])
        .range([0, width]);

    var invx = d3.scaleLinear()
        .range([minX - 0.5, maxX + 0.5])
        .domain([0, width]);

    var y = d3.scaleLinear()
        .domain([0, maxY])
        .range([0, height]);

    let {left, top} = margin;
    if (explore) {
        left = 5;
        top = 60;
    }
    var plotsvg = d3.select(obj)
        .insert("svg", ":first-child")
        .attr("x", -40)
        .attr("y", -45)
        .style("width", width) // set height to the height of #main.left
        // .style("height", height)
        .append("g")
        .attr("transform", "translate(" + left + "," + top + ")");

    plotsvg.selectAll("rect")
        .data(yVals)
        .enter()
        .append("rect")
        .attr("x", (d, i) =>  x(xVals[i] - 0.5 + barPadding))
        .attr("y", d =>  y(maxY - d))
        .attr("width", x(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
        .attr("height", y)
        .attr("fill", "#1f77b4");
}
