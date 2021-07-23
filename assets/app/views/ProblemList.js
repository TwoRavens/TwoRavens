import m from "mithril";
import Checkbox from "../../common/views/Checkbox";
import * as app from "../app";
import {
    getDescription,
    getPredictorVariables,
    getProblemCopy,
    getSubtask,
    getTargetVariables,
    setSelectedProblem
} from "../problem";
import Button from "../../common/views/Button";
import * as common from "../../common/common";
import Table from "../../common/views/Table";
import {boldPlain} from "../utils";
import ButtonLadda from "./ButtonLadda";
import {submitDiscProb} from "../modes/model";


export class ProblemList {
    view(vnode) {

        let problems = vnode.attrs.problems;

        let allMeaningful = Object.keys(problems).every(probID => problems[probID].meaningful);
        let discoveryAllCheck = m(Checkbox, {
            id: 'discoveryAllCheck',
            title: `mark ${allMeaningful ? 'no' : 'all'} problems as meaningful`,
            onclick: app.setCheckedDiscoveryProblem,
            checked: allMeaningful
        });

        let discoveryHeaders = () => [
            'Name',
            !app.taskPreferences.task1_finished && m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
            'Target', 'Predictors',
            Object.values(problems).some(prob => prob.subTask !== 'taskSubtypeUndefined') ? 'Subtask' : '',
            'Task',
            'Metric'
        ];

        let problemPartition = Object.keys(problems)
            .filter(problemId => !problems[problemId].pending)
            .reduce((out, problemId) => {
                out[problems[problemId].system] = out[problems[problemId].system] || [];
                out[problems[problemId].system].push(problems[problemId]);
                return out;
            }, {});

        let formatProblem = problem => [
            problem.problemId, // this is masked as the UID
            !app.taskPreferences.task1_finished && m('[style=text-align:center]', {onclick: e => e.stopPropagation()}, m(Checkbox, {
                onclick: state => app.setCheckedDiscoveryProblem(state, problem.problemId),
                checked: problem.meaningful
            })),
            getTargetVariables(problem).join(', '),
            getPredictorVariables(problem).join(', '),
            problem.subTask === 'taskSubtypeUndefined' ? '' : getSubtask(problem),
            problem.task,
            problem.metric
        ];

        return [
            m('div#discoveryTablesContainer', {
                    style: {
                        // height: '80%',
                        overflow: 'auto',
                        display: 'block',
                        'margin-bottom': 0,
                        'max-width': (window.innerWidth - 90) + 'px'
                    }
                },

                /*
                 *  Current Problem Table
                 */
                [
                    m('h4.card-header.clearfix',
                        m('div[style=height:50px;display:inline]', 'Current Problem'),
                        !selectedProblem.pending && m(Button, {
                            id: 'btnDeleteProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                selectedProblem.pending = true;
                                selectedProblem.unedited = true;
                            },
                        }, 'Delete'),
                        selectedProblem.pending && m(Button, {
                            id: 'btnSaveProblem',
                            style: {float: 'right', margin: '-5px', 'margin-right': '22px'},
                            class: 'btn-sm',
                            onclick: () => {
                                let problemCopy = getProblemCopy(selectedProblem);
                                selectedProblem.pending = false;

                                workspace.raven_config.problems[problemCopy.problemId] = problemCopy;
                                setSelectedProblem(problemCopy.problemId);
                            }
                        }, 'Save'),
                        selectedProblem.manipulations.length !== 0 && m(Button, {
                            style: {float: 'right', margin: '-5px', 'margin-right': '1em'},
                            class: 'btn-sm',
                            disabled: app.rightTab === 'Manipulate' && common.panelOpen['right'],
                            title: `view manipulations for ${selectedProblem.problemId}`,
                            onclick: () => {
                                app.setRightTab('Manipulate');
                                common.setPanelOpen('right');
                            }
                        }, 'Manipulations')),

                    /*
                     * Current Problem description
                     */
                    [
                        m('h5.card-header.clearfix',
                            m('div[style=height:50px;display:inline]', 'Description')),

                        m('p', {
                            id: 'problemDescription',
                            style: {'padding-left': '2%', 'max-width': '800px'},
                        }, m('pre', {
                            contenteditable: true,
                            oninput: v => {
                                selectedProblem.description = v.target.innerHTML
                                selectedProblem.unedited = false
                            }
                        }, m.trust(getDescription(selectedProblem)))),
                    ], // END: Current Problem description

                    m(Table, {
                        id: 'discoveryTableSelectedProblem',
                        headers: discoveryHeaders(),
                        data: [formatProblem(selectedProblem)],
                        activeRow: workspace.raven_config.selectedProblem,
                        // showUID: false,
                        abbreviation: 40
                    })
                ],

                /*
                 *  Generate tables for "Custom", "Discovered", and "Solved" problems
                 */
                ['solved', 'user', 'discovered'].filter(key => key in problemPartition).map(partition => [
                    /*
                     *  Display the appropriate header "Custom", "Discovered", or "Solved" problems
                     */
                    m('h4.card-header', `${{
                        'user': 'Custom',
                        'discovered': 'Discovered',
                        'solved': 'Solved'
                    }[partition]} Problems`),
                    /*
                     * User note for selecting "Discovered" problems
                     */
                    (partition === 'discovered') && m('div', {},
                        [
                            m('p', {
                                    style: {'padding-left': '3%'}
                                },
                                'Click on a Discovered problem below to make it the "Current Problem."', m('br'), boldPlain('Note: '), 'the new "Current Problem" will have the same "Target" and "Predictors" but the "Name" will be different.')
                        ]
                    ),
                    /*
                     * Problems table
                     */
                    m(Table, {
                        id: 'discoveryTable' + partition,
                        headers: discoveryHeaders(),
                        data: problemPartition[partition].map(formatProblem),
                        rowClasses: {
                            'discovery-table-highlight': selectedProblem.provenanceId
                                ? [selectedProblem.provenanceId] : []
                        },
                        onclick: problemId => {

                            let clickedProblem = problems[problemId];
                            if (clickedProblem.system === 'solved') {
                                setSelectedProblem(problemId);
                                app.setSelectedMode('results');
                                return;
                            }
                            if (selectedProblem.problemId === problemId) return;

                            if (clickedProblem.system === 'user') {
                                setSelectedProblem(problemId);
                                return;
                            }

                            // delete current problem if no changes were made
                            if (selectedProblem.pending) {
                                if (selectedProblem.unedited)
                                    delete problems[selectedProblem.problemId];
                                else if (confirm(`You have unsaved changes in the previous problem, ${selectedProblem.problemId}. Would you like to save ${selectedProblem.problemId}?`))
                                    selectedProblem.pending = false;
                                else delete problems[selectedProblem.problemId];
                            }

                            // create a copy of the autogenerated problem
                            if (clickedProblem.system === 'discovered') {
                                let copiedProblem = getProblemCopy(clickedProblem);
                                problems[copiedProblem.problemId] = copiedProblem;
                                setSelectedProblem(copiedProblem.problemId);
                            }
                        },
                        activeRow: selectedProblem.problemId,
                        abbreviation: 40,
                        sortable: true
                    })
                ]),
                /*
                 *  If this is an unfinished Task1, show the submit discovered
                 *    problem button!
                 */
                !app.taskPreferences.task1_finished && !app.isExploreMode && m(ButtonLadda, {
                    id: 'btnSubmitDisc',
                    style: {margin: '1em'},
                    class: 'btn-success',
                    activeLadda: app.taskPreferences.isSubmittingProblems,
                    onclick: submitDiscProb,
                    title: 'Submit all checked discovered problems'
                }, 'Submit Meaningful Problems')
            )
        ]
    }
}