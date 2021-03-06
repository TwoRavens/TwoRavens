import m from 'mithril';

import * as app from "../app";
import * as plots from "../plots";
import * as utils from "../utils";

import * as solverWrapped from '../solvers/wrapped';
import * as solverD3M from '../solvers/d3m';

import * as queryMongo from "../manipulations/queryMongo";
import * as manipulate from "../manipulations/manipulate";

import * as common from "../../common/common";
import Table from "../../common/views/Table";
import Dropdown from "../../common/views/Dropdown";
import Panel from "../../common/views/Panel";
import Subpanel from "../../common/views/Subpanel";
import MenuHeaders from "../../common/views/MenuHeaders";
import Button from "../../common/views/Button";
import Icon from "../../common/views/Icon";
import Popper from '../../common/views/Popper';
import MenuTabbed from "../../common/views/MenuTabbed";
import ModalVanilla from "../../common/views/ModalVanilla";
import Paginated from "../../common/views/Paginated";
import TextField from "../../common/views/TextField";
import ButtonRadio from "../../common/views/ButtonRadio";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";
import Slider from "../../common/views/slider";

import PlotVegaLite from "../views/PlotVegaLite";
import ConfusionMatrix from "../views/ConfusionMatrix";
import Flowchart from "../views/Flowchart";
import ModelInterpretation from "../views/ModelInterpretation";

import {
    getAbstractPipeline,
    getDescription,
    getNominalVariables,
    getOrderingTimeUnit,
    getOrderingVariable,
    getPredictorVariables,
    getSelectedProblem,
    getSubtask,
    getTargetVariables,
    setSelectedProblem
} from "../problem";
import {preparePanels} from "../views/PlotVegaLiteWrapper";
import {ExploreBoxes, explorePreferences, ExploreVariables} from "./explore";
import Checkbox from "../../common/views/Checkbox";


/**
 * Solution
 * @typedef {Object} Solution
 * @member {Object} [all_parameters]
 * @member {string} description
 * @member {string} name
 * @member {Produce[]} [produce]
 * @member {Score[]} scores
 * @member {string} searchId
 * @member {string} solutionId
 * @member {string} systemId
 */

/**
 * Produce
 * @typedef {Object} Produce
 * @member {Object} configuration - auxiliary parameters to produce, like predict_type ("RAW" or "PROBABILITIES")
 * @member {string} data_pointer - path to the data
 * @member {Object} input - input dataset name and path
 */

/**
 * Score
 * // TODO: include scoring configuration
 * @typedef {Object} Score
 * @member {Object} metric - metric name, k, positive class, etc
 * @member {string} target
 * @member {number} value
 */

// these variables hold indices, predictors, predicted and actual data
export let resultsCache = {};
let buildProblemResultsCache = () => ({
    // specific to problem, solution and target, all solutions stored for one target
    fittedVsActual: {},
    fittedVsActualLoading: {},

    // specific to problem, solution and target, all solutions stored for one target
    confusion: {},
    confusionLoading: {},

    // cached data for forecasting, per data split
    dataSample: {},
    dataSampleLoading: {},
    dataSampleIndices: {},
    fitted: {},
    fittedLoading: {},

    // cached data is specific to the split
    boundaryImagePathsLoading: {},
    boundaryImagePaths: {},

    // specific to solution and target, one solution stored for one target (tends to be larger)
    interpretationEFD: undefined,
    interpretationEFDLoading: false,

    // this has melted data for both actual and fitted values
    // specific to solution and target, all solutions stored for one target
    interpretationPartialsFitted: {},
    interpretationPartialsFittedLoading: {},

    // this has melted data for both actual and fitted values
    // specific to combo of solution, predictor and target
    interpretationICEFitted: {},
    interpretationICEFittedLoading: {},

    importanceScores: {},
    importanceScoresLoading: {},

    datasetSchemaPaths: {},
    datasetPaths: {},
    datasetIndexPartialsPaths: {},
    datasetPathsLoading: {},

    producePaths: {},
    producePathsLoading: {},

    levels: undefined,
    domains: undefined,
    domainsLoading: false,

    id: {
        query: JSON.stringify(resultsQuery),
        solutionId: undefined,
        dataSplit: undefined,
        target: undefined
    }
});
window.resultsCache = resultsCache;

// Results UI state
export let resultsPreferences = {
    interpretationMode: 'EFD',
    predictor: undefined,
    target: undefined,
    factor: undefined,
    plotScores: 'all',
    selectedMetric: undefined,
    timeSeriesPlotConfig: undefined,
    dataSplit: 'test',
    recordLimit: 10000,
    crossSection: 'unset',
    crossSectionTemp: 'unset',
    imagePage: 0,
    upload: {},
    explore: {
        go: false,
        mode: 'variables',
        recordLimit: 5000,
        variables: [],
        schemaName: undefined
    }
};
window.resultsPreferences = resultsPreferences;

