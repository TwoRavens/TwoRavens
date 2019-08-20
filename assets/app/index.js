import 'bootstrap';
import 'bootswatch/dist/materia/bootstrap.css';
import '../css/app.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';

import hopscotch from 'hopscotch';

import m from 'mithril';

import * as app from './app';
import * as results from './results';
import * as explore from './explore';
import * as model from './model';

import * as manipulate from './manipulations/manipulate';

import * as solverRook from "./solvers/rook";
import * as solverD3M from "./solvers/d3m";

import * as common from '../common/common';
import ButtonRadio from '../common/views/ButtonRadio';
import Button from '../common/views/Button';
import ButtonPlain from '../common/views/ButtonPlain';
import Dropdown from '../common/views/Dropdown';
import Footer from '../common/views/Footer';
import Header from '../common/views/Header';
import Modal from '../common/views/Modal';
import ModalVanilla from "../common/views/ModalVanilla";
import Peek from '../common/views/Peek';
import Table from '../common/views/Table';
import TextField from '../common/views/TextField';
import Popper from '../common/views/Popper';
import Datamart, {ModalDatamart} from "./datamart/Datamart";

import Icon from '../common/views/Icon';
import ModalWorkspace from "./views/ModalWorkspace";

// ALTERNATE WINDOWS
import Body_EventData from './eventdata/Body_EventData';
import Body_Dataset from "./views/Body_Dataset";

import {getSelectedProblem} from "./app";
import {buildDatasetUrl} from "./app";
import {alertWarn} from "./app";
import ButtonLadda from "./views/LaddaButton";

export let bold = value => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let boldPlain = value => m('b', value);
export let italicize = value => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = url => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);
export let linkURL = url => m('a', {href: url, style: {color: 'blue'}, }, url);
export let linkURLwithText = (url, text) => m('a', {href: url, style: {color: 'blue'}, }, text);
export let preformatted = text => m('pre', text);
export let abbreviate = (text, length) => text.length > length
    ? m('div', {'data-toggle': 'tooltip', title: text}, text.substring(0, length - 3).trim() + '...')
    : text;


class Body {
    oninit() {
        app.setRightTab(IS_D3M_DOMAIN ? 'Problem' : 'Models');
        app.set_mode('model');
        this.TA2URL = D3M_SVC_URL + '/SearchDescribeFitScoreSolutions';
    }

    onupdate(vnode) {
        this.previousMode = vnode.attrs.mode;
    }

    oncreate() {app.load();}

