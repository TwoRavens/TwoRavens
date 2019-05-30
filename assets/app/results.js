import m from 'mithril';
import * as jStat from 'jstat';
import * as d3 from "d3";

import * as app from "./app";
import * as plots from "./plots";

import * as common from "./../common/common";
import Table from "./../common/views/Table";
import MenuTabbed from "./../common/views/MenuTabbed";
import Dropdown from "./../common/views/Dropdown";
import Panel from "../common/views/Panel";
import MenuHeaders from "../common/views/MenuHeaders";

import {bold} from "./index";
import PlotVegaLite from "./views/PlotVegaLite";
import ConfusionMatrix from "./views/ConfusionMatrix";
import Flowchart from "./views/Flowchart";
import ForceDiagram, {groupBuilder, groupLinkBuilder, linkBuilder, pebbleBuilder} from "./views/ForceDiagram";
import Subpanel from "../common/views/Subpanel";

import * as solverRook from './solvers/rook';
import * as solverD3M from './solvers/d3m';


export let leftpanel = () => {

    let ravenConfig = app.getRavenConfig();
    let resultsProblem = app.getResultsProblem();

    if (!resultsProblem) return;

    let sections = [
        {
            value: 'Problem',
            contents: [
                m('div', {style: {height: '100%'}}, m(ForceDiagram, Object.assign(forceDiagramStateResults,{
                    mutateNodes: app.mutateNodes(resultsProblem),
                    summaries: app.variableSummaries
                }, app.buildForceData(resultsProblem)))),
                // m(Table, {data: resultsProblem})
            ]
        },
        {
            value: 'Solutions',
            contents: [
                m('div', {style: {display: 'inline-block', margin: '1em'}},
                    m(Dropdown, {
                        id: 'pipelineDropdown',
                        items: Object.keys(ravenConfig.problems).filter(key =>
                            Object.keys(ravenConfig.problems[key].solutions)
                                .reduce((sum, source) => sum + Object.keys(ravenConfig.problems[key].solutions[source]).length, 0)),
                        activeItem: ravenConfig.resultsProblem,
                        onclickChild: app.setResultsProblem
                    })),
                m('div#modelComparisonOption', {style: {display: 'inline-block'}},
                    m('input#modelComparisonCheck[type=checkbox]', {
                        onclick: m.withAttr("checked", app.setModelComparison),
                        checked: app.modelComparison,
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
                            value: 'Discovered Solutions',
                            contents:
                                m(Table, {
                                    id: 'pipelineTable',
                                    headers: ['Solution', 'Score'],
                                    data: Object.keys(resultsProblem.solutions.d3m)
                                        .map(pipelineId => [pipelineId, resultsProblem.solutions.d3m[pipelineId].score]),
                                    sortHeader: 'Score',
                                    sortFunction: app.sortPipelineTable,
                                    activeRow: new Set(resultsProblem.selectedSolutions.d3m),
                                    onclick: pipelineId => app.setSelectedSolution(resultsProblem, 'd3m', pipelineId),
                                    tableTags: m('colgroup',
                                        m('col', {span: 1}),
                                        m('col', {span: 1, width: '30%'}))
                                })
                        },
                        {
                            value: 'Baselines',
                            contents: [
                                // m(Subpanel, {
                                //     id: 'addModelSubpanel',
                                //     onclick: app.setResultsProblem
                                // }),

                                m(Table, {
                                    id: 'pipelineTable',
                                    headers: ['Solution', 'Score'],
                                    data: Object.keys(resultsProblem.solutions.rook)
                                        .map(solutionId => [
                                            solutionId,
                                            solverRook.getScore(resultsProblem, resultsProblem.solutions.rook[solutionId])
                                        ]),
                                    sortHeader: 'Score',
                                    sortFunction: app.sortPipelineTable,
                                    activeRow: new Set(resultsProblem.selectedSolutions.rook),
                                    onclick: pipelineId => app.setSelectedSolution(resultsProblem, 'rook', pipelineId),
                                    tableTags: m('colgroup',
                                        m('col', {span: 1}),
                                        m('col', {span: 1, width: '30%'}))
                                })
                            ]
                        }
                    ]
                })
            ]
        }
    ];

    return m(Panel, {
        side: 'left',
        label: 'Results',
        hover: false,
        width: '600px'
    },
    // there seems to be a strange mithril bug here - when returning back to model from results,
    // the dom element for MenuTabbed is reused, but the state is incorrectly transitioned, leaving an invalid '[' key.
    // "Fixed" by wrapping in a div, to prevent the dom reuse optimization
    m('div', {style: {height: 'calc(100% - 50px)'}}, m(MenuTabbed, {
        id: 'resultsMenu',
        currentTab: leftTabResults,
        callback: setLeftTabResults,
        sections
    })))
};

