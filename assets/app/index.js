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
import PlotVegaLiteWrapper from "./vega_schemas_2/PlotVegaLiteWrapper";
import {workspace} from "./app";

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
        app.setSelectedMode('model');
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
            app.setSelectedMode(mode);

        let exploreVariables = (vars ? vars.split('/') : [])
            .filter(variable => variable in app.variableSummaries);

        let overflow = app.is_explore_mode ? 'auto' : 'hidden';

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
                    app.is_results_mode && m(MainCarousel, {previousMode: this.previousMode}, m(results.CanvasSolutions, {problem: selectedProblem})),
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

            if (selectedProblem) path.push(m(Icon, {name: 'chevron-right'}), m(Popper, {
                content: () => m(Table, {
                    data: {'targets': selectedProblem.targets, 'predictors': selectedProblem.predictors,'description': preformatted(app.getDescription(selectedProblem).description)}
                })
            }, m('h4[style=display: inline-block; margin: .25em 1em]', selectedProblem.problemID)));

            let selectedSolutions = results.getSelectedSolutions(selectedProblem);
            if (app.is_results_mode && selectedSolutions.length === 1 && selectedSolutions[0]) {
                path.push(m(Icon, {name: 'chevron-right'}), m('h4[style=display: inline-block; margin: .25em 1em]',
                    results.getSolutionAdapter(selectedProblem, selectedSolutions[0]).getSolutionId()))
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


            app.currentMode === 'results' && selectedProblem && Object.keys(selectedProblem.solutions.d3m || {}).length > 0 && m(ButtonLadda, {
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
                onclick: app.setSelectedMode,
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
                m('h4', 'Organize all models/datasets'),
                m(Button, {
                    onclick: () => {
                        let problem = app.getSelectedProblem();
                        m.request(D3M_SVC_URL + '/ExportSolutions', {
                            method: 'POST',
                            body: results.getSummaryData(problem)
                        }).then(response => {
                            if (response.success) {
                                console.warn(response.data);
                            }
                            else console.error(response.message);
                        });
                    }
                }, 'Export All Results'),

                m('h4', 'TA2 System Debugger'),
                m(Button, {
                    style: {margin: '1em'},
                    onclick: async () => {
                        this.TA2Post = JSON.stringify(await solverD3M.getSolverSpecification(app.getSelectedProblem()));
                        m.redraw()
                    }
                }, 'Prepare'),

                m(Button, {
                    style: {margin: '1em'},
                    onclick: () => {
                        m.request(this.TA2URL, {
                            method: "POST",
                            body: JSON.parse(this.TA2Post)
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

let variableSummariesTemp;
m.request(ROOK_SVC_URL + 'preprocess.app', {
    method: 'POST',
    body: {
        data: '/ravens_volume/test_data/185_baseball/TRAIN/dataset_TRAIN/tables/learningData.csv',
        datastub: 'BASEBALL_TEST'
    }
}).then(response => {
    if (response.success) variableSummariesTemp = response.data;
    else console.error(response);
});

let tempConfiguration = {};
let tempVariableSummaries = {"cylinders":{"variableName":"cylinders","description":"","numchar":"numeric","nature":"ordinal","binary":false,"interval":"discrete","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":5,"median":4,"mean":5.449664429530201,"max":8,"min":3,"mode":[4],"modeFreq":150,"fewestValues":[3,5],"fewestFreq":3,"midpoint":null,"midpointFreq":null,"stdDev":1.6774850568543194,"herfindahlIndex":0.003672589725545382,"plotValues":{"3":3,"4":150,"5":3,"6":68,"8":74},"pdfPlotType":null,"pdfPlotX":null,"pdfPlotY":null,"cdfPlotType":"bar","cdfPlotX":[3,4.25,5.5,6.75,8],"cdfPlotY":[0.010067114093959731,0.5134228187919463,0.5234899328859061,0.7516778523489933,1],"name":"cylinders"},"displacement":{"variableName":"displacement","description":"","numchar":"numeric","nature":"ratio","binary":false,"interval":"continuous","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":76,"median":151,"mean":192.81711409395973,"max":455,"min":68,"mode":[250,350,97],"modeFreq":16,"fewestValues":[307,440,80,144,100],"fewestFreq":1,"midpoint":null,"midpointFreq":null,"stdDev":101.77067510919943,"herfindahlIndex":0.004287408945100731,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[67.6799950124772,75.59101562421283,83.50203623594845,91.41305684768409,99.3240774594197,107.23509807115533,115.14611868289096,123.05713929462658,130.9681599063622,138.87918051809783,146.79020112983346,154.70122174156907,162.6122423533047,170.52326296504032,178.43428357677595,186.3453041885116,194.2563248002472,202.16734541198284,210.07836602371844,217.98938663545408,225.9004072471897,233.81142785892533,241.72244847066094,249.63346908239657,257.5444896941322,265.45551030586785,273.3665309176034,281.27755152933906,289.1885721410747,297.0995927528103,305.010613364546,312.92163397628156,320.8326545880172,328.74367519975283,336.65469581148847,344.56571642322405,352.4767370349597,360.3877576466953,368.29877825843096,376.20979887016654,384.1208194819022,392.0318400936378,399.94286070537345,407.8538813171091,415.76490192884467,423.6759225405803,431.58694315231594,439.4979637640516,447.4089843757872,455.3200049875228],"pdfPlotY":[0.0031550690459648087,0.0038051534256211134,0.004394934753762551,0.004869875355240896,0.005187238655726942,0.005323177324537855,0.005275665746531744,0.005063041804595782,0.004719268308890658,0.004287697645475769,0.003814964449626351,0.003345921326922789,0.0029197663233420756,0.002567084500022809,0.002307547285249095,0.002148319288772938,0.0020835408966467677,0.002095371211759766,0.0021569073729336375,0.0022368800931645574,0.0023054773236483805,0.002340138256578565,0.00232989198552688,0.0022769716555274323,0.002195081348664243,0.0021046894187808,0.002026720418814097,0.001976587780041983,0.001960355013020821,0.001973962826772092,0.0020052955019922505,0.0020379321743116655,0.002055142337654277,0.0020430601758242503,0.0019926549888699668,0.0019006409260268952,0.00176959124451829,0.0016073493973611434,0.0014256793994404928,0.0012382016543787495,0.0010579702283240204,0.0008953027062863398,0.0007564417819983261,0.0006433009134656774,0.0005541336029826401,0.0004847114124742743,0.00042959641785729333,0.00038325984487655516,0.0003409634853298653,0.00029938235162299266],"cdfPlotType":"continuous","cdfPlotX":[68,75.89795918367346,83.79591836734694,91.6938775510204,99.59183673469389,107.48979591836735,115.38775510204081,123.28571428571428,131.18367346938777,139.0816326530612,146.9795918367347,154.87755102040816,162.77551020408163,170.67346938775512,178.57142857142856,186.46938775510205,194.3673469387755,202.26530612244898,210.16326530612244,218.06122448979593,225.9591836734694,233.85714285714286,241.75510204081633,249.6530612244898,257.55102040816325,265.44897959183675,273.34693877551024,281.2448979591837,289.1428571428571,297.0408163265306,304.9387755102041,312.8367346938776,320.734693877551,328.6326530612245,336.53061224489795,344.42857142857144,352.3265306122449,360.2244897959184,368.12244897959187,376.0204081632653,383.9183673469388,391.81632653061223,399.7142857142857,407.6122448979592,415.51020408163265,423.40816326530614,431.3061224489796,439.2040816326531,447.1020408163265,455],"cdfPlotY":[0.003355704697986577,0.020134228187919462,0.050335570469798654,0.14093959731543623,0.24161073825503357,0.2751677852348993,0.31208053691275167,0.40604026845637586,0.412751677852349,0.436241610738255,0.49328859060402686,0.5201342281879194,0.5335570469798657,0.5469798657718121,0.5536912751677853,0.5570469798657718,0.5570469798657718,0.5906040268456376,0.5906040268456376,0.5906040268456376,0.6308724832214765,0.6845637583892618,0.6845637583892618,0.6845637583892618,0.738255033557047,0.7583892617449665,0.761744966442953,0.761744966442953,0.761744966442953,0.761744966442953,0.8120805369127517,0.8221476510067114,0.8657718120805369,0.8657718120805369,0.8657718120805369,0.8691275167785235,0.9496644295302014,0.9563758389261745,0.9563758389261745,0.9563758389261745,0.959731543624161,0.959731543624161,0.959731543624161,0.9798657718120806,0.9798657718120806,0.9798657718120806,0.9832214765100671,0.9832214765100671,0.9865771812080537,1],"name":"displacement"},"horsepower":{"variableName":"horsepower","description":"","numchar":"numeric","nature":"ordinal","binary":false,"interval":"discrete","time":"unknown","invalidCount":5,"validCount":293,"uniqueCount":86,"median":92,"mean":103.21160409556315,"max":225,"min":46,"mode":[90],"modeFreq":17,"fewestValues":[91,215,112,132,122],"fewestFreq":1,"midpoint":null,"midpointFreq":null,"stdDev":36.860384521537476,"herfindahlIndex":0.0038467899903665273,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[45.678910224918866,49.345077154514016,53.011244084109165,56.677411013704315,60.34357794329946,64.0097448728946,67.67591180248976,71.3420787320849,75.00824566168005,78.6744125912752,82.34057952087035,86.0067464504655,89.67291338006065,93.3390803096558,97.00524723925093,100.6714141688461,104.33758109844123,108.0037480280364,111.66991495763153,115.33608188722668,119.00224881682183,122.66841574641698,126.33458267601213,130.00074960560727,133.66691653520243,137.3330834647976,140.99925039439273,144.66541732398787,148.331584253583,151.99775118317817,155.66391811277333,159.33008504236847,162.9962519719636,166.66241890155877,170.32858583115393,173.99475276074907,177.6609196903442,181.32708661993937,184.9932535495345,188.65942047912966,192.3255874087248,195.99175433831996,199.6579212679151,203.32408819751024,206.9902551271054,210.65642205670053,214.3225889862957,217.98875591589083,221.654922845486,225.32108977508113],"pdfPlotY":[0.0023058928656393193,0.003241178976740812,0.004414613023550445,0.005809130539637446,0.007357487715262644,0.008947809523825168,0.010451163999836133,0.011757823273187617,0.012800731543918826,0.013552911812063409,0.014004712487715931,0.014141188019202043,0.013937724496207018,0.013376165636409648,0.012468273671252632,0.011270116723380547,0.009879676329927152,0.008421151793367759,0.007024553534077385,0.005807198956727154,0.004859318100063644,0.00423352689540868,0.003938133439348793,0.003935323339112171,0.004145735382686463,0.004460560860885364,0.0047611008017672445,0.004943269328052249,0.00494098864256276,0.004739882522743257,0.004374374655984948,0.003908320019108031,0.0034080823362042678,0.0029211833478148125,0.0024696229420679825,0.002057437633014596,0.0016840529639251985,0.0013537783859765735,0.0010769047985251762,0.0008644092916510903,0.0007215807611148817,0.0006448112887092847,0.0006224826851758975,0.0006381993456964668,0.0006740325800438816,0.0007125545267844208,0.0007379427620535909,0.000737195374300783,0.0007021023611709888,0.0006314656733433788],"cdfPlotType":"continuous","cdfPlotX":[46,49.6530612244898,53.30612244897959,56.95918367346938,60.61224489795919,64.26530612244898,67.91836734693877,71.57142857142857,75.22448979591837,78.87755102040816,82.53061224489795,86.18367346938776,89.83673469387755,93.48979591836735,97.14285714285714,100.79591836734693,104.44897959183673,108.10204081632654,111.75510204081633,115.40816326530611,119.06122448979592,122.71428571428571,126.36734693877551,130.0204081632653,133.6734693877551,137.32653061224488,140.9795918367347,144.6326530612245,148.28571428571428,151.9387755102041,155.59183673469386,159.24489795918367,162.89795918367346,166.55102040816325,170.20408163265307,173.85714285714283,177.51020408163265,181.16326530612244,184.81632653061223,188.46938775510205,192.12244897959184,195.77551020408163,199.42857142857142,203.0816326530612,206.73469387755102,210.3877551020408,214.0408163265306,217.6938775510204,221.34693877551018,225],"cdfPlotY":[0.006825938566552901,0.020477815699658702,0.027303754266211604,0.030716723549488054,0.040955631399317405,0.05802047781569966,0.11945392491467577,0.19112627986348124,0.24914675767918087,0.2832764505119454,0.32081911262798635,0.378839590443686,0.4300341296928328,0.5119453924914675,0.5767918088737202,0.6348122866894198,0.6416382252559727,0.6791808873720137,0.7201365187713311,0.7337883959044369,0.7372013651877133,0.7508532423208191,0.7542662116040956,0.7679180887372014,0.7747440273037542,0.7815699658703071,0.8156996587030717,0.8191126279863481,0.8430034129692833,0.89419795221843,0.9112627986348123,0.9146757679180887,0.9215017064846417,0.9351535836177475,0.9522184300341296,0.9522184300341296,0.962457337883959,0.9692832764505119,0.9692832764505119,0.9692832764505119,0.9692832764505119,0.9726962457337884,0.9726962457337884,0.9761092150170648,0.9761092150170648,0.9829351535836177,0.9829351535836177,0.9863481228668942,0.9897610921501706,1],"name":"horsepower"},"weight":{"variableName":"weight","description":"","numchar":"numeric","nature":"ordinal","binary":false,"interval":"discrete","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":272,"median":2880,"mean":2978.7046979865772,"max":5140,"min":1613,"mode":[2155,2300,2720,1985],"modeFreq":3,"fewestValues":[2210,3609,3651,3781,4190],"fewestFreq":1,"midpoint":null,"midpointFreq":null,"stdDev":834.1311009954541,"herfindahlIndex":0.0036179680750618695,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[1612.679995012477,1684.672648277274,1756.665301542071,1828.6579548068676,1900.6506080716645,1972.6432613364614,2044.6359146012583,2116.628567866055,2188.621221130852,2260.613874395649,2332.606527660446,2404.5991809252428,2476.5918341900397,2548.584487454836,2620.577140719633,2692.56979398443,2764.562447249227,2836.5551005140237,2908.5477537788206,2980.540407043617,3052.533060308414,3124.525713573211,3196.5183668380078,3268.5110201028047,3340.5036733676016,3412.4963266323984,3484.4889798971953,3556.4816331619922,3628.474286426789,3700.466939691586,3772.459592956383,3844.45224622118,3916.4448994859767,3988.4375527507736,4060.4302060155705,4132.422859280367,4204.415512545164,4276.408165809961,4348.400819074757,4420.393472339554,4492.386125604351,4564.378778869148,4636.371432133945,4708.364085398742,4780.356738663539,4852.3493919283355,4924.342045193132,4996.334698457929,5068.327351722726,5140.320004987523],"pdfPlotY":[0.00013225479041978756,0.00017981813426042054,0.0002337609363448379,0.00029083953199697624,0.00034674818500338796,0.0003967972837985429,0.00043680852028566157,0.00046398285424666146,0.0004774655550696213,0.00047841355124142204,0.0004695449911207659,0.0004543454332674551,0.000436224097850682,0.0004178962337858683,0.0004011287715424056,0.00038680987102689645,0.0003751866646348641,0.0003661078230870681,0.0003591830543588127,0.00035386141577707273,0.0003494774712799959,0.00034530794960729573,0.000340648809038306,0.00033489666449136075,0.00032761425054715567,0.0003185715076689596,0.00030776774802350086,0.0002954440995174893,0.0002820848562073755,0.0002683880411895174,0.0002551755856407286,0.00024322832987425815,0.00023307172664599094,0.00022478302123649473,0.00021790678330653752,0.00021153375070297764,0.00020453035095639288,0.00019584045053871348,0.00018475342510938605,0.000171055178613208,0.00015503358167516732,0.00013736511158688854,0.00011894005869010441,0.00010068339030270405,0.00008340879879545423,0.00006772213907864468,0.00005397784444283162,0.00004228641944245828,0.000032565186597395905,0.000024614928155315932],"cdfPlotType":"continuous","cdfPlotX":[1613,1684.9795918367347,1756.9591836734694,1828.938775510204,1900.9183673469388,1972.8979591836735,2044.8775510204082,2116.857142857143,2188.8367346938776,2260.816326530612,2332.795918367347,2404.775510204082,2476.7551020408164,2548.734693877551,2620.714285714286,2692.6938775510207,2764.673469387755,2836.6530612244896,2908.6326530612246,2980.6122448979595,3052.591836734694,3124.5714285714284,3196.5510204081634,3268.5306122448983,3340.5102040816328,3412.4897959183672,3484.469387755102,3556.448979591837,3628.4285714285716,3700.408163265306,3772.387755102041,3844.367346938776,3916.3469387755104,3988.326530612245,4060.3061224489797,4132.285714285715,4204.265306122449,4276.244897959184,4348.224489795919,4420.2040816326535,4492.183673469388,4564.163265306122,4636.142857142857,4708.122448979592,4780.102040816327,4852.081632653061,4924.061224489797,4996.040816326531,5068.0204081632655,5140],"cdfPlotY":[0.003355704697986577,0.006711409395973154,0.010067114093959731,0.02348993288590604,0.04697986577181208,0.08053691275167785,0.1174496644295302,0.15771812080536912,0.2181208053691275,0.2684563758389262,0.30201342281879195,0.33557046979865773,0.35570469798657717,0.37583892617449666,0.4161073825503356,0.44966442953020136,0.47315436241610737,0.49328859060402686,0.5134228187919463,0.5436241610738255,0.5704697986577181,0.5906040268456376,0.6174496644295302,0.6442953020134228,0.6677852348993288,0.6879194630872483,0.7248322147651006,0.7348993288590604,0.7583892617449665,0.7818791946308725,0.802013422818792,0.8221476510067114,0.8355704697986577,0.8456375838926175,0.8557046979865772,0.87248322147651,0.8926174496644296,0.9060402684563759,0.9194630872483222,0.9395973154362416,0.9563758389261745,0.9630872483221476,0.9664429530201343,0.9832214765100671,0.9899328859060402,0.9899328859060402,0.9899328859060402,0.9932885906040269,0.9966442953020134,1],"name":"weight"},"acceleration":{"variableName":"acceleration","description":"","numchar":"numeric","nature":"ratio","binary":false,"interval":"continuous","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":89,"median":15.5,"mean":15.657718120805368,"max":24.8,"min":8,"mode":[14.5],"modeFreq":17,"fewestValues":[20.4,17.9,8,21.9,10.5],"fewestFreq":1,"midpoint":null,"midpointFreq":null,"stdDev":2.7713707412752373,"herfindahlIndex":0.0034604793520499836,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[7.679995012477201,8.0359135833965,8.391832154315797,8.747750725235095,9.103669296154393,9.45958786707369,9.815506437992989,10.171425008912287,10.527343579831584,10.883262150750882,11.23918072167018,11.595099292589477,11.951017863508776,12.306936434428074,12.662855005347371,13.018773576266671,13.374692147185968,13.730610718105265,14.086529289024565,14.442447859943861,14.79836643086316,15.154285001782458,15.510203572701755,15.866122143621054,16.22204071454035,16.57795928545965,16.93387785637895,17.289796427298246,17.645714998217542,18.001633569136843,18.35755214005614,18.713470710975436,19.069389281894736,19.425307852814033,19.78122642373333,20.13714499465263,20.493063565571926,20.848982136491223,21.204900707410523,21.56081927832982,21.916737849249117,22.272656420168417,22.628574991087714,22.98449356200701,23.34041213292631,23.696330703845604,24.052249274764904,24.408167845684204,24.764086416603497,25.120004987522798],"pdfPlotY":[0.0032477391557224856,0.004507663061118651,0.005861565733824276,0.0073634185155878615,0.009200487446976007,0.011665454975090313,0.015093103318597027,0.019752310120495407,0.025698275321579214,0.03270027604495371,0.04040723542480488,0.04870881950472278,0.05795383296231464,0.06871827770437577,0.08125536513770722,0.09511962082659797,0.10927059504049971,0.1224569930621111,0.1335128293870919,0.1415080145585135,0.14592405329648078,0.14682182934261548,0.14475169725714243,0.14037048505425415,0.13410003644823035,0.12615576873342618,0.1168784632376685,0.10696751946871506,0.09729806172055473,0.08843261099722798,0.08027311615538132,0.07219545866952005,0.06359179429359225,0.054413285953351216,0.04530020303449793,0.037194625847480435,0.0307381469309026,0.025920606632242046,0.022200888053339057,0.018925205178316744,0.015706461043774753,0.012554340124872759,0.009744164844101942,0.007550157831804137,0.006033655890339333,0.005024801866467124,0.004267376683298151,0.003570056871964039,0.002856433895565807,0.0021361436448513104],"cdfPlotType":"continuous","cdfPlotX":[8,8.342857142857143,8.685714285714285,9.028571428571428,9.371428571428572,9.714285714285715,10.057142857142857,10.4,10.742857142857144,11.085714285714285,11.428571428571429,11.771428571428572,12.114285714285714,12.457142857142857,12.8,13.142857142857142,13.485714285714286,13.82857142857143,14.17142857142857,14.514285714285714,14.857142857142858,15.2,15.542857142857143,15.885714285714286,16.228571428571428,16.57142857142857,16.914285714285715,17.25714285714286,17.6,17.942857142857143,18.285714285714285,18.628571428571426,18.97142857142857,19.314285714285717,19.65714285714286,20,20.34285714285714,20.685714285714283,21.02857142857143,21.371428571428574,21.714285714285715,22.057142857142857,22.4,22.742857142857144,23.085714285714285,23.42857142857143,23.771428571428572,24.114285714285714,24.457142857142856,24.8],"cdfPlotY":[0.003355704697986577,0.003355704697986577,0.006711409395973154,0.010067114093959731,0.010067114093959731,0.013422818791946308,0.02348993288590604,0.02348993288590604,0.026845637583892617,0.0436241610738255,0.05704697986577181,0.0738255033557047,0.10067114093959731,0.1040268456375839,0.13087248322147652,0.16778523489932887,0.18791946308724833,0.2483221476510067,0.28859060402684567,0.37583892617449666,0.3959731543624161,0.4664429530201342,0.5201342281879194,0.5570469798657718,0.610738255033557,0.6577181208053692,0.697986577181208,0.7416107382550335,0.7718120805369127,0.7919463087248322,0.8322147651006712,0.8590604026845637,0.8691275167785235,0.9060402684563759,0.9328859060402684,0.9362416107382551,0.9429530201342282,0.9530201342281879,0.9697986577181208,0.9697986577181208,0.9765100671140939,0.9832214765100671,0.9899328859060402,0.9899328859060402,0.9899328859060402,0.9899328859060402,0.9966442953020134,0.9966442953020134,0.9966442953020134,1],"name":"acceleration"},"model":{"variableName":"model","description":"","numchar":"numeric","nature":"ordinal","binary":false,"interval":"discrete","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":13,"median":76,"mean":76.07718120805369,"max":82,"min":70,"mode":[76],"modeFreq":30,"fewestValues":[82],"fewestFreq":16,"midpoint":null,"midpointFreq":null,"stdDev":3.5775322233075584,"herfindahlIndex":0.0033631004476739864,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[69.6799950124772,69.93795439972304,70.19591378696886,70.45387317421469,70.71183256146053,70.96979194870634,71.22775133595218,71.48571072319801,71.74367011044383,72.00162949768966,72.2595888849355,72.51754827218132,72.77550765942715,73.03346704667297,73.2914264339188,73.54938582116463,73.80734520841045,74.06530459565629,74.32326398290212,74.58122337014794,74.83918275739377,75.0971421446396,75.35510153188542,75.61306091913126,75.87102030637709,76.12897969362291,76.38693908086874,76.64489846811458,76.9028578553604,77.16081724260623,77.41877662985206,77.67673601709788,77.93469540434371,78.19265479158955,78.45061417883537,78.7085735660812,78.96653295332703,79.22449234057285,79.48245172781868,79.74041111506452,79.99837050231034,80.25632988955617,80.51428927680199,80.77224866404782,81.03020805129366,81.28816743853947,81.54612682578531,81.80408621303114,82.06204560027696,82.3200049875228],"pdfPlotY":[0.03812325552123616,0.04389241408346957,0.049100408167374175,0.05359732700351349,0.057362460297508695,0.060491613676997374,0.0631565762303757,0.06554893822778002,0.06782448129692134,0.0700635884817441,0.07225799105422094,0.07432618563688073,0.07615125996684396,0.07762820313690492,0.07870520068860262,0.0794058607723298,0.07982597494376503,0.08010693571676097,0.0803953544516503,0.08080235831800503,0.08137547675685161,0.08209143814741197,0.08287117962551233,0.08361109366808882,0.08421924462453755,0.08464381037488791,0.08488410552041513,0.08498136655480777,0.0849945025029068,0.08497187844553135,0.08493123832939348,0.08485555423006626,0.08470494845711973,0.08443752109635608,0.0840283133593562,0.08347715492098111,0.082801645908586,0.082018155995204,0.08111852311200904,0.08005144674634983,0.07871552801697157,0.07696692904194664,0.07464043497922258,0.07157953106853633,0.06766940020154324,0.06286636875146756,0.05721795486082443,0.050869086410889476,0.044052204543430264,0.03706180729104747],"cdfPlotType":"continuous","cdfPlotX":[70,70.24489795918367,70.48979591836735,70.73469387755102,70.9795918367347,71.22448979591837,71.46938775510205,71.71428571428571,71.95918367346938,72.20408163265306,72.44897959183673,72.6938775510204,72.93877551020408,73.18367346938776,73.42857142857143,73.6734693877551,73.91836734693878,74.16326530612245,74.40816326530611,74.65306122448979,74.89795918367346,75.14285714285714,75.38775510204081,75.63265306122449,75.87755102040816,76.12244897959184,76.36734693877551,76.61224489795919,76.85714285714286,77.10204081632654,77.34693877551021,77.59183673469387,77.83673469387755,78.08163265306122,78.3265306122449,78.57142857142857,78.81632653061224,79.06122448979592,79.3061224489796,79.55102040816327,79.79591836734694,80.04081632653062,80.28571428571428,80.53061224489795,80.77551020408163,81.0204081632653,81.26530612244898,81.51020408163265,81.75510204081633,82],"cdfPlotY":[0.07046979865771812,0.07046979865771812,0.07046979865771812,0.07046979865771812,0.07046979865771812,0.1342281879194631,0.1342281879194631,0.1342281879194631,0.1342281879194631,0.1912751677852349,0.1912751677852349,0.1912751677852349,0.1912751677852349,0.28859060402684567,0.28859060402684567,0.28859060402684567,0.28859060402684567,0.3624161073825503,0.3624161073825503,0.3624161073825503,0.3624161073825503,0.436241610738255,0.436241610738255,0.436241610738255,0.436241610738255,0.5369127516778524,0.5369127516778524,0.5369127516778524,0.5369127516778524,0.6073825503355704,0.6073825503355704,0.6073825503355704,0.6073825503355704,0.7046979865771812,0.7046979865771812,0.7046979865771812,0.7046979865771812,0.7818791946308725,0.7818791946308725,0.7818791946308725,0.7818791946308725,0.8624161073825504,0.8624161073825504,0.8624161073825504,0.8624161073825504,0.9463087248322147,0.9463087248322147,0.9463087248322147,0.9463087248322147,1],"name":"model"},"origin":{"variableName":"origin","description":"","numchar":"numeric","nature":"ordinal","binary":false,"interval":"discrete","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":3,"median":1,"mean":1.5738255033557047,"max":3,"min":1,"mode":[1],"modeFreq":186,"fewestValues":[2],"fewestFreq":53,"midpoint":null,"midpointFreq":null,"stdDev":0.8016729958929775,"herfindahlIndex":0.004223475979832797,"plotValues":{"1":186,"2":53,"3":59},"pdfPlotType":null,"pdfPlotX":null,"pdfPlotY":null,"cdfPlotType":"bar","cdfPlotX":[1,2,3],"cdfPlotY":[0.6241610738255033,0.802013422818792,1],"name":"origin"},"class":{"variableName":"class","description":"","numchar":"numeric","nature":"ratio","binary":false,"interval":"continuous","time":"unknown","invalidCount":0,"validCount":298,"uniqueCount":116,"median":22.15,"mean":23.526845637583893,"max":46.6,"min":9,"mode":[13],"modeFreq":16,"fewestValues":[31.6,35.7,46.6,26.5,10],"fewestFreq":1,"midpoint":null,"midpointFreq":null,"stdDev":7.908152302831483,"herfindahlIndex":0.0037335783097413202,"plotValues":{},"pdfPlotType":"continuous","pdfPlotX":[8.679995012477201,9.460403379314867,10.240811746152533,11.021220112990196,11.801628479827862,12.582036846665527,13.362445213503193,14.142853580340859,14.923261947178524,15.70367031401619,16.484078680853855,17.26448704769152,18.044895414529186,18.82530378136685,19.605712148204518,20.38612051504218,21.16652888187985,21.94693724871751,22.72734561555518,23.507753982392842,24.28816234923051,25.068570716068173,25.848979082905842,26.629387449743504,27.409795816581166,28.190204183418835,28.970612550256497,29.751020917094166,30.53142928393183,31.311837650769498,32.09224601760716,32.87265438444483,33.65306275128249,34.43347111812016,35.21387948495782,35.99428785179549,36.77469621863315,37.55510458547082,38.335512952308484,39.11592131914615,39.896329685983815,40.67673805282148,41.457146419659146,42.23755478649681,43.01796315333448,43.79837152017214,44.57877988700981,45.35918825384747,46.13959662068513,46.9200049875228],"pdfPlotY":[0.0060068437249315735,0.00911081963474234,0.013136397885120343,0.01798761041912507,0.02339179497057762,0.02893618203252303,0.0341664834138351,0.03870824967566412,0.04235082857735009,0.045051388558290224,0.04686540575453873,0.047856626940597016,0.048049410303635215,0.04745231493519396,0.04612941174372093,0.04426230398622617,0.04215218341070303,0.04014975307653577,0.03854494694163668,0.03747206439217128,0.036878036392083494,0.03656855273919351,0.0363069889054357,0.035915084501224895,0.03532574612736652,0.034566884897406856,0.033695219431910554,0.03272665573886658,0.03160770618889678,0.030242251807765692,0.028551011666985766,0.026522751360412874,0.024226973420824208,0.021786277692730706,0.0193307204698688,0.0169615766669955,0.014739463455842578,0.01269425399718183,0.01084328791597612,0.009204033424531783,0.007794517448631171,0.0066237519686406544,0.005680197546169813,0.004926797126195914,0.004306912446485422,0.003759281572623032,0.003235253744282752,0.0027105594363974264,0.0021870784209842664,0.0016853189165352566],"cdfPlotType":"continuous","cdfPlotX":[9,9.76734693877551,10.534693877551021,11.302040816326532,12.06938775510204,12.83673469387755,13.604081632653061,14.37142857142857,15.13877551020408,15.906122448979591,16.6734693877551,17.440816326530612,18.208163265306123,18.975510204081633,19.74285714285714,20.51020408163265,21.27755102040816,22.044897959183672,22.812244897959182,23.579591836734693,24.346938775510203,25.114285714285714,25.881632653061224,26.648979591836735,27.416326530612245,28.183673469387756,28.951020408163266,29.718367346938773,30.485714285714284,31.253061224489795,32.0204081632653,32.78775510204082,33.55510204081632,34.32244897959184,35.089795918367344,35.85714285714286,36.624489795918365,37.39183673469388,38.159183673469386,38.926530612244896,39.69387755102041,40.46122448979592,41.22857142857143,41.99591836734694,42.76326530612245,43.53061224489796,44.29795918367347,45.06530612244898,45.83265306122449,46.6],"cdfPlotY":[0.003355704697986577,0.003355704697986577,0.006711409395973154,0.016778523489932886,0.026845637583892617,0.026845637583892617,0.08053691275167785,0.12751677852348994,0.174496644295302,0.18791946308724833,0.23154362416107382,0.2483221476510067,0.32550335570469796,0.33557046979865773,0.3825503355704698,0.4395973154362416,0.4697986577181208,0.5,0.5100671140939598,0.5302013422818792,0.5738255033557047,0.5939597315436241,0.610738255033557,0.6610738255033557,0.6912751677852349,0.7214765100671141,0.7281879194630873,0.7516778523489933,0.7785234899328859,0.8087248322147651,0.8489932885906041,0.8657718120805369,0.8791946308724832,0.9026845637583892,0.9161073825503355,0.9228187919463087,0.9395973154362416,0.9496644295302014,0.9630872483221476,0.9630872483221476,0.9731543624161074,0.9731543624161074,0.9798657718120806,0.9832214765100671,0.9832214765100671,0.9899328859060402,0.9899328859060402,0.9966442953020134,0.9966442953020134,1],"name":"class"}};

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
        '/testPlot': {
            render: () => [
                app.variableSummaries && m(PlotVegaLiteWrapper, {
                    getData: app.getData,
                    variables: Object.keys(app.variableSummaries),
                    nominals: new Set(['Hall_of_Fame', 'Position']),
                    configuration: tempConfiguration,
                    abstractQuery: [],
                    summaries: tempVariableSummaries
                })
            ]
        },
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: app.peekId, image: '/static/images/TwoRavens.png'})},
        '/:mode': Body
    });
}
