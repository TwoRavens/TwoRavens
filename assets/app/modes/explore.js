import m from "mithril";
import * as d3 from 'd3';
import * as app from '../app';

import aggbar from '../vega-schemas/aggbar.json';
import area from '../vega-schemas/area.json';
import areauni from '../vega-schemas/univariate/areauni.json';
import averagediff from '../vega-schemas/averagediff.json';
import binnedcrossfilter from '../vega-schemas/multi/binnedcrossfilter.json';
import binnedscatter from '../vega-schemas/binnedscatter.json';
import binnedtableheat from '../vega-schemas/binnedtableheat.json';
import box2d from '../vega-schemas/box2d.json';
// import boxplot from '../vega-schemas/univariate/boxplot.json'
import bubbleqqq from '../vega-schemas/trivariate/bubbleqqq.json';
import bubbletri from '../vega-schemas/trivariate/bubbletri.json';
import densityschema from '../vega-schemas/univariate/density'
import dot from '../vega-schemas/univariate/dot.json';
import dotdashqqn from '../vega-schemas/trivariate/dotdashqqn.json';
import facetbox from '../vega-schemas/trivariate/facetbox.json';
import facetheatmap from '../vega-schemas/trivariate/facetheatmap.json';
import groupedbar from '../vega-schemas/groupedbar.json';
import groupedbarnqq from '../vega-schemas/trivariate/groupedbarnqq.json';
import groupedbartri from '../vega-schemas/trivariate/groupedbartri.json';
import heatmapnnq from '../vega-schemas/trivariate/heatmapnnq.json';
import histogram from '../vega-schemas/univariate/histogram.json';
import histogrammean from '../vega-schemas/univariate/histogrammean.json';
import horizgroupbar from '../vega-schemas/trivariate/horizgroupbar.json';
import horizon from '../vega-schemas/horizon.json';
import interactivebarmean from '../vega-schemas/interactivebarmean.json';
import line from '../vega-schemas/line.json';
import scatter from '../vega-schemas/scatter.json';
import scattermatrix from '../vega-schemas/multi/scattermatrix.json';
import scattermeansd from '../vega-schemas/scattermeansd.json';
import scatterqqq from '../vega-schemas/trivariate/scatterqqq.json';
import scattertri from '../vega-schemas/trivariate/scattertri.json';
import simplebar from '../vega-schemas/univariate/simplebar.json';
import stackedbar from '../vega-schemas/stackedbar.json';
import stackedbarnnn from '../vega-schemas/trivariate/stackedbarnnn.json';
import step from '../vega-schemas/step.json';
import strip from '../vega-schemas/strip.json';
import tablebubblennq from '../vega-schemas/trivariate/tablebubblennq.json';
import tableheat from '../vega-schemas/tableheat.json';
import timeseries from '../vega-schemas/timeseries.json';
import timeseriestri from '../vega-schemas/trivariate/timeseriestri.json';
import trellishist from '../vega-schemas/trellishist.json';
import trellisscatterqqn from '../vega-schemas/trivariate/trellisscatterqqn.json';

import * as common from "../../common/common";

import Button from "../../common/views/Button";
import Icon from "../../common/views/Icon";

import * as queryMongo from "../manipulations/queryMongo";
import ButtonRadio from "../../common/views/ButtonRadio";
import Popper from "../../common/views/Popper";
import Paginated from "../../common/views/Paginated";
import PlotVegaLite from "../views/PlotVegaLite";
import TextField from "../../common/views/TextField";
import PlotVegaLiteWrapper from "../views/PlotVegaLiteWrapper";
import {bold, italicize, remove, toggle} from "../utils";
import {
    getAbstractPipeline,
    getCategoricalVariables,
    getPredictorVariables,
    getSelectedProblem, getTargetVariables,
    setSelectedProblem
} from "../problem";

window.timeParse = d3.timeParse;

// adds some padding, sets the size so the content fills nicely in the page
let wrapCanvas = (...contents) => m('div#canvasExplore', {
        style: {
            height: '100%',
            'padding-top': common.panelMargin,
            'max-width': `1058px`,
            margin: 'auto'
        }
    },
    contents
);

