import vegaEmbed from 'vega-embed';
import m from "mithril";


import * as app from './app';
import * as box2d from './vega-schemas/box2d';
import * as scatter from './vega-schemas/scatter';
import * as stackedbar from './vega-schemas/stackedbar';
import * as line from './vega-schemas/line';
import * as tableheat from './vega-schemas/tableheat';
import * as groupedbar from './vega-schemas/groupedbar';
import * as strip from './vega-schemas/strip';
import * as aggbar from './vega-schemas/aggbar';
import * as binnedscatter from './vega-schemas/binnedscatter';
import * as step from './vega-schemas/step';
import * as area from './vega-schemas/area';
import * as binnedtableheat from './vega-schemas/binnedtableheat';
import * as averagediff from './vega-schemas/averagediff';
import * as scattermeansd from './vega-schemas/scattermeansd';
import * as scattermatrix from './vega-schemas/multi/scattermatrix';
import * as simplebar from './vega-schemas/univariate/simplebar';
import * as histogram from './vega-schemas/univariate/histogram';
import * as areauni from './vega-schemas/univariate/areauni';
import * as histogrammean from './vega-schemas/univariate/histogrammean';
import * as dot from './vega-schemas/univariate/dot';
import * as trellishist from './vega-schemas/trellishist';
import * as horizon from './vega-schemas/horizon';
import * as interactivebarmean from './vega-schemas/interactivebarmean';
import * as binnedcrossfilter from './vega-schemas/multi/binnedcrossfilter';
import * as scattertri from './vega-schemas/trivariate/scattertri';
import * as groupedbartri from './vega-schemas/trivariate/groupedbartri';
import * as horizgroupbar from './vega-schemas/trivariate/horizgroupbar';
import * as bubbletri from './vega-schemas/trivariate/bubbletri';
import * as bubbleqqq from './vega-schemas/trivariate/bubbleqqq';
import * as scatterqqq from './vega-schemas/trivariate/scatterqqq';
import * as trellisscatterqqn from './vega-schemas/trivariate/trellisscatterqqn';
import * as heatmapnnq from './vega-schemas/trivariate/heatmapnnq';
import * as dotdashqqn from './vega-schemas/trivariate/dotdashqqn';
import * as tablebubblennq from './vega-schemas/trivariate/tablebubblennq';
import * as stackedbarnnn from './vega-schemas/trivariate/stackedbarnnn';
import * as facetbox from './vega-schemas/trivariate/facetbox';
import * as facetheatmap from './vega-schemas/trivariate/facetheatmap';
import * as groupedbarnqq from './vega-schemas/trivariate/groupedbarnqq';


import * as plots from "./plots";

import * as common from "../common/common";
import ButtonRadio from "../common/views/ButtonRadio";
import Popper from "../common/views/Popper";

import PanelButton from "./views/PanelButton";

export let exploreVariables = [];

export class CanvasExplore {
    view(vnode) {
        let {vars, variate} = vnode.attrs;

        let expnodes = [];
        vars = vars ? vars.split('/') : [];

        let exploreVars = (() => {
            vars.forEach(x => {
                let node = app.variableSummaries[x];
                node && expnodes.push(node);
            });
            if (variate === "problem") {
                return m('', [
                    m('#plot', {style: 'display: block', oncreate: _ => plot([], "", app.getSelectedProblem())})
                ]);
            }
            if (!expnodes[0] && !expnodes[1]) {
                return;
            }

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
                bivariate: 'aggbar area averagediff binnedscatter binnedtableheat box'
                    + ' groupedbar horizon interactivebarmean line scatter scattermatrix scattermeansd stackedbar step strip tableheat trellishist',
                trivariate: 'bubbletri groupedbartri horizgroupbar scattertri bubbleqqq scatterqqq trellisscatterqqn heatmapnnq dotdashqqn tablebubblennq stackedbarnnn facetbox facetheatmap groupedbarnqq',
                multiple: 'binnedcrossfilter scattermatrix'
            };
            let filtered = schemas[variate];
            if (variate === 'bivariate' || variate === 'trivariate') {
                filtered = `${filtered} ${schemas.multiple}`;
            }

            let plot = expnodes[0] && expnodes[0].plottype === 'continuous' ? plots.density : plots.bars;

            return m('div', [
                m('div', {
                        style: {
                            'margin-bottom': '1em',
                            'overflow-x': 'scroll',
                            'white-space': 'nowrap',
                            width: '100%'
                        }
                    },
                    filtered.split(' ').map(x => {
                        return m("figure", {style: 'display: inline-block'}, [
                            m(`img#${x}_img[alt=${x}][height=140px][width=260px][src=/static/images/${x}.png]`, {
                                onclick: _ => plot(expnodes, x),
                                style: thumbsty(expnodes, x)
//                              style: {border: "2px solid #ddd", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}
                            }),
                            m("figcaption", {style: {"text-align": "center"}}, plotMap[x])
                        ]);
                    })),
                m('#plot', {
                    style: 'display: block',
                    oncreate: _ => expnodes.length > 1 ? plot(expnodes) : plot(expnodes[0], 'explore', true)
                })
            ]);
        })();