    view(vnode) {
        //app.alertLog(m(TextField, {value: JSON.stringify(app.workspaces)}));

        let {mode, vars, variate} = vnode.attrs;

        // after calling m.route.set, the params for mode, variate, vars don't update in the first redraw.
        // checking window.location.href is a workaround, permits changing mode from url bar
        if (window.location.href.includes(mode) && mode !== app.currentMode)
            app.set_mode(mode);

        let exploreVariables = (vars ? vars.split('/') : [])
            .filter(variable => variable in app.variableSummaries);

        let overflow = app.is_explore_mode ? 'auto' : 'hidden';

        let resultsProblem = app.getResultsProblem();
        let selectedProblem = app.getSelectedProblem();

        let drawForceDiagram = (app.is_model_mode || app.is_explore_mode) && selectedProblem && Object.keys(app.variableSummaries).length > 0;
        let forceData = drawForceDiagram && model.buildForceData(selectedProblem);

        return m('main',

            this.constructModals(),
            this.header(app.currentMode),
            this.footer(app.currentMode),
            app.workspace && Body.leftpanel(app.currentMode, forceData),
            app.workspace && Body.rightpanel(app.currentMode),
            app.workspace && Body.manipulations(),

            app.peekInlineShown && this.peekTable(),

            m(`#main`, {
                    style: {
                        overflow,
                        top: common.heightHeader,
                        height: `calc(100% - ${common.heightHeader} - ${common.heightFooter})`,
                        bottom: common.heightFooter,
                        display: app.is_manipulate_mode || (app.rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'none' : 'block',
                        'background-color': app.swandive ? 'grey' : 'transparent'
                    }
                },

                m('div', {
                        style: {width: '100%', height: '100%', position: 'relative'},
                    },
                    app.is_results_mode && m(MainCarousel, {previousMode: this.previousMode}, m(results.CanvasSolutions, {problem: resultsProblem})),
                    app.is_explore_mode && m(MainCarousel, {previousMode: this.previousMode}, m(explore.CanvasExplore, {variables: exploreVariables, variate})),
                    app.is_model_mode && m(MainCarousel, {previousMode: this.previousMode}, m(model.CanvasModel, {drawForceDiagram, forceData}))
                )
            )
        );
    }

    header() {
        let userlinks = username === '' ? [
            {title: "Log in", url: login_url, newWin: false},
            {title: "Sign up", url: signup_url, newWin: false}
        ] : [
            //{title: [m('span', {}, "Workspaces "), m(Icon, {name: 'link-external'})], url: workspaces_url, newWin: true},
            {title: [m('span', {}, "Settings "), m(Icon, {name: 'link-external'})], url: settings_url, newWin: true},
            {title: [m('span', {}, "Links "), m(Icon, {name: 'link-external'})], url: devlinks_url, newWin: true},
            {title: [m('span', {}, "Behavioral Logs "), m(Icon, {name: 'link-external'})], url: behavioral_log_url, newWin: true},
            {title: [m('span', {}, "Reset "), m(Icon, {name: 'alert'})], url: clear_user_workspaces_url, newWin: false},
            {title: [m('span', {}, "Switch Datasets"), m(Icon, {name: 'alert'})], url: switch_dataset_url, newWin: false},
            {title: "Logout", url: logout_url, newWin: false}];

        let openUserLink = (linkInfo) =>{
            linkInfo.newWin === true ? window.open(linkInfo.url) : window.location.href = linkInfo.url;
        }

        let resultsProblem = app.getResultsProblem();
        let selectedProblem = app.getSelectedProblem();

        let createBreadcrumb = () => {
            let path = [
                m(Popper, {
                        content: () => m(Table, {
                            data: Object.entries(app.workspace.datasetDoc.about)
                                .map(row => [row[0], preformatted(row[1])])
                        })
                    },
                    m('h4#dataName', {
                            style: {display: 'inline-block', margin: '.25em 1em'},
                        },
                        app.workspace.d3m_config.name || 'Dataset Name', m('br'),
                        app.workspace.name !== app.workspace.d3m_config.name && m('div', {
                            style: {
                                'font-style': 'italic', float: 'right', 'font-size': '14px',
                            }
                        }, `workspace: ${app.workspace.name}`)
                    ))
            ];

            let pathProblem = {
                'model': selectedProblem, 'results': resultsProblem
            }[app.currentMode];

            if (pathProblem) path.push(m(Icon, {name: 'chevron-right'}), m(Popper, {
                content: () => m(Table, {
                    data: {'targets': pathProblem.targets, 'predictors': pathProblem.predictors,'description': preformatted(app.getDescription(pathProblem).description)}
                })
            }, m('h4[style=display: inline-block; margin: .25em 1em]', pathProblem.problemID)));

            let selectedSolutions = results.getSelectedSolutions(resultsProblem);
            if (app.is_results_mode && selectedSolutions.length === 1 && selectedSolutions[0]) {
                path.push(m(Icon, {name: 'chevron-right'}), m('h4[style=display: inline-block; margin: .25em 1em]', ({
                    rook: solverRook.getSolutionAdapter, d3m: solverD3M.getSolutionAdapter
                })[selectedSolutions[0].source](pathProblem, selectedSolutions[0]).getName()))
            }

            return path;
        };

        return m(Header, {
                image: '/static/images/TwoRavens.png',
                aboutText: 'TwoRavens v0.2 "Marina del Ray" -- ' +
                    'The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. ' +
                    'In the Norse, their names were "Thought" and "Memory". ' +
                    'In our coming release, our thought-raven automatically advises on statistical model selection, ' +
                    'while our memory-raven accumulates previous statistical models from Dataverse, to provide cumulative guidance and meta-analysis.',
                attrsInterface: {style: app.is_explore_mode ? {'background-image': '-webkit-linear-gradient(top, #fff 0, rgb(227, 242, 254) 100%)'} : {}}
            },
            m('div', {style: {'flex-grow': 1}}),

            m(Button, {
                onclick: () => window.open('/#!/dataset')
            }, 'Dataset Description'),
            app.workspace && createBreadcrumb(),

            m('div', {style: {'flex-grow': 1}}),


            app.currentMode === 'results' && resultsProblem && Object.keys(resultsProblem.solutions.d3m).length > 0 && m(ButtonLadda, {
                id: 'btnEndSession',
                class: 'ladda-label ladda-button ' + (app.taskPreferences.task2_finished ? 'btn-secondary' : 'btn-success'),
                onclick: solverD3M.endsession,
                activeLadda: app.taskPreferences.isSubmittingPipelines,
                style: {margin: '0.25em 1em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'}
            }, 'Mark Problem Finished'),

            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {margin: '0px 1em', width: 'auto'}, class: 'navbar-left'},
                attrsButtons: {
                    // class: 'btn-sm',
                    style: {width: "auto"}},
                onclick: app.set_mode,
                activeSection: app.currentMode || 'model',
                sections: [
                    {value: 'Model'},
                    {value: 'Explore'},
                    {value: 'Results', attrsInterface: {class: (!app.taskPreferences.isResultsClicked && app.taskPreferences.task1_finished && !app.taskPreferences.task2_finished) ? 'btn-success' : 'btn-secondary'}}
                ], // mode 'Manipulate' diabled

                // attrsButtons: {class: ['btn-sm']}, // if you'd like small buttons (btn-sm should be applied to individual buttons, not the entire component)
                // attrsButtons: {style: {width: 'auto'}}
            }),

