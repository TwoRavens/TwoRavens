import m from 'mithril';

import * as app from "../app";
import {alertError, buildDatasetUrl, resetPeek, workspace} from "../app";
import * as plots from "../plots";

import * as solverWrapped from '../solvers/wrapped';
import * as solverD3M from '../solvers/d3m';

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

import {bold, italicize, preformatted} from "../index";
import PlotVegaLite from "../views/PlotVegaLite";
import ConfusionMatrix from "../views/ConfusionMatrix";
import Flowchart from "../views/Flowchart";
import ButtonRadio from "../../common/views/ButtonRadio";
import ModelInterpretation from "../views/ModelInterpretation";
import ModalVanilla from "../../common/views/ModalVanilla";
import * as queryMongo from "../manipulations/queryMongo";
import Paginated from "../../common/views/Paginated";
import TextField from "../../common/views/TextField";

import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";

let getSystemAdapters = problem => {

    // Available systems
    //  Note: h2o - requires Java
    let solverCandidateNames = app.applicableSolvers[problem.task][app.getSubtask(problem)];

    // only show solvers that are capable of solving this type of problem
    let solverSystemNames = TA2_WRAPPED_SOLVERS // set in templates/index.html
        .filter(name => solverCandidateNames.includes(name));

    let d3m_solver_info = TA2_D3M_SOLVER_ENABLED ? {d3m: solverD3M.getD3MAdapter(problem)} : {};

    return solverSystemNames
        .reduce((out, systemId) => Object.assign(out, {
            [systemId]: solverWrapped.getSystemAdapterWrapped(systemId, problem)
        }), d3m_solver_info);
}

let getComparableProblems = selectedProblem => Object.values(app.workspace.raven_config.problems)
    // comparable problems must have solutions
    .filter(problem => problem !== selectedProblem && problem.results?.solutions)
    // comparable problems must share targets
    .filter(problem => JSON.stringify(problem.targets.sort()) === JSON.stringify(selectedProblem.targets.sort()))
    // comparable problems must share scoring configuration
    .filter(problem => JSON.stringify(problem.scoreOptions) === JSON.stringify(selectedProblem.scoreOptions));

