import m from 'mithril';

import * as app from "../app";
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
import MenuTabbed from "../../common/views/MenuTabbed";

import {bold, italicize, preformatted} from "../index";
import PlotVegaLite from "../views/PlotVegaLite";
import ConfusionMatrix from "../views/ConfusionMatrix";
import Flowchart from "../views/Flowchart";
import ButtonRadio from "../../common/views/ButtonRadio";
import VariableImportance from "../views/VariableImportance";
import ModalVanilla from "../../common/views/ModalVanilla";
import * as queryMongo from "../manipulations/queryMongo";

export let leftpanel = () => {

    let ravenConfig = app.workspace.raven_config;

    let selectedProblem = app.getSelectedProblem();
    if (!selectedProblem) return;

    // Available systems
    //  Note: h2o - requires Java
    //
    let solverSystemNames = ['auto_sklearn', 'tpot', 'mlbox', 'ludwig']; // 'h2o', 'caret'

    // mljar-supervised only supports binary classification
    if (selectedProblem.task && selectedProblem.subTask &&
        selectedProblem.task.toLowerCase().includes('classification') &&
        selectedProblem.subTask.toLowerCase().includes('binary'))
        solverSystemNames.push('mljar-supervised');

    let solverSystems = solverSystemNames
        .reduce((out, systemId) => Object.assign(out, {
            [systemId]: solverWrapped.getSystemAdapterWrapped(systemId)
        }), {d3m: solverD3M.getD3MAdapter});

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
                items: ['all'].concat(selectedProblem.splitOptions.outOfSampleSplit ? ['test', 'train'] : []),
                activeItem: resultsPreferences.dataSplit,
                onclickChild: value => resultsPreferences.dataSplit = value,
                style: {'margin-left': '1em'}
            }))),
            // m(Dropdown, {
            //     id: 'pipelineDropdown',
            //     items: Object.keys(ravenConfig.problems).filter(key =>
            //         Object.keys(ravenConfig.problems[key].solutions)
            //             .reduce((sum, source) => sum + Object.keys(ravenConfig.problems[key].solutions[source]).length, 0)),
            //     activeItem: ravenConfig.selectedProblem,
            //     onclickChild: app.setSelectedProblem
            // })
        ),
        m('div#modelComparisonOption', {style: {displayx: 'inline-block'}},
            m('input#modelComparisonCheck[type=checkbox]', {
                onclick: m.withAttr("checked", setModelComparison),
                checked: modelComparison,
                style: {margin: '.25em'}
            }),
            m('label#modelComparisonLabel', {
                title: 'select multiple models to compare',
                style: {display: 'inline-block'}
            }, 'Model Comparison')
        ),

        m(MenuHeaders, {
            id: 'pipelineMenu',
            sections: [
                {
                    idSuffix: 'solvers',
                    value: 'Solvers',
                    contents: m(Table, {
                        id: 'solverTable',
                        data: Object.keys(solverSystems).map(systemId => ({
                            solver: systemId,
                            action: m(Button, {
                                class: 'btn-sm',
                                onclick: () => solverSystems[systemId](selectedProblem).solve(),
                                disabled: !!(selectedProblem.solverState[systemId] || {}).thinking
                            }, !!(selectedProblem.solverState[systemId] || {}).thinking ? 'Solving' : 'Solve'),
                            state: selectedProblem.solverState[systemId] && m('',
                                selectedProblem.solverState[systemId].thinking && common.loaderSmall(systemId),
                                m('div[style=font-size:medium;margin-left:1em;display:inline-block]',
                                    selectedProblem.solverState[systemId].message)
                            ),
                        })),
                        headers: ['solver', 'action', 'state'],
                        tableTags: m('colgroup',
                            m('col', {span: 1, width: '15em'}),
                            m('col', {span: 1, width: '3em'}),
                            m('col', {span: 1}))
                    })

                },
                !solutionsCombined && solverSystems.map(solver => ({
                    value: solver.systemId + ' Solutions',
                    contents: getSolutionTable(selectedProblem, solver.systemId)
                })),
                solutionsCombined && {
                    idSuffix: 'allSolutions',
                    value: 'All Solutions',
                    contents: getSolutionTable(selectedProblem)
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
                value: 'Problems',
                contents: [
                    Object.keys(otherSearches).length > 0 && m('h4', 'Within Workspace'),
                    'All searches being conducted for this workspace are listed below. ' +
                    'You may select searches for other problems in the workspace to view their solutions.',
                    m(Table, {
                        data: Object.keys(app.workspace.raven_config.problems)
                            .filter(problemId => 'd3m' in ((app.workspace.raven_config.problems[problemId] || {}).solverState || {}))
                            .map(problemId => app.workspace.raven_config.problems[problemId])
                            .map(problem => [
                                problem.problemID,
                                problem.targets.join(', '),
                                problem.solverState.d3m.searchId,
                                problem.solverState.d3m.thinking ? 'running' : 'stopped',
                                problem.solverState.d3m.thinking && m(Button, {
                                    title: 'stop the search',
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

                                        solverD3M.stopSearch(problem.solverState.d3m.searchId);
                                    }
                                }, m(Icon, {name: 'stop'}))
                            ]),
                        headers: ['Name', 'Targets', 'Search ID', 'State', 'Stop'],
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
                                        onclick: () => solverD3M.stopSearch(searchID)
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

        if (adapters.every(adapter => !adapter.getDataPointer(resultsPreferences.dataSplit))) {
            return [
                'Waiting for solver to produce predictions.',
                common.loader('PredictionSummary')
            ]
        }

        if (problem.task.toLowerCase().includes('regression') || problem.task.toLowerCase() === 'timeseriesforecasting') {
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

            return m('div', {
                style: {'height': '500px'}
            }, m(PlotVegaLite, {
                specification: plots.vegaScatter(
                    summaries.flatMap(summary => summary.fittedVsActual),
                    xName, yName, groupName, countName, title),
            }))
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
                                    attrsAll: {style: {width: 'calc(100% - 2em)', margin: '1em'}}
                                })),
                            summary.confusionMatrix.classes.length < 100 ? summary.confusionMatrix.classes.length > 0 ? m(PlotVegaLite, {
                                    specification: plots.vegaConfusionMatrix(
                                        summary.confusionMatrix.data,
                                        summary.confusionMatrix.classes,
                                        'Predicted', 'Actual', 'count',
                                        `Confusion Matrix for ${problem.targets[0]}${resultsPreferences.factor ? (' factor ' + resultsPreferences.factor) : ''}`)})
                                : 'Too few classes for confusion matrix! There is a data mismatch.'
                                : 'Too many classes for confusion matrix!'
                        ]
                    }))
                })
            ]
        }
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
                    "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
                    "description": `${metric} scores for ${problem.problemID}.`,
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

    variableImportance(problem, adapter) {

        let importanceContent = common.loader('VariableImportance');

        if (resultsPreferences.importanceMode === 'EFD') {
            let importanceData = problem.predictors.reduce((out, predictor) => Object.assign(out, {
                [predictor]: adapter.getImportanceEFD(predictor)
            }), {});

            // reassign content if some data is not undefined
            let importancePlots = Object.keys(importanceData).map(predictor => importanceData[predictor] && [
                bold(predictor),
                m(VariableImportance, {
                    mode: resultsPreferences.importanceMode,
                    data: importanceData[predictor]
                        .filter(point => resultsPreferences.factor === undefined || String(resultsPreferences.factor) === String(point.level)),
                    problem: problem,
                    predictor,
                    target: resultsPreferences.target,
                    yLabel: valueLabel,
                    variableLabel: variableLabel,
                    summary: app.variableSummaries[predictor]
                })
            ]).filter(_ => _);

            let isCategorical = app.getNominalVariables(problem).includes(resultsPreferences.target);
            if (importancePlots.length > 0) importanceContent = m('div', [
                m('div[style=margin: 1em]', italicize("Empirical first differences"), ` is a tool to measure variable importance from the empirical distribution of the data. The Y axis refers to the ${isCategorical ? 'probability of each level' : 'expectation'} of the dependent variable as the predictor (x) varies along its domain. Parts of the domain where the fitted and actual values align indicate high utility from the predictor. If the fitted and actual values are nearly identical, then the two lines may be indistinguishable.`),

                problem.task.toLowerCase().includes('classification') && m('div[style=margin-bottom:1em]', 'Set the factor to filter EFD plots to a single class/factor/level.',
                    m('br'),
                    m('label#resultsFactorLabel', 'Active factor/level: '),
                    m('[style=display:inline-block]', m(Dropdown, {
                        id: 'resultsFactorDropdown',
                        items: [
                            'undefined',
                            ...new Set(Object.values(importanceData)[0].map(point => point.level).sort(app.omniSort))
                        ],
                        activeItem: resultsPreferences.factor,
                        onclickChild: setResultsFactor,
                        style: {'margin-left': '1em'}
                    }))),
                importancePlots
            ]);
        }

        if (resultsPreferences.importanceMode === 'Partials') {
            let importancePlots = [
                m('div[style=margin: 1em]', italicize("Partials"), ` shows the prediction of the model as one predictor is varied, and the other predictors are held at their mean.`),
            ];
            app.getPredictorVariables(problem).forEach(predictor => {
                let importanceData = adapter.getImportancePartials(predictor);
                if (importanceData) importancePlots.push(m('div',
                    bold(predictor),
                    m(VariableImportance, {
                        mode: 'Partials',
                        data: importanceData,
                        problem: problem,
                        predictor: predictor,
                        target: resultsPreferences.target,
                        yLabel: valueLabel,
                        variableLabel: variableLabel,
                        summary: app.variableSummaries[predictor]
                    })
                    // !categoricals.includes(predictor) && m(PlotVegaLite, {
                    //     specification: plots.vegaDensityHeatmap(app.variableSummaries[predictor])
                    // })
                ));
            });
            if (importancePlots.length > 0) importanceContent = m('div', {style: 'overflow:auto'}, importancePlots);
        }
        if (resultsPreferences.importanceMode === 'PDP/ICE') {
            let isCategorical = app.getNominalVariables(problem).includes(resultsPreferences.target);

            importanceContent = [
                m('div[style=margin: 1em]',
                    italicize("Individual conditional expectations"), ` draws one line for each individual in the data, as the selected predictor is varied. `
                    + `A random sample of individuals are chosen from the dataset. `
                    + (isCategorical
                        ? 'The thickness of the lines is relative to the number of observations present at each level.'
                        : 'The red line is a partial dependency plot- the average of the target variable over all individuals.')),
                m('label', 'Importance for predictor:'),
                m(Dropdown, {
                    id: 'predictorImportanceDropdown',
                    items: problem.predictors,
                    onclickChild: mode => resultsPreferences.predictor = mode,
                    activeItem: resultsPreferences.predictor,
                })
            ];

            let importanceData = adapter.getImportanceICE(resultsPreferences.predictor);

            if (importanceData) importanceContent.push(m('div', {style: 'overflow:auto'}, m(VariableImportance, {
                mode: 'ICE',
                data: importanceData,
                problem: problem,
                predictor: resultsPreferences.predictor,
                target: resultsPreferences.target,
                yLabel: valueLabel,
                variableLabel: variableLabel,
                summary: app.variableSummaries[resultsPreferences.predictor]
            })));
            else importanceContent.push(common.loader('VariableImportance'))

        }
        return [
            m('label', 'Variable importance mode:'),
            m(ButtonRadio, {
                id: 'modeImportanceButtonBar',
                onclick: mode => resultsPreferences.importanceMode = mode,
                activeSection: resultsPreferences.importanceMode,
                sections: [
                    {value: 'EFD', title: 'empirical first differences'},
                    problem.datasetPaths.partials && {value: 'Partials', title: 'model prediction as predictor varies over its domain'},
                    {value: 'PDP/ICE', title: 'partial dependence plot/individual conditional expectation'}
                ]
            }),
            importanceContent
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
                //     'byudml': common.dvColor,
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
                    attrsAll: {style: {'margin-bottom': 0, padding: '1em'}}
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
                attrsAll: {style: {'margin-bottom': 0, 'padding': '1em'}}
            });
            let outputs = 'outputs' in pipeline && m(Table, {
                id: 'pipelineOutputsTable',
                data: pipeline.outputs,
                attrsAll: {style: {'margin-bottom': 0, 'padding': '1em'}}
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
                attrsAll: {
                    style: {
                        margin: '1em',
                        width: 'calc(100% - 2em)',
                        border: common.borderColor,
                        'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)'
                    }
                },
                nest: true
            }),
            m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Steps: '),
            m(Flowchart, {
                labelWidth: '5em',
                steps: pipelineFlowchartPrep(solution.pipeline)
            }))
    };

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

        let selectedSolutions = getSelectedSolutions(problem);
        if (selectedSolutions.length === 0)
            return m('div', {style: {margin: '1em 0px'}}, problemSummary);

        let solutionAdapters = selectedSolutions
            .map(solution => getSolutionAdapter(problem, solution));
        let firstAdapter = solutionAdapters[0];
        let firstSolution = selectedSolutions[0];

        let solutionSummary = selectedSolutions.length === 1 && m(Subpanel, {
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
        }, m(Table, {
            headers: ['Variable', 'Data'],
            data: [
                ['System', firstAdapter.getSystemId()],
                ['Downloads', m(Table, {
                    data: (firstSolution.produce || []).map(produce =>
                        ({
                            'name': produce.input.name,
                            'predict type': produce.configuration.predict_type,
                            'input': m(Button, {onclick: () => app.downloadFile(produce.input.resource_uri)}, 'Download'),
                            'output': m(Button, {onclick: () => app.downloadFile('file://' + produce.data_pointer)}, 'Download'),
                        }))

                })],
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
                // ['Model Zip', m(Button, {
                //     onclick: () => {
                //         solverWrapped.downloadModel(firstSolution.model_pointer)
                //     }
                // }, 'Download')]
            ])
        }));

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
        }, resultsSubpanels['Prediction Summary'] && this.predictionSummary(problem, solutionAdapters));

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
        }, resultsSubpanels['Scores Summary'] && this.scoresSummary(problem, solutionAdapters));

        let variableImportance = selectedSolutions.length === 1 && m(Subpanel, {
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
        }, resultsSubpanels['Variable Importance'] && this.variableImportance(problem, firstAdapter));

        let visualizePipelinePanel = selectedSolutions.length === 1 && firstSolution.systemId === 'd3m' && m(Subpanel, {
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

        let performanceStatsContents = firstSolution.systemId === 'caret' && Object.keys(firstSolution.models)
            .filter(target => firstSolution.models[target].statistics)
            .map(target => m('div',
                m('h5', target),
                m(Table, {
                    data: firstSolution.models[target].statistics[0]
                })));
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
            visualizePipelinePanel,
            performanceStats,
            coefficientMatrix,
            anovaTables,
            VIF
        );
    }
}