export let leftpanel = () => {

    let ravenConfig = app.workspace.raven_config;

    let selectedProblem = getSelectedProblem();
    if (!selectedProblem.results) selectedProblem.results = {};

    let comparableProblems = [selectedProblem, ...getComparableProblems(selectedProblem)];

    let solverSystems = getSystemAdapters(selectedProblem);

    // left panel, right tab
    let resultsContent = [
        m('div', {style: {display: 'inline-block', margin: '1em'}},
            m('h4', `${ravenConfig.selectedProblem} for `, m('div[style=display:inline-block]', m(Dropdown, {
                id: 'targetDropdown',
                items: getTargetVariables(selectedProblem),
                activeItem: resultsPreferences.target,
                onclickChild: value => resultsPreferences.target = value,
                style: {'margin-left': '1em'}
            })), ' on data split ', m('div[style=display:inline-block]', m(Dropdown, {
                id: 'dataSplitDropdown',
                items: ['all']
                    .concat(selectedProblem.splitOptions.outOfSampleSplit ? ['test', 'train'] : [])
                    .concat(Object.values(customDatasets).map(dataset => dataset.name)),
                activeItem: resultsPreferences.dataSplit,
                onclickChild: value => {
                    app.resetPeek();
                    resultsPreferences.dataSplit = value
                },
                style: {'margin-left': '1em'}
            }))),
        ),

        m(MenuHeaders, {
            id: 'pipelineMenu',
            sections: [
                {
                    idSuffix: 'trainOptions',
                    value: 'Train Options',
                    contents: m('div', {style: {width: '80%', margin: '0px 10%'}},

                        m('label', 'Approximate time bound for overall pipeline search, in minutes.'), //Leave empty for unlimited time.
                        m(Popper, {
                            content: () => ['minutes', m(TextField, {
                                id: 'timeBoundOption',
                                value: selectedProblem.searchOptions.timeBoundSearch || '',
                                disabled: selectedProblem.system === 'solved',
                                oninput: selectedProblem.system !== 'solved' && (value => selectedProblem.searchOptions.timeBoundSearch = value.replace(/[^\d.-]/g, '')),
                                onblur: selectedProblem.system !== 'solved' && (value => selectedProblem.searchOptions.timeBoundSearch = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                                style: {'margin-bottom': '1em'}
                            })]
                        }, m(Slider, {
                            min: Math.log(5) * 10000,
                            max: Math.log(60 * 24 * 7) * 10000 + 1,
                            style: {width: '100%'},
                            value: Math.log(selectedProblem.searchOptions.timeBoundSearch || 15) * 10000,
                            oninput: value => {
                                let minutes = Math.round(Math.exp(value / 10000));
                                if (minutes < 60) minutes = Math.round(minutes / 5) * 5;
                                if (60 < minutes && minutes < 60 * 6) minutes = Math.round(minutes / 15) * 15;
                                if (60 * 6 < minutes && minutes < 60 * 12) minutes = Math.round(minutes / 30) * 30;
                                if (60 * 12 < minutes && minutes < 60 * 24) minutes = Math.round(minutes / 60) * 60;
                                if (60 * 24 < minutes) minutes = Math.round(minutes / (60 * 24)) * 60 * 24;
                                selectedProblem.searchOptions.timeBoundSearch = minutes;
                            }
                        })),
                        utils.minutesToString(selectedProblem.searchOptions.timeBoundSearch || 15),
                        // m('br'), m('br'),
                        //
                        // m('label', 'Maximum record count per data split.'),
                        // m(Popper, {
                        //     content: () => m(TextField, {
                        //         id: 'maxRecordCountOption',
                        //         disabled: selectedProblem.system === 'solved',
                        //         value: selectedProblem.splitOptions.maxRecordCount || '',
                        //         oninput: selectedProblem.system !== 'solved' && (value => selectedProblem.splitOptions.maxRecordCount = value.replace(/[^\d.-]/g, '')),
                        //         onblur: selectedProblem.system !== 'solved' && (value => selectedProblem.splitOptions.maxRecordCount = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                        //         style: {'margin-bottom': '1em'}
                        //     }),
                        // }, m(Slider, {
                        //     min: 1,
                        //     max: Math.min(manipulate.totalSubsetRecords || Infinity, 50000),
                        //     style: {width: '100%'},
                        //     value: selectedProblem.splitOptions.maxRecordCount || 10000,
                        //     oninput: value => selectedProblem.splitOptions.maxRecordCount = value
                        // })),
                        // selectedProblem.splitOptions.maxRecordCount + " records"
                    )
                },
                {
                    idSuffix: 'solvers',
                    value: 'Solvers',
                    contents: m(Table, {
                        id: 'solverTable',
                        data: Object.keys(solverSystems).map(systemId => ({
                            solver: systemId,
                            action: m(Button, {
                                class: 'btn-sm',
                                onclick: () => solverSystems[systemId].solve(),
                                disabled: !!selectedProblem.results.solverState?.[systemId]?.thinking
                            }, !!selectedProblem.results.solverState?.[systemId]?.thinking ? 'Solving' : 'Solve'),
                            state: selectedProblem.results.solverState?.[systemId] && m('',
                                m('div[style=font-size:medium;margin-right:1em;display:inline-block]',
                                    selectedProblem.results.solverState?.[systemId]?.message),
                                selectedProblem.results.solverState[systemId].thinking && [
                                    common.loaderSmall(systemId),
                                    m(Button, {
                                        style: 'margin-left: 1em',
                                        title: 'end the search',
                                        class: 'btn-sm',
                                        onclick: () => {
                                            // User clicks the 'Stop' button next to a particular solver

                                            // behavioral logging
                                            let logParams = {
                                                feature_id: 'RESULTS_STOP_PROBLEM_SEARCH',
                                                activity_l1: 'MODEL_SELECTION',
                                                activity_l2: 'PROBLEM_SEARCH_SELECTION'
                                            };
                                            app.saveSystemLogEntry(logParams);

                                            // system adapters "adapt" a specific system interface to a common interface
                                            getSystemAdapters(selectedProblem)[systemId]
                                                .end(selectedProblem.results.solverState[systemId].searchId)
                                        }
                                    }, m(Icon, {name: 'stop'}))
                                ]
                            ),
                        })),
                        // headers: ['solver', 'action', 'state'],
                        tableTags: m('colgroup',
                            m('col', {span: 1, width: '15em'}),
                            m('col', {span: 1, width: '3em'}),
                            m('col', {span: 1}))
                    })

                },
                // !solutionsCombined && solverSystems.map(solver => ({
                //     value: solver.systemId + ' Solutions',
                //     contents: getSolutionTable(selectedProblem, solver.systemId)
                // })),
                {
                    idSuffix: 'allSolutions',
                    value: [
                        'All Solutions',

                        m('div[style=float:right]',
                            comparableProblems.length > 1 && m('[style=display:inline-block;margin-right:1em]', m(Popper, {
                                    content: () => m('div[style=max-width:250px]', 'When problem comparison is enabled, solutions from searches on comparable problems are included in the solution list.')
                                },
                                m(Button, {
                                    style: {'margin-top': '-1em'},
                                    class: ""
                                        // + (getSolutions(selectedProblem).length > 1 ? 'btn-success ' : '')
                                        + (problemComparison ? 'active ' : ''),
                                    onclick: () => setProblemComparison(!problemComparison)
                                }, 'Problem Comparison'))),
                            m('[style=display:inline-block]', m(Popper, {
                                    content: () => m('div[style=max-width:250px]', 'When model comparison is enabled, multiple solutions may be selected and visualized simultaneously.')
                                },
                                m(Button, {
                                    style: {'margin-top': '-1em'},
                                    class: ""
                                        // + (getSolutions(selectedProblem).length > 1 ? 'btn-success ' : '')
                                        + (modelComparison ? 'active ' : ''),
                                    onclick: () => setModelComparison(!modelComparison)
                                }, 'Model Comparison'))))
                    ],
                    contents: getSolutionTable(problemComparison ? comparableProblems : [selectedProblem])
                }
            ]
        })
    ];

    /*
      This is the Left Menu with tabs:  Problems | Solutions
     */
    let tabbedResults = m(MenuTabbed, {
        id: 'resultsMenu',
        attrsAll: {style: {height: 'calc(100% - 8px)'}},
        currentTab: leftTabResults,
        callback: setLeftTabResults,
        sections: [
            {
                value: 'Searches',
                contents: [
                    Object.keys(otherSearches).length > 0 && m('h4', 'Within Workspace'),
                    'All searches being conducted for this workspace are listed below. ' +
                    'You may select searches for other problems in the workspace to view their solutions.',
                    m(Table, {
                        data: Object.keys(app.workspace.raven_config.problems)

                            .map(problemId => app.workspace.raven_config.problems[problemId])
                            .filter(problem => problem.results)
                            // flatten problems to one entry per active search
                            .flatMap(problem =>
                                Object.keys(problem.results.solverState || {}).map(systemId => [problem, systemId]))
                            .map(([problem, systemId]) => [
                                problem.problemId,
                                getTargetVariables(problem).join(', '),
                                problem.results.solverState[systemId].searchId,
                                problem.results.solverState[systemId].thinking ? 'running' : 'stopped',
                                problem.results.solverState[systemId].thinking && m(Button, {
                                    title: 'end the search',
                                    class: 'btn-sm',
                                    onclick: () => {
                                        // User clicks the 'Stop' button next to
                                        // a particular problem search

                                        // behavioral logging
                                        let logParams = {
                                            feature_id: 'RESULTS_STOP_PROBLEM_SEARCH',
                                            activity_l1: 'MODEL_SELECTION',
                                            activity_l2: 'PROBLEM_SEARCH_SELECTION'
                                        };
                                        app.saveSystemLogEntry(logParams);

                                        // system adapters "adapt" a specific system interface to a common interface
                                        getSystemAdapters(problem)[systemId]
                                            .end(selectedProblem.results.solverState[systemId].searchId)
                                    }
                                }, m(Icon, {name: 'stop'}))
                            ]),
                        headers: ['problem', 'targets', 'search ID', 'state', 'stop'],
                        activeRow: app.workspace.raven_config.selectedProblem,
                        onclick: setSelectedProblem
                    }),
                    Object.keys(otherSearches).length > 0 && [
                        m('h4', 'Beyond Workspace'),
                        'The backend is also searching for solutions under these search IDs. ' +
                        'These searches could be remnants from a prior workspace, or concurrently being searched in a second workspace. ' +
                        'Solutions for these searches cannot be viewed from this workspace.',
                        m(Table, {
                            data: Object.keys(otherSearches)
                                .map(searchID => [
                                    '?',
                                    '?',
                                    searchID,
                                    otherSearches[searchID].running ? 'potentially running' : 'stopped',
                                    otherSearches[searchID].running && m(Button, {
                                        title: 'stop the search',
                                        class: 'btn-sm',
                                        onclick: () => solverD3M.endSearch(searchID)
                                    }, m(Icon, {name: 'stop'}))
                                ]),
                            headers: ['Name', 'Targets', 'Search ID', 'State', 'Stop']
                        })
                    ]
                ]
            },
            {
                value: 'Solutions',
                contents: resultsContent,
            }
        ]
    });

    return m(Panel, {
            side: 'left',
            label: 'Results',
            hover: window.innerWidth < 1000,
            width: '600px'
        },
        // there seems to be a strange mithril bug here - when returning back to model from results,
        // the dom element for MenuTabbed is reused, but the state is incorrectly transitioned, leaving an invalid '[' key.
        // "Fixed" by wrapping in a div, to prevent the dom reuse optimization
        m('div', {style: {height: 'calc(100% - 50px)', overflow: 'auto'}},
            tabbedResults))
};

export class CanvasSolutions {

    oninit() {
        this.confusionMode = 'Stack';
        app.updateRightPanelWidth()
    }

    predictionSummary(problem, adapters) {

        let response = [];
        let plotData;

        if (problem.task === 'objectDetection') {
            if (adapters.length !== 1) return
            // this gets the data sample loaded, so that calls to get images will begin
            adapters[0].getColumnSample(resultsPreferences.target, resultsPreferences.dataSplit);
            return [
                m(PlotVegaLite, {
                    specification: {
                        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                        "height": 100,
                        "data": {
                            "values": Object.keys(resultsCache[problem.problemId].boundaryImageColormap || []).map(solutionName => ({
                                "color": resultsCache[problem.problemId].boundaryImageColormap[solutionName],
                                "solution": solutionName
                            }))
                        },
                        "mark": "rect",
                        "encoding": {
                            "y": {"value": -5},
                            "x": {"field": "solution", "type": "nominal"},
                            "color": {"field": "color", "type": "nominal", "scale": null}
                        }
                    }
                }),
                m(Paginated, {
                    data: resultsCache[problem.problemId].dataSample[resultsPreferences.dataSplit],
                    makePage: dataSample => dataSample
                        .map(point => ({
                            point,
                            'src': adapters[0].getObjectBoundaryImagePath(
                                resultsPreferences.target,
                                resultsPreferences.dataSplit,
                                problem.tags.indexes.reduce((index, column) => Object.assign(index, {
                                    [column]: point[column]
                                }), {}))
                        }))
                        .filter(summary => summary.src)
                        .map(summary => m('div',
                            m('h5', summary.point.image),
                            m('img', {src: summary.src}))),
                    limit: 10,
                    page: resultsPreferences.imagePage,
                    setPage: index => resultsPreferences.imagePage = index
                })
            ]
        }

        if (problem.task.toLowerCase() === 'forecasting' && adapters.length > 0) {
            let plotSplits = resultsPreferences.dataSplit === 'all' ? ['train', 'test'] : [resultsPreferences.dataSplit];

            let actualSummary = plotSplits.reduce((out, split) => Object.assign(out, {
                [split]: adapters[0].getColumnSample(resultsPreferences.target, split)
            }), {});

            let timeSummary = plotSplits.reduce((out, split) => Object.assign(out, {
                [split]: adapters[0].getColumnSample(getOrderingVariable(problem), split)
            }), {});
            let predictedVariables = getPredictorVariables(problem);
            let crossSectionals = problem.tags.crossSection
                .filter(crossSection => predictedVariables.includes(crossSection))

            let crossSectionSummary = plotSplits
                // for each loaded data split
                .filter(split => actualSummary[split])
                // construct a treatment label
                .reduce((out, split) => {
                    // don't do anything if there are no cross sectional variables
                    if (crossSectionals.length === 0)
                        return Object.assign(out, {[split]: []});

                    // construct an intermediate {[columnName]: values} object
                    let crossSectionData = crossSectionals.reduce((out, columnName) => Object.assign(out, {
                        [columnName]: adapters[0].getColumnSample(columnName, split)
                    }), {});

                    // concat together the values in the columns for each of the cross sections, for each observation
                    out[split] = crossSectionData[crossSectionals[0]]
                        .map((_, i) => crossSectionals
                            .reduce((label, columnName) => `${label}-${crossSectionData[columnName][i]}`, '')
                            .slice(1), {});

                    return out;
                }, {});

            let forecastSummaries = adapters.map(adapter => plotSplits.reduce((out, split) => Object.assign(out, {
                [split]: adapter.getFitted(resultsPreferences.target, split)
            }), {solutionId: adapter.getSolutionId()}));


            let xName = getOrderingVariable(problem); // time
            let yName = resultsPreferences.target;
            let groupName = 'Solution Name';
            let dataSplit = 'Data Split';
            let crossSectionName = 'Cross Section';
            let title = 'Forecasts for ' + resultsPreferences.target;

            let plotData = plotSplits
                // for each split
                .filter(split => actualSummary[split])
                .flatMap(split => [
                    ...actualSummary[split].map((_, i) => ({
                        [dataSplit]: split,
                        [groupName]: 'Actual',
                        [yName]: actualSummary[split][i],
                        [crossSectionName]: crossSectionSummary[split][i],
                        [xName]: String(timeSummary[split][i]) // new Date(Date.parse(timeSummary[split][i]))
                    })),
                    ...forecastSummaries
                        // for each solutionId
                        .filter(forecastSummary => forecastSummary[split])
                        .flatMap(forecastSummary => forecastSummary[split]
                            // for each data point
                            .map((_, i) => ({
                                [dataSplit]: split,
                                [groupName]: forecastSummary.solutionId,
                                [yName]: forecastSummary[split][i],
                                [crossSectionName]: crossSectionSummary[split][i],
                                [xName]: String(timeSummary[split][i]) // new Date(Date.parse(timeSummary[split][i]))
                            })))
                ])
                .filter(point => problem.tags.crossSection.length === 0
                    || resultsPreferences.crossSection === 'unset'
                    || point[crossSectionName] === resultsPreferences.crossSection)

            if (plotData.length === 0) return [
                'Processing forecasts.',
                common.loader('ForecastSummary')
            ];

            let crossSectionsUnique = [...new Set(crossSectionSummary[plotSplits[0]])];

            if (!resultsPreferences.timeSeriesPlotConfig) {
                resultsPreferences.timeSeriesPlotConfig = crossSectionals.length
                    ? 'Confidence Interval' : 'Cross Sections'
            }

            response.push(
                plotSplits[0] in crossSectionSummary && crossSectionsUnique.length > 1 && [
                    m(ButtonRadio, {
                        id: 'timeSeriesPlotConfigButtonRadio',
                        onclick: state => resultsPreferences.timeSeriesPlotConfig = state,
                        activeSection: resultsPreferences.timeSeriesPlotConfig,
                        sections: [
                            {value: 'Confidence Interval'},
                            {value: 'Cross Sections'}
                        ]
                    }),
                    resultsPreferences.timeSeriesPlotConfig === "Cross Sections" && [
                        m('div[style=margin:.5em]', 'Subset to cross section:'),
                        (crossSectionsUnique.length > 20 ? m(TextFieldSuggestion, {
                            value: resultsPreferences.crossSectionTemp,
                            suggestions: crossSectionsUnique,
                            enforce: true,
                            oninput: val => resultsPreferences.crossSectionTemp = val,
                            onblur: val => {
                                resultsPreferences.crossSectionTemp = val;
                                resultsPreferences.crossSection = val
                            }
                        }) : m(Dropdown, {
                            id: 'crossSectionDropdown',
                            items: ['unset', ...crossSectionsUnique],
                            activeItem: resultsPreferences.crossSection,
                            onclickChild: value => resultsPreferences.crossSection = value,
                            style: {'margin-left': '1em'}
                        }))
                    ]
                ],
                m('div', {
                    style: {'margin-top': '1em', 'height': '500px', 'max-width': '700px'}
                }, m(PlotVegaLite, {
                    specification: (resultsPreferences.timeSeriesPlotConfig === 'Confidence Interval'
                        ? plots.vegaLiteForecastConfidence : plots.vegaLiteForecast)(
                        plotData, xName, yName, dataSplit,
                        groupName, crossSectionName, title, getOrderingTimeUnit(problem))
                })))
        }

        if (problem.task.toLowerCase().includes('regression') || problem.task.toLowerCase() === "forecasting") {
            let summaries = adapters.map(adapter => ({
                name: adapter.getSolutionId(),
                fittedVsActual: adapter.getFittedVsActuals(resultsPreferences.target),
            })).filter(summary => summary.fittedVsActual);

            if (adapters.every(adapter => !adapter.getProduceDataPath(resultsPreferences.dataSplit))) return [
                'Waiting for solver to produce predictions.',
                common.loader('PredictionSummary')
            ];
            if (summaries.length === 0) return [
                'Processing predictions.',
                common.loader('PredictionSummary')
            ];

            let yName = 'Fitted Value';
            let xName = 'Actual Value';
            let countName = 'count';
            let groupName = 'Solution Name';
            let title = 'Fitted vs. Actuals for predicting ' + resultsPreferences.target;

            summaries.forEach(summary => summary.fittedVsActual.map(entry => entry[groupName] = summary.name));

            plotData = summaries.flatMap(summary => summary.fittedVsActual);
            response.push(m('div', {
                style: {'height': '500px', 'max-width': '700px'}
            }, m(PlotVegaLite, {
                specification: plots.vegaLiteScatter(
                    plotData,
                    xName, yName, groupName, countName, title, summaries.length),
                listeners: {
                    "panner": selection => {
                        if (Object.keys(selection).length > 0) {
                            resultsPreferences.predictionSummarySelection = {
                                type: 'FittedVsActuals',
                                indices: plotData.filter(point =>
                                    selection['Fitted Value'][0] <= point['Fitted Value']
                                    && point['Fitted Value'] <= selection['Fitted Value'][1]
                                    && selection['Actual Value'][0] <= point['Actual Value']
                                    && point['Actual Value'] <= selection['Actual Value'][1])
                                    .flatMap(point => point.d3mIndex)
                            };
                        } else {
                            delete resultsPreferences.predictionSummarySelection
                        }
                        resultsPreferences.predictionSummaryPage = 0
                        m.redraw()
                    }
                }
            })))
        }

        if (problem.task.toLowerCase().includes('classification')) {

            let summaries = adapters.map(adapter => ({
                name: adapter.getSolutionId(),
                confusionMatrix: adapter.getConfusionMatrix(resultsPreferences.target)
            })).filter(summary => summary.confusionMatrix);
            if (adapters.every(adapter => !adapter.getProduceDataPath(resultsPreferences.dataSplit))) return [
                'Waiting for solver to produce predictions.',
                common.loader('PredictionSummary')
            ];
            if (summaries.length === 0) return [
                'Processing data from backend.',
                common.loader('PredictionSummary')
            ];

            // ignore summaries without confusion matrices
            summaries = summaries.filter(summary => summary.confusionMatrix);
            if (summaries.length === 0) return;

            // collect classes from all summaries
            let classes = [...new Set(summaries.flatMap(summary => summary.confusionMatrix.classes))];

            // convert to 2x2 if factor is set
            if (resultsPreferences.factor !== undefined)
                summaries.forEach(summary => summary.confusionMatrix = confusionMatrixFactor(
                    summary.confusionMatrix.data,
                    resultsPreferences.factor));

            // prevent invalid confusion matrix selection
            if (this.confusionMatrixSolution === undefined || !summaries.find(summary => summary.name === this.confusionMatrixSolution))
                this.confusionMatrixSolution = summaries[0].name;

            response.push(...[
                m('div[style=margin-bottom:1em]', 'Set the confusion matrix factor to view a confusion matrix where all other factors/levels are collapsed into a single class.',
                    m('br'),
                    m('label#confusionFactorLabel', 'Active factor/level: '),
                    m('[style=display:inline-block]', m(Dropdown, {
                        id: 'confusionFactorDropdown',
                        items: ['undefined', ...classes],
                        activeItem: resultsPreferences.factor,
                        onclickChild: setResultsFactor,
                        style: {'margin-left': '1em'}
                    }))),
                summaries.length > 1 && m('div',
                    m('label', 'Confusion Matrix Mode:'),
                    m(ButtonRadio, {
                        id: 'confusionModeButtonBar',
                        onclick: mode => this.confusionMode = mode,
                        activeSection: this.confusionMode,
                        sections: [
                            {value: 'Stack', title: 'render confusion matrices in the same space'},
                            {value: 'List', title: 'render confusion matrices above/below each other'}
                        ],
                        attrsAll: {style: {'margin-left': '1em', width: '10em', display: 'inline-block'}},
                    })),
                m('label', 'Pipeline:'),
                m({Stack: MenuTabbed, List: MenuHeaders}[this.confusionMode], {
                    id: 'confusionMenu',
                    currentTab: this.confusionMatrixSolution,
                    callback: solutionId => this.confusionMatrixSolution = solutionId,
                    sections: summaries.map((summary, i) => ({
                        value: summary.name,
                        contents: [
                            resultsPreferences.factor !== undefined && m('div',
                                i === 0 || this.confusionMode === 'Stack' ? `The scores in this table may differ from those in the left panel or the scores summary. These scores are computed without cross-validation, directly on the ${resultsPreferences.dataSplit} data split, when the positive class is ${resultsPreferences.factor}.` : '',
                                m(Table, {
                                    id: 'resultsPerformanceTable',
                                    headers: ['metric', 'score'],
                                    data: generatePerformanceData(summary.confusionMatrix.data, resultsPreferences.factor),
                                    style: {width: 'calc(100% - 2em)', margin: '1em'}
                                })),
                            summary.confusionMatrix.classes.length < 100 ? summary.confusionMatrix.classes.length > 0
                                ? m('div', {
                                        style: {'text-align': 'center'}
                                    },
                                    m('div', {
                                        style: {
                                            display: "inline-block",
                                            position: "relative",
                                            'max-width': '600px',
                                            width: "100%"
                                        }
                                    }, m('div', {style: 'margin-top: 80%'}), m('div', {
                                        style: {
                                            position: 'absolute',
                                            top: 0, bottom: 0, left: 0, right: 0
                                        }
                                    }, m(PlotVegaLite, {
                                        specification: plots.vegaLiteConfusionMatrix(
                                            summary.confusionMatrix.data,
                                            summary.confusionMatrix.classes,
                                            'Actual', 'Predicted', 'count',
                                            `Confusion Matrix for ${getTargetVariables(problem)[0]}${resultsPreferences.factor ? (' factor ' + resultsPreferences.factor) : ''}`),
                                        listeners: {
                                            "selector": selection => {
                                                if (Object.keys(selection).length > 0) {
                                                    // TODO: this is hacky- the _vgsid_ refers to the 1-based index in the input data
                                                    resultsPreferences.predictionSummarySelection = {
                                                        type: 'ConfusionMatrix',
                                                        indices: selection._vgsid_.map(idx => summary.confusionMatrix.data[idx - 1])
                                                            .flatMap(point => point.d3mIndex)
                                                    };
                                                } else {
                                                    delete resultsPreferences.predictionSummarySelection
                                                }
                                                resultsPreferences.predictionSummaryPage = 0
                                                m.redraw()
                                            }
                                        }
                                    }))))
                                : 'Too few classes for confusion matrix! There is a data mismatch.'
                                : 'Too many classes for confusion matrix!'
                        ]
                    }))
                })
            ])
        }

        let indices = resultsPreferences?.predictionSummarySelection?.indices;
        if (indices) {
            // variable for data that will be shown to user
            let tableData;
            let observationLimit = 50;
            // data sampled from the original dataset
            let predictorData;
            if (problem.task === 'forecasting') {
                indices = new Set(indices);
                predictorData = (adapters[0].getDataSample(resultsPreferences.dataSplit) || [])
                    .filter(point => indices.has(point.d3mIndex));
            } else {
                predictorData = adapters[0].getDataSample(resultsPreferences.dataSplit, indices.slice(0, observationLimit));
                indices = new Set(indices);
            }

            if (predictorData) {
                tableData = predictorData.filter(point => indices.has(point.d3mIndex))
            } else {
                // deduplicate indices (if multiple solutions selected)
                tableData = [...indices].map(d3mIndex => ({d3mIndex}));
            }

            if (indices.size > observationLimit) response.push(utils.italicize(`Only the first ${observationLimit} observations have been collected.`))
            response.push(m('div[style=overflow:auto;padding-bottom:1em]', m(Paginated, {
                data: tableData,
                makePage: data => m(Table, {data}),
                limit: 10,
                page: resultsPreferences?.predictionSummaryPage || 0,
                setPage: value => resultsPreferences.predictionSummaryPage = value
            })))
        }

        return response;
    };

    scoresSummary(problem, adapters) {

        if (resultsPreferences.plotScores === 'all')
            adapters = [problem, ...problemComparison ? getComparableProblems(problem) : []]
                .flatMap(problem => getSolutions(problem)
                    .map(solution => getSolutionAdapter(problem, solution)))

        return [
            m('div[style=margin-bottom:1em]',
                m('[style=display:inline-block;]', 'Graph'), m(ButtonRadio, {
                    id: 'plotScoresButtonBar',
                    onclick: mode => resultsPreferences.plotScores = mode,
                    activeSection: resultsPreferences.plotScores,
                    sections: [{value: 'all'}, {value: 'selected'}],
                    attrsAll: {style: {'margin': '0 .5em', display: 'inline-block', width: 'auto'}},
                    attrsButtons: {class: 'btn-sm', style: {width: 'auto'}},
                }),
                m('[style=display:inline-block]', 'solutions.')),
            [problem.metric, ...problem.metrics].map(metric => m(PlotVegaLite, {
                specification: {
                    "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                    "description": `${metric} scores for ${problem.problemId}.`,
                    data: {
                        values: adapters.map(adapter => ({
                            ID: adapter.getSolutionId(),
                            [metric]: adapter.getScore(metric)
                        })).filter(point => point[metric] !== undefined)
                    },
                    "mark": "bar",
                    "encoding": {
                        "x": {"field": 'ID', "type": "nominal"},
                        "y": {
                            "field": metric, "type": "quantitative",
                            scale: (metric in app.d3mMetricDomains)
                                ? {domain: app.d3mMetricDomains[metric]}
                                : {}
                        },
                        "tooltip": [
                            {"field": 'ID', "type": "nominal"},
                            {"field": metric, "type": "quantitative"}
                        ]
                    }
                }
            }))
        ]
    }

    variableImportance(problem, adapters) {
        let content = [utils.bold('Importance Scores')]
        if (adapters.length === 0) {
            content.push(utils.italicize("No solutions are selected"));
            return content
        }

        let importanceScores = adapters
            .map(adapter => ({
                'solution ID': adapter.getSolutionId(),
                'scores': adapter.getImportanceScore(resultsPreferences.target, resultsPreferences.interpretationMode)
            }))
            .filter(pair => pair.scores)
            .flatMap(importanceObj => Object.keys(importanceObj.scores).map(predictor => ({
                'solution ID': importanceObj['solution ID'],
                'predictor': predictor,
                'importance': importanceObj.scores[predictor]
            })))
            .reverse();

        if (importanceScores.length === 0) {
            content.push(
                m('div[style=margin:1em]', utils.italicize("Loading importance scores.")),
                common.loader("importanceLoader"))
            return content
        }

        content.push(m('div[style=max-height:500px]', m(PlotVegaLite, {
            specification: plots.vegaLiteImportancePlot(importanceScores, modelComparison)
        })))

        return content
    }

    modelInterpretation(problem, adapters) {

        let adapter = adapters[0];

        let interpretationContent = [];

        if (resultsPreferences.interpretationMode === 'EFD') {
            let isCategorical = getNominalVariables(problem).includes(resultsPreferences.target);
            interpretationContent.push(m('div[style=margin: 1em]',
                utils.italicize("Empirical first differences"), ` is a tool to interpret the influence of variables on the model, from the empirical distribution of the data. ` +
                `The Y axis refers to the ${isCategorical ? 'probability of each level' : 'expectation'} of the dependent variable as the predictor (x) varies along its domain. ` +
                `Parts of the domain where the fitted and actual values align indicate high utility from the predictor. ` +
                `If the fitted and actual values are nearly identical, then the two lines may be indistinguishable.`),);

            let interpretationEFDContent = common.loader('ModelInterpretation');
            if (adapters.length === 1) {
                let interpretationData = getPredictorVariables(problem).reduce((out, predictor) => Object.assign(out, {
                    [predictor]: adapter.getInterpretationEFD(predictor)
                }), {});

                // reassign content if some data is not undefined
                let sortedPredictors = Object.keys(resultsCache[problem.problemId]?.importanceScores
                    ?.[adapter.getSolutionId()]?.EFD?.[resultsPreferences.target] ?? {});

                let plotVariables = (sortedPredictors.length > 0 ? sortedPredictors.reverse() : Object.keys(interpretationData))
                    .filter(predictor => interpretationData[predictor]);

                if (!problem.task.toLowerCase().includes("classification")) {
                    resultsPreferences.factor = undefined;
                }

                if (plotVariables.length > 0) interpretationEFDContent = m('div', [

                    problem.task.toLowerCase().includes('classification') && m('div[style=margin-bottom:1em]',
                        'Set the factor to filter EFD plots to a single class/factor/level.', m('br'),
                        m('label#resultsFactorLabel', 'Active factor/level: '),
                        m('[style=display:inline-block]', m(Dropdown, {
                            id: 'resultsFactorDropdown',
                            items: [
                                'undefined',
                                ...new Set(Object.values(interpretationData)[0].map(point => point.level).sort(utils.omniSort))
                            ],
                            activeItem: resultsPreferences.factor,
                            onclickChild: setResultsFactor,
                            style: {'margin-left': '1em'}
                        }))),
                    m(Paginated, {
                        data: plotVariables,
                        makePage: variablesToPlot => variablesToPlot
                            .filter(predictor => predictor in interpretationData)
                            .map(predictor => [
                                m('br'), utils.bold(predictor),
                                m(ModelInterpretation, {
                                    mode: resultsPreferences.interpretationMode,
                                    data: interpretationData[predictor]
                                        .filter(point => resultsPreferences.factor === undefined || String(resultsPreferences.factor) === String(point.level)),
                                    problem: problem,
                                    predictor,
                                    target: resultsPreferences.target,
                                    yLabel: valueLabel,
                                    variableLabel: variableLabel,
                                    summary: app.variableSummaries[predictor],
                                    levels: resultsCache[problem.problemId].levels
                                })
                            ]),
                        limit: 10,
                        page: resultsPreferences.interpretationPage,
                        setPage: setInterpretationPage
                    })
                ]);
                interpretationContent.push(interpretationEFDContent);
            }
        }

        if (adapters.length === 1 && resultsPreferences.interpretationMode === 'Partials') {
            let interpretationPartialsData = getPredictorVariables(problem).map(predictor => ({
                predictor,
                data: adapter.getInterpretationPartials(predictor)
            })).filter(predictorEntry => predictorEntry.data);

            if (interpretationPartialsData.length > 0) interpretationContent = [
                m('div[style=margin: 1em]', utils.italicize("Partials"), ` shows the prediction of the model as one predictor is varied, and the other predictors are held at their mean.`),
                m('div', {style: 'overflow:auto'}, m(Paginated, {
                    data: interpretationPartialsData,
                    makePage: data => data.map(predictorEntry => m('div',
                        utils.bold(predictorEntry.predictor),
                        m(ModelInterpretation, {
                            mode: 'Partials',
                            data: predictorEntry.data,
                            problem: problem,
                            predictor: predictorEntry.predictor,
                            target: resultsPreferences.target,
                            yLabel: valueLabel,
                            variableLabel: variableLabel,
                            summary: app.variableSummaries[predictorEntry.predictor],
                            levels: resultsCache[problem.problemId].levels
                        }))),
                    limit: 10,
                    page: resultsPreferences.interpretationPage,
                    setPage: setInterpretationPage
                }))
            ];
        }
        if (adapters.length === 1 && resultsPreferences.interpretationMode === 'PDP/ICE') {
            let isCategorical = getNominalVariables(problem).includes(resultsPreferences.target);
            let sortedPredictors = Object.keys(resultsCache[problem.problemId]?.importanceScores
                ?.[adapter.getSolutionId()]?.EFD?.[resultsPreferences.target] ?? {});

            let predictors = sortedPredictors.length > 0
                ? sortedPredictors.reverse()
                : getPredictorVariables(problem);

            interpretationContent = [
                m('div[style=margin: 1em]',
                    utils.italicize("Individual conditional expectations"), ` draws one line for each individual in the data, as the selected predictor is varied. `
                    + `A random sample of individuals are chosen from the dataset. `
                    + (isCategorical
                        ? 'The thickness of the lines is relative to the number of observations present at each level.'
                        : 'The red line is a partial dependency plot- the average of the target variable over all individuals.')),

                m(Paginated, {
                    data: predictors,
                    makePage: predictors => predictors.map(predictor => {
                        let interpretationData = adapter.getInterpretationICE(predictor);

                        let predictorContent = [utils.bold(predictor)];
                        if (interpretationData) predictorContent.push(m('div', {style: 'overflow:auto'}, m(ModelInterpretation, {
                            mode: 'ICE',
                            data: interpretationData,
                            problem: problem,
                            predictor: predictor,
                            target: resultsPreferences.target,
                            yLabel: valueLabel,
                            variableLabel: variableLabel,
                            summary: app.variableSummaries[predictor],
                            levels: resultsCache[problem.problemId].levels
                        })));
                        else interpretationContent.push(common.loader('ModelInterpretation'))

                        return predictorContent
                    }),
                    limit: 10,
                    page: resultsPreferences.interpretationPage,
                    setPage: setInterpretationPage
                })
            ];
        }
        return [
            m('label', 'Model interpretation tool:'),
            m(ButtonRadio, {
                id: 'modeInterpretationButtonBar',
                onclick: mode => resultsPreferences.interpretationMode = mode,
                activeSection: resultsPreferences.interpretationMode,
                sections: [
                    {value: 'EFD', title: 'empirical first differences'},
                    {value: 'Partials', title: 'model prediction as predictor varies over its domain'},
                    problem.task !== "forecasting" && {value: 'PDP/ICE', title: 'partial dependence plot/individual conditional expectation'}
                ].filter(_=>_)
            }),
            interpretationContent
        ]
    }

    visualizePipeline(solution) {

        // only called if the pipeline flowchart is rendered
        let pipelineFlowchartPrep = pipeline => {
            let steps = pipeline.steps.map((pipeStep, i) => ({
                key: 'Step ' + i,
                color: common.grayColor,
                // special coloring is not enabled for now
                // color: {
                //     'data': common.grayColor,
                //     'sklearn_wrap': common.csColor
                // }[pipeStep.primitive.python_path.split('.')[2]] || common.grayColor,
                // the table is overkill, but we could certainly add more info here
                summary: m(Table, {
                    id: 'pipelineFlowchartSummary' + i,
                    // abbreviation: 40,
                    data: {
                        'Name': pipeStep['primitive']['primitive'].name,
                        'Method': pipeStep['primitive']['primitive']['pythonPath'].replace('d3m.primitives.', '')
                    },
                    style: {'margin-bottom': 0, padding: '1em'}
                }),
                content: m(Table, {
                    id: 'pipelineTableStep' + i,
                    abbreviation: 40,
                    data: pipeStep,
                    nest: true
                })
            }));

            let inputs = 'inputs' in pipeline && m(Table, {
                id: 'pipelineInputsTable',
                data: pipeline.inputs,
                style: {'margin-bottom': 0, 'padding': '1em'}
            });
            let outputs = 'outputs' in pipeline && m(Table, {
                id: 'pipelineOutputsTable',
                data: pipeline.outputs,
                style: {'margin-bottom': 0, 'padding': '1em'}
            });

            return [
                {color: common.successColor, key: 'Inputs', summary: inputs, content: inputs},
                ...steps,
                {color: common.successColor, key: 'Outputs', summary: outputs, content: outputs}
            ];
        };

        return solution.pipeline && m('div', {
                style: {
                    height: 'calc(100% - 30px)',
                    overflow: 'auto'
                }
            },
            m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Overview: '),
            m(Table, {
                id: 'pipelineOverviewTable',
                data: Object.keys(solution.pipeline).reduce((out, entry) => {
                    if (!['inputs', 'steps', 'outputs', 'id', 'users', 'digest'].includes(entry))
                        out[entry] = solution.pipeline[entry];
                    return out;
                }, {}),
                style: {
                    margin: '1em',
                    width: 'calc(100% - 2em)',
                    border: common.borderColor,
                    'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)'
                }
            }),
            m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Steps: '),
            m(Flowchart, {
                labelWidth: '5em',
                steps: pipelineFlowchartPrep(solution.pipeline)
            }))
    };

    uploadDataset(problem, adapters) {

        return [
            m('div',
            m('h5', 'Data Split Name:'),
            m(TextField, {
                style: {width: 'auto', display: 'inline-block'},
                id: 'datasetNameTextField',
                value: resultsPreferences.upload.name,
                oninput: value => resultsPreferences.upload.name = value,
                onblur: value => resultsPreferences.upload.name = value
            }),
            m('label.btn.btn-secondary', {style: {display: 'inline-block', margin: '1em'}}, [
                m('input', {
                    hidden: true,
                    type: 'file',
                    onchange: e => {
                        resultsPreferences.upload.file = e.target.files[0];
                        // resets the event, so that the second upload works
                        e.target.value = ''
                    }
                })
            ], 'Browse'),
            resultsPreferences.upload?.file?.name),

            m(Button, {
                onclick: () => {
                    if (!resultsPreferences.upload.file) {
                        app.alertError("No dataset is supplied.");
                        return;
                    }
                    if ((resultsPreferences.upload?.name?.length ?? 0) === 0) {
                        app.alertError("No dataset name is supplied.");
                        return;
                    }

                    if (resultsPreferences.upload.name in problem.results.datasetPaths) {
                        app.alertError(`Data split ${resultsPreferences.upload.name} already exists. Please choose another name.`);
                        return;
                    }

                    uploadForModelRun(
                        resultsPreferences.upload.file,
                        resultsPreferences.upload.name,
                        problem
                    ).then(({customDataset, manipulatedInfo}) => {
                        customDatasets[getCustomDatasetId()] = customDataset;
                        // clear form, upload was successful
                        resultsPreferences.upload = {};
                        getSolutions(problem).forEach(solution => produceOnSolution(
                            getSolutionAdapter(problem, solution),
                            customDataset.name,
                            manipulatedInfo.data_path,
                            manipulatedInfo.metadata_path))
                    })
                },
                disabled: !resultsPreferences.upload.file || resultsPreferences.upload.name.length === 0
            }, "Produce"),

            Object.keys(customDatasets).length > 0 && [
                m('h4[style=margin:1em]', 'Custom Datasets'),
                "Set the current data split from the top of the left panel, or via the 'Select' button below. If your dataset contains actual values for the target variable, the Prediction Summary, Variable Importance, and Empirical First Differences will update to reflect the new dataset. Predictions are produced for all known solutions when your dataset is uploaded.",
                m(Table, {
                    data: Object.keys(customDatasets).map(evaluationId => {
                        let dataPointer = adapters.length === 1 && adapters[0].getProduceDataPath(customDatasets[evaluationId].name);
                        return [
                            customDatasets[evaluationId].name,
                            m(Button, {
                                onclick: () => resultsPreferences.dataSplit = customDatasets[evaluationId].name
                            }, "Select"),
                            adapters.length === 1 && m(Button, {
                                disabled: !dataPointer,
                                onclick: () => app.downloadFile(dataPointer)
                            }, "Download Predictions")
                        ]
                    })
                })
            ]
        ]
    }

    variableExplore(problem, adapters) {

        // wait until all produces have materialized to disk to prevent an empty join entering the cache
        if (adapters.some(adapter => !adapter.getProduceDataPath(resultsPreferences.dataSplit)))
            return common.loader("VariableExplore");

        // names of estimated target variables
        let foldedVariables = adapters.map(adapter => `${resultsPreferences.target}-${adapter.getSolutionId()}`);

        // we're not recomputing preprocess summaries for joined results data.
        //   this constructs an approximation of what that would look like
        let resultsSummaries = Object.assign(
            foldedVariables.reduce((out, variable) =>
                Object.assign(out, {
                    [variable]: Object.assign({},
                        app.variableSummaries[resultsPreferences.target] || {},
                        {variableName: variable, name: variable})
                }), {}),
            // problem.results.variablesInitial.reduce((out, variable) =>
            //     Object.assign(out, {[variable]: app.variableSummaries[variable] || {}}), {}),
            app.variableSummaries);

        // ensure invalid variables are removed
        resultsPreferences.explore.variables = resultsPreferences.explore.variables
            .filter(variable => variable in resultsSummaries)

        let hasVariables = resultsPreferences.explore.variables.length > 0;
        let splitPath = problem.results.datasetPaths?.[resultsPreferences.dataSplit];
        if (!splitPath) return;
        let splitCollectionName = `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`;
        // TODO: thread initial variables through ExploreVariables
        let {
            collectionName, datafile, pipeline, datasets
        } = getResultsAbstractPipeline(problem, splitCollectionName, splitPath, true);


        return m('div',
            !resultsPreferences.explore.go && [
                m(Button, {
                    id: 'exploreGo',
                    class: hasVariables && 'btn-success',
                    style: {margin: '.5em'},
                    disabled: !hasVariables,
                    onclick: () => {
                        if (!hasVariables) return;

                        // behavioral logging
                        let logParams = {
                            feature_id: 'RESULTS_EXPLORE_MAKE_PLOTS',
                            activity_l1: 'MODEL_SELECTION',
                            activity_l2: 'MODEL_SEARCH',
                            other: {selected: resultsPreferences.explore.variables}
                        };
                        app.saveSystemLogEntry(logParams);

                        resultsPreferences.explore.go = true;
                    }
                }, 'go'),
                m('div', {style: 'display: flex; flex-direction: row; flex-wrap: wrap'},
                m(ExploreBoxes, {
                    preferences: resultsPreferences.explore,
                    summaries: resultsSummaries
                })),
            ],
            resultsPreferences.explore.go && m(ExploreVariables, {
                preferences: resultsPreferences.explore,
                summaries: resultsSummaries,
                callbackGoBack: () => resultsPreferences.explore.go = false,
                abstractQuery: [
                    ...pipeline,
                    ...getResultsAbstractPipelineTargets(problem, adapters),
                ],
                getData: body => app.getData(Object.assign({
                    datafile: datafile, // location of the dataset csv
                    collection_name: collectionName,
                    datasets
                }, body)),
            }))
    }

    customExplore(problem, adapters, mapping) {

        // wait until all produces have materialized to disk to prevent an empty join entering the cache
        if (adapters.some(adapter => !adapter.getProduceDataPath(resultsPreferences.dataSplit)))
            return common.loader("CustomExplore");

        let isClassification = ['classification', 'vertexclassification'].includes(problem.task.toLowerCase());

        let splitPath = problem.results.datasetPaths?.[resultsPreferences.dataSplit];
        if (!splitPath) return;
        let splitCollectionName = `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`

        let {
            collectionName, datafile, pipeline, variablesInitial, datasets
        } = getResultsAbstractPipeline(problem, splitCollectionName, splitPath, true);

        // names of estimated target variables
        let foldedVariables = adapters.map(adapter => `${resultsPreferences.target}_${adapter.getSolutionId()}`);
        let errorVariables = foldedVariables.map(variable => 'Error_' + variable);

        let baseVariables = queryMongo.buildPipeline([...pipeline], variablesInitial).variables;
        // we're not recomputing preprocess summaries for joined results data.
        //   this constructs the minimal necessary portion of what that would look like
        let resultsSummaries = [
            ...baseVariables, ...foldedVariables, ...errorVariables
        ].reduce((out, variable) => Object.assign(out, {[variable]: app.variableSummaries[variable] || {}}), {});

        Object.assign(resultsSummaries, resultsPreferences.variableSummariesDiffs || {});

        // lock secondary axis to estimated target variables
        customConfiguration.channels = customConfiguration.channels || [];
        if (resultsPreferences.lockExplorePlot) {
            if (mapping) {
                let colorChannel = mappingConfiguration.channels.find(channel => channel.name === 'color');
                if (!colorChannel) {
                    colorChannel = {name: 'color'};
                    mappingConfiguration.channels.push(colorChannel);
                }
                if (!errorVariables.includes(colorChannel.variable))
                    colorChannel.variable = errorVariables[0]
                colorChannel.aggregation = isClassification ? 'count' : 'variance';
                colorChannel.schemeCategory = "sequential-single"
                colorChannel.scheme = colorChannel.scheme || {};
                colorChannel.scheme['sequential-single'] = 'reds';
            } else {
                let secondaryChannel = customConfiguration.channels.find(channel => channel.name === "secondary axis");
                if (!secondaryChannel) {
                    secondaryChannel = {name: 'secondary axis'}
                    customConfiguration.channels.push(secondaryChannel);
                }
                secondaryChannel.variables = [...foldedVariables];
                // add a color channel
                let colorChannel = customConfiguration.channels.find(channel => channel.name === 'color');
                if (!colorChannel && secondaryChannel.variables.length > 1) customConfiguration.channels.push({
                    name: 'color',
                    variable: secondaryChannel.key || 'field'
                })
            }
        }

        let nominals = new Set(getNominalVariables(problem));
        if (isClassification) foldedVariables.map(v => nominals.add(v));

        let {editor, plot} = preparePanels({
            mapping,
            getData: body => app.getData(Object.assign({
                datafile: datafile, // location of the dataset csv
                collection_name: collectionName,
                datasets
            }, body)),
            nominals,
            configuration: mapping ? mappingConfiguration : customConfiguration,
            abstractQuery: [
                ...pipeline,
                ...getResultsAbstractPipelineTargets(problem, adapters),
                {
                    type: "transform",
                    transforms: foldedVariables.map(variable => ({
                        "name": `Error_${variable}`,
                        "equation": isClassification ?
                            `toInt(eq(${variable}, ${resultsPreferences.target}))`
                            : `${variable} - ${resultsPreferences.target}`
                    }))
                }
            ],
            summaries: resultsSummaries,
            setSummaryAttr: (variable, attr, value) => {
                if (variable in app.variableSummaries)
                    app.setVariableSummaryAttr(variable, attr, value)
                else {
                    utils.setDeep(resultsPreferences, ['variableSummariesDiffs', variable, attr], value);
                    utils.setDeep(app.variableSummaries, [variable, attr], value);
                }
            },
            sampleSize: parseInt(explorePreferences.recordLimit),
            variablesInitial: variablesInitial,
            initViewport: mappingConfiguration.initViewport,
            setInitViewport: value => mappingConfiguration.initViewport = value
        });

        return [
            m('div', m(Checkbox, {
                id: 'showErrorCheck',
                onclick: () => resultsPreferences.lockExplorePlot = !resultsPreferences.lockExplorePlot,
                checked: resultsPreferences.lockExplorePlot
            }), m('[style=margin:1em;display:inline-block]', mapping
                ? 'Lock to error visualization for the current model.'
                : 'Lock secondary axis to fitted values.')),
            editor,
            m('', {style: {height: '800px'}}, plot)
        ]
    }

    view(vnode) {
        let {problem} = vnode.attrs;
        if (!problem) return;
        if (manipulate.constraintMenu) return;

        let predictors = getPredictorVariables(problem);
        let targets = getTargetVariables(problem);
        // ensure valid state of selected predictor, target
        if (!predictors.includes(resultsPreferences.predictor))
            resultsPreferences.predictor = predictors[0];
        if (!targets.includes(resultsPreferences.target))
            resultsPreferences.target = targets[0];

        let problemSummary = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Problem Description',
            shown: resultsSubpanels['Problem Description'],
            setShown: state => {
                resultsSubpanels['Problem Description'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_PROBLEM_DESCRIPTION',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        },
            m(Table, {
                headers: ['Variable', 'Data'],
                data: [
                    ['Dependent Variables', getTargetVariables(problem)],
                    ['Predictors', getPredictorVariables(problem)],
                    ['Description', utils.preformatted(getDescription(problem))],
                    ['Task', problem.task]
                ]
            }),
            "Manipulate data that was used to train the model. This can be used to look at prediction summaries, variable importance, EFD, partials and ICE plots from data within specific regions.",
            m(manipulate.PipelineFlowchart, {
                compoundPipeline: [
                    ...getAbstractPipeline(problem, true),
                    ...resultsQuery
                ],
                pipeline: resultsQuery,
                editable: true
            }));

        let selectedAdapters = getSelectedAdapters([problem, ...problemComparison ? getComparableProblems(problem) : []]);

        if (selectedAdapters.length === 0)
            return m('div', {style: {margin: '1em 0px'}}, problemSummary);

        let firstAdapter = selectedAdapters[0];
        let firstSolution = firstAdapter.getSolution();

        let solutionSummary = selectedAdapters.length === 1 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Solution Description',
            shown: resultsSubpanels['Solution Description'],
            setShown: state => {
                resultsSubpanels['Solution Description'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_SOLUTION_DESCRIPTION',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        },
            m(Table, {
                data: [
                    ['System', firstAdapter.getSystemId()],
                    ['Description', firstAdapter.getDescription()],
                    ['Model', firstAdapter.getName()]
                ].concat(firstSolution.systemId === 'caret' ? [
                    ['Label', firstSolution.meta.label],
                    ['Caret/R Method', firstSolution.meta.method],
                    ['Tags', firstSolution.meta.tags],
                ] : firstSolution.systemId === 'd3m' ? [
                    // ['Status', firstSolution.status],
                    // ['Created', new Date(firstSolution.created).toUTCString()]
                ] : [
                    firstSolution.systemId === 'TwoRavens' && ['All Hyperparameters', firstSolution.all_parameters],
                    ['Model Zip', m(Button, {
                        onclick: () => {
                            solverWrapped.downloadModel(firstSolution)
                        }
                    }, 'Download')]
                ]),
                style: {background: 'white'}
            }),

            utils.bold("Downloads"),
            m(Table, {
                sortable: true,
                sortHeader: 'name',
                data: Object.keys(resultsCache[problem.problemId]?.producePaths[firstSolution.solutionId] ?? {})
                    .map(produceName => ({
                        'name': produceName,
                        // 'predict type': produce.configuration.predict_type,
                        'input': m(Button, {
                            onclick: () => app.downloadFile(
                                problem.results.datasetPaths[produceName]
                                ?? resultsCache[problem.problemId].datasetPaths?.[produceName])
                        }, 'Download'),
                        'output': m(Button, {
                            onclick: () => app.downloadFile(
                                'file://' + resultsCache[problem.problemId].producePaths?.[firstSolution.solutionId]?.[produceName])
                        }, 'Download'),
                    }))
            })
        );

        let predictionSummary = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Prediction Summary',
            shown: resultsSubpanels['Prediction Summary'],
            setShown: state => {
                resultsSubpanels['Prediction Summary'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_PREDICTION_SUMMARY',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Prediction Summary'] && this.predictionSummary(problem, selectedAdapters));

        let scoresSummary = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Scores Summary',
            shown: resultsSubpanels['Scores Summary'],
            setShown: state => {
                resultsSubpanels['Scores Summary'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_SCORES_SUMMARY',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Scores Summary'] && this.scoresSummary(problem, selectedAdapters));

        let variableImportance = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Variable Importance',
            shown: resultsSubpanels['Variable Importance'],
            setShown: state => {
                resultsSubpanels['Variable Importance'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_VARIABLE_IMPORTANCE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Variable Importance'] && this.variableImportance(problem, selectedAdapters));

        let modelInterpretation = selectedAdapters.length === 1 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Model Interpretation',
            shown: resultsSubpanels['Model Interpretation'],
            setShown: state => {
                resultsSubpanels['Model Interpretation'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_MODEL_INTERPRETATION',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Model Interpretation'] && this.modelInterpretation(problem, selectedAdapters));

        let visualizePipelinePanel = selectedAdapters.length === 1 && firstSolution.systemId === 'd3m' && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Visualize Pipeline',
            shown: resultsSubpanels['Visualize Pipeline'],
            setShown: state => {
                resultsSubpanels['Visualize Pipeline'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_VISUALIZE_PIPELINE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Visualize Pipeline'] && this.visualizePipeline(firstSolution));


        let uploadDataset = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Upload Dataset',
            shown: resultsSubpanels['Upload Dataset'],
            setShown: state => {
                resultsSubpanels['Upload Dataset'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_CUSTOM_PRODUCE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Upload Dataset'] && this.uploadDataset(problem, selectedAdapters));

        let variableExplore = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Variable Exploration',
            shown: resultsSubpanels['Variable Exploration'],
            setShown: state => {
                resultsSubpanels['Variable Exploration'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_VARIABLE_EXPLORE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Variable Exploration'] && this.variableExplore(problem, selectedAdapters));

        let customExplore = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Data Exploration',
            shown: resultsSubpanels['Data Exploration'],
            setShown: state => {
                resultsSubpanels['Data Exploration'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_CUSTOM_EXPLORE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Data Exploration'] && this.customExplore(problem, selectedAdapters));

        let customExploreMapping = m(Subpanel, {
            style: {margin: '0px 1em', position: 'relative'},
            header: 'Mapping Exploration',
            shown: resultsSubpanels['Mapping Exploration'],
            setShown: state => {
                resultsSubpanels['Mapping Exploration'] = state;
                if (state) {
                    // behavioral logging
                    let logParams = {
                        feature_id: 'VIEW_MAPPING_EXPLORE',
                        activity_l1: 'MODEL_SELECTION',
                        activity_l2: 'MODEL_EXPLANATION'
                    };
                    app.saveSystemLogEntry(logParams);
                }
            }
        }, resultsSubpanels['Mapping Exploration'] && this.customExplore(problem, selectedAdapters, true));

        let performanceStatsContents = firstSolution.systemId === 'caret' && Object.keys(firstSolution.models)
            .filter(target => firstSolution.models[target].statistics)
            .map(target => m('div',
                m('h5', target),
                m(Table, {data: firstSolution.models[target].statistics[0]})));
        let performanceStats = performanceStatsContents.length > 0 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Performance Statistics',
            shown: resultsSubpanels['Performance Statistics'],
            setShown: state => resultsSubpanels['Performance Statistics'] = state
        }, performanceStatsContents);

        let coefficientsContents = firstSolution.systemId === 'caret' && Object.keys(firstSolution.models)
            .filter(target => firstSolution.models[target].coefficients !== undefined)
            .map(target => m('div',
                m('h5', target),
                m(Table, {
                    data: ['intercept', ...getPredictorVariables(problem)].map((predictor, i) => [
                        predictor,
                        firstSolution.models[target].coefficients[i]
                    ])
                }),
                firstSolution.models[target].coefficientCovarianceMatrix && m(ConfusionMatrix, {
                    id: target + 'CovarianceMatrix',
                    title: 'Coefficient Covariance Matrix for ' + target,
                    data: firstSolution.models[target].coefficientCovarianceMatrix,
                    startColor: '#e9ede8',
                    endColor: '#5770b0',
                    xLabel: '',
                    yLabel: '',
                    classes: ['intercept', ...getPredictorVariables(problem)],
                    margin: {left: 10, right: 10, top: 50, bottom: 10},
                    attrsAll: {style: {height: '600px'}}
                })));
        let coefficientMatrix = coefficientsContents.length > 0 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Coefficients',
            shown: resultsSubpanels['Coefficients'],
            setShown: state => resultsSubpanels['Coefficients'] = state
        }, coefficientsContents);


        let prepareANOVA = table => [...getPredictorVariables(problem), 'Residuals']
            .map(predictor => table.find(row => row._row === predictor))
            .map(row => ({
                'Predictor': row._row,
                'Sum Sq': row['Sum Sq'],
                'Df': row.Df,
                'Mean Sq': row['Mean Sq'],
                'F value': row['F value'],
                'P-value': row['Pr(>F)']
            }));

        let anovaTablesContent = firstSolution.systemId === 'caret' && Object.keys(firstSolution.models)
            .filter(target => firstSolution.models[target].anova)
            .map(target => m('div',
                m('h5', target),
                m(Table, {data: prepareANOVA(firstSolution.models[target].anova)})));
        let anovaTables = (anovaTablesContent || []).length > 0 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'ANOVA Tables',
            shown: resultsSubpanels['ANOVA Tables'],
            setShown: state => resultsSubpanels['ANOVA Tables'] = state
        }, anovaTablesContent);

        let VIFContents = firstSolution.systemId === 'caret' && Object.keys(firstSolution.models)
            .filter((target, i) => i === 0 && firstSolution.models[target].vif)
            .map(target => m('div',
                m(Table, {
                    data: Object.keys(firstSolution.models[target].vif).map(predictor => [
                        predictor,
                        firstSolution.models[target].vif[predictor][0]
                    ])
                })));
        let VIF = (VIFContents || []).length === 1 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Variance Inflation',
            shown: resultsSubpanels['Variance Inflation'],
            setShown: state => resultsSubpanels['Variance Inflation'] = state
        }, VIFContents);

        return m('div', {style: {margin: '1em 0px'}},
            problemSummary,
            solutionSummary,
            predictionSummary,
            customExplore,
            customExploreMapping,
            variableExplore,
            scoresSummary,
            variableImportance,
            modelInterpretation,
            visualizePipelinePanel,
            performanceStats,
            coefficientMatrix,
            anovaTables,
            VIF,
            uploadDataset,
        );
    }
}


export let showFinalPipelineModal = false;
export let setShowFinalPipelineModal = state => showFinalPipelineModal = state;

export let finalPipelineModal = () => {
    let selectedProblem = getSelectedProblem();

    let chosenSolution = getSolutions(selectedProblem, 'd3m').find(solution => solution.chosen);
    if (!chosenSolution) return;

    let adapter = getSolutionAdapter(selectedProblem, chosenSolution);

    return m(ModalVanilla, {
            id: 'finalPipelineModal',
            setDisplay: setShowFinalPipelineModal
        },
        m('h4', 'Pipeline ', adapter.getSolutionId()),
        'Task Two Complete. Your selected pipeline has been submitted.',

        // m('br'),
        // m(Button, {
        //     onclick: () => {
        //         // TODO: this is not feasible, because urls have length limits
        //         // TODO: use link sharing and open a saved workspace instead
        //         let deployUrl = new URL(`http://${window.location.host}/#!/deploy`);
        //         deployUrl.searchParams.append('problem', JSON.stringify(selectedProblem))
        //         console.log(deployUrl.href);
        //         m.route.set(deployUrl.href)
        //     }
        // }, 'Load a deploy interface.'),
    )
};

// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getProblem: () => problem,
    getSolution: () => solution,
    getName: () => solution.name,
    getDescription: () => solution.description,
    getSystemId: () => solution.systemId,
    getSolutionId: () => solution.solutionId || 'unknown',
    getIsLoading: isSelected => {
        let cache = resultsCache?.[problem.problemId];
        return isSelected && (cache?.interpretationEFDLoading
            || Object.values(cache?.interpretationICEFittedLoading ?? {}).some(_=>_)
            || Object.values(cache?.datasetPathsLoading ?? {}).some(_=>_)
            || cache?.domainsLoading
            || cache?.dataSampleLoading?.[resultsPreferences.dataSplit]
            || Object.values(cache?.boundaryImagePathsLoading?.[resultsPreferences.target]?.[resultsPreferences.dataSplit] ?? {}).some(_=>_))

            || Object.values(cache?.importanceScoresLoading?.[solution.solutionId] ?? {}).some(_=>_)
            || cache?.interpretationPartialsFittedLoading?.[solution.solutionId]
            || cache?.confusionLoading?.[solution.solutionId]
            || cache?.fittedVsActualLoading?.[solution.solutionId]
            || Object.values(cache?.fittedLoading?.[solution.solutionId] ?? {}).some(_=>_)
            || Object.values(cache?.producePathsLoading?.[solution.solutionId] ?? {}).some(_=>_)
    },
    getProduceDataPath: name => {
        let adapter = getSolutionAdapter(problem, solution);
        loadProducePath(adapter, name, problem.results.datasetPaths[name], problem.results.datasetSchemaPaths[name]);
        return resultsCache?.[problem.problemId]?.producePaths?.[solution.solutionId]?.[name]
    },
    getFittedVsActuals: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadFittedVsActuals(problem, adapter);
        return resultsCache?.[problem.problemId]?.fittedVsActual?.[solution.solutionId]?.[target]
    },
    getConfusionMatrix: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadConfusionData(problem, adapter);
        return resultsCache?.[problem.problemId]?.confusion?.[solution.solutionId]?.[target]
    },
    getColumnSample: (target, split, indices) => {
        loadDataSample(problem, split, indices);
        let sample = resultsCache?.[problem.problemId]?.dataSample?.[split]
        if (sample) return sample.map(obs => obs[target])
    },
    getDataSample: (split, indices) => {
        loadDataSample(problem, split, indices);
        return resultsCache?.[problem.problemId]?.dataSample?.[split]
    },
    getFitted: (target, split) => {
        let adapter = getSolutionAdapter(problem, solution);
        loadFittedData(problem, adapter, split);
        let fitted = resultsCache?.[problem.problemId].fitted?.[adapter.getSolutionId()]?.[split];
        if (fitted) return fitted.map(obs => obs[target]);
    },
    getScore: metric => {
        if (!solution.scores) return;
        let evaluation = solution.scores.find(score => app.d3mMetricsInverted[score.metric.metric] === metric);
        return evaluation && evaluation.value
    },
    getInterpretationEFD: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadInterpretationEFDData(problem, adapter);

        return resultsCache?.[problem.problemId]?.interpretationEFD?.[predictor]
    },
    getInterpretationPartials: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadInterpretationPartialsFittedData(adapter);

        if (!resultsCache?.[problem.problemId]?.interpretationPartialsFitted?.[adapter.getSolutionId()]) return;

        return utils.melt(
            resultsCache[problem.problemId].domains[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    resultsCache[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()][predictor][i])),
            [predictor],
            valueLabel, variableLabel);
    },
    getInterpretationICE: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadInterpretationICEFittedData(adapter, predictor);

        return resultsCache?.[problem.problemId]?.interpretationICEFitted?.[predictor]
    },
    getImportanceScore: (target, mode) => {
        let adapter = getSolutionAdapter(problem, solution);
        // TODO: importance scores for partials, PDP/ICE
        mode = 'EFD'
        loadImportanceScore(problem, adapter, mode);

        return resultsCache?.[problem.problemId]?.importanceScores?.[adapter.getSolutionId()]?.[mode]?.[target];
    },
    // get the bounding box image for the selected problem's target variable, in the desired split, at the given index
    getObjectBoundaryImagePath: (target, split, index) => {
        let selectedSolutions = getSelectedSolutions(problem);
        let adapters = selectedSolutions
            .map(solution => getSolutionAdapter(problem, solution));

        loadObjectBoundaryImagePath(problem, adapters, target, split, index);
        return resultsCache?.[problem.problemId]?.boundaryImagePaths?.[target]?.[split]?.[JSON.stringify(index)];
    }
});