            m(Dropdown, {
                id: 'loginDropdown',
                items: userlinks.map(link => link.title),
                activeItem: username,
                onclickChild: child => openUserLink(userlinks.find(link => link.title === child))
            })

        );
    }

    peekTable() {

        let pipeline = [
            ...app.workspace.raven_config.hardManipulations,
            ...(app.is_model_mode ? app.getSelectedProblem().manipulations : [])
        ];
        if (app.peekInlineShown && !app.peekData && !app.peekIsExhausted) app.resetPeek(pipeline);

        return m('div#previewTable', {
                style: {
                    "position": "fixed",
                    "bottom": common.heightFooter,
                    "height": app.peekInlineHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto",
                    'z-index': 100,
                    'background': 'rgba(255,255,255,.6)'
                },
                onscroll: () => {
                    // don't apply infinite scrolling when list is empty
                    if ((app.peekData || []).length === 0) return;

                    let container = document.querySelector('#previewTable');
                    let scrollHeight = container.scrollHeight - container.scrollTop;
                    if (scrollHeight < container.offsetHeight + 100) app.updatePeek(pipeline);
                }
            },
            m('#horizontalDrag', {
                style: {
                    position: 'absolute',
                    top: '-4px',
                    left: 0,
                    right: 0,
                    height: '12px',
                    cursor: 'h-resize',
                    'z-index': 1000
                },
                onmousedown: (e) => {
                    app.setPeekInlineIsResizing(true);
                    document.body.classList.add('no-select');
                    app.peekMouseMove(e);
                }
            }),
            m(Table, {
                id: 'previewTable',
                data: app.peekData || []
            })
        );
    }

    footer() {

        return m(Footer, [
            m('div.btn.btn-group[style=margin:5px;padding:0px]',
                m(Button, {id: 'btnTA2',class: 'btn-sm', onclick: _ => hopscotch.startTour(app.initialTour(), 0)}, 'Help Tour ', m(Icon, {name: 'milestone'})),
                m(Button, {id: 'btnTA2', class: 'btn-sm', onclick: _ => app.helpmaterials('video')}, 'Video ', m(Icon, {name: 'file-media'})),
                m(Button, {id: 'btnTA2', class: 'btn-sm', onclick: _ => app.helpmaterials('manual')}, 'Manual ', m(Icon, {name: 'file-pdf'})),
                m(Button, {
                        id: 'btnAPIInfoWindow',
                        class: `btn-sm ${app.isAPIInfoWindowOpen ? 'active' : ''}`,
                        onclick: _ => {
                            app.setAPIInfoWindowOpen(true);
                            m.redraw();
                        },
                    },
                    `Basic Info (id: ${app.getCurrentWorkspaceId()})`
                )
            ),
            app.workspace && m('div.btn.btn-group[style=margin:5px;padding:0px]',
                !app.workspace.is_original_workspace && m(ButtonPlain, {
                    id: 'btnSaveWorkspace',
                    class: `btn-sm btn-secondary ${app.saveCurrentWorkspaceWindowOpen ? 'active' : ''}`,
                    onclick: app.saveUserWorkspace
                  },
                  'Save '),

                m(ButtonPlain, {
                    id: 'btnSaveAsNewWorkspace',
                    // 'aria-pressed': `${app.isSaveNameModelOpen ? 'true' : 'false'}`,
                    class: `btn-sm btn-secondary ${app.showModalSaveName ? 'active' : ''}`,
                    onclick: _ => app.setShowModalSaveName(true)
                  },
                  'Save As New ',
                ),
                m(ButtonPlain, {
                        id: 'btnLoadWorkspace',
                        // 'aria-pressed': `${app.isSaveNameModelOpen ? 'true' : 'false'}`,
                        class: `btn-sm btn-secondary ${app.showModalWorkspace? 'active' : ''}`,
                        onclick: () => app.setShowModalWorkspace(true)
                    },
                    'Load',
                )
              ),
            m(Button, {
                style: {'margin': '8px'},
                title: 'alerts',
                class: 'btn-sm',
                onclick: () => app.setShowModalAlerts(true)
            }, m(Icon, {name: 'bell', style: `color: ${app.alerts.length > 0 && app.alerts[0].time > app.alertsLastViewed ? common.selVarColor : '#818181'}`})),

            [
                m(Button, {
                    style: {'margin': '8px'},
                    title: 'ta2 debugger',
                    class: 'btn-sm',
                    onclick: () => app.setShowModalTA2Debug(true)
                }, m(Icon, {name: 'bug'})),

                m(Button, {
                    style: {'margin': '8px'},
                    title: 'ta2 stop searches',
                    class: 'btn-sm',
                    onclick: () => {
                        solverD3M.endAllSearches();
                        solverD3M.stopAllSearches();
                        // solverD3M.endsession();
                        // solverD3M.handleENDGetSearchSolutionsResults();
                    }
                }, m(Icon, {name: 'stop'}))
            ],

            // m("span", {"class": "footer-info-break"}, "|"),
            // m("a", {"href" : "/dev-raven-links", "target": "=_blank"}, "raven-links"),

            m('div.btn.btn-group', {style: 'float: right; padding: 0px;margin:5px'},


                m(Button, {
                    class: 'btn-sm',
                    onclick: () => app.setShowModalDownload(true)
                }, 'Download'),
                m(Button, {
                    class: 'btn-sm' + (app.peekInlineShown ? ' active' : ''),
                    onclick: () => app.setPeekInlineShown(!app.peekInlineShown)
                }, 'Peek'),
                m(Button,{
                    onclick: () => window.open('#!/data', 'data') && app.logEntryPeekUsed(true),
                    class: 'btn-sm'
                  }, m(Icon, {name: 'link-external'}))),
            manipulate.totalSubsetRecords !== undefined && m("span.badge.badge-pill.badge-secondary#recordCount", {
                style: {
                    float: 'right',
                    "margin-left": "5px",
                    "margin-top": "1.4em",
                    "margin-right": "2em"
                }
            }, manipulate.totalSubsetRecords + ' Records')
        ]);
    }

    /*
     * Start: Construct potential modal boxes for the page.
     */
    constructModals() {
        return [
            m(Modal),
            this.modalSaveCurrentWorkspace(),
            app.showModalWorkspace && m(ModalWorkspace, {
                    workspace: app.workspace,
                    setDisplay: app.setShowModalWorkspace,
                    loadWorkspace: app.loadWorkspace
                }
            ),

            results.showFinalPipelineModal && results.finalPipelineModal(),

            app.showModalDownload && m(ModalVanilla, {
                id: 'downloadModal',
                setDisplay: app.setShowModalDownload
            },
                m('h4', 'Downloads'),

                m(Table, {
                    data: [
                        [
                            'Original Dataset',
                            m(Button, {
                                class: 'btn-sm',
                                onclick: () => app.downloadFile(app.workspace.datasetPath)
                            }, 'Download'),
                            italicize('Retrieve the original, raw file. No alterations applied.')
                        ],
                        manipulate.constraintMenu && [
                            'Peek Dataset',
                            m(Button, {
                                class: 'btn-sm',
                                onclick: async () => {
                                    let problem = getSelectedProblem();
                                    let datasetUrl = await buildDatasetUrl(problem, manipulate.constraintMenu.step);
                                    if (!datasetUrl) alertWarn('Unable to prepare dataset for download.');
                                    app.downloadFile(datasetUrl)
                                }
                            }, 'Download'),
                            italicize('Retrieve full dataset currently shown in Peek. Peek shows data at intermediate manipulation stages.')
                        ],
                        [
                            'Modeling Dataset',
                            m(Button, {
                                class: 'btn-sm',
                                onclick: async () => {
                                    let problem = getSelectedProblem();
                                    let datasetUrl = await buildDatasetUrl(problem);
                                    if (!datasetUrl) alertWarn('Unable to prepare dataset for download.');
                                    app.downloadFile(datasetUrl);
                                }
                            }, 'Download'),
                            italicize('Retrieve the dataset used for modeling, with casting, manipulations and column drops applied.')
                        ]
                    ]
                })),
            /*
             * Alerts modal.  Displays the list of alerts, if any.
             */
            app.showModalAlerts && m(ModalVanilla, {
                id: 'alertsModal',
                setDisplay: () => {
                    app.alertsLastViewed.setTime(new Date().getTime());
                    app.setShowModalAlerts(false)
                }
            }, [
                m('h4[style=width:3em;display:inline-block]', 'Alerts'),
                m(Button, {
                    title: 'Clear Alerts',
                    style: {display: 'inline-block', 'margin-right': '0.75em'},
                    onclick: () => app.alerts.length = 0,
                    disabled: app.alerts.length === 0
                }, m(Icon, {name: 'check'})),
                app.alerts.length === 0 && italicize('No alerts recorded.'),
                app.alerts.length > 0 && m(Table, {
                    data: [...app.alerts].reverse().map(alert => [
                        alert.time > app.alertsLastViewed && m(Icon, {name: 'primitive-dot'}),
                        m(`div[style=background:${app.hexToRgba({
                            'log': common.menuColor,
                            'warn': common.warnColor,
                            'error': common.errorColor
                        }[alert.type], .5)}]`, alert.time.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3")),
                        alert.description
                    ]),
                    attrsAll: {style: {'margin-top': '1em'}},
                    tableTags: m('colgroup',
                        m('col', {span: 1, width: '10px'}),
                        m('col', {span: 1, width: '75px'}),
                        m('col', {span: 1}))
                })
            ]),
            /*
             * Datamart Modal
             */
            app.workspace && m(ModalDatamart, {
                preferences: app.datamartPreferences,
                endpoint: app.datamartURL,
                dataPath: app.workspace.datasetPath
            }),

            // Show basic API and Workspace Info
            this.modalBasicInfo(),

            /*
             * Save as new workspace modal.
             *  - prompt user for new workspace name
             */
            app.showModalSaveName && m(ModalVanilla, {
                    id: "modalNewWorkspacename",
                    setDisplay: () => {
                        app.setShowModalSaveName(false);
                    },
                },
                m('div', {'class': 'row'},
                    m('div', {'class': 'col-sm'},

                        m('h3', app.workspace.is_original_workspace
                            ? 'Save Workspace.' : 'Save as a New Workspace.'),

                        m('p', {}, 'Please enter a workspace name.'),

                        m('p', {},
                            m('b', '- Current workspace name: '),
                            m('span', `"${app.getCurrentWorkspaceName()}"`),
                            m('span', ` (id: ${app.getCurrentWorkspaceId()})`),
                        ),

                        // Text field to enter new workspace name
                        m(TextField, {
                            id: 'newNameModal',
                            placeholder: 'New Workspace Name',
                            oninput: app.setNewWorkspaceName,
                            onblur: app.setNewWorkspaceName,
                            value: app.newWorkspaceName
                        }),

                        // Display user messages
                        m('div', {
                                id: 'newNameMessage',
                                style: 'padding:20px 0;'
                            },
                            m('p', {class: "lead"}, app.getnewWorkspaceMessage())
                        ),
                        // Close Button Row - used if save is successful
                        app.displayCloseButtonRow && m('div', {
                            id: 'rowCloseModalButton',
                            class: 'row',
                        },
                        m('div', {'class': 'col-sm'},
                            // Close
                            m(ButtonPlain, {
                                id: 'btnRowCloseModalButton',
                                class: 'btn-sm btn-primary',
                                onclick: _ => app.setShowModalSaveName(false)
                            }, 'Close'))
                        ),


                        // Button Row
                        app.displaySaveNameButtonRow && m('div', {
                            id: 'rowSaveWorkspaceButtons',
                            class: 'row',
                        },
                        m('div', {'class': 'col-sm'},

                            // Cancel button
                            m(ButtonPlain, {
                                id: 'btnModalCancelSaveAsNewWorkspace',
                                class: 'btn-sm btn-secondary',
                                style: 'margin-right: 15px;',
                                onclick: _ => {
                                    app.setNewWorkspaceName('');
                                    app.setShowModalSaveName(false);
                                },
                            }, 'Cancel'),

                            // Save Button
                            m(ButtonPlain, {
                                id: 'btnModalSaveAsNewWorkspace',
                                class: 'btn-sm btn-primary',
                                onclick: _ => {
                                    console.log('save clicked...');

                                    // clear any error messages
                                    app.setNewWorkspaceMessageSuccess('Attempting to save...')

                                    // attempt to save the name
                                    app.saveAsNewWorkspace();
                                },
                            }, 'Save'),
                        )
                        )
                        /*
                         * END: Save as new workspace modal.
                         */
                    ),
                )
            ),

            app.showModalTA2Debug && m(ModalVanilla, {
                    id: 'modalTA2Debug',
                    setDisplay: app.setShowModalTA2Debug
                },
                m('h4', 'Open Source Solver System Debugger'),

                m('div', {style: 'margin:1em'},
                    Object.keys(app.solvers).map(system_name => m(Button, {
                        style: {margin: '.5em'},
                        onclick: async () => {
                            let selectedProblem = app.getSelectedProblem();
                            console.warn(selectedProblem);
                            let specification = app.getSolverSpecification(selectedProblem);

                            console.log(JSON.stringify(specification));

                            let response = await m.request('/solver-service/Solve', {
                                method: 'POST',
                                data: Object.assign({
                                    system: system_name,
                                    system_params: app.solvers[system_name]
                                }, {
                                    "timeout": 999999999,
                                    "specification": specification
                                })
                            });

                            if (!response.success) console.log(response);
                        }
                    }, system_name))),

                m('div', {style: 'overflow:auto'},
                    m(Table, {data: Object.values(app.modelResults)})),

                m('h4', 'TA2 System Debugger'),
                m(Button, {
                    style: {margin: '1em'},
                    onclick: async () => {

                        let selectedProblem = app.getSelectedProblem();


                        let nominalVars = new Set(app.getNominalVariables(selectedProblem));
                        let predictorVars = app.getPredictorVariables(selectedProblem);

                        let hasNominal = [...selectedProblem.targets, ...predictorVars]
                            .some(variable => nominalVars.has(variable));
                        let hasManipulation = selectedProblem.manipulations.length > 0;

                        let needsProblemCopy = hasManipulation || hasNominal;

                        // TODO: upon deleting or reassigning datasetDocProblemUrl, server-side temp directories may be deleted
                        if (needsProblemCopy) {
                            let {metadata_path} = await app.buildProblemUrl(selectedProblem);
                            selectedProblem.datasetDocPath = metadata_path;
                        } else delete selectedProblem.datasetDocPath;

                        let datasetDocPath = selectedProblem.datasetDocPath || app.workspace.d3m_config.dataset_schema;

                        this.TA2Post = JSON.stringify({
                            searchSolutionParams: solverD3M.GRPC_SearchSolutionsRequest(selectedProblem),
                            fitSolutionDefaultParams: solverD3M.GRPC_GetFitSolutionRequest(datasetDocPath),
                            produceSolutionDefaultParams: solverD3M.GRPC_ProduceSolutionRequest(datasetDocPath),
                            scoreSolutionDefaultParams: solverD3M.GRPC_ScoreSolutionRequest(selectedProblem, datasetDocPath)
                        });
                        m.redraw()
                    }
                }, 'Prepare'),

                m(Button, {
                    style: {margin: '1em'},
                    onclick: () => {
                        m.request(this.TA2URL, {
                            method: "POST",
                            data: JSON.parse(this.TA2Post)
                        }).then(console.log).then(m.redraw)
                    }
                }, 'Send'),
                m('div#URL', {style: {margin: '1em'}},
                    'URL',
                    m(TextField, {
                        value: this.TA2URL,
                        oninput: value => this.TA2URL = value,
                        onblur: value => this.TA2URL = value
                    })),
                m('div#searchContainer', {style: {margin: '1em'}},
                    'POST',
                    m(TextField, {
                        value: this.TA2Post,
                        oninput: value => this.TA2Post = value,
                        onblur: value => this.TA2Post = value
                    })),
                this.TA2Response && m('div#searchContainer', {style: {margin: '1em'}},
                    'Response Successful: ' + this.TA2Response.success,
                    m(TextField, {
                        value: this.TA2Response.message,
                        oninput: _ => _, onblur: _ => _
                    })
                ),
                m('div#solutions', {style: {margin: '1em'}},
                    'Solutions',
                    m(TextField, {value: JSON.stringify(app.getSelectedProblem().solutions.d3m)}))
            )
        ]
    }

    /*
     * Show basic API and Workspace Info
     */
    modalBasicInfo(){

      return app.isAPIInfoWindowOpen && m(ModalVanilla, {
          id: "modalAPIInfo",
          setDisplay: () => {
            app.setAPIInfoWindowOpen(false);
          },
        },
        // Row 1 - info
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm'},
            [
              m('h3', {}, 'Basic Information'),
              m('hr'),
              m('p', [
                  m('b', 'Workspace Id: '),
                  m('span', app.getCurrentWorkspaceId())
                ]),
                m('p', [
                    m('b', 'Workspace Name: '),
                    m('span', app.getCurrentWorkspaceName())
                  ]),
              m('hr'),
              m('p', [
                  m('b', 'TA2: '),
                  m('span', app.TA2ServerInfo)
                ]),
              m('p', [
                  m('b', 'TA3: '),
                  m('span', `TwoRavens (API: ${TA3TA2_API_VERSION})`)
                ]),
              m('hr'),
              m('p', [
                  m('b', 'Git Branch Name: '),
                  m('span', `${GIT_BRANCH_INFO.name}`)
                ]),
              m('p', [
                  m('b', 'Git Branch Commit: '),
                  m('span', `${GIT_BRANCH_INFO.commit}`)
                ]),
              m('hr'),
              m('p', [
                  m('b', 'app.workspace.datasetUrl: '),
                  m('span', `${app.workspace.datasetPath}`)
                ]),
              m('hr'),
                m('div', [
                  m('b', 'datamartPreferences: '),
                  m('div',
                    m('pre', `${JSON.stringify(app.datamartPreferences, null, 4)}`)
                  ),
                ]),
              m('hr'),
              m('div', [
                  m('b', 'Workspace: '),
                  m('div',
                    m('pre', `${JSON.stringify(app.workspace, null, 4)}`)
                  ),
                ]),
              m('hr'),
            ]
          ),
        ),
        // Row 2 - info
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm text-left'},
            // Close
            m(ButtonPlain, {
              id: 'btnInfoCloseModalButton',
              class: 'btn-sm btn-primary',
              onclick: _ => {
                app.setAPIInfoWindowOpen(false);},
              },
              'Close'),
            )
          )
        )
    } // end: modalBasicInfo

    /*
     * Save current workspace modal.
     */
    modalSaveCurrentWorkspace(){

      return app.saveCurrentWorkspaceWindowOpen && m(ModalVanilla, {
          id: "modalCurrentWorkspaceMessage",
          setDisplay: () => {
            app.setSaveCurrentWorkspaceWindowOpen(false);
          },
        },
        m('div', {'class': 'row'},
          m('div', {'class': 'col-sm'},
              [
                m('h3', {}, 'Save Current Workspace'),
                m('hr'),
                m('p', {},
                  m('b', '- Current workspace name: '),
                  m('span', `"${app.getCurrentWorkspaceName()}"`),
                  m('span', ` (id: ${app.getCurrentWorkspaceId()})`),
                ),

                // Display user messages
                m('div', {
                    id: 'divSaveCurrentMessage',
                    style: 'padding:20px 0;'
                  },
                  m('p', {class: "lead"}, app.getCurrentWorkspaceMessage())
                ),
                m('hr'),
            ]
          )
        ),
          // Close Button Row
          m('div', {
              id: 'rowCloseModalButton',
              class: 'row',
            },
            m('div', {'class': 'col-sm'},
              // Close
              m(ButtonPlain, {
                id: 'btnRowCloseModalButton',
                class: 'btn-sm btn-primary',
                onclick: _ => {
                  app.setSaveCurrentWorkspaceWindowOpen(false);},
                },
                'Close'),
              )
          ),
        );
      /*
       * END: Save current workspace modal.
       */

    }

    /*
     * End: Construct potential modal boxes for the page.
     */

    static leftpanel(mode, forceData) {
        if (mode === 'manipulate') return manipulate.leftpanel();
        if (mode === 'results') return results.leftpanel();
        return model.leftpanel(forceData);
    }

    static rightpanel(mode) {
        if (mode === 'manipulate') return manipulate.rightpanel();
        if (mode === 'model') return model.rightpanel();
    }

    static manipulations() {
        let selectedProblem = app.getSelectedProblem();
        return (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu([
            ...app.workspace.raven_config.hardManipulations,
            ...(app.is_model_mode ? selectedProblem.manipulations : [])
        ])  // the identifier for which pipeline to edit
    }
}