export class CanvasSolutions {

    oninit() {
        this.confusionFactor = undefined;
        app.updateRightPanelWidth()
    }

    predictionSummary(problem, summaries) {

        let setConfusionFactor = factor => this.confusionFactor = factor === 'undefined' ? undefined : factor;
        summaries = summaries.filter(summary => summary.fittedValues || summary.actualValues);
        if (problem.task === 'regression') {
            let xData = summaries.reduce((out, summary) =>
                Object.assign(out, {[summary.name]: summary.fittedValues}), {});
            let yData = summaries.reduce((out, summary) =>
                Object.assign(out, {[summary.name]: summary.actualValues}), {});

            let xName = 'Fitted Values';
            let yName = 'Actual Values';
            let title = 'Fitted vs. Actuals';
            let legendName = 'Solution Name';

            return m('div', {
                style: {'height': '500px'}
            }, m(PlotVegaLite, {
                specification: plots.vegaScatter(xData, yData, xName, yName, title, legendName),
                data: summaries
            }))
        }

        if (problem.task === 'classification') {
            let confusionData = summaries
                .map(summary => Object.assign({pipelineId: summary.pipelineID},
                    generateConfusionData(summary.actualValues, summary.fittedValues, this.confusionFactor) || {}))
                .filter(instance => 'data' in instance)
                .sort((a, b) => app.sortPipelineTable(a.score, b.score));

            return confusionData.map((confusionInstance, i) => [
                i === 0 && m('div[style=margin-top:.5em]',
                    m('label#confusionFactorLabel', 'Confusion Matrix Factor: '),
                    m('[style=display:inline-block]', m(Dropdown, {
                        id: 'confusionFactorDropdown',
                        items: ['undefined', ...confusionInstance.allClasses],
                        activeItem: this.confusionFactor,
                        onclickChild: setConfusionFactor,
                        style: {'margin-left': '1em'}
                    }))),
                confusionInstance.data.length === 2 && m(Table, {
                    id: 'resultsPerformanceTable',
                    headers: ['metric', 'score'],
                    data: generatePerformanceData(confusionInstance.data),
                    attrsAll: {style: {width: 'calc(100% - 2em)', margin: '1em'}}
                }),
                confusionInstance.data.length < 100 ? m('div', {
                    style: {'min-height': '500px'}
                }, m(ConfusionMatrix, Object.assign({}, confusionInstance, {
                    id: 'resultsConfusionMatrixContainer' + confusionInstance.pipelineID,
                    title: "Confusion Matrix: Pipeline " + confusionInstance.pipelineID,
                    startColor: '#ffffff', endColor: '#e67e22',
                    margin: {left: 10, right: 10, top: 50, bottom: 10},
                    attrsAll: {style: {height: '600px'}}
                }))) : 'Too many classes for confusion matrix!'
            ])
        }
    };

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
                    abbreviation: 40,
                    data: {
                        'Name': pipeStep['primitive']['primitive'].name,
                        // 'Method': pipeStep['primitive']['primitive']['pythonPath'].split('.').slice(-1)[0]
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
                    width: '70%',
                    height: 'calc(100% - 30px)',
                    overflow: 'auto'
                }
            },
            m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Overview: '),
            m(Table, {
                id: 'pipelineOverviewTable',
                data: Object.keys(solution.pipeline).reduce((out, entry) => {
                    if (['inputs', 'steps', 'outputs'].indexOf(entry) === -1)
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

        let problemSummary = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Problem Description',
            shown: resultsSubpanels['Problem Description'],
            setShown: state => resultsSubpanels['Problem Description'] = state
        }, m(Table, {
            headers: ['Variable', 'Data'],
            data: [
                ['Dependent Variables', problem.targets],
                ['Predictors', problem.predictors],
                ['Description', problem.description],
                ['Task', problem.task]
            ]
        }));

        let selectedSolutions = app.getSolutions(problem);
        if (selectedSolutions.length === 0)
            return m('div', {style: {margin: '1em 0px'}}, problemSummary);

        let solutionSummaries = selectedSolutions
            .map(solution => solutionAdapter(problem, solution)).filter(_=>_);
        let firstSolution = selectedSolutions[0];

        let solutionSummary = selectedSolutions.length === 1 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Solution Description',
            shown: resultsSubpanels['Solution Description'],
            setShown: state => resultsSubpanels['Solution Description'] = state
        }, m(Table, {
            headers: ['Variable', 'Data'],
            data: [
                ['Source', firstSolution.source]
            ].concat(firstSolution.source === 'rook' ? [
                ['Label', firstSolution.meta.label],
                ['Caret/R Method', firstSolution.meta.method],
                ['Tags', firstSolution.meta.tags]
            ] : [])
        }));

        let predictionSummary = m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Prediction Summary',
            shown: resultsSubpanels['Prediction Summary'],
            setShown: state => resultsSubpanels['Prediction Summary'] = state
        }, this.predictionSummary(problem, solutionSummaries));

        let visualizePipeline = selectedSolutions.length === 1 && firstSolution.source === 'd3m' && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Visualize Pipeline',
            shown: resultsSubpanels['Visualize Pipeline'],
            setShown: state => resultsSubpanels['Visualize Pipeline'] = state
        }, this.visualizePipeline(firstSolution));

        let performanceStatsContents = firstSolution.source === 'rook' && Object.keys(firstSolution.models)
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

        let coefficientsContents = firstSolution.source === 'rook' && Object.keys(firstSolution.models)
            .filter(target => firstSolution.models[target].coefficients !== undefined)
            .map(target => m('div',
                m('h5', target),
                m(Table, {data: ['intercept', ...problem.predictors].map((predictor, i) => [
                        predictor,
                        firstSolution.models[target].coefficients[i]
                    ])}),
                firstSolution.models[target].coefficientCovarianceMatrix && m(ConfusionMatrix, {
                    id: target + 'CovarianceMatrix',
                    title: 'Coefficient Covariance Matrix for ' + target,
                    data: firstSolution.models[target].coefficientCovarianceMatrix,
                    startColor: '#e9ede8',
                    endColor: '#5770b0',
                    xLabel: '',
                    yLabel: '',
                    classes: ['intercept', ...problem.predictors],
                    margin: {left: 10, right: 10, top: 50, bottom: 10},
                    attrsAll: {style: {height: '600px'}}
                })));
        let coefficientMatrix = coefficientsContents.length > 0 && m(Subpanel, {
            style: {margin: '0px 1em'},
            header: 'Coefficients',
            shown: resultsSubpanels['Coefficients'],
            setShown: state => resultsSubpanels['Coefficients'] = state
        }, coefficientsContents);


        let prepareANOVA = table => [...problem.predictors, 'Residuals']
            .map(predictor => table.find(row => row._row === predictor))
            .map(row => ({
                'Predictor': row._row,
                'Sum Sq': row['Sum Sq'],
                'Df': row.Df,
                'Mean Sq': row['Mean Sq'],
                'F value': row['F value'],
                'P-value': row['Pr(>F)']
            }));

        let anovaTablesContent = firstSolution.source === 'rook' && Object.keys(firstSolution.models)
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

        let VIFContents = firstSolution.source === 'rook' && Object.keys(firstSolution.models)
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
            visualizePipeline,
            performanceStats,
            coefficientMatrix,
            anovaTables,
            VIF
        );
    }
}