/**
 * @param {Problem} problem
 * @returns {*}
 */
let getSystemAdapters = problem => {

    // Available systems
    //  Note: h2o - requires Java
    let solverCandidateNames = app.applicableSolvers[problem.task][getSubtask(problem)];

    // only show solvers that are capable of solving this type of problem
    let solverSystemNames = TA2_WRAPPED_SOLVERS // set in templates/index.html
        .filter(name => solverCandidateNames.includes(name));

    let d3m_solver_info = TA2_D3M_SOLVER_ENABLED ? {d3m: solverD3M.getD3MAdapter(problem)} : {};

    return solverSystemNames
        .reduce((out, systemId) => Object.assign(out, {
            [systemId]: solverWrapped.getSystemAdapterWrapped(systemId, problem)
        }), d3m_solver_info);
}

/**
 * @param {Problem} selectedProblem
 * @returns {*}
 */
let getComparableProblems = selectedProblem => Object.values(app.workspace.raven_config.problems)
    // comparable problems must have solutions
    .filter(problem => problem !== selectedProblem && problem.results?.solutions)
    // comparable problems must share targets
    .filter(problem => JSON.stringify(getTargetVariables(problem).sort()) === JSON.stringify(getTargetVariables(selectedProblem).sort()))
    // comparable problems must share scoring configuration
    .filter(problem => JSON.stringify(problem.scoreOptions) === JSON.stringify(selectedProblem.scoreOptions));