class MainCarousel {
    oninit(){
        this.modeOrder = ['model', 'explore', 'results']
    }
    // NOTE: onbeforeremove must be leaky, because the state is not updated before passing
    onbeforeremove(vnode) {
        vnode.dom.classList.add(
            this.modeOrder.indexOf(vnode.attrs.previousMode) < this.modeOrder.indexOf(app.currentMode)
                ? 'exit-left' : 'exit-right');
        return new Promise(function (resolve) {
            vnode.dom.addEventListener("animationend", resolve)
        })
    }
    oncreate(vnode) {
        vnode.dom.classList.add(
            this.modeOrder.indexOf(vnode.attrs.previousMode) < this.modeOrder.indexOf(app.currentMode)
                ? 'enter-right' : 'enter-left');
    }
    view(vnode) {
        return m('div', {
            style: {
                position: 'absolute',
                width: '100%',
                height: '100%',
                'padding-left': common.panelOcclusion['left'],
                'padding-right': common.panelOcclusion['right'],
                overflow: 'auto'
            }}, vnode.children)
    }
}


let standaloneDatamart = () => {

    return [
        m(Header, {
            image: '/static/images/TwoRavens.png',
            aboutText: 'TwoRavens, ISI',
        }, [
            m('img#ISILogo', {
                src: '/static/images/formal_viterbi_card_black_on_white.jpg',
                style: {
                    'max-width': '140px',
                    'max-height': '62px'
                }
            }),
            m('div', {style: {'flex-grow': 1}}),
            m('img#datamartLogo', {
                src: '/static/images/datamart_logo.png',
                style: {
                    'max-width': '140px',
                    'max-height': '62px'
                }
            }),
            m('div', {style: {'flex-grow': 1}}),
        ]),
        m('div', {style: {margin: 'auto', 'margin-top': '1em', 'max-width': '1000px'}},
            m(Datamart, {
                preferences: app.datamartPreferences,
                dataPath: app.workspace.datasetPath,
                endpoint: app.datamartURL,
                labelWidth: '10em'
            })),
        m(ModalDatamart, {
            preferences: app.datamartPreferences,
            endpoint: app.datamartURL,
            dataPath: app.workspace.datasetPath
        })
    ]
};