let solutionAdapter = (problem, solution) => {
    let solver = {rook: solverRook, d3m: solverD3M}[solution.source];
    let target = problem.targets[0];

    return {
        name: solver.getName(problem, solution),
        actualValues: solver.getActualValues(problem, solution, target),
        fittedValues: solver.getFittedValues(problem, solution, target),
        score: solver.getScore(problem, solution, target),
        targets: problem.targets,
        predictors: problem.predictors,
        description: solver.getDescription(problem, solution),
        task: solver.getTask(problem, solution),
        model: solver.getModel(problem, solution)
    };
};

let leftTabResults = 'Solutions';
let setLeftTabResults = tab => leftTabResults = tab;

let resultsSubpanels = {
    'Prediction Summary': true,
    'Variance Inflation': false,
    'ANOVA Tables': false,
    'Coefficients': false,
    'Performance Statistics': false,
    'Visualize Pipeline': false,
    'Solution Description': false,
    'Problem Description': false
};

export let forceDiagramStateResults = {
    builders: [pebbleBuilder, groupBuilder, linkBuilder, groupLinkBuilder],
    pebbleLinks: [],
    hoverPebble: undefined,
    contextPebble: undefined,
    selectedPebble: undefined,
    hoverTimeout: undefined,
    isPinned: false,
    hullRadius: 40,
    defaultPebbleRadius: 40,
    hoverTimeoutDuration: 150, // milliseconds to wait before showing/hiding the pebble handles
    selectTransitionDuration: 300, // milliseconds of pebble resizing animations
    arcHeight: 16,
    arcGap: 1
};