/**
 * @param {Problem} problem
 * @param {string} systemId
 * @returns {Solution}
 */
export let getBestSolution = (problem, systemId) => {
    let solutions = systemId
        ? Object.values(problem.results.solutions[systemId])
        : Object.keys(problem.results.solutions)
            .flatMap(systemId => Object.values(problem.results.solutions[systemId]));

    let adapters = solutions.map(solution => getSolutionAdapter(problem, solution));
    let direction = reverseSet.includes(resultsPreferences.selectedMetric) ? -1 : 1;
    let scorings = adapters
        .map(adapter => [adapter, adapter.getScore(resultsPreferences.selectedMetric) * direction])
        .filter(([_, score]) => !isNaN(score))

    if (scorings.length === 0) return
    return scorings.reduce((best, current) => best[1] > current[1] ? best : current)[0]
}

/**
 * @param {Problem[]} problems
 * @param {string} systemId
 * @returns {*}
 */
let getSolutionTable = (problems, systemId) => {
    let adapters = problems.flatMap(problem => {
        let solutionMap = problem.results.solutions || {};
        let solutions = systemId
            ? Object.values(solutionMap[systemId])
            : Object.keys(solutionMap)
                .flatMap(systemId => Object.values(solutionMap[systemId]))
        return solutions.map(solution => getSolutionAdapter(problem, solution))
    });

    let activeAdapters = new Set(adapters
        .filter(adapter => (adapter.getProblem().results.selectedSolutions[adapter.getSystemId()]
            || '').includes(adapter.getSolutionId())));

    // metrics shown in the table are whatever was selected in the current problem's scoring configuration
    let problem = getSelectedProblem();
    let data = adapters
        // extract data for each row (identification and scores)
        .map(adapter => Object.assign(
            {
                adapter,
                '': adapter.getIsLoading(activeAdapters.has(adapter))
                    ? common.loaderSmall("solutionTable")
                    : m('[style=width:20px]'),
                id: String(adapter.getSolutionId())
            },
            problems.length > 1 ? {problem: adapter.getProblem().problemId} : {},
            {solver: adapter.getSystemId(), solution: adapter.getName()},
            [problem.metric, ...problem.metrics]
                .reduce((out, metric) => Object.assign(out, {
                    [metric]: utils.formatPrecision(adapter.getScore(metric))
                }), {})));

    return m(Table, {
        id: 'solutionTable' + (systemId || ''), data,
        sortable: true, showUID: false,
        sortHeader: resultsPreferences.selectedMetric,
        setSortHeader: header => resultsPreferences.selectedMetric = header,
        sortDescending: !reverseSet.includes(resultsPreferences.selectedMetric),
        activeRow: activeAdapters,
        onclick: adapter => {
            let problem = adapter.getProblem();
            problem.results.userSelectedSolution = true;
            setSelectedSolution(problem, adapter.getSystemId(), adapter.getSolutionId())
        }
    })
};