        return [variate === 'problem' ?
            m('',
                m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                m('br'),
                exploreVars)
            : exploreVars ?
                m('',
                    m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                    m('br'),
                    exploreVars)
                : m('',
                    m(ButtonRadio, {
                        id: 'exploreButtonBar',
                        attrsAll: {style: {width: '400px'}},
                        attrsButtons: {class: ['btn-sm']},
                        onclick: x => {
                            app.setVariate(x);
                            if (app.exploreVariate === 'Multivariate') return;
                            let maxVariables = {
                                Univariate: 1,
                                Bivariate: 2,
                                Trivariate: 3
                            }[app.exploreVariate];
                            exploreVariables = exploreVariables
                                .slice(Math.max(0, exploreVariables.length - maxVariables));
                        },
                        activeSection: app.exploreVariate,
                        sections: app.leftTab === 'Discover' ? [{value: 'Problem'}] : [{value: 'Univariate'}, {value: 'Bivariate'}, {value: 'Trivariate'}, {value: 'Multiple'}]
                    }),
                    m(PanelButton, {
                        id: 'exploreGo',
                        classes: 'btn-success',
                        onclick: _ => {
                            let variate = app.exploreVariate.toLowerCase();
                            let selected = app.leftTab === 'Discover' ? [app.workspace.raven_config.selectedProblem] : exploreVariables;
                            let len = selected.length;
                            if (variate === 'univariate' && len != 1
                                || variate === 'problem' && len != 1
                                || variate === 'bivariate' && len != 2
                                || variate === 'trivariate' && len != 3
                                || variate === 'multiple' && len < 2) {
                                return;
                            }
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

                            let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                            let [n0, n1, n2] = exploreVariables.map(variable => app.variableSummaries[variable]);
                            let predictorVariables = app.getPredictorVariables(selectedProblem);

                            // tile for each variable or problem
                            let tile = m('span#exploreNodeBox', {
                                    onclick: _ => {
                                        if (app.leftTab === 'Discover') {
                                            app.setSelectedProblem(x);
                                            exploreVariables = [x];
                                            return;
                                        }

                                        if (app.exploreVariate === 'Multivariate') {
                                            exploreVariables.includes(x)
                                                ? app.remove(exploreVariables, x) : exploreVariables.push(x);
                                            return;
                                        }

                                        let maxVariables = {
                                            'Univariate': 1,
                                            'Bivariate': 2,
                                            'Trivariate': 3
                                        }[app.exploreVariate];

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
                                }, m('#exploreNodePlot', {
                                    oninit() {
                                        this.node = app.variableSummaries[x];
                                    },
                                    oncreate(vnode) {
                                        let plot = (this.node || {}).plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                        this.node && plot(this.node, vnode.dom, 110, true);
                                    },
                                    onupdate(vnode) {
                                        let targetName = app.leftTab === 'Discover'
                                            ? app.workspace.raven_config.problems[x].targets[0]
                                            : x;
                                        let node = app.variableSummaries[targetName];
                                        if (node && node !== this.node) {
                                            let plot = node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                            plot(node, vnode.dom, 110, true);
                                            this.node = node;
                                        }
                                    },
                                    style: 'height: 65%'
                                }),
                                m('#exploreNodeLabel', {style: 'margin: 1em'},
                                    show && n0 && n0.name === x ? `${x} (x)`
                                        : show && n1 && n1.name === x ? `${x} (y)`
                                        : show && n2 && n2.name === x ? `${x} (z)`
                                            : predictorVariables ? [
                                                    m('b', x),
                                                    m('p', predictorVariables.join(', '))]
                                                : x)
                            );

                            if (app.variableSummaries[targetName].labl)
                                return m(Popper, {content: () => app.variableSummaries[targetName].labl}, tile);
                            return tile;
                        }))
                )]
    }
}

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

