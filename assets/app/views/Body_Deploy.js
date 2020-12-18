import m from 'mithril';
import Table from "../../common/views/Table";
import Header from "../../common/views/Header";
import Canvas from "../../common/views/Canvas";
import {heightHeader} from "../../common/common";
import * as app from '../app';
import * as results from '../modes/results';
import {customDatasets, getSolutionAdapter, resultsPreferences, uploadForModelRun} from '../modes/results';

import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";
import {generateProblemID, setSelectedProblem} from "../problem";

export default class Body_Dataset {
    async oninit(vnode) {
        await app.load({awaitPreprocess: false});

        let {problem} = vnode.attrs;

        let problemId = generateProblemID()
        problem.problemId = problemId;
        workspace.raven_config.problems[problemId] = problem;
        setSelectedProblem(problemId);
    }

    view(vnode) {
        let {id, image, problem} = vnode.attrs;

        console.log({'test': problem});
        problem = JSON.parse(problem);

        if (!app.workspace) return;

        let solution = results.getSelectedSolutions(problem, 'd3m')[0];
        let adapter = results.getSolutionAdapter(problem, solution);

        return [
            m(Header, {image}, app.workspace && [
                m('div', {style: {'flex-grow': 1}}),
                m("h4#dataName", app.workspace.d3m_config.name),
                m('div', {style: {'flex-grow': 1}}),
            ]),
            m(Canvas, {
                    attrsAll: {
                        id: 'canvas' + id,
                        style: {
                            'padding-left': 0,
                            'padding-right': 0,
                            'margin-top': heightHeader + 'px',
                            height: `calc(100% - ${heightHeader})`
                        }
                    }
                },
                m('div', {
                        style: {
                            'max-width': '1000px',
                            'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                            margin: '1em auto'
                        }
                    },


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
                                    resultsPreferences. upload.file = e.target.files[0];
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

                            uploadForModelRun(
                                resultsPreferences.upload.file,
                                resultsPreferences.upload.name,
                                problem.results.d3mDatasetId,
                            ).then(({customDataset, manipulatedInfo}) => {
                                // clear form, upload was successful
                                resultsPreferences.upload = {};
                                results.produceOnSolution(
                                    getSolutionAdapter(problem, solution),
                                    customDataset.name,
                                    manipulatedInfo.data_path,
                                    manipulatedInfo.metadata_path)
                            })
                        },
                        disabled: !resultsPreferences.upload.file || resultsPreferences.upload.name.length === 0
                    }, "Produce"),

                    Object.keys(customDatasets).length > 0 && [
                        m('h4[style=margin:1em]', 'Custom Datasets'),
                        "Set the current data split from the top of the left panel, or via the 'Select' button below. If your dataset contains actual values for the target variable, the Prediction Summary, Variable Importance, and Empirical First Differences will update to reflect the new dataset. Predictions are produced for all known solutions when your dataset is uploaded.",
                        m(Table, {
                            data: Object.keys(customDatasets).map(evaluationId => {
                                let dataPointer = adapter.getProduceDataPath(customDatasets[evaluationId].name);
                                return [
                                    customDatasets[evaluationId].name,
                                    m(Button, {
                                        onclick: () => resultsPreferences.dataSplit = customDatasets[evaluationId].name
                                    }, "Select"),
                                    m(Button, {
                                        disabled: !dataPointer,
                                        onclick: () => app.downloadFile(dataPointer)
                                    }, "Download Predictions")
                                ]
                            })
                        })
                    ]
                ))
        ]
    }
}