let get_node_label = problemOrVariableName => {
    if (explorePreferences.mode === 'problems') {
        let exploreProblem = 'problems' in app.workspace.raven_config && app.workspace.raven_config.problems[problemOrVariableName];
        let predictorVariables = getPredictorVariables(exploreProblem);
        let targetVariables = getTargetVariables(exploreProblem);
        if (targetVariables.length === 0)
            return

        let problemText = predictorVariables
            && [targetVariables.join(','), m(Icon, {
                style: 'margin:.5em;margin-top:.25em',
                name: 'arrow-left'
            }), predictorVariables.join(', ')];
        return problemText ? [m('b', problemOrVariableName), m('p', problemText)] : problemOrVariableName;
    }

    let pos = explorePreferences.variables.indexOf(problemOrVariableName);
    if (pos === -1) return problemOrVariableName;

    let str = pos === 0 ? 'x' :
        pos === 1 ? 'y' :
            pos === 2 ? 'z' :
                String.fromCharCode(pos + 97);
    return `${problemOrVariableName} (${str})`;
};

export class ExploreBoxes {
    view(vnode) {
        let {preferences, summaries} = vnode.attrs;
        let exploreBoxIds = Object.keys(preferences.mode === "problems" ? app.workspace.raven_config.problems : summaries);

        // boxId could either be a problemId or a variable name
        return m(Paginated, {
            data: exploreBoxIds,
            makePage: exploreBoxIds => m('',
                {style: 'display: flex; flex-direction: row; flex-wrap: wrap; margin-top: 3em'}, exploreBoxIds.map(boxId => {
                let selected = preferences.mode === 'problems'
                    ? boxId === selectedProblem.problemId
                    : preferences.variables.includes(boxId);

                let node = summaries[boxId];
                let kind = node?.timeUnit ? 'temporal' :
                    node?.locationUnit ? 'geographic' :
                        null;

                let nodeLabel = get_node_label(boxId);
                if (!nodeLabel)
                    return

                // tile for each variable or problem
                return m('span#exploreNodeBox', {
                        onclick: () => {
                            if (preferences.mode === 'problems') {
                                setSelectedProblem(boxId);
                                preferences.variables = [boxId];
                                return;
                            }

                            toggle(preferences.variables, boxId);
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
                            'background-color': selected ? app.hexToRgba(common.colors.selVar) : common.colors.base
                        }
                    },
                    m('#exploreNodePlot', {
                        oninit() {
                            this.node = summaries[boxId];
                        },
                        oncreate(vnode) {
                            let plot = (this.node || {}).pdfPlotType === 'continuous' ? densityNode : barsNode;
                            this.node && plot(this.node, vnode.dom, 110, true);
                        },
                        onupdate(vnode) {
                            let targetName = preferences.mode === 'problems'
                                ? getTargetVariables(app.workspace.raven_config.problems[boxId])[0]
                                : boxId;
                            let node = summaries[targetName];
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
                        nodeLabel),
                    kind && m('div', m('em', kind))
                );
            })),
            limit: 20,
            page: explorePreferences.variablePage,
            setPage: index => explorePreferences.variablePage = index
        })
    }
}

export class ExploreVariables {
    view(vnode) {
        let {preferences, summaries, callbackGoBack, getData, abstractQuery} = vnode.attrs;

        let getPlotScroller = nodeSummaries => {
            return m('div#explorePlotBar', {
                    style: {
                        'margin-bottom': '1em',
                        position: 'relative'
                    }
                },
                m('div', {
                    style: {
                        'overflow-x': 'scroll',
                        'white-space': 'nowrap',
                        width: '100%',
                    }
                }, getRelevantPlots(nodeSummaries, preferences.mode).map(schemaName => m("figure", {style: 'display: inline-block'}, [
                        m(`img#${schemaName}_img[alt=${schemaName}][height=140px][width=260px][src=/static/images/${schemaName}.png]`, {
                            onclick: () => preferences.schemaName = schemaName,
                            style: getThumbnailStyle(nodeSummaries, schemaName)
                        }),
                        m("figcaption",
                            {style: {"text-align": "center"}},
                            schemaName === preferences.schemaName ? bold(plotMap[schemaName]) : plotMap[schemaName])
                    ])
                )),
                m('div', {
                    style: {
                        'position': 'absolute',
                        'width': '100%',
                        'height': '100%',
                        'box-shadow': 'inset -10px 0 10px -10px #333, inset 10px 0 10px -10px #333',
                        'top': '0',
                        'left': '0', 'pointer-events': 'none'
                    }
                }))
        }

        let getPlot = () => {

            if (preferences.mode === "problems") {
                let predictors = getPredictorVariables(selectedProblem);
                let targets = getTargetVariables(selectedProblem);
                if (predictors.length === 0)
                    return "No predictors are selected. Please select some predictors."

                if (!targets.includes(preferences.target))
                    preferences.target = targets[0]
                if (!preferences.target)
                    return "No targets are selected. Please select a target."

                let nodeSummaries = [
                    summaries[predictors[0]],
                    summaries[preferences.target]
                ];
                let relevantPlots = getRelevantPlots(nodeSummaries, preferences.mode);
                if (!relevantPlots.includes(preferences.schemaName) || !getIsRecommended(nodeSummaries, preferences.schemaName)) {
                    preferences.schemaName = relevantPlots[0];
                }

                let specification = getPlotSpecification(preferences, summaries, abstractQuery, getData);

                let exploreContent = [];

                if (targets.length > 1) exploreContent.push(
                    m('div', {style: {display: 'inline-block'}}, bold("Target:")),
                    m(ButtonRadio, {
                        id: 'exploreTargetButtonRadio',
                        title: 'select target variable',
                        sections: targets.map(target => ({value: target})),
                        activeSection: preferences.target,
                        onclick: target => preferences.target = target,
                        attrsAll: {style: {width: 'auto', margin: '1em'}},
                        attrsButtons: {style: {width: 'auto'}}
                    }))

                exploreContent.push(
                    getPlotScroller(nodeSummaries),
                    m(Paginated, {
                        data: predictors,
                        makePage: () => exploreCache.specificationIsLoading
                            ? [italicize("Loading data exploration."), common.loader('explore')]
                            : specification && m('[style=display:block;height:500px]',
                            italicize(specification.annotation),
                            m(PlotVegaLite, {specification})),
                        limit: preferences.pageLength,
                        page: preferences.page,
                        setPage: index => preferences.page = index
                    }));

                return exploreContent
            }

            if (preferences.variables.length === 0) return;
            let nodeSummaries = preferences.variables.map(variable => summaries[variable]);
            // clear out old state if not relevant
            let relevantPlots = getRelevantPlots(nodeSummaries, preferences.mode);
            if (!(relevantPlots.includes(preferences.schemaName)) || !getIsRecommended(nodeSummaries, preferences.schemaName)) {
                preferences.schemaName = relevantPlots[0];
            }
            let specification = getPlotSpecification(preferences, summaries, abstractQuery, getData);

            return m('div',
                getPlotScroller(nodeSummaries),
                exploreCache.specificationIsLoading
                    ? [italicize("Loading data exploration."), common.loader('explore')]
                    : specification && m('[style=display:block;height:500px]',
                    italicize(specification.annotation),
                    m(PlotVegaLite, {specification}))
            );
        };

        if (['variables', 'problems'].includes(preferences.mode)) return wrapCanvas(
            m(Button, {
                    class: 'btn-secondary',
                    onclick: callbackGoBack,
                    style: {margin: '.5em'}
                },
                m(Icon, {name: 'chevron-left', style: 'margin-right:.5em;transform:scale(1.5)'}),
                'back to variables'),
            m('br'),
            getPlot()
        );
    }
}

export class CanvasExplore {
    view(vnode) {
        let {exploreMode, variables} = vnode.attrs;

        if (exploreMode === 'variables') {
            explorePreferences.go = true;
            explorePreferences.mode = exploreMode;
            explorePreferences.variables = variables;
        } else if (exploreMode === 'problems') {
            explorePreferences.go = true;
            explorePreferences.mode = exploreMode;
        } else if (exploreMode === 'custom') {
            explorePreferences.go = true;
            explorePreferences.mode = exploreMode;
        } else {
            explorePreferences.go = false;
        }

        let selectedProblem = getSelectedProblem();

        if (!explorePreferences.go) return [wrapCanvas(
            m(ButtonRadio, {
                id: 'problemVariateButtonRadio',
                attrsAll: {style: {width: '330px', margin: '.5em', position: 'fixed'}},
                activeSection: explorePreferences.mode,
                onclick: value => explorePreferences.mode = value.toLowerCase(),
                sections: [
                    {value: 'Variables'},
                    {value: 'Problems'},
                    {value: 'Custom'},
                    {value: 'Mapping'}
                ]
            }),
            !['custom', 'mapping'].includes(explorePreferences.mode) && m(Button, {
                id: 'exploreGo',
                class: 'btn-success',
                style: {margin: '.5em', 'margin-left': 'calc(330px + 1.5em)', position: 'fixed'},
                onclick: () => {
                    let selected = explorePreferences.mode === 'problems'
                        ? [app.workspace.raven_config.selectedProblem]
                        : explorePreferences.variables;
                    if (selected.length === 0) return;

                    // behavioral logging
                    let logParams = {
                        feature_id: 'EXPLORE_MAKE_PLOTS',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_SEARCH',
                        other: {selected}
                    };
                    app.saveSystemLogEntry(logParams);

                    m.route.set(`/explore/${explorePreferences.mode}/${selected.join('/')}`);
                }
            }, 'go'),

            m('div', {
                    style: {
                        'margin-left': 'calc(460px + 1.5em)',
                        'margin-top': '0.5em',
                        position: 'fixed',
                        background: common.colors.lightGray,
                        'border-radius': '3px',
                        'box-shadow': '1px 1px 4px rgba(0, 0, 0, 0.4)'
                    }
                },
                m('div', {style: {display: 'inline-block'}}, m(Popper, {
                    content: () => explorePreferences.recordLimit ? `Up to ${explorePreferences.recordLimit} records are sampled from the dataset (after aggregating).` : 'An unlimited number of records are included in the plots.'
                }, m('label', {style: {margin: '0 1em'}}, bold('Record Limit')))),
                m(TextField, {
                    id: 'recordLimit',
                    value: explorePreferences.recordLimit || '',
                    oninput: value => explorePreferences.recordLimit = value.replace(/[^\d.-]/g, ''),
                    onblur: value => explorePreferences.recordLimit = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined,
                    style: {margin: 0, width: "200px", display: 'inline-block'}
                })),

            m('br'),
            !['custom', 'mapping'].includes(explorePreferences.mode) && m(ExploreBoxes, {
                    preferences: explorePreferences,
                    summaries: app.variableSummaries,
                })
        ),
            explorePreferences.mode === 'mapping' && m('div', {
                    style: {
                        position: 'absolute', width: '100%', top: '5.5em', bottom: 0, 'border-top': common.colors.border
                    }
                },
                m(PlotVegaLiteWrapper, {
                    mapping: true,
                    getData: app.getData,
                    categoricals: new Set(getCategoricalVariables(selectedProblem)),
                    configuration: mappingConfiguration,
                    abstractQuery: getAbstractPipeline(selectedProblem, true),
                    summaries: app.variableSummaries,
                    setSummaryAttr: app.setVariableSummaryAttr,
                    sampleSize: parseInt(explorePreferences.recordLimit),
                    variablesInitial: app.workspace.raven_config.variablesInitial,
                    initViewport: mappingConfiguration.initViewport,
                    setInitViewport: value => mappingConfiguration.initViewport = value
                })),
            explorePreferences.mode === 'custom' && m('div', {
                    style: {
                        position: 'absolute', width: '100%', top: '5.5em', bottom: 0, 'border-top': common.colors.border
                    }
                },
                m(PlotVegaLiteWrapper, {
                    getData: app.getData,
                    categoricals: new Set(getCategoricalVariables(selectedProblem)),
                    configuration: customConfiguration,
                    abstractQuery: getAbstractPipeline(selectedProblem, true),
                    summaries: app.variableSummaries,
                    setSummaryAttr: app.setVariableSummaryAttr,
                    sampleSize: parseInt(explorePreferences.recordLimit),
                    variablesInitial: app.workspace.raven_config.variablesInitial
                })
            )
        ];

        return m(ExploreVariables, {
            preferences: explorePreferences,
            summaries: app.variableSummaries,
            callbackGoBack: () => {
                m.route.set('/explore');
                setTimeout(m.redraw, 20)
            },
            abstractQuery: getAbstractPipeline(selectedProblem, true),
            getData: app.getData,
        });
    }
}

export let getRelevantPlots = (nodeSummaries, mode) => {
    let variate = mode === 'problems' ? 'bivariate' : ({
        1: 'univariate', 2: 'bivariate', 3: 'trivariate'
    })[nodeSummaries.length] || 'multivariate';
    let filtered = variateSchemas[variate];
    if (variate === 'bivariate' || variate === 'trivariate')
        filtered = `${filtered} ${variateSchemas.multivariate}`;

    let plotGroups = {
        'recommended': [],
        'unknown': [],
        'discouraged': []
    };
    filtered.split(' ').forEach(schemaName => {
        let isRecommended = getIsRecommended(nodeSummaries, schemaName);
        plotGroups[isRecommended === undefined ? 'unknown' : isRecommended ? 'recommended' : 'discouraged'].push(schemaName)
    });

    // MIKE: the plot returned by inferPlotType is always moved to the front
    let finalOrder = Object.values(plotGroups).flatMap(_ => _);
    let bestPlot = inferPlotType(nodeSummaries)[0];
    remove(finalOrder, bestPlot);
    finalOrder.unshift(bestPlot);
    return finalOrder;
};

let plotMap = {
    aggbar: "Aggregate Bar",
    area: "Area Chart",
    areauni: "Area Chart Uni",
    averagediff: "Diff. from Avg.",
    binnedcrossfilter: "Binned Cross Filter",
    binnedscatter: "Binned Scatter",
    binnedtableheat: "Binned Heatmap",
    box: "Box Plot",
    bubbleqqq: "Bubble Plot with Binned Groups",
    bubbletri: "Bubble Plot with Groups",
    density: "Density Plot",
    dot: "Simple Dot Plot",
    dotdashqqn: "Dot-dash Plot",
    facetbox: "Faceted Box Plot",
    facetheatmap: "Faceted Heatmap",
    groupedbar: "Grouped Bar",
    groupedbarnqq: "Grouped Bar with Binned Z",
    groupedbartri: "Grouped Bar",
    heatmapnnq: "Heatmap with Mean Z",
    histogram: "Histogram Uni",
    histogrammean: "Histogram with Mean Uni",
    horizgroupbar: "Horizontal Grouped Bar",
    horizon: "Horizon Plot",
    interactivebarmean: "Interactive Bar with Mean",
    line: "Line Chart",
    scatter: "Scatter Plot",
    scattermatrix: "Scatter Matrix",
    scattermeansd: "Scatter with Overlays",
    scatterqqq: "Interactive Scatterplot with Binned Groups",
    scattertri: "Scatterplot with Groups",
    simplebar: "Simple Bar Uni",
    stackedbar: "Stacked Bar",
    stackedbarnnn: "Stacked Bar Plot",
    step: "Step Chart",
    strip: "Strip Plot",
    tablebubblennq: "Table Bubble Plot",
    tableheat: "Heatmap",
    timeseries: "Timeseries",
    timeseriestri: "Timeseries with Groups",
    trellishist: "Histogram Trellis",
    trellisscatterqqn: "Scatterplot Trellis",
};

let schemaMap = {
    aggbar: aggbar,
    area: area,
    areauni: areauni,
    averagediff: averagediff,
    binnedcrossfilter: binnedcrossfilter,
    binnedscatter: binnedscatter,
    binnedtableheat: binnedtableheat,
    box: box2d,
    bubbleqqq: bubbleqqq,
    bubbletri: bubbletri,
    density: densityschema,
    dot: dot,
    dotdashqqn: dotdashqqn,
    facetbox: facetbox,
    facetheatmap: facetheatmap,
    groupedbar: groupedbar,
    groupedbarnqq: groupedbarnqq,
    groupedbartri: groupedbartri,
    heatmapnnq: heatmapnnq,
    histogram: histogram,
    histogrammean: histogrammean,
    horizgroupbar: horizgroupbar,
    horizon: horizon,
    interactivebarmean: interactivebarmean,
    line: line,
    scatter: scatter,
    scattermatrix: scattermatrix,
    scattermeansd: scattermeansd,
    scatterqqq: scatterqqq,
    scattertri: scattertri,
    simplebar: simplebar,
    stackedbar: stackedbar,
    stackedbarnnn: stackedbarnnn,
    step: step,
    strip: strip,
    tablebubblennq: tablebubblennq,
    tableheat: tableheat,
    timeseries: timeseries,
    timeseriestri: timeseriestri,
    trellishist: trellishist,
    trellisscatterqqn: trellisscatterqqn,
};

let variateSchemas = {
    univariate: 'density histogram histogrammean dot areauni simplebar',
    bivariate: 'scatter box tableheat binnedtableheat aggbar area averagediff binnedscatter ' +
        'groupedbar horizon interactivebarmean line scattermatrix ' +
        'scattermeansd stackedbar step strip trellishist timeseries',
    trivariate: 'bubbletri groupedbartri horizgroupbar scattertri bubbleqqq ' +
        'scatterqqq trellisscatterqqn heatmapnnq dotdashqqn tablebubblennq ' +
        'stackedbarnnn facetbox facetheatmap groupedbarnqq timeseriestri',
    multivariate: 'binnedcrossfilter scattermatrix'
};

let appropriateSchemas = {
    q: ["density", "histogram", "histogrammean", "dot", "areauni", "simplebar"],
    n: ["simplebar"],
    qq: ["scatter", "line", "area", "binnedscatter", "binnedtableheat", "horizon", "scattermatrix", "scattermeansd", "step", "timeseries"],
    nn: ["tableheat", "stackedbar"],
    nq: ["box", "interactivebarmean", "timeseries"],
    qn: ["box", "aggbar", "strip", "trellishist", "timeseries"],
    qqq: ["bubbleqqq", "scatterqqq", "scattermatrix"],
    qnn: ["horizgroupbar", "facetbox"],
    qqn: ["scattertri", "trellisscatterqqn", "dotdashqqn"],
    qnq: ["bubbletri"],
    nqn: ["groupedbartri", "facetbox", "timeseriestri"],
    nqq: ["groupedbarnqq"],
    nnq: ["heatmapnnq", "tablebubblennq"],
    nnn: ["stackedbarnnn", "facetheatmap"]
};

// nodeSummaries: Vec<VariableSummary>, summaries for each data channel
// schemaName: string, optional
let inferPlotType = (nodeSummaries, schemaName) => {

    if (nodeSummaries.length > 3) return ['scattermatrix', 'aaa'];

    // 'q' for quantitative, 'n' for nominal, 'a' for any
    let natures = nodeSummaries
        .map(summary => (summary.pdfPlotType === 'continuous') ? 'q' : 'n')
        .join("");

    if (schemaName) return [schemaName, natures];

    if (nodeSummaries.length === 1) {
        return [{
            q: 'density',
            n: 'simplebar'
        }[natures], natures]
    }

    let isTemporal = !!nodeSummaries[0].timeUnit;

    if (nodeSummaries.length === 2) {
        if (isTemporal)
            return ['timeseries', natures[0] + 'n'];

        // returns true if uniques is equal to, one less than, or two less than the number of valid observations
        let getIsIndex = summary => {
            let duplicates = summary.validCount - summary.uniqueCount;
            return 0 < duplicates && duplicates <= 2;
        }

        // check if each variable is an index column. if so, make difference from mean the default plot
        let isIndex = nodeSummaries.map(getIsIndex);
        if (isIndex[0] && !isIndex[1])
            return ['averagediff', 'nq'];
        else if (!isIndex[0] && isIndex[1])
            return ['averagediff', 'qn'];

        return [{
            qq: 'scatter',
            nq: 'box',
            qn: 'box',
            nn: 'tableheat'
        }[natures] || 'tableheat', natures]
    }

    if (nodeSummaries.length === 3) {
        if (isTemporal)
            return ['timeseriestri', natures.substring(0, 2) + 'n'];

        return [{
            qqq: 'bubbleqqq',
            qqn: 'scattertri',
            qnq: 'bubbletri',
            qnn: 'horizgroupbar',
            nqq: 'groupedbarnqq',
            nqn: 'groupedbartri',
            nnq: 'heatmapnnq',
            nnn: 'stackedbarnnn'
        }[natures] || 'scattermatrix', natures]
    }
};


const colors = [
    "#e6194b", "#3cb44b", "#ffe119", "#0082c8", "#f58231", "#911eb4", "#46f0f0",
    "#f032e6", "#d2f53c", "#fabebe", "#008080", "#e6beff", "#aa6e28", "#fffac8",
    "#800000", "#aaffc3", "#808000", "#ffd8b1", "#000080", "#808080"
];

// function to fill in the contents of the vega schema.
let fillVegaSchema = (schema, data, flip) => {
    let [schemaName, natures] = data.plottype;

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

    // vega treats periods and brackets as indexing into structures unless they are escaped
    // unfortunately, vega still shows the escape characters. Annoying bug, obvious fix, lots of work
    data.varsRenamed = data.vars.map(variable => variable
        .replace(".", "\\\\.")
        .replace("[", "\\\\[")
        .replace("]", "\\\\]"))

    if (data["vars"].length > 1) {
        stringified = stringified.replace(/tworavensY/g, data.varsRenamed[1]);
    }
    if (data["vars"].length > 2) {
        stringified = stringified.replace(/tworavensZ/g, data.varsRenamed[2]);
    }
    if (data["vars"].length > 1) {
        stringified = stringified.replace(/tworavensY/g, data.varsRenamed[1]);
    }
    if (data["vars"].length > 2) {
        stringified = stringified.replace(/tworavensZ/g, data.varsRenamed[2]);
    }
    stringified = stringified.replace(/tworavensX/g, data.varsRenamed[0]);
    stringified = stringified.replace(/"tworavensFilter"/g, null);
    stringified = stringified.replace("url", "values");
    stringified = stringified.replace('"tworavensData"', data.plotdata[0]);

    if (data.uniqueY) {
        let $colors = colors.splice(0, data["uniqueY"].length).map(col => `"${col}"`).join(',');
        let $uniques = data["uniqueY"].map(uni => `"${uni}"`).join(',');
        stringified = stringified.replace(/"tworavensUniqueY"/g, "[" + $uniques + "]");
        stringified = stringified.replace(/"tworavensColors"/g, "[" + $colors + "]");
    }
    if (schemaName === "groupedbartri") {
        let $colors = colors.splice(0, data["uniqueZ"].length).map(col => `"${col}"`).join(',');
        //  stringified = stringified.replace(/"tworavensUniqueY"/g, "["+data.uniqueY+"]");
        stringified = stringified.replace(/"tworavensColors"/g, "[" + $colors + "]");
    }
    if (data.meanY) {
        stringified = stringified.replace(/"tworavensMeanY"/g, data.meanY);
        stringified = stringified.replace(/tworavensMeanY/g, data.meanY); //both needed in this order
    }
    if (schemaName === "scattermatrix") {
        let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
        stringified = stringified.replace(/"tworavensRow"/g, $matvars);
        stringified = stringified.replace(/"tworavensCol"/g, $matvars);
    }
    if (schemaName === "binnedcrossfilter") {
        let $matvars = data["vars"].map(myvar => `"${myvar}"`).join(',');
        stringified = stringified.replace(/"tworavensVars"/g, $matvars);
    }

    // behavioral logging
    let logParams = {
        feature_id: 'EXPLORE_VIEW_PLOT',
        activity_l1: 'DATA_PREPARATION',
        activity_l2: 'DATA_EXPLORE',
        other: {plottype: [schemaName, natures]}
    };
    app.saveSystemLogEntry(logParams);

    // VJD: if you enter this console.log into the vega editor https://vega.github.io/editor/#/edited the plot will render
    // console.log(stringified);

    console.log(stringified)
    return JSON.parse(stringified);
};

let defaultRecordLimit = 5000;
let customConfiguration = {};
window.customConfiguration = customConfiguration;
let mappingConfiguration = {
    channels: [
        {name: 'color'},
        {name: 'opacity'},
        {name: 'tooltip'}
    ]
};
window.mappingConfiguration = mappingConfiguration;
export let explorePreferences = {
    go: false,
    mode: 'variables',
    recordLimit: defaultRecordLimit,
    schemaName: undefined,
    variables: [],
    variablePage: 0,
    page: 0,
    pageLength: 5,
    target: undefined
}
window.explorePreferences = explorePreferences;

let exploreCache = {
    id: undefined,
    // the specification of the vega-lite plot currently shown on the page
    specification: undefined,
    // used to block duplicate requests for updating the plot
    specificationIsLoading: false
}

function getPlotSpecification(preferences, summaries, abstractQuery, getData) {
    // update and kick off changes to internal state
    loadPlotSpecification(preferences, summaries, abstractQuery, getData)
    // if preferences have changed, then this will return undefined until loaded
    return exploreCache.specification
}

export async function loadPlotSpecification(preferences, summaries, abstractQuery, getData) {

    let problem = getSelectedProblem();

    let pendingId = JSON.stringify(Object.assign({
        manipulations: getAbstractPipeline(problem, true)
    }, preferences));

    // data is already current
    if (pendingId === exploreCache.id)
        return

    exploreCache.specification = undefined;
    exploreCache.id = pendingId;

    // data is already being loaded
    if (exploreCache.specificationIsLoading)
        return

    exploreCache.specificationIsLoading = true;

    // ~~~~ begin building the plot specification
    let {mode, variables, schemaName} = preferences;

    // function returns whether to flip a plot. for example, if plot expects 'nq' and users gives 'qn', flip should return true. this may have to be generalized for 3+ dimension plots
    let plotflip = (pt) => {
        return pt[0] === "box" && pt[1] === "qn" ? true :
            pt[0] === "facetbox" && pt[1] === "qnn" ? true :
                pt[0] === "averagediff" && pt[1] === "nq";
    };

    let facetSummaries;

    if (mode === 'problems') {
        let targets = getTargetVariables(problem);
        if (preferences.pageLength * (preferences.page - 1) > getPredictorVariables(problem).length)
            preferences.page = 0

        if (!(preferences.target in targets))
            preferences.target = targets[0];

        facetSummaries = getPredictorVariables(problem).map(predictor => [
            summaries[predictor],
            summaries[preferences.target]
        ]).splice(preferences.page * preferences.pageLength, preferences.pageLength).filter(_ => _)
    } else {
        facetSummaries = [variables.map(variable => summaries[variable])]
    }

    // build vega-lite specifications for every facet
    let facetSpecifications = [];
    await Promise.all(facetSummaries.map(async (nodeSummaries, i) => {

        // VJD: second element in array tags the variables for the plot e.g., qq means quantitative,quantitative; qn means quantitative,nominal
        let plotType = inferPlotType(nodeSummaries, schemaName);

        let nodeNames = nodeSummaries.map(i => i?.name);

        let {pipeline: compiled, datasets} = queryMongo.buildPipeline(
            [
                ...abstractQuery,
                {
                    type: 'menu',
                    metadata: {
                        type: 'data',
                        variables: nodeNames,
                        dropNA: nodeNames,
                        sample: parseInt(preferences.recordLimit) || defaultRecordLimit
                    }
                }
            ],
            app.workspace.raven_config.variablesInitial);

        console.log(datasets);
        let dataPathSampled = await getData({
            method: 'aggregate',
            query: JSON.stringify(compiled),
            export: 'csv',
            datasets
        });

        let jsonout = {plottype: plotType, zd3mdata: dataPathSampled};
        let response = await m.request(ROOK_SVC_URL + 'plotData.app', {method: 'POST', body: jsonout});
        if (!response.success) {
            console.warn(response);
            return;
        }
        let json = response.data;

        console.log('Explore data:');
        console.log(compiled, json);
        if (plotType[0].includes('timeseries')) {
            let plotdata = JSON.parse(json.plotdata[0]);
            let temporalVariables = Object.values(summaries)
                .filter(summary => summary.timeUnit)
                .map(summary => summary.name)
                .filter(variable => variables.includes(variable))

            let parsers = temporalVariables.reduce((out, variable) => {
                let format = summaries[variable].timeUnit
                return Object.assign(out, {
                    [variable]: format
                        ? d3.timeParse(format)
                        : _ => _ // text => new Date(Date.parse(text))
                })
            }, {})

            if (temporalVariables.length > 0) {
                try {
                    temporalVariables.forEach(variable => plotdata
                        .forEach(obs => obs[variable] = parsers[variable](obs[variable]).toString()));
                    json.plotdata = [JSON.stringify(plotdata)];
                } catch (_) {
                }
            }
        }

        let schema = schemaMap[plotType[0]];
        if (!schema) app.alertError("invalid plot type");
        // console.log(schema);
        let flip = plotflip(plotType);
        json.vars = nodeNames;
        facetSpecifications[i] = fillVegaSchema(schema, json, flip);
    }));

    // requested plot may have changed while waiting for response
    if (exploreCache.id !== pendingId)
        return;

    exploreCache.specification = facetSpecifications.length === 1
        ? facetSpecifications[0]
        : {vconcat: facetSpecifications, config: {axisY: {minExtent: 30}}};
    exploreCache.specificationIsLoading = false;
    m.redraw();
}

function getThumbnailStyle(nodeSummaries, schemaName) {

    let isRecommended = getIsRecommended(nodeSummaries, schemaName);
    if (isRecommended === undefined) return {};

    let styling = {
        "border-radius": "3px",
        padding: "5px",
        margin: "3%", cursor: "pointer"
    };

    styling.border = isRecommended
        ? "2px solid " + common.colors.success
        : "2px solid " + common.colors.error;

    return styling;
}

function getIsRecommended(nodeSummaries, schemaName) {
    let plotType = inferPlotType(nodeSummaries);
    if (!plotType) return;

    return (appropriateSchemas[plotType[1]] || []).includes(schemaName);
}

// prefer using vegaLite going forward

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
        .attr("fill", common.colors.d3);
}

export function barsNode(node, obj, radius, explore) {

    d3.select(obj).selectAll("svg").remove();

    // Histogram spacing
    var barPadding = .015; // Space between bars
    var topScale = 1.2; // Multiplicative factor to assign space at top within graph - currently removed from implementation

    // Data
    var keys = Object.keys(node.plotValues);
    var yVals = [];
    var xVals = [];
    var yValKey = [];

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
        .attr("x", (d, i) => x(xVals[i] - 0.5 + barPadding))
        .attr("y", d => y(maxY - d))
        .attr("width", x(minX + 0.5 - 2 * barPadding)) // the "width" is the coordinate of the end of the first bar
        .attr("height", y)
        .attr("fill", common.colors.d3);
}