let getPlotType = (pt,pn) => {

    // returns true if uniques is equal to, one less than, or two less than the number of valid observations
    function uniqueValids(pn) {
        return pn.uniques === pn.valid ? true :
            pn.uniques === pn.valid - 1 ? true :
                pn.uniques === pn.valid - 2 ? true : false;
    }

    if (pn.length > 3) return ['scattermatrix', 'aaa'];
    let myCons = [];
    let vt = "";

    for (let i = 0; i < pn.length; i++) {
        myCons[i] = pn[i].plottype === 'continuous' ? true : false;
        pn[i].plottype === 'continuous' ? vt = vt + 'q' : vt = vt + 'n';
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
}

export async function plot(plotNodes, plottype="", problem={}) {

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
        for (var i=0; i<arr.length; i++) {
            if (typeof arr[i] != 'undefined') {
                myarr[i]=arr[i].name;}
        }
        return myarr;
    }

    // function returns whether to flip a plot. for example, if plot expects 'nq' and users gives 'qn', flip should return true. this may have to be generalized for 3+ dimension plots
    let plotflip = (pt) => {
        return  pt[0] === "box" && pt[1] === "qn" ? true :
                pt[0] === "facetbox" && pt[1] === "qnn" ? true :
                pt[0] === "averagediff" && pt[1] === "nq" ? true : false;
    };

    // function to fill in the contents of the vega schema.
    let fillVega = (data,flip,schema) => {
        let stringified = JSON.stringify(schema);
        console.log(flip);
        if(flip) {
            stringified = stringified.replace(/"x"/g,'"t"');
            stringified = stringified.replace(/"x2"/g, '"t2"');
            stringified = stringified.replace(/"y"/g, '"x"');
            stringified = stringified.replace(/"y2"/g, '"x2"');
            stringified = stringified.replace(/"t"/g, '"y"');
            stringified = stringified.replace(/"t2"/g, '"y2"');

            let temp = data.vars[0];
            data.vars[0] = data.vars[1];
            data.vars[1] = temp;
        }


        if(data["vars"].length>1) {
            stringified = stringified.replace(/tworavensY/g, data.vars[1]);
        }
        if(data["vars"].length>2) {
            stringified = stringified.replace(/tworavensZ/g, data.vars[2]);
        }
        stringified = stringified.replace(/tworavensX/g, data.vars[0]);
        stringified = stringified.replace(/"tworavensFilter"/g, null);
        stringified = stringified.replace("url", "values");
        stringified = stringified.replace('"tworavensData"',data.plotdata[0]);
        if (data.uniqueY) {
            let $colors = colors.splice(0, data["uniqueY"].length).map(col => `"${col}"`).join(',');
            let $uniques = data["uniqueY"].map(uni => `"${uni}"`).join(',');
            stringified = stringified.replace(/"tworavensUniqueY"/g, "["+$uniques+"]");
            stringified = stringified.replace(/"tworavensColors"/g, "["+$colors+"]");
        }
        if (data.plottype[0]=="groupedbartri") {
            let $colors = colors.splice(0, data["uniqueZ"].length).map(col => `"${col}"`).join(',');
          //  stringified = stringified.replace(/"tworavensUniqueY"/g, "["+data.uniqueY+"]");
            stringified = stringified.replace(/"tworavensColors"/g, "["+$colors+"]");
        }
        if (data.meanY) {
            stringified = stringified.replace(/"tworavensMeanY"/g, data.meanY);
            stringified = stringified.replace(/tworavensMeanY/g, data.meanY); //both needed in this order
        }
        if(data.plottype[0]=="scattermatrix") {
            let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
            stringified = stringified.replace(/"tworavensRow"/g, $matvars);
            stringified = stringified.replace(/"tworavensCol"/g, $matvars);
        }
        if(data.plottype[0]=="binnedcrossfilter") {
            let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
            stringified = stringified.replace(/"tworavensVars"/g, $matvars);
        }

        // VJD: if you enter this console.log into the vega editor https://vega.github.io/editor/#/edited the plot will render
        console.log(stringified);
        return JSON.parse(stringified);
    };

    let myx = [];
    let myy = {};
    let mypn = [];
    let vegajson = {};
    let jsonarr = [];

    if(plotNodes.length===0) {
        myy = app.variableSummaries[problem.targets[0]];
        myx = app.getPredictorVariables(problem).map(predictor => app.variableSummaries[predictor]);
    } else {
        myx[0] = "oneshot"; // necessary to work out the looping
        mypn=plotNodes;
    }

    for(var i=0; i<myx.length; i++) {
        if(plotNodes.length===0) { // note only drawing bivariate plots
            mypn=[myx[i],myy];
        }
        plottype = i>0 ? "" : plottype;
        plottype = getPlotType(plottype,mypn); // VJD: second element in array tags the variables for the plot e.g., qq means quantitative,quantitative; qn means quantitative,nominal
        console.log(mypn);
        let plotvars = getNames(mypn);
        let zd3mdata = app.workspace.datasetUrl;
        let jsonout = {plottype, plotvars, zd3mdata};
        console.log(jsonout);

        // write links to file & run R CMD
        let json = await app.makeRequest(ROOK_SVC_URL + 'plotdataapp', jsonout);
        if (!json) {
            return;
        }

        let schema = plottype[0] === "box" ? box2d :
            plottype[0] === "scatter" ? scatter :
            plottype[0] === "stackedbar" ? stackedbar:
            plottype[0] === "line" ? line:
            plottype[0] === "tableheat" ? tableheat:
            plottype[0] === "groupedbar" ? groupedbar:
            plottype[0] === "strip" ? strip:
            plottype[0] === "aggbar" ? aggbar:
            plottype[0] === "binnedscatter" ? binnedscatter:
            plottype[0] === "step" ? step:
            plottype[0] === "area" ? area:
            plottype[0] === "binnedtableheat" ? binnedtableheat:
            plottype[0] === "averagediff" ? averagediff:
            plottype[0] === "scattermeansd" ? scattermeansd:
            plottype[0] === "scattermatrix" ? scattermatrix:
            plottype[0] === "simplebar" ? simplebar:
            plottype[0] === "histogram" ? histogram:
            plottype[0] === "areauni" ? areauni:
            plottype[0] === "histogrammean" ? histogrammean:
            plottype[0] === "trellishist" ? trellishist:
            plottype[0] === "interactivebarmean" ? interactivebarmean:
            plottype[0] === "dot" ? dot:
            plottype[0] === "horizon" ? horizon:
            plottype[0] === "binnedcrossfilter" ? binnedcrossfilter:
            plottype[0] === "scattertri" ? scattertri:
            plottype[0] === "groupedbartri" ? groupedbartri:
            plottype[0] === "bubbletri" ? bubbletri:
            plottype[0] === "horizgroupbar" ? horizgroupbar:
            plottype[0] === "bubbleqqq" ? bubbleqqq:
            plottype[0] === "scatterqqq" ? scatterqqq:
            plottype[0] === "trellisscatterqqn" ? trellisscatterqqn:
            plottype[0] === "heatmapnnq" ? heatmapnnq:
            plottype[0] === "dotdashqqn" ? dotdashqqn:
            plottype[0] === "tablebubblennq" ? tablebubblennq:
            plottype[0] === "stackedbarnnn" ? stackedbarnnn:
            plottype[0] === "facetbox" ? facetbox:
            plottype[0] === "facetheatmap" ? facetheatmap:
            plottype[0] === "groupedbarnqq" ? groupedbarnqq:
            app.alertError("invalid plot type");
    //    console.log(schema);

        let flip = plotflip(plottype);
        jsonarr[i] = fillVega(json,flip,schema);
    }

    if(jsonarr.length===1) {
        vegajson = jsonarr[0];
    } else {
        vegajson = "{\"vconcat\":[";
        for(var i=0; i<jsonarr.length; i++) {
            vegajson = vegajson + JSON.stringify(jsonarr[i]) + ",";
        }
        vegajson = vegajson.slice(0,-1);
        vegajson = vegajson + "],\"config\":{\"axisY\":{\"minExtent\":30}}}";
        vegajson = JSON.parse(vegajson);
    }
    console.log(vegajson);
    vegaEmbed('#plot', vegajson, {width: 800, height: 600});
}

export function thumbsty(plotNodes, thumb) {

    if (!approps) return {};

    let plottype = getPlotType("",plotNodes);
    if (!plottype) return {};

    return approps[plottype[1]].indexOf(thumb) > -1
        ? {border: "2px solid #0F0", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}
        : {border: "2px solid #F00", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"};
}