let leftTabResults = 'Solutions'; // default value

/**
 * The name of the tab will bring the selected tab to the forefront,
 * similar to clicking the tab button
 * @param {string} tabName
 */
let setLeftTabResults = tabName => {

    leftTabResults = tabName;

    // behavioral logging
    let logParams = tabName === 'Solutions' ? {
        feature_id: 'RESULTS_VIEW_SOLUTIONS',
        activity_l1: 'MODEL_SELECTION',
        activity_l2: 'MODEL_SUMMARIZATION',
    } : {
        feature_id: 'RESULTS_VIEW_PROBLEM_SEARCHES',
        activity_l1: 'MODEL_SELECTION',
        activity_l2: 'PROBLEM_SEARCH_SELECTION',
    };
    app.saveSystemLogEntry(logParams);
};

let setResultsFactor = factor => resultsPreferences.factor = factor === 'undefined' ? undefined : factor;
let setInterpretationPage = page => {
    resultsPreferences.interpretationPage = page;
    let cache = resultsCache[getSelectedProblem().problemId];
    if (cache) cache.interpretationICEFitted = {};
}

// labels for model interpretation X/Y axes
export let valueLabel = "Observation";
export let variableLabel = "Dependent Variable";

// array of metrics to sort low to high
export let reverseSet = [
    "meanSquaredError", "rootMeanSquaredError", "meanAbsoluteError", "hammingLoss", "rank", "loss"
];

// searchID: {running: true} for searchIDs streamed back from TA2 that are not in the workspace
export let otherSearches = {};

let resultsSubpanels = {
    'Prediction Summary': true,
    'Scores Summary': false,
    'Data Subsetting': false,
    'Variance Inflation': false,
    'ANOVA Tables': false,
    'Coefficients': false,
    'Performance Statistics': false,
    'Visualize Pipeline': false,
    'Solution Description': false,
    'Problem Description': false,
    'Variable Importance': false,
    'Model Interpretation': false,
    'Upload Dataset': false,
    'Variable Exploration': false,
    'Data Exploration': false,
    'Mapping Exploration': false,
};

/**
 * when selected, the solutionId is added to the problem.selectedSolutions[systemId] array
 * @param {Problem} problem
 * @param {string} systemId
 * @param {string} solutionId
 */
export let setSelectedSolution = (problem, systemId, solutionId) => {
    solutionId = String(solutionId);

    // set behavioral logging
    let logParams = {
        activity_l1: 'MODEL_SELECTION',
        other: {solutionId: solutionId}
    };

    if (!problem) return;
    if (!(systemId in problem.results.selectedSolutions)) problem.results.selectedSolutions[systemId] = [];

    // TODO: find a better place for this/code pattern. Unsetting this here is ugly
    if (problem.problemId in resultsCache) {
        resultsCache[problem.problemId].interpretationICEFitted = {};
        resultsCache[problem.problemId].interpretationICEFittedLoading = {};
    }

    if (modelComparison) {

        if (problem.results.selectedSolutions[systemId].includes(solutionId))
            utils.remove(problem.results.selectedSolutions[systemId], solutionId);
        else {
            problem.results.selectedSolutions[systemId].push(solutionId);
            utils.add(resultsPreferences.explore.variables, `${resultsPreferences.target}-${solutionId}`);
        }
        // set behavioral logging
        logParams.feature_id = 'RESULTS_COMPARE_SOLUTIONS';
        logParams.activity_l2 = 'MODEL_COMPARISON';
    } else {
        problem.results.selectedSolutions = Object.keys(problem.results.selectedSolutions)
            .reduce((out, source) => Object.assign(out, {[source]: []}, {}), {});
        problem.results.selectedSolutions[systemId] = [solutionId];
        utils.add(resultsPreferences.explore.variables, `${resultsPreferences.target}-${solutionId}`);

        getSelectedAdapters(getComparableProblems(problem))
            .map(adapter => adapter.getProblem())
            // empty all of the selections in all other problems
            .forEach(problem => Object.keys(problem.results.selectedSolutions)
                .forEach(systemId => problem.results.selectedSolutions[systemId] = []))

        // set behavioral logging
        logParams.feature_id = 'RESULTS_SELECT_SOLUTION';
        logParams.activity_l2 = 'MODEL_SUMMARIZATION';

        // ------------------------------------------------
        // Logging, include score, rank, and solutionId
        // ------------------------------------------------
        let chosenSolution = problem.results.solutions[systemId][solutionId];
        if (chosenSolution) {
            let adapter = getSolutionAdapter(problem, chosenSolution);
            let score = adapter.getScore(problem.metric);
            if (score !== undefined) {
                logParams.other = {
                    solutionId: chosenSolution.solutionId,
                    rank: getProblemRank(problem.results.solutions[systemId], solutionId),
                    performance: score,
                    metric: resultsPreferences.selectedMetric,
                };
                //  console.log(JSON.str)
            }
        } else {
            console.log('>>>> NOPE! no chosenSolution');
        }
    }

    // record behavioral logging
    app.saveSystemLogEntry(logParams);

    // for easy debugging
    window.selectedSolution = getSelectedSolutions(problem)[0];
};

let getProblemRank = (solutions, solutionId) => {
    let cnt = 0;
    for (let solutionKey of Object.keys(solutions).reverse()) {
        cnt += 1;
        if (solutionKey === solutionId) return String(cnt);
    }
    return String(-1);
};

/**
 * Get solutions for the problem
 * @param {Problem} problem
 * @param {?string} systemId - only get solutions specific to this system
 * @returns {Solution[]}
 */
export let getSolutions = (problem, systemId=undefined) => {
    if (!problem) return [];

    if (systemId) {
        if (!(systemId in problem.results.solutions)) problem.results.solutions[systemId] = [];
        Object.values(problem.results.solutions[systemId]);
    }

    return Object.values(problem.results.solutions)
        .flatMap(source => Object.values(source))
};