let setSelectedPebble = pebble => {
    forceDiagramStateResults.selectedPebble = pebble;
    m.redraw();
};

Object.assign(forceDiagramStateResults, {
    setSelectedPebble,
    pebbleEvents: {
        click: setSelectedPebble,
        mouseover: pebble => {
            clearTimeout(forceDiagramStateResults.hoverTimeout);
            forceDiagramStateResults.hoverTimeout = setTimeout(() => {
                forceDiagramStateResults.hoverPebble = pebble;
                m.redraw()
            }, forceDiagramStateResults.hoverTimeoutDuration)
        },
        mouseout: () => {
            clearTimeout(forceDiagramStateResults.hoverTimeout);
            forceDiagramStateResults.hoverTimeout = setTimeout(() => {
                forceDiagramStateResults.hoverPebble = undefined;
                m.redraw()
            }, forceDiagramStateResults.hoverTimeoutDuration)
        },
        contextmenu: pebble => {
            d3.event.preventDefault(); // block browser context menu
            if (forceDiagramStateResults.contextPebble) {
                if (forceDiagramStateResults.contextPebble !== pebble) forceDiagramStateResults.pebbleLinks.push({
                    source: forceDiagramStateResults.contextPebble,
                    target: pebble,
                    right: true
                });
                forceDiagramStateResults.contextPebble = undefined;
            } else forceDiagramStateResults.contextPebble = pebble;
            m.redraw();
        }
    }
});

/* Generates confusion table data and labels, given the expected and predicted values*/