// functions to extract information from D3M response format
export let getSolutionAdapter = (problem, solution) => ({
    getName: () => solution.name,
    getDescription: () => solution.description,
    getSystemId: () => solution.systemId,
    getSolutionId: () => solution.solutionId || 'unknown',
    getDataPointer: (dataSplit, predict_type='RAW') => {
        let produce = (solution.produce || [])
            .find(produce =>
                produce.input.name === dataSplit &&
                produce.configuration.predict_type === predict_type);
        return produce && produce.data_pointer;
    },
    getFittedVsActuals: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadFittedVsActuals(problem, adapter);
        if (solution.solutionId in resultsData.fittedVsActual)
            return resultsData.fittedVsActual[solution.solutionId][target];
    },
    getConfusionMatrix: target => {
        let adapter = getSolutionAdapter(problem, solution);
        loadConfusionData(problem, adapter);
        if (solution.solutionId in resultsData.confusion)
            return resultsData.confusion[solution.solutionId][target];
    },
    getScore: metric => {
        if (!solution.scores) return;
        let evaluation = solution.scores.find(score => app.d3mMetricsInverted[score.metric.metric] === metric);
        return evaluation && evaluation.value
    },
    getImportanceEFD: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadImportanceEFDData(problem, adapter);

        if (resultsData.importanceEFD)
            return resultsData.importanceEFD[predictor];
    },
    getImportancePartials: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadImportancePartialsFittedData(problem, adapter);

        if (!resultsData.importancePartialsFitted[adapter.getSolutionId()]) return;

        return app.melt(
            problem.domains[predictor]
                .map((x, i) => Object.assign({[predictor]: x},
                    resultsData.importancePartialsFitted[adapter.getSolutionId()][predictor][i])),
            [predictor],
            valueLabel, variableLabel);
    },
    getImportanceICE: predictor => {
        let adapter = getSolutionAdapter(problem, solution);
        loadImportanceICEFittedData(problem, adapter, predictor);

        if (resultsData.importanceICEFitted) {
            return resultsData.importanceICEFitted
        }
    }
});