export let leftpanel = () => {

    let ravenConfig = app.workspace.raven_config;

    let selectedProblem = app.getSelectedProblem();
    if (!selectedProblem) return;

    let comparableProblems = [selectedProblem, ...getComparableProblems(selectedProblem)];

    let solverSystems = getSystemAdapters(selectedProblem);

    // left panel, right tab
    let resultsContent = [
        m('div', {style: {display: 'inline-block', margin: '1em'}},
            m('h4', `${ravenConfig.selectedProblem} for `, m('div[style=display:inline-block]', m(Dropdown, {
                id: 'targetDropdown',
                items: selectedProblem.targets,
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
                    resetPeek();
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
                        m('label', 'Approximate time bound for overall pipeline search, in minutes. Leave empty for unlimited time.'),
                        m(TextField, {
                            id: 'timeBoundOption',
                            value: selectedProblem.searchOptions.timeBoundSearch || '',
                            disabled: selectedProblem.system === 'solved',
                            oninput: selectedProblem.system !== 'solved' && (value => selectedProblem.searchOptions.timeBoundSearch = value.replace(/[^\d.-]/g, '')),
                            onblur: selectedProblem.system !== 'solved' && (value => selectedProblem.searchOptions.timeBoundSearch = Math.max(0, parseFloat(value.replace(/[^\d.-]/g, ''))) || undefined),
                            style: {'margin-bottom': '1em'}
                        }),
                        m('label', 'Maximum record count per data split.'),
                        m(TextField, {
                            id: 'maxRecordCountOption',
                            disabled: selectedProblem.system === 'solved',
                            value: selectedProblem.splitOptions.maxRecordCount || '',
                            oninput: selectedProblem.system !== 'solved' && (value => selectedProblem.splitOptions.maxRecordCount = value.replace(/[^\d.-]/g, '')),
                            onblur: selectedProblem.system !== 'solved' && (value => selectedProblem.splitOptions.maxRecordCount = parseFloat(value.replace(/[^\d.-]/g, '')) || undefined),
                            style: {'margin-bottom': '1em'}
                        }))

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
                                problem.targets.join(', '),
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
                        onclick: app.setSelectedProblem
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

        if (problem.task === 'objectDetection') {
            // this gets the data sample loaded, so that calls to get images will begin
            adapters[0].getDataSample(resultsPreferences.target, resultsPreferences.dataSplit);
            return [
                m(PlotVegaLite, {
                    specification: {
                        "$schema": "https://vega.github.io/schema/vega-lite/v4.json",
                        "height": 100,
                        "data": {
                            "values": Object.keys(resultsData[problem.problemId].boundaryImageColormap || []).map(solutionName => ({
                                "color": resultsData[problem.problemId].boundaryImageColormap[solutionName],
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
                    data: resultsData[problem.problemId].dataSample[resultsPreferences.dataSplit] || [],
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

        if (problem.task !== 'forecasting' && adapters.every(adapter => !adapter.getDataPointer(resultsPreferences.dataSplit))) {
            return [
                'Waiting for solver to produce predictions.',
                common.loader('PredictionSummary')
            ]
        }

        if (problem.task.toLowerCase() === 'forecasting' && adapters.length > 0) {
            let plotSplits = resultsPreferences.dataSplit === 'all' ? ['train', 'test'] : [resultsPreferences.dataSplit];

            let actualSummary = plotSplits.reduce((out, split) => Object.assign(out, {
                [split]: adapters[0].getDataSample(resultsPreferences.target, split)
            }), {});

            let timeSummary = plotSplits.reduce((out, split) => Object.assign(out, {
                [split]: adapters[0].getDataSample(app.getTemporalVariables(problem)[0] ?? 'd3mIndex', split)
            }), {});
            let predictedVariables = app.getPredictorVariables(problem);
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
                        [columnName]: adapters[0].getDataSample(columnName, split)
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


            let xName = 'Time';
            let yName = resultsPreferences.target;
            let groupName = 'Solution Name';
            let dataSplit = 'Data Split';
            let crossSectionName = 'Cross Section';
            let title = 'Forecasted vs. Actuals for predicting ' + resultsPreferences.target;

            let plotData = plotSplits
                // for each split
                .filter(split => actualSummary[split])
                .flatMap(split => [
                    ...actualSummary[split].map((_, i) => ({
                        [dataSplit]: split,
                        [groupName]: 'Actual',
                        [yName]: actualSummary[split][i],
                        [crossSectionName]: crossSectionSummary[split][i],
                        [xName]: timeSummary[split][i] // new Date(Date.parse(timeSummary[split][i]))
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
                                [xName]: timeSummary[split][i] // new Date(Date.parse(timeSummary[split][i]))
                            })))
                ])
                .filter(point => problem.tags.crossSection.length === 0
                    || resultsPreferences.crossSection === 'unset'
                    || point[crossSectionName] === resultsPreferences.crossSection)

            if (plotData.length === 0) return [
                'Processing forecasts.',
                common.loader('ForecastSummary')
            ];

            let crossSectionsUnique = ['unset', ...new Set(crossSectionSummary[plotSplits[0]])];

            response.push(
                plotSplits[0] in crossSectionSummary && crossSectionsUnique.length > 1 && [
                    m(ButtonRadio, {
                        id: 'timeSeriesPlotConfigButtonRadio',
                        onclick: state => resultsPreferences.timeSeriesPlotConfig = state,
                        activeSection: resultsPreferences.timeSeriesPlotConfig,
                        sections: [
                            {value: 'Confidence interval'},
                            {value: 'Cross sections'}
                        ]
                    }),
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
                ],
                m('div', {
                    style: {'height': '500px'}
                }, m(PlotVegaLite, {
                    specification: (resultsPreferences.timeSeriesPlotConfig === 'Confidence interval'
                        ? plots.vegaLiteForecastConfidence : plots.vegaLiteForecast)(
                        plotData, xName, yName, dataSplit,
                        groupName, crossSectionName, title),
                })))

        }

        if (problem.task.toLowerCase().includes('regression')) {
            let summaries = adapters.map(adapter => ({
                name: adapter.getSolutionId(),
                fittedVsActual: adapter.getFittedVsActuals(resultsPreferences.target),
            })).filter(summary => summary.fittedVsActual);

            if (summaries.length === 0) return [
                'Processing predictions.',
                common.loader('PredictionSummary')
            ];

            let xName = 'Fitted Values';
            let yName = 'Actual Values';
            let countName = 'count';
            let groupName = 'Solution Name';
            let title = 'Fitted vs. Actuals for predicting ' + resultsPreferences.target;

            summaries.forEach(summary => summary.fittedVsActual.map(entry => entry[groupName] = summary.name));

            response.push(m('div', {
                style: {'height': '500px'}
            }, m(PlotVegaLite, {
                specification: plots.vegaLiteScatter(
                    summaries.flatMap(summary => summary.fittedVsActual),
                    xName, yName, groupName, countName, title),
            })))
        }

        if (problem.task.toLowerCase().includes('classification')) {

            let summaries = adapters.map(adapter => ({
                name: adapter.getSolutionId(),
                confusionMatrix: adapter.getConfusionMatrix(resultsPreferences.target)
            })).filter(summary => summary.confusionMatrix);

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
                    summary.confusionMatrix.classes,
                    resultsPreferences.factor));

            // prevent invalid confusion matrix selection
            if (this.confusionMatrixSolution === undefined || !summaries.find(summary => summary.name === this.confusionMatrixSolution))
                this.confusionMatrixSolution = summaries[0].name;

            return [
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
                                            'Predicted', 'Actual', 'count',
                                            `Confusion Matrix for ${problem.targets[0]}${resultsPreferences.factor ? (' factor ' + resultsPreferences.factor) : ''}`)
                                    }))))
                                : 'Too few classes for confusion matrix! There is a data mismatch.'
                                : 'Too many classes for confusion matrix!'
                        ]
                    }))
                })
            ]
        }
        return response;
    };

    scoresSummary(problem, adapters) {

        if (resultsPreferences.plotScores === 'all')
            adapters = getSolutions(problem).map(solution => getSolutionAdapter(problem, solution));

        return [
            m('div', m('[style=display:inline-block]', 'Graph'), m(ButtonRadio, {
                id: 'plotScoresButtonBar',
                onclick: mode => resultsPreferences.plotScores = mode,
                activeSection: resultsPreferences.plotScores,
                sections: [{value: 'all'}, {value: 'selected'}],
                attrsAll: {style: {'margin': '0 .5em', display: 'inline-block', width: 'auto'}},
                attrsButtons: {class: 'btn-sm', style: {width: 'auto'}},
            }), m('[style=display:inline-block]', 'solutions.')),
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
        let content = [bold('Importance Scores')]
        if (adapters.length === 0) {
            content.push(italicize("No solutions are selected"));
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
                m('div[style=margin:1em]', italicize("Loading importance scores.")),
                common.loader("importanceLoader"))
            return content
        }

        content.push(m(PlotVegaLite, {
            specification: plots.vegaLiteImportancePlot(importanceScores, modelComparison)
        }))

        return content
    }

    modelInterpretation(problem, adapters) {

        let adapter = adapters[0];

        let interpretationContent = [];

        if (resultsPreferences.interpretationMode === 'EFD') {
            let isCategorical = app.getNominalVariables(problem).includes(resultsPreferences.target);
            interpretationContent.push(m('div[style=margin: 1em]',
                italicize("Empirical first differences"), ` is a tool to interpret the influence of variables on the model, from the empirical distribution of the data. ` +
                `The Y axis refers to the ${isCategorical ? 'probability of each level' : 'expectation'} of the dependent variable as the predictor (x) varies along its domain. ` +
                `Parts of the domain where the fitted and actual values align indicate high utility from the predictor. ` +
                `If the fitted and actual values are nearly identical, then the two lines may be indistinguishable.`),);

            let interpretationEFDContent = common.loader('ModelInterpretation');
            if (adapters.length === 1) {
                let interpretationData = problem.predictors.reduce((out, predictor) => Object.assign(out, {
                    [predictor]: adapter.getInterpretationEFD(predictor)
                }), {});

                // reassign content if some data is not undefined
                let sortedPredictors = Object.keys(resultsData[problem.problemId]?.importanceScores
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
                                ...new Set(Object.values(interpretationData)[0].map(point => point.level).sort(app.omniSort))
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
                                m('br'), bold(predictor),
                                m(ModelInterpretation, {
                                    mode: resultsPreferences.interpretationMode,
                                    data: interpretationData[predictor]
                                        .filter(point => resultsPreferences.factor === undefined || String(resultsPreferences.factor) === String(point.level)),
                                    problem: problem,
                                    predictor,
                                    target: resultsPreferences.target,
                                    yLabel: valueLabel,
                                    variableLabel: variableLabel,
                                    summary: app.variableSummaries[predictor]
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
            let interpretationPartialsData = app.getPredictorVariables(problem).map(predictor => ({
                predictor,
                data: adapter.getInterpretationPartials(predictor)
            })).filter(predictorEntry => predictorEntry.data);

            if (interpretationPartialsData.length > 0) interpretationContent = [
                m('div[style=margin: 1em]', italicize("Partials"), ` shows the prediction of the model as one predictor is varied, and the other predictors are held at their mean.`),
                m('div', {style: 'overflow:auto'}, m(Paginated, {
                    data: interpretationPartialsData,
                    makePage: data => data.map(predictorEntry => m('div',
                        bold(predictorEntry.predictor),
                        m(ModelInterpretation, {
                            mode: 'Partials',
                            data: predictorEntry.data,
                            problem: problem,
                            predictor: predictorEntry.predictor,
                            target: resultsPreferences.target,
                            yLabel: valueLabel,
                            variableLabel: variableLabel,
                            summary: app.variableSummaries[predictorEntry.predictor]
                        }))),
                    limit: 10,
                    page: resultsPreferences.interpretationPage,
                    setPage: setInterpretationPage
                }))
            ];
        }
        if (adapters.length === 1 && resultsPreferences.interpretationMode === 'PDP/ICE') {
            let isCategorical = app.getNominalVariables(problem).includes(resultsPreferences.target);
            let sortedPredictors = Object.keys(resultsData[problem.problemId]?.importanceScores
                ?.[adapter.getSolutionId()]?.EFD?.[resultsPreferences.target] ?? {});

            let predictors = sortedPredictors.length > 0
                ? sortedPredictors.reverse()
                : app.getPredictorVariables(problem);

            interpretationContent = [
                m('div[style=margin: 1em]',
                    italicize("Individual conditional expectations"), ` draws one line for each individual in the data, as the selected predictor is varied. `
                    + `A random sample of individuals are chosen from the dataset. `
                    + (isCategorical
                        ? 'The thickness of the lines is relative to the number of observations present at each level.'
                        : 'The red line is a partial dependency plot- the average of the target variable over all individuals.')),

                m(Paginated, {
                    data: predictors,
                    makePage: predictors => predictors.map(predictor => {
                        let interpretationData = adapter.getInterpretationICE(predictor);

                        let predictorContent = [bold(predictor)];
                        if (interpretationData) predictorContent.push(m('div', {style: 'overflow:auto'}, m(ModelInterpretation, {
                            mode: 'ICE',
                            data: interpretationData,
                            problem: problem,
                            predictor: predictor,
                            target: resultsPreferences.target,
                            yLabel: valueLabel,
                            variableLabel: variableLabel,
                            summary: app.variableSummaries[predictor]
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
                    problem.results.datasetPaths.partials && {
                        value: 'Partials',
                        title: 'model prediction as predictor varies over its domain'
                    },
                    {value: 'PDP/ICE', title: 'partial dependence plot/individual conditional expectation'}
                ]
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
                {color: common.csColor, key: 'Inputs', summary: inputs, content: inputs},
                ...steps,
                {color: common.csColor, key: 'Outputs', summary: outputs, content: outputs}
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
                        getSolutions(problem)
                            .forEach(solution => produceOnSolution(customDataset, manipulatedInfo, problem, solution))
                    })
                },
                disabled: !resultsPreferences.upload.file || resultsPreferences.upload.name.length === 0
            }, "Produce"),

            Object.keys(customDatasets).length > 0 && [
                m('h4[style=margin:1em]', 'Custom Datasets'),
                "Set the current data split from the top of the left panel, or via the 'Select' button below. If your dataset contains actual values for the target variable, the Prediction Summary, Variable Importance, and Empirical First Differences will update to reflect the new dataset. Predictions are produced for all known solutions when your dataset is uploaded.",
                m(Table, {
                    data: Object.keys(customDatasets).map(evaluationId => {
                        let dataPointer = adapters.length === 1 && adapters[0].getDataPointer(customDatasets[evaluationId].name);
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

    view(vnode) {
        let {problem} = vnode.attrs;
        if (!problem) return;

        // ensure valid state of selected predictor, target
        if (!problem.predictors.includes(resultsPreferences.predictor))
            resultsPreferences.predictor = problem.predictors[0];
        if (!problem.targets.includes(resultsPreferences.target))
            resultsPreferences.target = problem.targets[0];

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
        }, m(Table, {
            headers: ['Variable', 'Data'],
            data: [
                ['Dependent Variables', problem.targets],
                ['Predictors', app.getPredictorVariables(problem)],
                ['Description', preformatted(app.getDescription(problem))],
                ['Task', problem.task]
            ]
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

            bold("Downloads"),
            m(Table, {
                sortable: true,
                sortHeader: 'name',
                data: (firstSolution.produce ?? []).map(produce =>
                    ({
                        'name': produce.input.name,
                        'predict type': produce.configuration.predict_type,
                        'input': m(Button, {onclick: () => app.downloadFile(produce.input.resource_uri)}, 'Download'),
                        'output': m(Button, {onclick: () => app.downloadFile('file://' + produce.data_pointer)}, 'Download'),
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

        let variableImportance = problem.task !== 'forecasting' && m(Subpanel, {
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

        let modelInterpretation = problem.task !== 'forecasting' && m(Subpanel, {
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
                    data: ['intercept', ...app.getPredictorVariables(problem)].map((predictor, i) => [
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
                    classes: ['intercept', ...app.getPredictorVariables(problem)],
                    margin: {left: 10, right: 10, top: 50, bottom: 10},
                    attrsAll: {style: {height: '600px'}}
                })));
        let coefficientMatrix = coefficientsContents.length > 0 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Coefficients',
            shown: resultsSubpanels['Coefficients'],
            setShown: state => resultsSubpanels['Coefficients'] = state
        }, coefficientsContents);


        let prepareANOVA = table => [...app.getPredictorVariables(problem), 'Residuals']
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
            scoresSummary,
            variableImportance,
            modelInterpretation,
            visualizePipelinePanel,
            performanceStats,
            coefficientMatrix,
            anovaTables,
            VIF,
            uploadDataset
        );
    }
}

// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getProblem: () => problem,
    getSolution: () => solution,
    getName: () => solution.name,
    getDescription: () => solution.description,
    getSystemId: () => solution.systemId,
    getSolutionId: () => solution.solutionId || 'unknown',
    getDataPointer: (dataSplit, predict_type = 'RAW') => {
        let produce = (solution.produce || [])
            .find(produce =>
                produce.input.name === dataSplit &&
                produce.configuration.predict_type === predict_type);
        return produce?.data_pointer;
    },
    getFittedVsActuals: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadFittedVsActuals(problem, adapter);
        return resultsData?.[problem.problemId]?.fittedVsActual?.[solution.solutionId]?.[target]
    },
    getConfusionMatrix: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadConfusionData(problem, adapter);
        return resultsData?.[problem.problemId]?.confusion?.[solution.solutionId]?.[target]
    },
    getDataSample: (target, split) => {
        loadDataSample(problem, split);
        let sample = resultsData?.[problem.problemId]?.dataSample?.[split];
        if (sample) return sample.map(obs => obs[target])
    },
    getFitted: (target, split) => {
        let adapter = getSolutionAdapter(problem, solution);
        loadFittedData(problem, adapter, split);
        let fitted = resultsData?.[problem.problemId].fitted?.[adapter.getSolutionId()]?.[split];
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

        return resultsData?.[problem.problemId]?.interpretationEFD?.[predictor]
    },
    getInterpretationPartials: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadInterpretationPartialsFittedData(problem, adapter);

        if (!resultsData?.[problem.problemId]?.interpretationPartialsFitted?.[adapter.getSolutionId()]) return;

        return app.melt(
            problem.domains[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    resultsData[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()][predictor][i])),
            [predictor],
            valueLabel, variableLabel);
    },
    getInterpretationICE: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadInterpretationICEFittedData(problem, adapter, predictor);

        return resultsData?.[problem.problemId]?.interpretationICEFitted?.[predictor]
    },
    getImportanceScore: (target, mode) => {
        let adapter = getSolutionAdapter(problem, solution);
        // TODO: importance scores for partials, PDP/ICE
        mode = 'EFD'
        loadImportanceScore(problem, adapter, mode);

        return resultsData?.[problem.problemId]?.importanceScores?.[adapter.getSolutionId()]?.[mode]?.[target];
    },
    // get the bounding box image for the selected problem's target variable, in the desired split, at the given index
    getObjectBoundaryImagePath: (target, split, index) => {
        let selectedSolutions = getSelectedSolutions(problem);
        let adapters = selectedSolutions
            .map(solution => getSolutionAdapter(problem, solution));

        loadObjectBoundaryImagePath(problem, adapters, target, split, index);
        return resultsData?.[problem.problemId]?.boundaryImagePaths?.[target]?.[split]?.[JSON.stringify(index)];
    }
});

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

let getSolutionTable = (problems, systemId) => {
    let adapters = problems.flatMap(problem => {
        let solutionMap = problem.results.solutions || {};
        let solutions = systemId
            ? Object.values(solutionMap[systemId])
            : Object.keys(solutionMap)
                .flatMap(systemId => Object.values(solutionMap[systemId]))
        return solutions.map(solution => getSolutionAdapter(problem, solution))
    });

    // metrics shown in the table are whatever was selected in the current problem's scoring configuration
    let problem = app.getSelectedProblem();
    let data = adapters
        // extract data for each row (identification and scores)
        .map(adapter => Object.assign(
            {adapter, id: String(adapter.getSolutionId()),},
            problems.length > 1 ? {problem: adapter.getProblem().problemId} : {},
            {solver: adapter.getSystemId(), solution: adapter.getName()},
            [problem.metric, ...problem.metrics]
                .reduce((out, metric) => Object.assign(out, {
                    [metric]: app.formatPrecision(adapter.getScore(metric))
                }), {})));

    return m(Table, {
        id: 'solutionTable' + (systemId || ''), data,
        sortable: true, showUID: false,
        sortHeader: resultsPreferences.selectedMetric,
        setSortHeader: header => resultsPreferences.selectedMetric = header,
        sortDescending: !reverseSet.includes(resultsPreferences.selectedMetric),
        activeRow: new Set(adapters
            .filter(adapter => (adapter.getProblem().results.selectedSolutions[adapter.getSystemId()] || '').includes(adapter.getSolutionId()))),
        onclick: adapter => {
            let problem = adapter.getProblem();
            problem.results.userSelectedSolution = true;
            setSelectedSolution(problem, adapter.getSystemId(), adapter.getSolutionId())
        }
    })
};

/*
  Set the leftTab value
 */
let leftTabResults = 'Solutions'; // default value

/*
  The name of the tab will bring the selected tab to the forefront,
  similar to clicking the tab button
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

export let resultsPreferences = {
    interpretationMode: 'EFD',
    predictor: undefined,
    target: undefined,
    factor: undefined,
    plotScores: 'all',
    selectedMetric: undefined,
    timeSeriesPlotConfig: 'Cross sections',
    dataSplit: 'test',
    recordLimit: 10000,
    crossSection: 'unset',
    crossSectionTemp: 'unset',
    imagePage: 0,
    upload: {},
};
window.resultsPreferences = resultsPreferences;

let setResultsFactor = factor => resultsPreferences.factor = factor === 'undefined' ? undefined : factor;
let setInterpretationPage = page => {
    resultsPreferences.interpretationPage = page;
    let cache = resultsData[app.getSelectedProblem().problemId];
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
    'Variance Inflation': false,
    'ANOVA Tables': false,
    'Coefficients': false,
    'Performance Statistics': false,
    'Visualize Pipeline': false,
    'Solution Description': false,
    'Problem Description': false,
    'Variable Importance': false,
    'Model Interpretation': false,
    'Upload Dataset': false
};

// when selected, the key/value [mode]: [pipelineID] is set.
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
    if (problem.problemId in resultsData) {
        resultsData[problem.problemId].interpretationICEFitted = {};
        resultsData[problem.problemId].interpretationICEFittedLoading = {};
    }

    if (modelComparison) {

        problem.results.selectedSolutions[systemId].includes(solutionId)
            ? app.remove(problem.results.selectedSolutions[systemId], solutionId)
            : problem.results.selectedSolutions[systemId].push(solutionId);

        // set behavioral logging
        logParams.feature_id = 'RESULTS_COMPARE_SOLUTIONS';
        logParams.activity_l2 = 'MODEL_COMPARISON';
    } else {
        problem.results.selectedSolutions = Object.keys(problem.results.selectedSolutions)
            .reduce((out, source) => Object.assign(out, {[source]: []}, {}), {});
        problem.results.selectedSolutions[systemId] = [solutionId];

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

        // ------------------------------------------------
        // ------------------------------------------------
    }

    // record behavioral logging
    app.saveSystemLogEntry(logParams);

    // for easy debugging
    window.selectedSolution = getSelectedSolutions(problem)[0];
};


export let getProblemRank = (solutions, solutionId) => {
    let cnt = 0;
    for (let solutionKey of Object.keys(solutions).reverse()) {
        cnt += 1;
        if (solutionKey === solutionId) return String(cnt);
    }
    return String(-1);
};


export let getSolutions = (problem, source) => {
    if (!problem) return [];

    if (source) {
        if (!(source in problem.results.solutions)) problem.results.solutions[source] = [];
        Object.values(problem.results.solutions[source]);
    }

    return Object.values(problem.results.solutions)
        .flatMap(source => Object.values(source))
};

// retrieve solution adapters for all passed problems
export let getSelectedAdapters = problems =>
    problems.flatMap(problem => getSelectedSolutions(problem)
        .map(solution => getSolutionAdapter(problem, solution)));

export let getSelectedSolutions = (problem, systemId) => {
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
    let selectedProblem = app.getSelectedProblem();
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

// mutate the confusion data to create significance and explanation fields
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

export let confusionMatrixFactor = (data, labels, factor) => {
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
    interpretConfusionMatrix(data);
    return {
        data: data,
        classes: [factor, 'not ' + factor]
    }
};

// generate an object containing accuracy, recall, precision, F1, given a 2x2 confusion data matrix
// the positive class is the upper left block
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

export let showFinalPipelineModal = false;
export let setShowFinalPipelineModal = state => showFinalPipelineModal = state;

export let finalPipelineModal = () => {
    let selectedProblem = app.getSelectedProblem();

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

// {[name]: [path]}
let customDatasetCount = 0;
let getCustomDatasetId = () => 'dataset ' + customDatasetCount++;
export let customDatasets = {};

// these variables hold indices, predictors, predicted and actual data
export let resultsData = {};
let buildProblemResultsData = () => ({
    // specific to problem, solution and target, all solutions stored for one target
    fittedVsActual: {},
    fittedVsActualLoading: {},

    // specific to problem, solution and target, all solutions stored for one target
    confusion: {},
    confusionLoading: {},

    // cached data for forecasting, per data split
    dataSample: {},
    dataSampleLoading: {},
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

    id: {
        query: [],
        solutionID: undefined,
        dataSplit: undefined,
        target: undefined
    }
});
window.resultsData = resultsData;

// TODO: just need to add menu element, some debug probably needed
// manipulations to apply to data after joining predictions
export let resultsQuery = [];

export let loadProblemData = async problem => {

    let problemId = problem.problemId;
    // create a default problem
    if (!(problemId in resultsData))
        resultsData[problemId] = buildProblemResultsData();

    // complete reset if problemId, query, dataSplit or target changed
    if (JSON.stringify(resultsData[problemId].id.query) === JSON.stringify(resultsQuery) &&
        resultsData[problemId].id.dataSplit === resultsPreferences.dataSplit &&
        resultsData[problemId].id.target === resultsPreferences.target)
        return;

    // complete reset of problem's cache
    resultsData[problemId] = buildProblemResultsData();
    resultsData[problemId].id = {
        query: resultsQuery,
        solutionId: undefined,
        dataSplit: resultsPreferences.dataSplit,
        target: resultsPreferences.target
    }
};

export let loadSolutionData = async (problem, adapter) => {
    await loadProblemData(problem);

    if (resultsData[problem.problemId].id.solutionID === adapter.getSolutionId())
        return;

    resultsData[problem.problemId].id.solutionID = adapter.getSolutionId();

    // solution specific, one solution stored
    resultsData[problem.problemId].interpretationEFD = undefined;
    resultsData[problem.problemId].interpretationEFDLoading = false;
};

export let loadFittedVsActuals = async (problem, adapter) => {
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getDataPointer(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // fitted vs actuals don't apply for non-regression problems
    if (!['regression', 'semisupervisedregression', 'forecasting'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsData[problem.problemId].fittedVsActual)
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()] = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let produceId = app.generateID(dataPointer);
    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-fitted-vs-actuals-data`, {
            method: 'POST',
            body: {
                data_pointer: dataPointer,
                metadata: {
                    targets: problem.targets,
                    collectionName: app.workspace.d3m_config.name,
                    collectionPath: app.workspace.datasetPath,
                    query: compiled,
                    produceId
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    resultsData[problem.problemId].fittedVsActual[adapter.getSolutionId()] = response.data;
    resultsData[problem.problemId].fittedVsActualLoading[adapter.getSolutionId()] = false;

    // apply state changes to the page
    m.redraw();
};


export let loadConfusionData = async (problem, adapter) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getDataPointer(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // confusion matrices don't apply for non-classification problems
    if (!['classification', 'vertexclassification'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].confusionLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsData[problem.problemId].confusion)
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].confusionLoading[adapter.getSolutionId()] = true;

    console.log(adapter.getSolutionId())

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let produceId = app.generateID(dataPointer);
    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-confusion-data`, {
            method: 'POST',
            body: {
                data_pointer: dataPointer,
                metadata: {
                    targets: problem.targets,
                    collectionName: app.workspace.d3m_config.name,
                    collectionPath: app.workspace.datasetPath,
                    query: compiled,
                    produceId
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    Object.keys(response.data).forEach(variable => {
        if (response.data[variable].classes.length <= 15) {
            response.data[variable].classes = response.data[variable].classes
                .sort(app.omniSort);

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

    resultsData[problem.problemId].confusion[adapter.getSolutionId()] = response.data;
    resultsData[problem.problemId].confusionLoading[adapter.getSolutionId()] = false;

    // apply state changes to the page
    m.redraw();
};

export let loadDataSample = async (problem, split) => {

    // reset if id is different
    await loadProblemData(problem);

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].dataSampleLoading[split])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId].dataSample[split])
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].dataSampleLoading[split] = true;

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);

    let compiled = queryMongo.buildPipeline(
        [
            ...app.workspace.raven_config.hardManipulations,
            ...problem.manipulations,
            problem.task === 'objectDetection' && {
                type: 'aggregate',
                measuresUnit: problem.tags.indexes.map(index => ({"subset": "discrete", "column": index})),
                // collect all the values in the target column into an array, and take the first value in the image column
                // TODO: "image" should not be hardcoded
                measuresAccum: [
                    ...problem.targets.map(target => ({"subset": "push", "column": target})),
                    {'subset': 'first', 'column': 'image'}
                ]
            },
            {
                type: 'menu',
                metadata: {
                    type: 'data',
                    sample: resultsPreferences.recordLimit
                }
            },
        ].filter(_ => _),
        app.workspace.raven_config.variablesInitial)['pipeline'];

    let response;
    try {
        response = await app.getData({
            method: 'aggregate',
            datafile: problem.results.datasetPaths[split],
            collection_name: `${app.workspace.d3m_config.name}_${problem.problemId}_${split}`,
            reload: true,
            query: JSON.stringify(compiled)
        })
    } catch (err) {
        console.warn("retrieve data sample error");
        console.log(err);
        app.alertWarn('Dependent variables have not been loaded. Some plots will not load.')
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsData[problem.problemId].id.query) !== tempQuery)
        return;

    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    resultsData[problem.problemId].dataSample[split] = response;
    resultsData[problem.problemId].dataSampleLoading[split] = false;

    m.redraw()
};

export let loadFittedData = async (problem, adapter, split) => {
    await loadDataSample(problem, split);

    let dataPointer = adapter.getDataPointer(split);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // indices from dataSample must be loaded first
    if (!(split in resultsData[problem.problemId].dataSample))
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].fittedLoading?.[adapter.getSolutionId()]?.[split])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId].fitted?.[adapter.getSolutionId()]?.[split])
        return;

    // begin blocking additional requests to load
    app.setRecursive(resultsData[problem.problemId].fittedLoading, [
        [adapter.getSolutionId(), {}],
        [split, true]
    ]);

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
            method: 'POST',
            body: {
                data_pointer: dataPointer,
                indices: resultsData[problem.problemId].dataSample[split].map(obs => obs.d3mIndex)
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    // attempt to parse all data into floats
    let nominals = app.getNominalVariables(problem);
    response.data.forEach(row => problem.targets
        .filter(target => !nominals.includes(target))
        .forEach(target => {
            if (!(target in row)) return;

            let parsed = parseFloat(row[target]);
            if (!isNaN(parsed)) row[target] = parsed
        }));

    app.setRecursive(resultsData[problem.problemId].fitted,
        [[adapter.getSolutionId(), {}], [split, response.data]]);
    app.setRecursive(resultsData[problem.problemId].fittedLoading,
        [[adapter.getSolutionId(), {}], [split, false]]);

    // apply state changes to the page
    m.redraw();
};

export let loadInterpretationPartialsFittedData = async (problem, adapter) => {

    // load dependencies, which can clear loading state if problem, etc. changed
    await loadProblemData(problem);

    let dataPointer = adapter.getDataPointer('partials');

    // don't attempt to load if there is no data
    if (!dataPointer) return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()])
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()] = true;

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
            method: 'POST',
            body: {data_pointer: dataPointer}
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    // convert unlabeled string table to predictor format
    let offset = 0;
    resultsData[problem.problemId].interpretationPartialsFitted[adapter.getSolutionId()] = Object.keys(problem.domains).reduce((out, predictor) => {
        let nextOffset = offset + problem.domains[predictor].length;
        // for each point along the domain of the predictor
        out[predictor] = response.data.slice(offset, nextOffset)
            // for each target specified in the problem
            .map(point => problem.targets.reduce((out_point, target) => Object.assign(out_point, {
                [target]: app.inferIsCategorical(target) ? point[target] : parseNumeric(point[target])
            }), {}));
        offset = nextOffset;
        return out;
    }, {});
    resultsData[problem.problemId].interpretationPartialsFittedLoading[adapter.getSolutionId()] = false;

    m.redraw();
};

// interpretation from empirical first differences
export let loadInterpretationEFDData = async (problem, adapter) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getDataPointer(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].interpretationEFDLoading)
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId].interpretationEFD)
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].interpretationEFDLoading = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let produceId = app.generateID(dataPointer);
    let response;

    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
            method: 'POST',
            body: {
                data_pointer: dataPointer,
                metadata: {
                    produceId,
                    targets: problem.targets,
                    predictors: app.getPredictorVariables(problem),
                    categoricals: app.getNominalVariables(problem),
                    collectionName: app.workspace.d3m_config.name,
                    collectionPath: app.workspace.datasetPath,
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    let nominals = app.getNominalVariables(problem);

    // melt predictor data once, opposed to on every redraw
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor] = app.melt(
            nominals.includes(predictor)
                ? app.sample(response.data[predictor], 20, false, true)
                : response.data[predictor],
            ["predictor"], valueLabel, variableLabel));

    // add more granular categorical columns from the compound key 'variableLabel'
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor]
            .forEach(point => {
                point.target = point[variableLabel].split(' ')[0];
                point.level = point[variableLabel].split('-').pop();
            }));

    resultsData[problem.problemId].interpretationEFD = response.data;
    resultsData[problem.problemId].interpretationEFDLoading = false;

    // apply state changes to the page
    m.redraw();
};

// interpretation from empirical first differences
export let loadInterpretationICEFittedData = async (problem, adapter, predictor) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let dataPointerPredictors = problem.results.datasetPaths['ICE_synthetic_' + predictor];
    let dataPointerIndex = problem.results.datasetIndexPartialsPaths['ICE_synthetic_' + predictor];
    let dataPointerFitted = adapter.getDataPointer('ICE_synthetic_' + predictor);

    // don't load if data is not available
    if (!dataPointerFitted || !dataPointerPredictors || !dataPointerIndex)
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId].interpretationICEFittedLoading[predictor])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId].interpretationICEFitted[predictor])
        return;

    // begin blocking additional requests to load
    resultsData[problem.problemId].interpretationICEFittedLoading[predictor] = true;

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);

    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-ICE-data`, {
            method: 'POST',
            body: {
                data_pointer_predictors: dataPointerPredictors,
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
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    resultsData[problem.problemId].interpretationICEFitted[predictor] = response.data;
    resultsData[problem.problemId].interpretationICEFittedLoading[predictor] = false;

    // apply state changes to the page
    m.redraw();
};

let loadImportanceScore = async (problem, adapter, mode) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    // TODO: implement importance based on partials and PDP/ICE
    mode = 'EFD'

    let dataPointers = [];
    if (mode === 'EFD')
        dataPointers = {'EFD': adapter.getDataPointer(resultsPreferences.dataSplit)};
    if (mode === 'Partials')
        dataPointers = {'Partials': adapter.getDataPointer('partials')};
    if (mode === 'PDP/ICE')
        dataPointers = app.getPredictorVariables(problem).reduce((out, predictor) => Object.assign(out, {
            [predictor]: adapter.getDataPointer('ICE_synthetic_' + predictor)
        }), {});

    // don't load if data is not available
    if (Object.values(dataPointers).some(pointer => !pointer))
        return;

    // don't load if systems are already in loading state
    if (resultsData[problem.problemId]?.importanceScoresLoading?.[adapter.getSolutionId()]?.[mode])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId]?.importanceScores?.[adapter.getSolutionId()]?.[mode])
        return;

    // begin blocking additional requests to load
    app.setRecursive(resultsData, [
        ['importanceScoresLoading', {}],
        [adapter.getSolutionId(), {}],
        [mode, true]]);

    let tempQuery = JSON.stringify(resultsData[problem.problemId].id.query);
    let response;
    if (mode === 'EFD') {
        // how to construct actual values after manipulation
        let dataPointer = dataPointers['EFD'];
        let compiled = queryMongo.buildPipeline([
            ...app.workspace.raven_config.hardManipulations,
            ...problem.manipulations,
            ...resultsQuery
        ], app.workspace.raven_config.variablesInitial)['pipeline'];

        let produceId = app.generateID(dataPointer);

        try {
            response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
                method: 'POST',
                body: {
                    data_pointer: dataPointer,
                    metadata: {
                        produceId,
                        targets: problem.targets,
                        predictors: app.getPredictorVariables(problem),
                        categoricals: app.getNominalVariables(problem),
                        collectionName: app.workspace.d3m_config.name,
                        collectionPath: app.workspace.datasetPath,
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

    if (mode === 'Partials') {
        try {
            response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
                method: 'POST',
                body: {data_pointer: dataPointers['Partials']}
            });

            // console.log(response);

            if (!response.success) {
                console.warn(response.data);
                throw response.data;
            }
        } catch (err) {
            console.error(err);
            return;
        }
        let offset = 0;
        let partialsData = Object.keys(problem.domains).reduce((out, predictor) => {
            let nextOffset = offset + problem.domains[predictor].length;
            // for each point along the domain of the predictor
            out[predictor] = response.data.slice(offset, nextOffset)
                // for each target specified in the problem
                .map(point => problem.targets.reduce((out_point, target) => Object.assign(out_point, {
                    [target]: app.inferIsCategorical(target) ? point[target] : parseNumeric(point[target])
                }), {}));
            offset = nextOffset;
            return out;
        }, {});

        console.log(partialsData);
    }

    if (mode === 'PDP/ICE') {
        let responses = {};
        await Promise.all(Object.keys(dataPointers).map(async predictor => {
            let dataPointerPredictors = problem.results.datasetPaths['ICE_synthetic_' + predictor];
            let dataPointerIndex = problem.results.datasetIndexPartialsPaths['ICE_synthetic_' + predictor];
            if (!dataPointerPredictors) return;
            try {
                responses[predictor] = await m.request(D3M_SVC_URL + `/retrieve-output-ICE-data`, {
                    method: 'POST',
                    body: {
                        data_pointer_predictors: dataPointerPredictors,
                        data_pointer_fitted: dataPointers[predictor],
                        data_pointer_index: dataPointerIndex,
                        variable: predictor
                    }
                });
            } catch (err) {
                console.error(err);
                return;
            }
        }));

        response = Object.keys(responses).reduce((out, resp) => {
            return {
                success: out.success && resp.success,
                data: {scores: Object.assign(out.data.scores, resp.success ? resp.data.scores : {})}
            }
        }, {success: true, data: {scores: {}}});

        console.log(response);
        // TODO: variable importance for PDP/ICE
        return;
    }

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;
    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    let responseImportance = await m.request(ROOK_SVC_URL + 'variableImportance.app', {
        method: 'POST',
        body: {
            efdData: response.data,
            targets: problem.targets,
            categoricals: app.getNominalVariables(problem),
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
    app.setRecursive(resultsData[problem.problemId], [
        ['importanceScores', {}],
        [adapter.getSolutionId(), {}],
        [mode, responseImportance.data.scores]
    ]);

    m.redraw();
};

let loadObjectBoundaryImagePath = async (problem, adapters, target, split, index) => {
    adapters.forEach(adapter => loadFittedData(problem, adapter, split));

    // reset image paths if the fitted data for one of the problems is not loaded
    if (!adapters.every(adapter => adapter.getSolutionId() in resultsData[problem.problemId].fitted)) {
        resultsData[problem.problemId].boundaryImagePaths = {};
        resultsData[problem.problemId].boundaryImageColormap = undefined;
        resultsData[problem.problemId].boundaryImagePathsLoading = {};
        return;
    }

    // object boundaries only apply to object detection problems
    if (problem.task.toLowerCase() !== 'objectdetection')
        return;

    // don't load if image is already being loaded
    if (resultsData[problem.problemId]?.boundaryImagePathsLoading?.[target]?.[split]?.[JSON.stringify(index)])
        return;

    // don't load if already loaded
    if (resultsData[problem.problemId]?.boundaryImagePaths?.[target]?.[split]?.[JSON.stringify(index)])
        return;

    // begin blocking additional requests to load
    app.setRecursive(resultsData[problem.problemId], [
        ['boundaryImagePathsLoading', {}],
        [target, {}],
        [split, {}],
        [JSON.stringify(index), true]
    ]);

    let actualPoint = resultsData[problem.problemId].dataSample[split]
        .find(point => Object.entries(index).every(pair => point[pair[0]] === pair[1]));

    // collect all fitted data points at the given index for each solution
    // an object of {Actual: [boundary1, ...], solutionId: [boundary1, boundary2], ...}
    let fittedPoints = adapters.reduce((fittedPoints, adapter) => Object.assign(fittedPoints, {
            [adapter.getSolutionId()]: resultsData[problem.problemId].fitted[adapter.getSolutionId()][split]
                // all multi-indexes match
                .filter(point => Object.entries(index).every(pair => point[pair[0]] === pair[1]))
                // turn all matched points into an array of boundaries
                .flatMap(point => point[target])
        }),
        {Actual: actualPoint[target]});

    if (!resultsData[problem.problemId].boundaryImageColormap) {
        resultsData[problem.problemId].boundaryImageColormap = Object.keys(fittedPoints).reduce((map, solutionName, i) => Object.assign(map, {
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
                    [resultsData[problem.problemId].boundaryImageColormap[solutionName].replace('#', '')]: fittedPoints[solutionName]
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

    if (resultsPreferences.dataSplit !== resultsData[problem.problemId].id.dataSplit)
        return;

    app.setRecursive(resultsData[problem.problemId], [
        ['boundaryImagePaths', {}],
        [target, {}],
        [split, {}],
        [JSON.stringify(index), response.data]
    ]);

    app.setRecursive(resultsData[problem.problemId], [
        ['boundaryImagePathsLoading', {}],
        [target, {}],
        [split, {}],
        [JSON.stringify(index), false]
    ]);

    // apply state changes to the page
    m.redraw();
};

let parseNumeric = value => isNaN(parseFloat(value)) ? value : parseFloat(value);


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

export let findProblem = data => {
    if (data.search_id === undefined) return;
    return Object.values(app.workspace?.raven_config?.problems || {})
        .find(problem => String(problem?.results?.solverState?.[data.system]?.searchId) === String(data.search_id));
};

export let prepareResultsDatasets = async (problem, solverId) => {
    // set d3m dataset id to unique value if not defined
    problem.results.d3mDatasetId = problem.results.d3mDatasetId
        || workspace.datasetDoc.about.datasetID + '_' + Math.abs(app.generateID(String(Math.random())));

    problem.results.selectedSolutions[solverId] = problem.results.selectedSolutions[solverId] || [];
    app.setRecursive(problem, [['results', {}], ['solverState', {}], [solverId, {}], ['thinking', true]]);

    problem.results.solverState[solverId].message = 'applying manipulations to data';
    m.redraw();
    try {
        if (!app.materializeManipulationsPromise[problem.problemId])
            app.materializeManipulationsPromise[problem.problemId] = app.materializeManipulations(problem);
        await app.materializeManipulationsPromise[problem.problemId];
    } catch (err) {
        alertError(`Applying data manipulations failed: ${err}`);
        throw err
    }

    if (['classification', 'regression'].includes(problem.task)) {
        problem.results.solverState[solverId].message = 'preparing partials data';
        m.redraw();
        try {
            if (!app.materializePartialsPromise[problem.problemId])
                app.materializePartialsPromise[problem.problemId] = app.materializePartials(problem);
            await app.materializePartialsPromise[problem.problemId];
        } catch (err) {
            console.error(err);
            console.log('Materializing partials failed. Continuing without partials data.')
        }

        // add ICE datasets to to datasetSchemaPaths and datasetPaths
        problem.results.solverState[solverId].message = 'preparing ICE data';
        m.redraw();
        try {
            if (!app.materializeICEPromise[problem.problemId])
                app.materializeICEPromise[problem.problemId] = app.materializeICE(problem);
            await app.materializeICEPromise[problem.problemId];
        } catch (err) {
            console.error(err);
            console.log('Materializing ICE failed. Continuing without ICE data.')
        }
    }

    problem.results.solverState[solverId].message = 'preparing train/test splits';
    m.redraw();
    try {
        if (!app.materializeTrainTestPromise[problem.problemId])
            app.materializeTrainTestPromise[problem.problemId] = app.materializeTrainTest(problem);
        await app.materializeTrainTestPromise[problem.problemId];
    } catch (err) {
        console.error(err);
        console.log('Materializing train/test splits failed. Continuing without splitting.')
    }

    problem.results.solverState[solverId].message = 'initiating the search for solutions';
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

    let manipulatedInfo = await buildDatasetUrl(
        problem, undefined, customDataset.datasetPath,
        `${workspace.d3m_config.name}_${customDataset.name}`,
        customDataset.datasetDoc);

    problem.results.datasetSchemas[customDataset.name] = customDataset.datasetDoc;
    problem.results.datasetPaths[customDataset.name] = manipulatedInfo.data_path;
    problem.results.datasetSchemaPaths[customDataset.name] = manipulatedInfo.metadata_path;

    return {customDataset, manipulatedInfo};
}

export let produceOnSolution = async (customDataset, manipulatedInfo, problem, solution) => {

    let adapter = getSolutionAdapter(problem, solution);
    let solverSystems = getSystemAdapters(problem);

    solverSystems[adapter.getSystemId()].produce(
        adapter.getSolutionId(),
        {
            'train': {
                'name': 'train',
                "resource_uri": 'file://' + problem.results.datasetPaths.train
            },
            'input': {
                'name': customDataset.name,
                'metadata_uri': 'file://' + manipulatedInfo.metadata_path,
                'resource_uri': 'file://' + manipulatedInfo.data_path,
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