if (IS_EVENTDATA_DOMAIN) {
    m.route(document.body, '/home', {
        '/data': {render: () => m(Peek, {id: 'eventdata', image: '/static/images/TwoRavens.png'})},
        '/:mode': Body_EventData
    });
}
else {
    m.route(document.body, '/model', {
        '/dataset': {render: () => m(Body_Dataset, {image: '/static/images/TwoRavens.png'})},
        '/datamart': {render: standaloneDatamart},
        // '/testPlot': {
        //     render: () => [
        //         // for testing plot redraw speeds
        //         m(ButtonRadio, {
        //             sections: [{value: 1}, {value: 2}]
        //         }),
        //         Object.keys(efdContinuousData).map(predictor => [
        //             m(VariableImportance, {
        //                 data: app.melt(efdContinuousData[predictor], [predictor]),
        //                 predictor,
        //                 target: 'Doubles',
        //                 mode: 'EFD',
        //                 problem: tempProblem,
        //                 yLabel: 'value',
        //                 variableLabel: 'variable'
        //             })
        //         ]),
        //
        //         Object.keys(efdCategoricalData).map(predictor => [
        //             m(VariableImportance, {
        //                 data: app.melt(efdCategoricalData[predictor], [predictor]),
        //                 predictor,
        //                 target: 'Hall_of_Fame',
        //                 mode: 'EFD',
        //                 problem: tempProblem,
        //                 yLabel: 'value',
        //                 variableLabel: 'variable'
        //             })
        //         ])
        //     ]
        // },
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: app.peekId, image: '/static/images/TwoRavens.png'})},
        '/:mode': Body
    });
}