let getSolutionTable = (problem, systemId) => {
    let solutions = systemId
        ? Object.values(problem.solutions[systemId])
        : Object.keys(problem.solutions)
            .flatMap(systemId => Object.values(problem.solutions[systemId]));

    let adapters = solutions.map(solution => getSolutionAdapter(problem, solution));

    let data = adapters
    // extract data for each row (identification and scores)
        .map(adapter => Object.assign({
                adapter, ID: String(adapter.getSolutionId()), Solver: adapter.getSystemId(), Solution: adapter.getName()
            },
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
            .filter(adapter => (problem.selectedSolutions[adapter.getSystemId()] || '').includes(adapter.getSolutionId()))),
        onclick: adapter => setSelectedSolution(problem, adapter.getSystemId(), adapter.getSolutionId())
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
    importanceMode: 'EFD',
    predictor: undefined,
    target: undefined,
    factor: undefined,
    plotScores: 'all',
    selectedMetric: undefined,
    dataSplit: 'test'
};

let setResultsFactor = factor => resultsPreferences.factor = factor === 'undefined' ? undefined : factor;

// labels for variable importance X/Y axes
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
    'Variable Importance': false
};

let solutionsCombined = true;

// when selected, the key/value [mode]: [pipelineID] is set.
export let setSelectedSolution = (problem, systemId, solutionId) => {
    solutionId = String(solutionId);

    // set behavioral logging
    let logParams = {
        activity_l1: 'MODEL_SELECTION',
        other: {solutionId: solutionId}
    };

    if (!problem) return;
    if (!(systemId in problem.selectedSolutions)) problem.selectedSolutions[systemId] = [];

    // TODO: find a better place for this/code pattern. Unsetting this here is ugly
    resultsData.importanceICEFitted = undefined;
    resultsData.importanceICEFittedLoading = false;

    if (modelComparison) {

        problem.selectedSolutions[systemId].includes(solutionId)
            ? app.remove(problem.selectedSolutions[systemId], solutionId)
            : problem.selectedSolutions[systemId].push(solutionId);

        // set behavioral logging
        logParams.feature_id = 'RESULTS_COMPARE_SOLUTIONS';
        logParams.activity_l2 = 'MODEL_COMPARISON';
    } else {
        problem.selectedSolutions = Object.keys(problem.selectedSolutions)
            .reduce((out, source) => Object.assign(out, {[source]: []}, {}), {});
        problem.selectedSolutions[systemId] = [solutionId];

        // set behavioral logging
        logParams.feature_id = 'RESULTS_SELECT_SOLUTION';
        logParams.activity_l2 = 'MODEL_SUMMARIZATION';

        // ------------------------------------------------
        // Logging, include score, rank, and solutionId
        // ------------------------------------------------
        let chosenSolution = problem.solutions[systemId][solutionId];
        if (chosenSolution){
            let adapter = getSolutionAdapter(problem, chosenSolution);
            let score = adapter.getScore(problem.metric);
            if (score !== undefined){
              logParams.other = {
                          solutionId: chosenSolution.solutionId,
                          rank: getProblemRank(problem.solutions[systemId], solutionId),
                          performance: score,
                          metric: resultsPreferences.selectedMetric,
                          };
            //  console.log(JSON.str)
            }
        } else{
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
        if (!(source in problem.solutions)) problem.solutions[source] = [];
        Object.values(problem.solutions[source]);
    }

    return Object.values(problem.solutions)
        .flatMap(source => Object.values(source))
};

export let getSelectedSolutions = (problem, systemId) => {
    if (!problem) return [];

    if (!systemId) return Object.keys(problem.selectedSolutions)
        .flatMap(systemId => problem.selectedSolutions[systemId]
            .map(id => problem.solutions[systemId][id])).filter(_ => _);

    problem.selectedSolutions[systemId] = problem.selectedSolutions[systemId] || [];
    return problem.selectedSolutions[systemId]
        .map(id => problem.solutions[systemId][id]).filter(_ => _)
};

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
        'Task Two Complete. Your selected pipeline has been submitted.'

        // * lots of room for cool activities *

        // m(Table, {
        //     id: 'finalPipelineTable',
        //     data: []
        // })
    )
};