/**
 * retrieve solution adapters for all passed problems
 * @param {Problem[]} problems
 * @returns {*[]}
 */
export let getSelectedAdapters = problems =>
    problems.flatMap(problem => getSelectedSolutions(problem)
        .map(solution => getSolutionAdapter(problem, solution)));

/**
 * Get selected solutions for the problem
 * @param {Problem} problem
 * @param {string} systemId
 * @returns {Solution[]}
 */
export let getSelectedSolutions = (problem, systemId=undefined) => {
    if (!problem?.results?.selectedSolutions) return [];

    if (!systemId) return Object.keys(problem.results.selectedSolutions)
        .flatMap(systemId => problem.results.selectedSolutions[systemId]
            .map(id => problem.results.solutions[systemId][id])).filter(_ => _);

    problem.results.selectedSolutions[systemId] = problem.results.selectedSolutions[systemId] || [];
    return problem.results.selectedSolutions[systemId]
        .map(id => problem.results.solutions[systemId][id]).filter(_ => _)
};

export let problemComparison = true;
export let setProblemComparison = state => problemComparison = state;

// When enabled, multiple pipelineTable pipelineIDs may be selected at once
export let modelComparison = false;
export let setModelComparison = state => {
    let selectedProblem = getSelectedProblem();
    let selectedSolutions = getSelectedSolutions(selectedProblem);

    modelComparison = state;
    if (selectedSolutions.length > 1 && !modelComparison) {
        let adapter = getSolutionAdapter(selectedProblem, selectedSolutions[0]);
        setSelectedSolution(selectedProblem, adapter.getSystemId(), adapter.getSolutionId());
    }

    if (!problemComparison) getComparableProblems(selectedProblem)
        .map(adapter => adapter.getProblem())
        // empty all of the selections in all other problems
        .forEach(problem => Object.keys(problem.results.selectedSolutions)
            .forEach(systemId => problem.results.selectedSolutions[systemId] = []))
};

/**
 * mutate confusion data to create significance and explanation fields
 * @param data
 */
export let interpretConfusionMatrix = data => {
    let actualCounts = data
        .reduce((counts, point) => Object.assign(counts, {[point.Actual]: (counts[point.Actual] || 0) + point.count}), {});

    data.forEach(point => {
        point.microCount = point.count / actualCounts[point.Actual];
        point.explanation = point.Predicted === point.Actual
            ? `There are ${point.count} observations where the model correctly predicts class ${point.Predicted}.`
            : `There are ${point.count} observations where the model incorrectly predicts class ${point.Predicted}, but the actual class is ${point.Actual}.`;
        point.significance = +point.microCount > 0.5
            ? `This cell is significant because it contains the majority of observations when the factor is ${point.Actual}.`
            : `Predictions from the model when the actual factor is ${point.Actual} are relatively unlikely to be ${point.Predicted}.`;
    })
};

/**
 * Restructure confusion matrix to a 2x2 based on one factor
 * @param data
 * @param factor
 * @returns {*}
 */
export let confusionMatrixFactor = (data, factor) => {
    let matrix = [[0, 0], [0, 0]];
    factor = String(factor);

    data.forEach(point =>
        matrix[Number(String(point.Predicted) === factor)][Number(String(point.Actual) === factor)] += point.count);

    data = [
        {Predicted: factor, Actual: factor, count: matrix[1][1]},
        {Predicted: factor, Actual: 'not ' + factor, count: matrix[1][0]},
        {Predicted: 'not ' + factor, Actual: factor, count: matrix[0][1]},
        {Predicted: 'not ' + factor, Actual: 'not ' + factor, count: matrix[0][0]}
    ];
    // mutate data in-place
    interpretConfusionMatrix(data);
    return {
        data: data,
        classes: [factor, 'not ' + factor]
    }
};

/**
 * generate an object containing accuracy, recall, precision, F1, given a 2x2 confusion data matrix
 * the positive class is the upper left block
 * @param data2x2
 * @param positiveFactor
 * @returns {{precision: *, recall: *, accuracy: *, f1: *}}
 */
export function generatePerformanceData(data2x2, positiveFactor) {

    positiveFactor = String(positiveFactor);
    let tp = (data2x2.find(point => (String(point.Predicted) === positiveFactor) && (String(point.Actual) === positiveFactor)) || {count: 0}).count;
    let fn = (data2x2.find(point => (String(point.Predicted) !== positiveFactor) && (String(point.Actual) === positiveFactor)) || {count: 0}).count;
    let fp = (data2x2.find(point => (String(point.Predicted) === positiveFactor) && (String(point.Actual) !== positiveFactor)) || {count: 0}).count;
    let tn = (data2x2.find(point => (String(point.Predicted) !== positiveFactor) && (String(point.Actual) !== positiveFactor)) || {count: 0}).count;

    let p = tp + fn;
    let n = fp + tn;

    let round = (number, digits) => Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits);

    return {
        f1: round(2 * tp / (2 * tp + fp + fn), 2),
        precision: round(tp / (tp + fp), 2), // positive predictive value
        recall: round(tp / (tp + fn), 2), // sensitivity, true positive rate
        accuracy: round((tp + tn) / (p + n), 2),

        // specificity: round(fp / (fp + tn), 2),
        // 'true positive rate': round(tp / (tp + fn), 2), // already included with recall
        // 'true negative rate': round(tn / (tn + fp), 2),
        // 'false positive rate': round(fp / (fp + tn), 2),
        // 'false negative rate': round(fn / (fn + tp), 2), // miss rate
    }
}

// {[name]: [path]}
let customDatasetCount = 0;
let getCustomDatasetId = () => 'dataset ' + customDatasetCount++;
export let customDatasets = {};

/**
 * Materialize a dataset with additional columns for solutions
 * @param problem
 * @param adapters
 * @returns abstract pipeline that joins predictions from adapters into original data
 */
let getResultsAbstractPipelineTargets = (problem, adapters) => adapters
    .map(adapter => [adapter, adapter.getProduceDataPath(resultsPreferences.dataSplit)])
    .filter(([_, producePath]) => producePath)
    .map(([adapter, producePath]) => ({
        type: 'join',
        from: `${app.workspace.d3m_config.name}_split_${utils.generateID(problem.results.datasetPaths[resultsPreferences.dataSplit])}_produce_${utils.generateID(producePath)}`,
        fromPath: producePath,
        index: problem.tags.indexes[0],
        variables: {
            [`${resultsPreferences.target}_${adapter.getSolutionId()}`]: resultsPreferences.target
        }
    }));

let getResultsAbstractPipeline = (problem, splitCollectionName, splitDatafile, all) => {
    // if there are variables in the results query that are not included in the data split,
    //     start from the root dataset, use lookup on split to filter base dataset
    if (all || resultsQuery[0].abstractQuery.some(node => queryMongo.getSubsetDependencies(node).length > 0)) {
        return {
            collectionName: app.workspace.d3m_config.name,
            datafile: app.workspace.datasetPath,
            pipeline: [
                ...getAbstractPipeline(problem, true),
                {
                    type: 'join',
                    from: splitCollectionName,
                    fromPath: splitDatafile,
                    index: problem.tags.indexes[0],
                    variables: problem.results.variablesInitial
                        .reduce((out, variable) => Object.assign(out, {[variable]: variable}), {})
                },
                ...resultsQuery
            ],
            variablesInitial: app.workspace.raven_config.variablesInitial,
            datasets: {[splitCollectionName]: {path: splitDatafile, indexes: problem.tags.indices}}
        }
    } else {
        // if the data split covers the results query, skip manipulations on base dataset
        return {
            collectionName: splitCollectionName,
            datafile: splitDatafile,
            pipeline: resultsQuery,
            variablesInitial: app.workspace.raven_config.variablesInitial
        }
    }
}

// manipulations to apply to data after joining predictions
export let resultsQuery = [
    {
        type: 'subset',
        id: 0,
        abstractQuery: [],
        nodeId: 1,
        groupId: 1
    }
];

/**
 * Invalidate/reset the resultsCache if problem has changed
 * @param {Problem} problem
 */
export let checkResultsCache = problem => {

    let problemId = problem.problemId;
    // create a default problem
    if (!(problemId in resultsCache))
        resultsCache[problemId] = buildProblemResultsCache();

    // complete reset if query, dataSplit or target changed
    if (resultsCache[problemId].id.query === JSON.stringify(resultsQuery)
        && resultsCache[problemId].id.dataSplit === resultsPreferences.dataSplit
        && resultsCache[problemId].id.target === resultsPreferences.target)
        return;

    resultsCache[problemId] = buildProblemResultsCache();
    resultsCache[problemId].id = {
        query: JSON.stringify(resultsQuery),
        solutionId: undefined,
        dataSplit: resultsPreferences.dataSplit,
        target: resultsPreferences.target
    }
};

/**
 * Invalidate parts of the resultsCache if solution has changed
 * @param {Problem} problem
 * @param adapter
 * @returns {Promise<void>}
 */
export let loadSolutionData = async (problem, adapter) => {
    await checkResultsCache(problem);

    if (resultsCache[problem.problemId].id.solutionId === adapter.getSolutionId())
        return;

    resultsCache[problem.problemId].id.solutionId = adapter.getSolutionId();

    // solution specific, one solution stored
    resultsCache[problem.problemId].interpretationEFD = undefined;
    resultsCache[problem.problemId].interpretationEFDLoading = false;
};

/**
 * Potentially invalidate parts of results cache.
 * Load fitted vs actuals if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param adapter
 * @returns {Promise<void>}
 */
export let loadFittedVsActuals = async (problem, adapter) => {
    await loadSolutionData(problem, adapter);

    let produceName = resultsPreferences.dataSplit;
    let dataPointer = problem.results.datasetPaths[produceName];
    let schemaPointer = problem.results.datasetSchemaPaths[produceName];

    // don't attempt to load produce if there is no data
    if (!dataPointer || !schemaPointer)
        return;

    // ensure produce is running
    await loadProducePath(adapter, produceName, dataPointer, schemaPointer);

    let producePointer = adapter.getProduceDataPath(produceName);

    // don't load if data is not available
    if (!producePointer)
        return;

    // fitted vs actuals don't apply for non-regression problems
    if (!['regression', 'semisupervisedregression', 'forecasting'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsCache[problem.problemId].fittedVsActual)
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()] = true;
    m.redraw()

    let produceId = utils.generateID(producePointer);
    let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];
    let splitCollectionName = `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`;

    // how to construct actual values after manipulation
    let {
        collectionName, datafile, pipeline, variablesInitial, datasets
    } = getResultsAbstractPipeline(problem, splitCollectionName, splitPath)
    let compiled = queryMongo.buildPipeline(pipeline, variablesInitial).pipeline;

    let tempQuery = resultsCache[problem.problemId].id.query;
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-fitted-vs-actuals-data`, {
            method: 'POST',
            body: {
                data_pointer: producePointer,
                metadata: {
                    targets: getTargetVariables(problem),
                    collection_name: collectionName,
                    datafile,
                    query: compiled,
                    produceId,
                    // auxiliary datasets to join against
                    datasets
                }
            }
        });

        if (!response.success) {
            console.warn(response);
            throw response.data;
        }
    } catch (err) {
        console.warn("retrieve-output-fitted-vs-actuals-data error");
        console.log(err);
        app.alertWarn('Fitted vs Actuals data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    resultsCache[problem.problemId].fittedVsActual[adapter.getSolutionId()] = response.data;
    resultsCache[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()] = false;

    // apply state changes to the page
    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load confusion data if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param adapter
 * @returns {Promise<void>}
 */
export let loadConfusionData = async (problem, adapter) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let produceName = resultsPreferences.dataSplit;
    let dataPointer = problem.results.datasetPaths[produceName];
    let schemaPointer = problem.results.datasetSchemaPaths[produceName];

    // don't attempt to load produce if there is no data
    if (!dataPointer || !schemaPointer)
        return;

    // ensure produce is running
    await loadProducePath(adapter, produceName, dataPointer, schemaPointer);

    let producePointer = adapter.getProduceDataPath(produceName);

    // don't load if data is not available
    if (!producePointer)
        return;

    // confusion matrices don't apply for non-classification problems
    if (!['classification', 'vertexclassification'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].confusionLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsCache[problem.problemId].confusion)
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].confusionLoading[adapter.getSolutionId()] = true;
    m.redraw()

    let produceId = utils.generateID(producePointer);
    let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];
    let splitCollectionName = `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`;

    // how to construct actual values after manipulation
    let {
        collectionName, datafile, pipeline, variablesInitial, datasets
    } = getResultsAbstractPipeline(problem, splitCollectionName, splitPath)
    let compiled = queryMongo.buildPipeline(pipeline, variablesInitial).pipeline;

    let tempQuery = resultsCache[problem.problemId].id.query;

    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-confusion-data`, {
            method: 'POST',
            body: {
                data_pointer: producePointer,
                metadata: {
                    targets: getTargetVariables(problem),
                    collection_name: collectionName,
                    datafile: datafile,
                    query: compiled,
                    produceId,
                    datasets
                }
            }
        });

        if (!response.success) {
            // console.warn(response);
            throw response.data;
        }
    } catch (err) {
        // console.warn("retrieve-output-confusion-data error");
        console.log(err);
        app.alertWarn('Confusion matrix data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    Object.keys(response.data).forEach(variable => {
        if (response.data[variable].classes.length <= 15) {
            response.data[variable].classes = response.data[variable].classes
                .sort(utils.omniSort);

            let extraPoints = [];
            response.data[variable].classes.forEach(levelActual =>
                response.data[variable].classes.forEach(levelPredicted => {
                    if (!response.data[variable].data.find(point => point.Actual === levelActual && point.Predicted === levelPredicted))
                        extraPoints.push({Actual: levelActual, Predicted: levelPredicted, count: 0})
                }));
            response.data[variable].data.push(...extraPoints);
        }
        interpretConfusionMatrix(response.data[variable].data)
    });

    resultsCache[problem.problemId].confusion[adapter.getSolutionId()] = response.data;
    resultsCache[problem.problemId].confusionLoading[adapter.getSolutionId()] = false;

    // apply state changes to the page
    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load a data sample if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param {string} split - which data split to sample from
 * @param {?*[]} indices - sample from rows where the index column contains these values
 * @returns {Promise<void>}
 */
export let loadDataSample = async (problem, split, indices=undefined) => {

    // reset if id is different
    await checkResultsCache(problem);

    let dataSampleIndices = JSON.stringify(indices);
    if (resultsCache[problem.problemId].dataSampleIndices?.[split] !== dataSampleIndices) {
        utils.setDeep(resultsCache, [problem.problemId, 'dataSampleIndices', split], dataSampleIndices)
        utils.setDeep(resultsCache, [problem.problemId, 'dataSample', split], undefined)
        utils.setDeep(resultsCache, [problem.problemId, 'dataSampleLoading', split], false)
    }
    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].dataSampleLoading[split])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId].dataSample[split])
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].dataSampleLoading[split] = true;
    m.redraw()

    let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];
    let splitCollectionName = `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`;

    // how to construct actual values after manipulation
    let {
        collectionName, datafile, pipeline, variablesInitial, datasets
    } = getResultsAbstractPipeline(problem, splitCollectionName, splitPath, true)

    let compiled = queryMongo.buildPipeline([
        pipeline,
        problem.task === 'objectDetection' && {
            type: 'aggregate',
            measuresUnit: problem.tags.indexes.map(index => ({"subset": "discrete", "column": index})),
            // collect all the values in the target column into an array, and take the first value in the image column
            // TODO: "image" should not be hardcoded
            measuresAccum: [
                ...getTargetVariables(problem).map(target => ({"subset": "push", "column": target})),
                {'subset': 'first', 'column': 'image'}
            ]
        },
        indices && {
            type: "subset",
            abstractQuery: [
                {
                    children: indices.map(index => ({value: index})),
                    column: "d3mIndex",
                    negate: "false",
                    operation: "and",
                    subset: "discrete",
                    type: "rule"
                }
            ]
        },
        {
            type: 'menu',
            metadata: {
                type: 'data',
                sample: resultsPreferences.recordLimit
            }
        }], variablesInitial).pipeline;

    let tempQuery = resultsCache[problem.problemId].id.query;

    let response;
    try {
        response = await app.getData({
            method: 'aggregate',
            datafile: datafile,
            collection_name: collectionName,
            reload: false,
            query: JSON.stringify(compiled),
            datasets
        })
    } catch (err) {
        console.warn("retrieve data sample error");
        console.log(err);
        app.alertWarn('Data sample from splits has failed to load. Some plots will not load.')
        return;
    }

    // don't accept if query changed
    if (resultsCache[problem.problemId].id.query !== tempQuery)
        return;

    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    if (resultsCache[problem.problemId].dataSampleIndices[split] !== dataSampleIndices)
        return;

    resultsCache[problem.problemId].dataSample[split] = response;
    resultsCache[problem.problemId].dataSampleLoading[split] = false;

    m.redraw()
};