/* if a factor is passed, the resultant table will be 2x2 with respect to the factor */
export function generateConfusionData(Y_true, Y_pred, factor = undefined) {
    if (!Y_true || !Y_pred) return;

    // dvvalues are generally numeric
    Y_true = Y_true.map(String);

    // predvals are generally strings
    Y_pred = Y_pred.map(String);

    // combine actuals and predicted, and get all unique elements
    let classes = [...new Set([...Y_true, ...Y_pred])].sort();
    let allClasses = classes;

    if (factor !== undefined) {
        factor = String(factor);
        Y_true = Y_true.map(obs => factor === obs ? factor : 'not ' + factor);
        Y_pred = Y_pred.map(obs => factor === obs ? factor : 'not ' + factor);
        classes = [...new Set([...Y_true, ...Y_pred])].sort()
    }

    // create a matrix of zeros
    let data = Array.from({length: classes.length}, () => new Array(classes.length).fill(0));

    // linearize the coordinate assignment stage
    let indexOf = classes.reduce((out, clss, i) => {
        out[clss] = i;
        return out
    }, {})
    // increment the data matrix at the class coordinates of true and pred
    Y_true.forEach((_, i) => data[indexOf[Y_true[i]]][indexOf[Y_pred[i]]]++);

    return {data, classes, allClasses};
}

/* generate an object containing accuracy, recall, precision, F1, given a 2x2 confusion data matrix */
export function generatePerformanceData(confusionData2x2) {

    let tp = confusionData2x2[0][0];
    let fn = confusionData2x2[0][1];
    let fp = confusionData2x2[1][0];
    let tn = confusionData2x2[1][1];

    let p = tp + fn;
    let n = fp + tn;

    let round = (number, digits) => Math.round(number * Math.pow(10, digits)) / Math.pow(10, digits)

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


// STATISTICS HELPER FUNCTIONS

// covariance matrix returned by R
let cov = [[1, .87, .28, .1, -.548], [.1, 2, .3, -.4, .5], [.85, .2, .46, .4, -.5], [.1, .2, .3, 4, .23], [.1, .2358, -3.25, .4, .23]];
// coefficients returned by R
let coefs = [.2, 2.3, .12, 2.8, 7.78].map(elem => [elem]); // map to a column vector

// description of predictor variable to vary confidence band over
let predictor = {min: -100, max: 100, index: 2};
// fixed values for other predictors, likely the mean values of each other predictor
let constants = [1, 2, 5, 2];


// ~~~~ helper functions

// n linearly spaced points between min and max
let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);

// outer broadcast of x and y on column i
let broadcast = (x, y, i) => y.map(point => [...x.slice(0, i), point, ...x.slice(i)]);

// dot product between vectors
let dot = (x, y) => x.reduce((sum, _, i) => sum + x[i] * y[i], 0);

// computes diagonal of x @ Sym @ x.T, where C must be symmetric
let symmetricQuadraticDiag = (x, Sym) => x
    .map(rowLeft => Sym.map(rowRight => dot(rowLeft, rowRight))) // left product
    .map((rowLeft, i) => dot(rowLeft, x[i])); // right product

// matrix product between A, B
let product = (A, B) => A
    .map(rowA => B[0].map((_, j) => rowA.reduce((sum, _, i) => sum + rowA[i] * B[i][j], 0)));

let makeEllipse = (p1, p2, varCovMat) => {
    // only consider interactions among two coefficients
    varCovMat = [
        [varCovMat[p1][p1], varCovMat[p1][p2]],
        [varCovMat[p2][p1], varCovMat[p2][p2]]
    ];

    // λ^2 - trace(Σ)*λ + det(Σ)
    let [a, b, c] = [1, -varCovMat[0][0] -varCovMat[1][1], varCovMat[0][0] * varCovMat[1][1] - 2 * varCovMat[0][1]];
    let eigvals = [-1, 1].map(sign => (-b + sign * Math.sqrt(b * b - 4 * a * c)) / (2 * a));
    let eigvecs = [
        [varCovMat[0][1], eigvals[0] - varCovMat[0][0]],
        [eigvals[1] - varCovMat[1][1], varCovMat[1][0]]
    ];

    let maximalEigvec = eigvecs[Number(Math.abs(eigvals[0]) < Math.abs(eigvals[1]))];

    return {
        angle: Math.atan2(maximalEigvec[1], maximalEigvec[0]) * 180 / Math.pi,
        eigvals
    }
};

let getMean = data => data.reduce((sum, value) => sum + value, 0) / data.length;
let getVariance = (data, ddof = 1) => {
    let mean = getMean(data);
    return data.reduce((sum, value) => (value - mean) ^ 2, 0) / (data.length - ddof);
};