// these variables hold indices, predictors, predicted and actual data
export let resultsData = {
    fittedVsActual: {},
    fittedVsActualLoading: {},

    // cached data is specific to the problem
    confusion: {},
    confusionLoading: {},

    // cached data is specific to the solution (tends to be larger)
    importanceEFD: undefined,
    importanceEFDLoading: false,

    // this has melted data for both actual and fitted values
    importancePartialsFitted: {},
    importancePartialsFittedLoading: {},

    // this has melted data for both actual and fitted values
    importanceICEFitted: undefined,
    importanceICEFittedLoading: false,

    id: {
        query: [],
        problemID: undefined,
        solutionID: undefined,
        dataSplit: undefined,
        predictor: undefined,
        target: undefined
    }
};
window.resultsData = resultsData;

// TODO: just need to add menu element, some debug probably needed
// manipulations to apply to data after joining predictions
export let resultsQuery = [];

export let loadProblemData = async (problem, predictor=undefined) => {
    // unload ICE data if predictor changed
    if (predictor && predictor !== resultsData.id.predictor) {
        resultsData.id.predictor = predictor;
        resultsData.importanceICEFitted = undefined;
        resultsData.importanceICEFittedLoading = false;
    }

    // complete reset if problemId, query, dataSplit or target changed
    if (resultsData.id.problemID === problem.problemID &&
        JSON.stringify(resultsData.id.query) === JSON.stringify(resultsQuery) &&
        resultsData.id.dataSplit === resultsPreferences.dataSplit &&
        resultsData.id.target === resultsPreferences.target)
        return;

    resultsData.id.query = resultsQuery;
    resultsData.id.problemID = problem.problemID;
    resultsData.id.solutionID = undefined;
    resultsData.id.dataSplit = resultsPreferences.dataSplit;
    resultsData.id.target = resultsPreferences.target;

    // specific to solution and target, all solutions stored for one target
    resultsData.fittedVsActual = {};
    resultsData.fittedVsActualLoading = {};

    // specific to solution and target, all solutions stored for one target
    resultsData.confusion = {};
    resultsData.confusionLoading = {};

    // specific to solution and target, one solution stored for one target
    resultsData.importanceEFD = undefined;
    resultsData.importanceEFDLoading = false;

    // specific to solution and target, all solutions stored for one target
    resultsData.importancePartialsFitted = {};
    resultsData.importancePartialsFittedLoading = {};

    // specific to combo of solution, predictor and target
    resultsData.importanceICEFitted = undefined;
    resultsData.importanceICEFittedLoading = false;
};