/**
 * Potentially invalidate parts of results cache.
 * Load fitted data if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 *
 * Typically used for time series plotting
 * @param {Problem} problem
 * @param adapter
 * @param {string} split - which data split to pull from
 * @returns {Promise<void>}
 */
export let loadFittedData = async (problem, adapter, split) => {
    await loadDataSample(problem, split);

    let dataPointer = problem.results.datasetPaths[split];
    let schemaPointer = problem.results.datasetSchemaPaths[split];

    // don't attempt to load produce if there is no data
    if (!dataPointer || !schemaPointer)
        return;

    // ensure produce is running
    await loadProducePath(adapter, split, dataPointer, schemaPointer);

    let producePointer = adapter.getProduceDataPath(split);

    // don't load if data is not available
    if (!producePointer)
        return;

    // indices from dataSample must be loaded first
    if (!(split in resultsCache[problem.problemId].dataSample))
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].fittedLoading?.[adapter.getSolutionId()]?.[split])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId].fitted?.[adapter.getSolutionId()]?.[split])
        return;

    // begin blocking additional requests to load
    utils.setDeep(resultsCache, [problem.problemId, 'fittedLoading', adapter.getSolutionId(), split], true);
    m.redraw()

    let tempQuery = resultsCache[problem.problemId].id.query;
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
            method: 'POST',
            body: {
                data_pointer: producePointer,
                indices: resultsCache[problem.problemId].dataSample[split].map(obs => obs.d3mIndex)
            }
        });

        if (!response.success) {
            console.warn(response);
            throw response.data;
        }
    } catch (err) {
        console.warn("retrieve-output-data error");
        console.log(err);
        app.alertWarn('Fitted data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    // attempt to parse all data into floats
    let nominals = getNominalVariables(problem);
    response.data.forEach(row => getTargetVariables(problem)
        .filter(target => !nominals.includes(target))
        .forEach(target => {
            if (!(target in row)) return;

            let parsed = parseFloat(row[target]);
            if (!isNaN(parsed)) row[target] = parsed
        }));

    utils.setDeep(resultsCache, [problem.problemId, 'fitted', adapter.getSolutionId(), split], response.data);
    utils.setDeep(resultsCache, [problem.problemId, 'fittedLoading', adapter.getSolutionId(), split], false);

    // apply state changes to the page
    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load interpretation data for partials if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param adapter
 * @returns {Promise<void>}
 */
export let loadInterpretationPartialsFittedData = async (adapter) => {
    let problem = adapter.getProblem();

    await loadPartialsDatasetPath(problem);

    let produceName = 'partials';
    let dataPointer = resultsCache[problem.problemId].datasetPaths[produceName];
    let schemaPointer = resultsCache[problem.problemId].datasetSchemaPaths[produceName];

    // don't attempt to load produce if there is no data
    if (!dataPointer || !schemaPointer)
        return;

    // ensure produce is running
    await loadProducePath(adapter, produceName, dataPointer, schemaPointer);

    let producePointer = adapter.getProduceDataPath(produceName);

    // don't attempt to load if there is no data
    if (!producePointer)
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()])
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()] = true;
    m.redraw()

    let tempQuery = resultsCache[problem.problemId].id.query;
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
            method: 'POST',
            body: {data_pointer: producePointer}
        });

        if (!response.success) {
            console.warn(response.data);
            throw response.data;
        }
    } catch (err) {
        console.error(err);
        app.alertWarn('Partials data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    // convert unlabeled string table to predictor format
    let offset = 0;
    resultsCache[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()] =
        Object.keys(resultsCache[problem.problemId].domains).reduce((out, predictor) => {
        let nextOffset = offset + resultsCache[problem.problemId].domains[predictor].length;
        // for each point along the domain of the predictor
        out[predictor] = response.data.slice(offset, nextOffset)
            // for each target specified in the problem
            .map(point => getTargetVariables(problem).reduce((out_point, target) => Object.assign(out_point, {
                [target]: app.inferIsCategorical(target) ? point[target] : utils.parseNumeric(point[target])
            }), {}));
        offset = nextOffset;
        return out;
    }, {});
    resultsCache[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()] = false;

    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load interpretation data for empirical first differences if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param adapter
 * @returns {Promise<void>}
 */
export let loadInterpretationEFDData = async (problem, adapter) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getProduceDataPath(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].interpretationEFDLoading)
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId].interpretationEFD)
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].interpretationEFDLoading = true;
    m.redraw()

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline(
        [...resultsQuery],
        problem.results.variablesInitial)['pipeline'];

    let tempQuery = resultsCache[problem.problemId].id.query;
    let produceId = utils.generateID(dataPointer);
    let response;

    let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];

    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
            method: 'POST',
            body: {
                data_pointer: dataPointer,
                metadata: {
                    produceId,
                    targets: getTargetVariables(problem),
                    predictors: getPredictorVariables(problem),
                    categoricals: [...getNominalVariables(problem)
                        .filter(variable => problem.results.variablesInitial.includes(variable))],
                    datafile: splitPath, // location of the dataset csv
                    collection_name: `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`, // collection/dataset name
                    query: compiled
                }
            }
        });

        if (!response.success)
            throw response.data;
    } catch (err) {
        console.warn("retrieve-output-EFD-data error");
        console.log(err);
        // app.alertWarn('Model interpretation EFD data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    let nominals = getNominalVariables(problem);

    // melt predictor data once, opposed to on every redraw
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor] = utils.melt(
            nominals.includes(predictor)
                ? utils.sample(response.data[predictor], 20, false, true)
                : response.data[predictor],
            ["predictor"], valueLabel, variableLabel));

    // add more granular categorical columns from the compound key 'variableLabel'
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor]
            .forEach(point => {
                point.target = point[variableLabel].split(' ')[0];
                point.level = point[variableLabel].split('-').pop();
            }));

    resultsCache[problem.problemId].interpretationEFD = response.data;
    resultsCache[problem.problemId].interpretationEFDLoading = false;

    // apply state changes to the page
    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load interpretation data for individual condition expectation if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param adapter
 * @param {string} predictor - data for each predictor is computed/retrieved/stored separately
 * @returns {Promise<void>}
 */