/**
 * construct a multivariate confidence region, projected onto 'predictor' at 'constants'
 * @param varCovMat - pxp variance-covariance matrix of regression coefficients
 * @param coefficients - regression coefficients
 * @param predictor - {
 *     min, max - bounds to vary the predicted variable
 *     n - number of points to construct intervals for, within the bounds [min, max]
 *     index - column index of predictor within the design matrix
 * }
 * @param constants - fixed values for the other predictors
 * @param preferences - specified in makeIntervals.
 *                      'statistic' should either be 'workingHotelling' (simultaneous) or 't' (pointwise)
 * @returns {*} - list of [lower, upper] intervals
 */
let makeGLMBands = (varCovMat, coefficients, predictor, constants, preferences) => {
    let {min, max, index, n = 100} = predictor;
    let observations = broadcast(constants, linspace(min, max, n), index);
    let fittedValues = product(observations, coefficients).map(row => row[0]); // product produces a column vector
    let variances = symmetricQuadraticDiag(observations, varCovMat);

    return makeIntervals(Object.assign({
        values: fittedValues,
        variances,
        statistic: 'workingHotelling',
        ddof: varCovMat.length
    }, preferences))
};

/**
 * construct a set of confidence intervals with the specified parameters
 * @param values - construct intervals for each of these values
 * @param variances - variance of each value
 * @param statistic - workingHotelling, scheffe, bonferroni, tukey, t
 * @param type - mean or prediction
 * @param family - glm family
 * @param alpha - 100(1 - alpha)% confidence
 * @param n - number of observations in entire dataset
 * @param ddof - delta degrees of freedom (p for regression intervals, used in statistic computation)
 * @param MSE - mean squared error of the regression model, estimated sample variance (needed for prediction interval only)
 * @param m - mean of m predictions in the prediction interval (optional)
 * @returns {*} - list of [lower, upper] intervals
 */
let makeIntervals = ({values, variances, statistic, type, family, alpha, n, ddof, MSE, m}) => {

    // MSE is already included in the coefficient variance-covariance matrix
    let stdErr = variances.map({
        mean: _ => _,
        prediction: x => (MSE * 1 / (m || 1)) + x,
    }[type]).map(Math.sqrt);

    let g = values.length;

    let statValue = {
        // simultaneous region over regression surface
        workingHotelling: Math.sqrt(ddof * jStat.centralF.inv(1 - alpha, ddof, n - ddof)),

        // simultaneous set
        scheffe: Math.sqrt(g * jStat.centralF.inv(1 - alpha, g, n - ddof)),
        bonferroni: jStat.studentt.inv(1 - alpha / (2 * g), n - ddof),

        // pointwise
        t: jStat.studentt.inv(1 - alpha / 2, n - ddof)
    }[statistic];

    let invLink = {
        gaussian: _ => _,
        poisson: x => Math.exp(x),
        exponential: x => -1 / x,
        gamma: x => -1 / x,
        binomial: x => 1 / (1 + Math.exp(x))
    }[family];

    return values
        .map((val, i) => [-1, 1].map(sign => invLink(val + sign * statValue * stdErr[i])).sort())
};

// // ~~~~ compute confidence intervals
// console.warn('GLM Bands');
// console.log(makeGLMBands(cov, coefs, predictor, constants, {
//     type: 'mean',
//     statistic: 'workingHotelling',
//     family: 'gaussian',
//     alpha: .05,
//     n: 2500,
//     MSE: 1.2
// }));
//
// console.warn('Set of intervals for coefficients');
// console.log(makeIntervals({
//     values: coefs.map(coef => coef[0]),
//     variances: cov.map((_, i) => cov[i][i]),
//     statistic: 'bonferroni',
//     type: 'mean',
//     family: 'gaussian',
//     alpha: .05,
//     n: 2500,
//     ddof: 1,
//     MSE: 1.2
// }));