export let loadSolutionData = async (problem, adapter, predictor=undefined) => {
    await loadProblemData(problem, predictor);

    if (resultsData.id.solutionID === adapter.getSolutionId())
        return;

    resultsData.id.solutionID = adapter.getSolutionId();

    // solution specific, one solution stored
    resultsData.importanceEFD = undefined;
    resultsData.importanceEFDLoading = false;
};

export let loadFittedVsActuals = async (problem, adapter) => {
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getDataPointer(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // fitted vs actuals don't apply for non-regression problems
    if (!['regression', 'semisupervisedregression', 'timeseriesforecasting'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsData.fittedVsActualLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsData.fittedVsActual)
        return;

    // begin blocking additional requests to load
    resultsData.fittedVsActualLoading[adapter.getSolutionId()] = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let produceId = dataPointer
        .substr(dataPointer.lastIndexOf('/') + 1)
        .replace('.csv', '');
    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-fitted-vs-actuals-data`, {
            method: 'POST',
            data: {
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

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    resultsData.fittedVsActual[adapter.getSolutionId()] = response.data;
    resultsData.fittedVsActualLoading[adapter.getSolutionId()] = false;

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
    if (!['classification', 'semisupervisedclassification', 'vertexclassification'].includes(problem.task.toLowerCase()))
        return;

    // don't load if systems are already in loading state
    if (resultsData.confusionLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (adapter.getSolutionId() in resultsData.confusion)
        return;

    // begin blocking additional requests to load
    resultsData.confusionLoading[adapter.getSolutionId()] = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let produceId = dataPointer
        .substr(dataPointer.lastIndexOf('/') + 1)
        .replace('.csv', '');
    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-confusion-data`, {
            method: 'POST',
            data: {
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
        console.warn("retrieve-output-confusion-data error");
        console.log(err);
        app.alertWarn('Confusion matrix data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept response if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;


    Object.keys(response.data)
        .forEach(variable => {
            if (response.data[variable].classes.length < 10) {
                let extraPoints = [];
                response.data[variable].classes.forEach(levelActual => response.data[variable].classes.forEach(levelPredicted => {
                    if (!response.data[variable].data.find(point => point.Actual === levelActual && point.Predicted === levelPredicted))
                        extraPoints.push({Actual: levelActual, Predicted: levelPredicted, count: 0})
                }));
                response.data[variable].data.push(...extraPoints);
            }
            interpretConfusionMatrix(response.data[variable].data)
        });

    resultsData.confusion[adapter.getSolutionId()] = response.data;
    resultsData.confusionLoading[adapter.getSolutionId()] = false;

    // apply state changes to the page
    m.redraw();
};

export let loadImportancePartialsFittedData = async (problem, adapter) => {

    // load dependencies, which can clear loading state if problem, etc. changed
    await loadProblemData(problem);

    let dataPointer = adapter.getDataPointer('partials');

    // don't attempt to load if there is no data
    if (!dataPointer) return;

    // don't load if systems are already in loading state
    if (resultsData.importancePartialsFittedLoading[adapter.getSolutionId()])
        return;

    // don't load if already loaded
    if (resultsData.importancePartialsFitted[adapter.getSolutionId()])
        return;

    // begin blocking additional requests to load
    resultsData.importancePartialsFittedLoading[adapter.getSolutionId()] = true;

    let tempQuery = JSON.stringify(resultsData.id.query);
    let response;
    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-data`, {
            method: 'POST',
            data: {data_pointer: dataPointer}
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

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    // convert unlabeled string table to predictor format
    let offset = 0;
    resultsData.importancePartialsFitted[adapter.getSolutionId()] = Object.keys(problem.domains).reduce((out, predictor) => {
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
    resultsData.importancePartialsFittedLoading[adapter.getSolutionId()] = false;

    m.redraw();
};

// importance from empirical first differences
export let loadImportanceEFDData = async (problem, adapter) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter);

    let dataPointer = adapter.getDataPointer(resultsPreferences.dataSplit);

    // don't load if data is not available
    if (!dataPointer)
        return;

    // don't load if systems are already in loading state
    if (resultsData.importanceEFDLoading)
        return;

    // don't load if already loaded
    if (resultsData.importanceEFD)
        return;

    // begin blocking additional requests to load
    resultsData.importanceEFDLoading = true;

    // how to construct actual values after manipulation
    let compiled = queryMongo.buildPipeline([
        ...app.workspace.raven_config.hardManipulations,
        ...problem.manipulations,
        ...resultsQuery
    ], app.workspace.raven_config.variablesInitial)['pipeline'];

    let tempQuery = JSON.stringify(resultsData.id.query);
    let produceId = dataPointer
        .substr(dataPointer.lastIndexOf('/') + 1)
        .replace('.csv', '');
    let response;

    try {
        response = await m.request(D3M_SVC_URL + `/retrieve-output-EFD-data`, {
            method: 'POST',
            data: {
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
        // app.alertWarn('Variable importance EFD data has not been loaded. Some plots will not load.');
        return;
    }

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    let responseImportance = await m.request(ROOK_SVC_URL + 'efdimportance.app', {
        method: 'POST',
        data: {efdData: response.data}
    });
    // reorder response.data predictors based on importance
    if (responseImportance.success) response.data = responseImportance.data
        .reduce((data, variable) => Object.assign(data, {[variable]: response.data[variable]}), {});

    let nominals = app.getNominalVariables(problem);

    // melt predictor data once, opposed to on every redraw
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor] = app.melt(
            nominals.includes(predictor)
                ? app.sample(response.data[predictor], 20, false, true)
                : response.data[predictor],
            [predictor], valueLabel, variableLabel));

    // add more granular categorical columns from the compound key 'variableLabel'
    Object.keys(response.data)
        .forEach(predictor => response.data[predictor]
            .forEach(point => {
                point.target = point[variableLabel].split(' ')[0];
                point.level = point[variableLabel].split('-').pop();
            }));

    resultsData.importanceEFD = response.data;
    resultsData.importanceEFDLoading = false;

    // apply state changes to the page
    m.redraw();
};

// importance from empirical first differences
export let loadImportanceICEFittedData = async (problem, adapter, predictor) => {
    // load dependencies, which can clear loading state if problem, etc. changed
    await loadSolutionData(problem, adapter, predictor);

    let dataPointerPredictors = problem.datasetPaths['ICE_synthetic_' + predictor];
    let dataPointerFitted = adapter.getDataPointer('ICE_synthetic_' + predictor);

    // don't load if data is not available
    if (!dataPointerFitted || !dataPointerPredictors)
        return;

    // don't load if systems are already in loading state
    if (resultsData.importanceICEFittedLoading)
        return;

    // don't load if already loaded
    if (resultsData.importanceICEFitted)
        return;

    // begin blocking additional requests to load
    resultsData.importanceICEFittedLoading = true;

    let tempQuery = JSON.stringify(resultsData.id.query);

    let response = await m.request(D3M_SVC_URL + `/retrieve-output-ICE-data`, {
        method: 'POST',
        data: {
            data_pointer_predictors: dataPointerPredictors,
            data_pointer_fitted: dataPointerFitted,
            variable: predictor
        }
    });

    if (!response.success)
        throw response.data;

    // don't accept response if current problem has changed
    if (resultsData.id.problemID !== problem.problemID)
        return;

    // don't accept if query changed
    if (JSON.stringify(resultsQuery) !== tempQuery)
        return;

    resultsData.importanceICEFitted = response.data;
    resultsData.importanceICEFittedLoading = false;

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