export let loadInterpretationICEFittedData = async (adapter, predictor) => {
    let problem = adapter.getProblem();

    await loadICEDatasetPaths(problem);

    let produceName = 'ICE_synthetic_' + predictor;

    let dataPointerPredictor = resultsCache[problem.problemId].datasetPaths[produceName];
    let schemaPointerPredictor = resultsCache[problem.problemId].datasetSchemaPaths[produceName];
    let dataPointerIndex = resultsCache[problem.problemId].datasetIndexPartialsPaths[produceName];

    // don't load if data is not available
    if (!dataPointerPredictor || !dataPointerIndex || !schemaPointerPredictor)
        return;

    // kick off a produce for the ice data
    await loadProducePath(adapter, produceName, dataPointerPredictor, schemaPointerPredictor);

    let dataPointerFitted = adapter.getProduceDataPath(produceName);

    // don't load if data is not available
    if (!dataPointerFitted)
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].interpretationICEFittedLoading[predictor])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId].interpretationICEFitted[predictor])
        return;

    // begin blocking additional requests to load
    resultsCache[problem.problemId].interpretationICEFittedLoading[predictor] = true;
    m.redraw()

    let tempQuery = resultsCache[problem.problemId].id.query;
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-ICE-data`, {
            method: 'POST',
            body: {
                data_pointer_predictors: dataPointerPredictor,
                data_pointer_fitted: dataPointerFitted,
                data_pointer_index: dataPointerIndex,
                variable: predictor
            }
        });
    } catch (err) {
        console.error(err);
        app.alertWarn('ICE data has not been loaded. Some plots will not load.');
        return;
    }

    if (!response.success)
        throw response.data;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    resultsCache[problem.problemId].interpretationICEFitted[predictor] = response.data;
    resultsCache[problem.problemId].interpretationICEFittedLoading[predictor] = false;

    // apply state changes to the page
    m.redraw();
};

/**
 * Potentially invalidate parts of results cache.
 * Load scores for variable importance if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param adapter
 * @param mode - unused, always 'EFD'. Base importance scores off of EFD or ICE
 * @returns {Promise<void>}
 */
let loadImportanceScore = async (problem, adapter, mode) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    // TODO: implement importance based on partials and PDP/ICE
    mode = 'EFD'

    let dataPointers = {};
    if (mode === 'EFD')
        dataPointers = {'EFD': adapter.getProduceDataPath(resultsPreferences.dataSplit)};
    if (mode === 'Partials')
        dataPointers = {'Partials': adapter.getProduceDataPath('partials')};
    if (mode === 'PDP/ICE')
        dataPointers = getPredictorVariables(problem).reduce((out, predictor) => Object.assign(out, {
            [predictor]: adapter.getProduceDataPath('ICE_synthetic_' + predictor)
        }), {});

    // don't load if data is not available
    if (Object.values(dataPointers).some(pointer => !pointer))
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId]?.importanceScoresLoading?.[adapter.getSolutionId()]?.[mode])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId]?.importanceScores?.[adapter.getSolutionId()]?.[mode])
        return;

    // begin blocking additional requests to load
    utils.setDeep(resultsCache, [problem.problemId, 'importanceScoresLoading', adapter.getSolutionId(), mode], true);
    m.redraw()

    let tempQuery = resultsCache[problem.problemId].id.query;
    let response;
    if (mode === 'EFD') {
        // how to construct actual values after manipulation
        let dataPointer = dataPointers['EFD'];
        let compiled = queryMongo.buildPipeline(
            [...resultsQuery],
            problem.results.variablesInitial)['pipeline'];

        let produceId = utils.generateID(dataPointer);

        let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];
        try {
            response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
                method: 'POST',
                body: {
                    data_pointer: dataPointer,
                    metadata: {
                        produceId,
                        targets: getTargetVariables(problem),
                        predictors: getPredictorVariables(problem),
                        categoricals: getNominalVariables(problem),
                        datafile: splitPath, // location of the dataset csv
                        collection_name: `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`, // collection/dataset name
                        query: compiled
                    }
                }
            });

            if (!response.success)
                throw response.data;
        } catch (err) {
            console.warn("retrieve-output-EFD-data error");
            console.log(err);
            // app.alertWarn('Model interpretation EFD data has not been loaded. Some plots will not load.');
            return;
        }
    }

    // if (mode === 'Partials') {
    //     try {
    //         response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
    //             method: 'POST',
    //             body: {data_pointer: dataPointers['Partials']}
    //         });
    //
    //         // console.log(response);
    //
    //         if (!response.success) {
    //             console.warn(response.data);
    //             throw response.data;
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         return;
    //     }
    //     let offset = 0;
    //     let partialsData = Object.keys(resultsCache[problem.problemId].domains).reduce((out, predictor) => {
    //         let nextOffset = offset + resultsCache[problem.problemId].domains[predictor].length;
    //         // for each point along the domain of the predictor
    //         out[predictor] = response.data.slice(offset, nextOffset)
    //             // for each target specified in the problem
    //             .map(point => getTargetVariables(problem).reduce((out_point, target) => Object.assign(out_point, {
    //                 [target]: app.inferIsCategorical(target) ? point[target] : utils.parseNumeric(point[target])
    //             }), {}));
    //         offset = nextOffset;
    //         return out;
    //     }, {});
    //
    //     console.log(partialsData);
    // }

    // if (mode === 'PDP/ICE') {
    //     let responses = {};
    //     await Promise.all(Object.keys(dataPointers).map(async predictor => {
    //         let dataPointerPredictors = problem.results.datasetPaths['ICE_synthetic_' + predictor];
    //         let dataPointerIndex = problem.results.datasetIndexPartialsPaths['ICE_synthetic_' + predictor];
    //         if (!dataPointerPredictors) return;
    //         try {
    //             responses[predictor] = await m.request(D3M_SVC_URL + `/retrieve-output-ICE-data`, {
    //                 method: 'POST',
    //                 body: {
    //                     data_pointer_predictors: dataPointerPredictors,
    //                     data_pointer_fitted: dataPointers[predictor],
    //                     data_pointer_index: dataPointerIndex,
    //                     variable: predictor
    //                 }
    //             });
    //         } catch (err) {
    //             console.error(err);
    //             return;
    //         }
    //     }));
    //
    //     response = Object.keys(responses).reduce((out, resp) => {
    //         return {
    //             success: out.success && resp.success,
    //             data: {scores: Object.assign(out.data.scores, resp.success ? resp.data.scores : {})}
    //         }
    //     }, {success: true, data: {scores: {}}});
    //
    //     console.log(response);
    //     // TODO: variable importance for PDP/ICE
    //     return;
    // }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    let responseImportance = await m.request(ROOK_SVC_URL + 'variableImportance.app', {
        method: 'POST',
        body: {
            efdData: response.data,
            targets: getTargetVariables(problem),
            categoricals: getNominalVariables(problem),
            task: problem.task
        }
    });

    if (!responseImportance.success) {
        console.warn('collecting importance scores failed');
        return;
    }

    // sort the importance scores dictionary for each target
    Object.keys(responseImportance.data.scores).forEach(target =>
        responseImportance.data.scores[target] = Object.keys(responseImportance.data.scores[target])
            .sort((a, b) => responseImportance.data.scores[target][a] - responseImportance.data.scores[target][b])
            .reduce((sorted, predictor) => Object.assign(sorted, {
                [predictor]: responseImportance.data.scores[target][predictor]
            }), {}));

    // save importance scores into cache
    utils.setDeep(resultsCache,
        [problem.problemId, 'importanceScores', adapter.getSolutionId(), mode], responseImportance.data.scores);
    utils.setDeep(resultsCache,
        [problem.problemId, 'importanceScoresLoading', adapter.getSolutionId(), mode], false);

    m.redraw();
};

export let loadProducePath = async (adapter, name, dataPath, metadataPath) => {
    let problem = adapter.getProblem();
    await checkResultsCache(problem);

    // d3m requires fit to be complete before produce can be run
    if (adapter.getSystemId() === "d3m" && !adapter.getSolution().fittedSolutionId)
        return

    // don't load if already loaded
    if (resultsCache[problem.problemId].producePaths?.[adapter.getSolutionId()]?.[name])
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].producePathsLoading?.[adapter.getSolutionId()]?.[name])
        return;

    utils.setDeep(resultsCache,
        [problem.problemId, 'producePathsLoading', adapter.getSolutionId(), name], true);
    m.redraw()

    await produceOnSolution(adapter, name, dataPath, metadataPath)
}

/**
 * Potentially invalidate parts of results cache.
 * Load paths to images with boundaries drawn if results cache is empty.
 * Apply values to cache once loaded if results cache is compatible
 * @param {Problem} problem
 * @param adapters
 * @param target
 * @param split
 * @param index
 * @returns {Promise<void>}
 */
let loadObjectBoundaryImagePath = async (problem, adapters, target, split, index) => {
    adapters.forEach(adapter => loadFittedData(problem, adapter, split));

    // reset image paths if the fitted data for one of the problems is not loaded
    if (!adapters.every(adapter => adapter.getSolutionId() in resultsCache[problem.problemId].fitted)) {
        resultsCache[problem.problemId].boundaryImagePaths = {};
        resultsCache[problem.problemId].boundaryImageColormap = undefined;
        resultsCache[problem.problemId].boundaryImagePathsLoading = {};
        return;
    }

    // object boundaries only apply to object detection problems
    if (problem.task.toLowerCase() !== 'objectdetection')
        return;

    // don't load if image is already being loaded
    if (resultsCache[problem.problemId]?.boundaryImagePathsLoading?.[target]?.[split]?.[JSON.stringify(index)])
        return;

    // don't load if already loaded
    if (resultsCache[problem.problemId]?.boundaryImagePaths?.[target]?.[split]?.[JSON.stringify(index)])
        return;

    // begin blocking additional requests to load
    utils.setDeep(resultsCache,
        [problem.problemId, 'boundaryImagePathsLoading', target, split, JSON.stringify(index)], true);
    m.redraw()

    let actualPoint = resultsCache[problem.problemId].dataSample[split]
        .find(point => Object.entries(index).every(pair => point[pair[0]] === pair[1]));

    // collect all fitted data points at the given index for each solution
    // an object of {Actual: [boundary1, ...], solutionId: [boundary1, boundary2], ...}
    let fittedPoints = adapters.reduce((fittedPoints, adapter) => Object.assign(fittedPoints, {
            [adapter.getSolutionId()]: resultsCache[problem.problemId].fitted[adapter.getSolutionId()][split]
                // all multi-indexes match
                .filter(point => Object.entries(index).every(pair => point[pair[0]] === pair[1]))
                // turn all matched points into an array of boundaries
                .flatMap(point => point[target])
        }),
        {Actual: actualPoint[target]});

    if (!resultsCache[problem.problemId].boundaryImageColormap) {
        resultsCache[problem.problemId].boundaryImageColormap = Object.keys(fittedPoints)
            .reduce((map, solutionName, i) => Object.assign(map, {
                [solutionName]: common.colorPalette[i % common.colorPalette.length]
            }), {});
    }

    let response;
    try {
        response = await m.request(`image-utils/markup-image`, {
            method: 'POST',
            body: {
                file_path: problem.results.datasetSchemaPaths[split].replace('datasetDoc.json', '') + '/media/' + actualPoint.image,
                borders: Object.keys(fittedPoints).reduce((borders, solutionName) => Object.assign({
                    [resultsCache[problem.problemId].boundaryImageColormap[solutionName].replace('#', '')]: fittedPoints[solutionName]
                }), {})
            }
        });

        if (!response.success) {
            console.warn(response);
            throw response.data;
        }
    } catch (err) {
        console.warn("markup-image error");
        console.log(err);
        // app.alertWarn('Marked up image has not been loaded.');
        return;
    }

    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    utils.setDeep(resultsCache,
        [problem.problemId, 'boundaryImagePaths', target, split, JSON.stringify(index)], response.data);

    utils.setDeep(resultsCache,
        [problem.problemId, 'boundaryImagePathsLoading', target, split, JSON.stringify(index)], false);

    // apply state changes to the page
    m.redraw();
};

/**
 * should be equivalent to partials.app
 * loads up linearly spaced observations along domain and non-mangled levels/counts
 * @param {Problem} problem
 * @returns {Promise<void>}
 */
let loadPredictorDomains = async problem => {

    await checkResultsCache(problem);

    if (resultsCache[problem.problemId].domains)
        return;
    if (resultsCache[problem.problemId].domainsLoading)
        return;

    resultsCache[problem.problemId].domainsLoading = true;
    m.redraw();

    let predictors = getPredictorVariables(problem);
    let categoricals = getNominalVariables(problem).filter(variable => predictors.includes(variable));

    let compiled = queryMongo.buildPipeline(
        [...resultsQuery],
        problem.results.variablesInitial)['pipeline'];

    let facets = categoricals
        .filter(variable => app.variableSummaries[variable].validCount > 0)
        .reduce((facets, variable) => Object.assign(facets, {
            [variable]: [
                {$group: {_id: '$' + variable, count: {$sum: 1}}},
                {$sort: {count: -1, _id: 1}},
                {$limit: ICE_DOMAIN_MAX_SIZE},
                {$project: {'_id': 0, level: '$_id', count: 1}}
            ]
        }), {});

    // {[variable]: [{'level': level, 'count': count}, ...]}
    resultsCache[problem.problemId].levels = Object.keys(facets).length > 0 ? (await app.getData({
        method: 'aggregate',
        query: JSON.stringify([
            ...compiled,
            {$facet: facets}
        ]),
        datafile: problem.results.datasetPaths[resultsPreferences.dataSplit],
        collection_name: `${app.workspace.d3m_config.name}_split_${resultsPreferences.dataSplit}`, // collection/dataset name
    }))[0] : {};

    // {[variable]: *samples along domain*}
    resultsCache[problem.problemId].domains = predictors.reduce((domains, predictor) => {
        let summary = app.variableSummaries[predictor];
        if (!summary.validCount)
            domains[predictor] = [];
        else if (categoricals.includes(predictor))
            domains[predictor] = resultsCache[problem.problemId].levels[predictor].map(entry => entry.level);
        else {
            if (app.variableSummaries[predictor].binary)
                domains[predictor] = [app.variableSummaries[predictor].min, app.variableSummaries[predictor].max];
            else
                domains[predictor] = utils.linspace(
                    app.variableSummaries[predictor].min,
                    app.variableSummaries[predictor].max,
                    ICE_DOMAIN_MAX_SIZE)
        }
        return domains;
    }, {})

    resultsCache[problem.problemId].domainsLoading = false;
    m.redraw();
}


export let ICE_SAMPLE_MAX_SIZE = 50;
export let ICE_DOMAIN_MAX_SIZE = 20;
/**
 * Create a synthetic individual conditional expectation dataset and save the path
 * @param problem
 * @returns {Promise<void>}
 */
let loadICEDatasetPaths = async problem => {
    // console.log('materializing ICE');

    await checkResultsCache(problem);

    // prepare necessary metadata for building synthetic data
    await loadPredictorDomains(problem);
    if (!resultsCache[problem.problemId].domains)
        return

    // don't load if already loaded
    if (Object.keys(resultsCache[problem.problemId].datasetPaths)
        .some(name => name.startsWith('ICE_synthetic_')))
        return;

    // don't load if systems are already in loading state
    if (resultsCache[problem.problemId].datasetPathsLoading['ICE_synthetic_*'])
        return;

    resultsCache[problem.problemId].datasetPathsLoading['ICE_synthetic_*'] = true;
    m.redraw();

    let tempQuery = resultsCache[problem.problemId].id.query;

    let compiled = buildPipeline(
        [...resultsQuery, {type: 'menu', metadata: {type: 'data', sample: ICE_SAMPLE_MAX_SIZE}}], problem.results.variablesInitial)['pipeline']

    let splitPath = problem.results.datasetPaths[resultsPreferences.dataSplit];
    let splitSchema = problem.results.datasetSchemas[resultsPreferences.dataSplit];

    let partialsLocationInfo;
    try {
        // BUILD SAMPLE DATASET
        let samplePaths = await app.getData({
            // run on this dataset
            datafile: splitPath,
            collection_name: `${app.workspace.d3m_config.name}_split_${utils.generateID(splitPath)}`, // collection/dataset name
            // perform these aggregations
            method: 'aggregate',
            query: JSON.stringify(compiled),
            // export with this dataset schema
            export: 'dataset',
            metadata: JSON.stringify(queryMongo.translateDatasetDoc(compiled, splitSchema, problem)),
        });

        // BUILD ICE DATASETS
        partialsLocationInfo = await m.request({
            method: 'POST',
            url: D3M_SVC_URL + '/get-partials-datasets',
            body: {
                // run on this dataset
                dataset_schema_path: samplePaths.metadata_path,
                dataset_path: samplePaths.data_path,
                // use this metadata to construct synthetic data
                problem: solverWrapped.SPEC_problem(problem),
                all_variables: problem.results.variablesInitial,
                domains: resultsCache[problem.problemId].domains,
                // export with this metadata
                dataset_id: problem.results.d3mDatasetId,
                update_roles: true,
                separate_variables: true,
                name: 'ICE_synthetic_'
            }
        });
    } catch (err) {
        console.warn("ICE get-partials-dataset error");
        console.log(err);
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    if (!partialsLocationInfo?.success) {
        app.alertWarn('Call for ICE data failed. ' + partialsLocationInfo.message);
        throw partialsLocationInfo.message;
    }

    // save into cache
    Object.assign(resultsCache[problem.problemId].datasetSchemaPaths, partialsLocationInfo.data.dataset_schemas);
    Object.assign(resultsCache[problem.problemId].datasetPaths, partialsLocationInfo.data.dataset_paths);
    Object.assign(resultsCache[problem.problemId].datasetIndexPartialsPaths, partialsLocationInfo.data.dataset_index_paths);
    resultsCache[problem.problemId].datasetPathsLoading['ICE_synthetic_*'] = false;
    m.redraw();
}

/**
 * @param {Problem} problem
 * @returns {*}
 */
let loadPartialsDatasetPath = async problem => {
    // preparing partials data
    await checkResultsCache(problem);

    // prepare necessary metadata for building synthetic data
    await loadPredictorDomains(problem);
    if (!resultsCache[problem.problemId].domains)
        return

    if (resultsCache[problem.problemId].datasetPaths['partials'])
        return;
    if (resultsCache[problem.problemId].datasetPathsLoading['partials'])
        return;
    resultsCache[problem.problemId].datasetPathsLoading['partials'] = true;
    m.redraw();

    // BUILD BASE DATASET (one record)
    let dataset = [Object.keys(app.variableSummaries)
        .reduce((record, variable) => Object.assign(record, {
            [variable]: resultsCache[problem.problemId].levels?.[variable]?.[0]?.level
                ?? app.variableSummaries[variable].median // take most frequent level (first mode)
        }), {})];

    let tempQuery = resultsCache[problem.problemId].id.query;

    let splitSchema = problem.results.datasetSchemas[resultsPreferences.dataSplit];

    // BUILD PARTIALS DATASETS
    let partialsLocationInfo;
    try {
        partialsLocationInfo = await m.request({
            method: 'POST',
            url: D3M_SVC_URL + '/get-partials-datasets',
            body: {
                // run on this dataset
                dataset_schema: splitSchema,
                dataset,
                // user this metadata to construct synthetic data
                problem: solverWrapped.SPEC_problem(problem),
                all_variables: problem.results.variablesInitial,
                domains: resultsCache[problem.problemId].domains,
                // export with this metadata
                dataset_id: problem.results.d3mDatasetId,
                separate_variables: false,
                name: 'partials'
            }
        });
    } catch (err) {
        console.warn("Partials get-partials-dataset error");
        console.log(err);
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsCache[problem.problemId].id.dataSplit)
        return;

    if (!partialsLocationInfo?.success) {
        app.alertWarn('Call for partials data failed. ' + partialsLocationInfo.message);
        throw partialsLocationInfo.message;
    }

    // save into cache
    Object.assign(resultsCache[problem.problemId].datasetSchemaPaths, partialsLocationInfo.data.dataset_schemas);
    Object.assign(resultsCache[problem.problemId].datasetPaths, partialsLocationInfo.data.dataset_paths);
    Object.assign(resultsCache[problem.problemId].datasetIndexPartialsPaths, partialsLocationInfo.data.dataset_index_paths);
    resultsCache[problem.problemId].datasetPathsLoading['partials'] = false;
    m.redraw()
}

/**
 * Summarize all solutions for a problem to be used in exporting
 * @param {Problem} problem
 * @returns {*}
 */
export let getSummaryData = problem => ({
    dataset_name: app.workspace.d3m_config.name,
    problem: problem,
    solutions: getSolutions(problem)
        .map(solution => {
            let adapter = getSolutionAdapter(problem, solution);
            let systemId = adapter.getSystemId();

            let outputs = systemId === 'd3m' ? Object.keys(solution.produce).map(key =>
                ({
                    'name': key,
                    'predict type': 'RAW',
                    'output': solution.produce[key]
                })) : (solution.produce || []).map(produce =>
                ({
                    'name': produce.input.name,
                    'predict type': produce.configuration.predict_type,
                    'output': '/' + produce.data_pointer,
                }));

            return {
                outputs,
                solution: solution,
                solutionId: adapter.getSolutionId(),
                systemId: adapter.getSystemId()
            }
        })
});

/**
 * Find the problem corresponding to some websocket response
 * @param data
 * @returns {Problem | undefined}
 */
export let findProblem = data => {
    if (data.search_id === undefined) return;
    return Object.values(app.workspace?.raven_config?.problems || {})
        .find(problem => String(problem?.results?.solverState?.[data.system]?.searchId) === String(data.search_id));
};

export let prepareResultsDatasets = async (problem, solverId) => {
    // set d3m dataset id to unique value if not defined
    utils.setDefault(problem.results, 'd3mDatasetId',
        app.workspace.datasetDoc.about.datasetID + '_' + Math.abs(utils.generateID(String(Math.random()))));

    utils.setDefaultDeep(problem, ['results', 'selectedSolutions', solverId], []);
    let solverState = utils.setStructure(problem, ['results', 'solverState', solverId]);
    solverState.thinking = true;
    solverState.message = 'applying manipulations to data';

    m.redraw();
    try {
        if (!app.materializeManipulationsPromise[problem.problemId])
            app.materializeManipulationsPromise[problem.problemId] = app.materializeManipulations(problem);
        await app.materializeManipulationsPromise[problem.problemId];
    } catch (err) {
        app.alertError(`Applying data manipulations failed: ${err}`);
        throw err
    }

    solverState.message = 'preparing train/test splits';
    m.redraw();
    try {
        if (!app.materializeTrainTestPromise[problem.problemId])
            app.materializeTrainTestPromise[problem.problemId] = app.materializeTrainTest(problem);
        await app.materializeTrainTestPromise[problem.problemId];
    } catch (err) {
        console.error(err);
        console.log('Materializing train/test splits failed. Continuing without splitting.')
    }

    // variables present in the problem after all data preprocessing is applied
    problem.results.variablesInitial = [...buildPipeline(
        getAbstractPipeline(problem), app.workspace.raven_config.variablesInitial
    )['variables']]

    solverState.message = 'initiating the search for solutions';
    m.redraw();
};

export let uploadForModelRun = async (file, name, problem) => {

    let body = new FormData();
    body.append('metadata', JSON.stringify({dataset_doc_id: problem.results.d3mDatasetId, name}));
    body.append('files', file);

    // initial upload
    let response = await m.request("user-workspaces/upload-dataset-for-model-run", {
        method: "POST", body
    });

    if (!response.success) {
        app.alertError(response.message);
        return
    }

    let customDataset = {
        name,
        datasetDocPath: response.data.new_dataset_doc_path,
        datasetDoc: response.data.new_dataset_doc,
        // TODO: this is sloppy
        datasetPath: response.data.new_dataset_doc_path.replace('datasetDoc.json', 'tables/learningData.csv')
    };

    let manipulatedInfo = await app.buildDatasetPath(
        problem, undefined, customDataset.datasetPath,
        `${app.workspace.d3m_config.name}_${customDataset.name}`,
        customDataset.datasetDoc);

    problem.results.datasetSchemas[customDataset.name] = customDataset.datasetDoc;
    problem.results.datasetPaths[customDataset.name] = manipulatedInfo.data_path;
    problem.results.datasetSchemaPaths[customDataset.name] = manipulatedInfo.metadata_path;

    return {customDataset, manipulatedInfo};
}

export let produceOnSolution = async (adapter, name, dataPath, schemaPath) => {
    let problem = adapter.getProblem();

    getSystemAdapters(problem)[adapter.getSystemId()].produce(
        adapter.getSolutionId(),
        {
            'train': {
                'name': 'train',
                // the d3m wrapper ignores this
                "resource_uri": 'file://' + (problem.splitOptions.outOfSampleSplit
                    ? problem.results.datasetPaths.train
                    : problem.results.datasetPaths.all)
            },
            'input': {
                'name': name,
                'metadata_uri': 'file://' + schemaPath,
                'resource_uri': 'file://' + dataPath,
            },
            'configuration': {
                'predict_type': 'RAW'
            },
            'output': {
                'resource_uri': 'file:///ravens_volume/solvers/produce/'
            }
        })
        .then(response => !response.success && console.error(response.message))
}
