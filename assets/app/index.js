import '../css/app.css';
import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';

import hopscotch from 'hopscotch';

import m from 'mithril';

import * as app from './app';
import * as exp from './explore';
import * as plots from './plots';
import * as results from './results';

import * as manipulate from './manipulate';
import * as subset from '../EventData/app/app';

import PanelButton from './views/PanelButton';
import Subpanel from './views/Subpanel';
import Flowchart from './views/Flowchart';

import * as common from '../common/app/common';
import ButtonRadio from '../common/app/views/ButtonRadio';
import Button from '../common/app/views/Button';
import Footer from '../common/app/views/Footer';
import Header from '../common/app/views/Header';
import MenuTabbed from '../common/app/views/MenuTabbed';
import Modal from '../common/app/views/Modal';
import Panel from '../common/app/views/Panel';
import PanelList from '../common/app/views/PanelList';
import Peek from '../common/app/views/Peek';
import Table from '../common/app/views/Table';
import TextField from '../common/app/views/TextField';
import MenuHeaders from "../common/app/views/MenuHeaders";
// EVENTDATA
import Body_EventData from '../EventData/app/Body_EventData';
import Peek_EventData from '../common-eventdata/views/Peek';
import '../EventData/css/app.css'
import '../EventData/app/app'

export let bold = (value) => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);
export let italicize = (value) => m('div', {style: {'font-style': 'italic', display: 'inline'}}, value);
export let link = (url) => m('a', {href: url, style: {color: 'darkblue'}, target: '_blank', display: 'inline'}, url);

let state = {
    pipelines: [],
    async get_pipelines() {
        this.pipelines = await app.listpipelines();
        m.redraw();
    }
};

let nodesExplore = [];

function setBackgroundColor(color) {
    return function() {
        this.style['background-color'] = color;
    };
}

function leftpanel(mode) {

    if (mode === 'results')
        return results.leftpanel(Object.keys(app.allPipelineInfo));

    if (mode === 'manipulate')
        return manipulate.leftpanel();

    let selectedDisco = app.disco.find(problem => problem.problem_id === app.selectedProblem);
    let transformVars = app.selectedProblem && 'pipelineId' in selectedDisco && selectedDisco.pipelineId in subset.manipulations
        ? [...manipulate.getTransformVariables(subset.manipulations[selectedDisco.pipelineId])] : [];

    let discoveryAllCheck = m('input#discoveryAllCheck[type=checkbox]', {
        onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked)),
        checked: app.disco.length === app.checkedDiscoveryProblems.size,
        title: `mark ${app.disco.length === app.checkedDiscoveryProblems.size ? 'no' : 'all'} problems as meaningful`
    });
    let discoveryHeaders = [
        'problem_id',
        m('[style=text-align:center]', 'Meaningful', m('br'), discoveryAllCheck),
        app.disco.some(prob => prob.system === 'user') ? 'User' : '',
        'Target', 'Predictors', 'Task', 'Metric', 'Subset', 'Transform'
    ];



    let formatProblem = problem => [
        problem.problem_id, // this is masked as the UID
        m('input[type=checkbox][style=width:100%]', {
            onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked, problem.problem_id)),
            checked: app.checkedDiscoveryProblems.has(problem.problem_id),
            title: 'mark this problem as meaningful'
        }),
        problem.system === 'user' && m('div[title="User created problem"]', glyph('user')),
        problem.target,
        problem.predictors.join(', '),
        problem.task,
        problem.metric,
        !!problem.subsetObs && problem.subsetObs,
        !!problem.transform && problem.transform
    ];

    let nodes = app.is_explore_mode ? nodesExplore : app.nodes;

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: !(app.is_manipulate_mode || app.rightTab === 'Manipulate'),
        width: app.modelLeftPanelWidths[app.leftTab],
        attrsAll: {
            style: {
                'z-index': 101,
                background: 'rgb(249, 249, 249, .5)', // TODO this makes the leftpanel partially transparent, check with Vito
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.is_model_mode && app.rightTab === 'Manipulate' && manipulate.showTable && subset.tableData ? manipulate.tableSize: '0px'} - ${common.heightFooter})`
            }
        }
    }, m(MenuTabbed, {
        id: 'leftpanelMenu',
        attrsAll: {style: {height: 'calc(100% - 39px)'}},
        currentTab: app.leftTab,
        callback: app.setLeftTab,
        sections: [
            (!(app.is_model_mode && app.rightTab === 'Manipulate') || manipulate.constraintMenu) && {
                value: 'Variables',
                title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                contents: app.is_model_mode && app.rightTab === 'Manipulate' ? [
                    m('h5', 'Constraint Type'),
                    manipulate.varList()
                ] : [
                    m(TextField, {
                        id: 'searchVar',
                        placeholder: 'Search variables and labels',
                        oninput: app.searchVariables
                    }),
                    m(PanelList, {
                        id: 'varList',
                        items: app.valueKey.concat(transformVars),
                        colors: {
                            [app.hexToRgba(common.selVarColor)]: nodes.map(n => n.name),
                            [app.hexToRgba(common.nomColor)]: app.zparams.znom,
                            [app.hexToRgba(common.dvColor)]: app.is_explore_mode ? [] : app.zparams.zdv
                        },
                        classes: {'item-bordered': app.matchedVariables},
                        callback: x => app.clickVar(x, nodes),
                        popup: variable => app.popoverContent(app.findNodeIndex(variable, true)),
                        attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'}
                    })
                ]
            },
            {
                value: 'Discovery',
                contents: [
                    m('div#discoveryTablesContainer', {
                            style: {
                                height: '80%',
                                overflow: 'auto',
                                display: 'block',
                                'margin-bottom': 0,
                                'max-width': (window.innerWidth - 90) + 'px'
                            }
                        },
                        // app.selectedProblem !== undefined && [
                        //     m('h4', 'Current Problem'),
                        //     m(Table, {
                        //         id: 'discoveryTableManipulations',
                        //         headers: discoveryHeaders,
                        //         data: [formatProblem(selectedDisco)],
                        //         activeRow: app.selectedProblem,
                        //         showUID: false,
                        //         abbreviation: 40
                        //     }),
                        //     m('h4', 'All Problems')
                        // ],
                        m(Table, {
                            id: 'discoveryTable',
                            headers: discoveryHeaders,
                            data: [
                                ...app.disco.filter(prob => prob.system === 'user'),
                                ...app.disco.filter(prob => prob.system !== 'user')
                            ].map(formatProblem),
                            activeRow: app.selectedProblem,
                            onclick: app.discoveryClick,
                            showUID: false,
                            abbreviation: 40
                        })),
                    m('textarea#discoveryInput[style=display:block; float: left; width: 100%; height:calc(20% - 35px); overflow: auto; background-color: white]', {
                        value: selectedDisco === undefined ? '' : selectedDisco.description
                    }),
                    m(PanelButton, {
                        id: 'btnSave',
                        onclick: app.saveDisc,
                        title: 'Saves your revised problem description.'
                    }, 'Save Desc.'),
                    m(PanelButton, {
                        id: 'btnSubmitDisc',
                        classes: 'btn-success',
                        style: 'float: right',
                        onclick: app.submitDiscProb,
                        title: 'Submit all checked discovered problems.'
                    }, 'Submit Disc. Probs.')
                ]
            },
            {
                value: 'Summary',
                title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
                display: 'none',
                contents: [
                    m('center',
                        m('b', app.summary.name),
                        m('br'),
                        m('i', app.summary.labl)),
                    m('table', app.summary.data.map(tr => m('tr', tr.map(
                        td => m('td',
                            {
                                onmouseover: setBackgroundColor('aliceblue'),
                                onmouseout: setBackgroundColor('f9f9f9')
                            },
                            td)))))]
            }
        ]
    }));
}

let righttab = (id, task, title, probDesc) => m(PanelList, {
    id: id,
    items: Object.keys(task || {}),
    colors: {[app.hexToRgba(common.selVarColor)]: [app.d3mProblemDescription[probDesc]]},
    classes: {
        'item-lineout': Object.keys(task || {})
            .filter(item => app.locktoggle && item !== app.d3mProblemDescription[probDesc])
    },
    callback: (value) => app.setD3mProblemDescription(probDesc, value),
    popup: v => task[v][1],
    attrsItems: {'data-placement': 'top', 'data-original-title': title + ' Description'}
});

function rightpanel(mode) {
    if (mode === 'results') return; // returns undefined, which mithril ignores
    if (mode === 'explore') return;
    if (mode === 'manipulate') return manipulate.rightpanel();

    // mode == null (model mode)

    // only called if the pipeline flowchart is rendered
    function pipelineFlowchartPrep(pipeline) {
        let steps = pipeline.steps.map((pipeStep, i) => ({
            key: 'Step ' + i,
            color: common.grayColor,
            // special coloring is not enabled for now
            // color: {
            //     'data': common.grayColor,
            //     'byudml': common.dvColor,
            //     'sklearn_wrap': common.csColor
            // }[pipeStep.primitive.python_path.split('.')[2]] || common.grayColor,
            summary: m(Table, {
                id: 'pipelineFlowchartSummary' + i,
                abbreviation: 40,
                data: {
                    'Name': pipeStep['primitive']['primitive'].name,
                    'Method': pipeStep['primitive']['primitive']['pythonPath'].split('.').slice(-1)[0]
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
    }

    let dropdown = (label, key, task) => {
        let metric = key === 'performanceMetrics';
        let desc = app.d3mProblemDescription[key];
        desc = metric ? desc[0].metric : desc;
        return m('.dropdown', {style: 'padding: .5em'},
                 m('', m('label', label), m('br'),
                   app.locktoggle ? m('button.btn.btn-disabled', desc) : [
                       m('button.btn.btn-default.dropdown-toggle[data-toggle=dropdown]', {id: key},
                         desc, m('span.caret')),
                       m('ul.dropdown-menu', {'aria-labelledby': key}, Object.keys(task)
                         .map(x => m('li', {
                             style: 'padding: 0.25em',
                             onclick: _ => app.setD3mProblemDescription(key, metric ? [{metric: x}] : x)
                         }, x)))
                   ]));
    };

    if (app.selectedProblem) {
        if (!(app.domainIdentifier.name in subset.manipulations)) subset.manipulations[app.domainIdentifier.name] = [];

        let combinedId = app.domainIdentifier.name + app.selectedProblem;
        if (!(combinedId in subset.manipulations)) subset.manipulations[combinedId] = [];
    }

    let sections = [
        // {value: 'Models',
        //  display: app.IS_D3M_DOMAIN ? 'block' : 'none',
        //  contents: righttab('models')},
        {value: 'Problem',
         idSuffix: 'Type',
         contents: [
             m(`button#btnLock.btn.btn-default`, {
                 class: app.locktoggle ? 'active' : '',
                 onclick: () => app.lockDescription(!app.locktoggle),
                 title: 'Lock selection of problem description',
                 style: 'float: right',
             }, glyph(app.locktoggle ? 'lock' : 'pencil', true)),
             m('', {style: 'float: left'},
               dropdown('Task', 'taskType', app.d3mTaskType),
               dropdown('Task Subtype', 'taskSubtype', app.d3mTaskSubtype),
               dropdown('Metric', 'performanceMetrics', app.d3mMetrics))
         ]},
        app.selectedProblem && {
            value: 'Manipulate',
            title: 'Apply transformations and subsets to a problem',
            contents: m(MenuHeaders, {
                id: 'aggregateMenu',
                attrsAll: {style: {height: '100%', overflow: 'auto'}},
                sections: [
                    (subset.manipulations[app.domainIdentifier.name] || []).length !== 0 && {
                        value: 'Dataset Pipeline',
                        contents: m(manipulate.PipelineFlowchart, {
                            compoundPipeline: subset.manipulations[app.domainIdentifier.name],
                            pipelineId: app.domainIdentifier.name,
                            editable: false
                        })
                    },
                    {
                        value: 'Problem Pipeline',
                        contents: m(manipulate.PipelineFlowchart, {
                            compoundPipeline: [...subset.manipulations[app.domainIdentifier.name], ...subset.manipulations[app.domainIdentifier.name + app.selectedProblem]],
                            pipelineId: app.domainIdentifier.name + app.selectedProblem,
                            editable: true,
                            aggregate: false
                        })
                    }
                ]
            })
        },
        {value: 'Results',
         display: !app.swandive || IS_D3M_DOMAIN ? 'block' : 'none',
         idSuffix: 'Setx',
         contents: [
             m('#setxRight[style=float: right; width: 30%; height: 100%; overflow:auto]',
                 app.selectedPipeline && [
                     bold('Score Metric: '), app.d3mProblemDescription.performanceMetrics[0].metric, m('br'),
                     app.resultsMetricDescription
                 ],
                 app.pipelineTable.length !== 0 && m(Table, {
                     id: 'pipelineTable',
                     headers: app.pipelineHeader,
                     data: app.pipelineTable,
                     activeRow: app.selectedPipeline,
                     onclick: app.setSelectedPipeline,
                     abbreviation: 20,
                     tableTags: m('colgroup',
                         m('col', {span: 1}),
                         m('col', {span: 1, width: '30%'}))
                 })),
             app.pipelineTable.length === 0 && "Use 'Solve This Problem' to create a list of pipelines. ",
             app.selectedPipeline === undefined && 'Click a pipeline to explore results.',

             app.selectedPipeline && m(ButtonRadio, {
                 id: 'resultsButtonBar',
                 attrsAll: {style: {width: 'auto'}},
                 attrsButtons: {class: ['btn-sm'], style: {width: 'auto'}},
                 onclick: app.setSelectedResultsMenu,
                 activeSection: app.selectedResultsMenu,
                 sections: [
                     {value: 'Prediction Summary', id: 'btnPredPlot'},
                     {value: 'Generate New Predictions', id: 'btnGenPreds'},
                     {value: 'Visualize Pipeline', id: 'btnVisPipe'}
                 ]
             }),
             m(`div#predictionSummary[style=display:${app.selectedResultsMenu === 'Prediction Summary' ? 'block' : 'none'};height:calc(100% - 30px); overflow: auto; width: 70%]`,
                 m('#setxLeftPlot[style=float:left; background-color:white; overflow:auto;]'),
                 m('#setxLeft[style=display:none; float: left; overflow: auto; background-color: white]'),
             ),
             m(`#setxLeftGen[style=display:${app.selectedResultsMenu === 'Generate New Predictions' ? 'block' : 'none'}; float: left; width: 70%; height:calc(100% - 30px); overflow: auto; background-color: white]`,
                 m('#setxLeftTop[style=display:block; float: left; width: 100%; height:50%; overflow: auto; background-color: white]',
                     m('#setxLeftTopLeft[style=display:block; float: left; width: 30%; height:100%; overflow: auto; background-color: white]'),
                     m('#setxLeftTopRight[style=display:block; float: left; width: 70%; height:100%; overflow: auto; background-color: white]')),
                 m('#setxLeftBottomLeft[style=display:block; float: left; width: 70%; height:50%; overflow: auto; background-color: white]'),
                 m('#setxLeftBottomRightTop[style=display:block; float: left; width: 30%; height:10%; overflow: auto; background-color: white]',
                     m(PanelButton, {
                         id: 'btnExecutePipe',
                         classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
                         onclick: app.executepipeline,
                         style: {
                             display: app.selectedPipeline === undefined ? 'none' : 'block',
                             float: 'left',
                             'margin-right': '10px'
                         },
                         title: 'Execute pipeline'
                     }, m('span.ladda-label[style=pointer-events: none]', 'Execute Generation'))),
                 m('#setxLeftBottomRightBottom[style=display:block; float: left; width: 30%; height:40%; overflow: auto; background-color: white]')),
             app.selectedResultsMenu === 'Visualize Pipeline' && app.selectedPipeline in app.allPipelineInfo && m('div', {
                     style: {
                         width: '70%',
                         height: 'calc(100% - 30px)',
                         overflow: 'auto'
                     }
                 },
                 m('div', {style: {'font-weight': 'bold', 'margin': '1em'}}, 'Overview: '),
                 m(Table, {
                     id: 'pipelineOverviewTable',
                     data: Object.keys(app.allPipelineInfo[app.selectedPipeline].pipeline).reduce((out, entry) => {
                         if (['inputs', 'steps', 'outputs'].indexOf(entry) === -1)
                             out[entry] = app.allPipelineInfo[app.selectedPipeline].pipeline[entry];
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
                     steps: pipelineFlowchartPrep(app.allPipelineInfo[app.selectedPipeline].pipeline)
                 })
             )
         ]
        }
    ];

    return m(Panel, {
        side: 'right',
        label: 'Model Selection',
        hover: true,
        width: app.modelRightPanelWidths[app.rightTab],
        attrsAll: {
            style: {
                'z-index': 101,
                height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${app.is_model_mode && app.rightTab === 'Manipulate' && manipulate.showTable && subset.tableData ? manipulate.tableSize: '0px'} - ${common.heightFooter})`
            }
        }
    }, m(MenuTabbed, {
        id: 'rightpanelMenu',
        currentTab: app.rightTab,
        callback: app.setRightTab,
        sections: sections,
        attrsAll: {style: {height: 'calc(100% - 39px)'}}
    }));
}

export let glyph = (icon, unstyled) =>
    m(`span.glyphicon.glyphicon-${icon}` + (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));

class Body {
    oninit() {
        app.setRightTab(IS_D3M_DOMAIN ? 'Problem' : 'Models');
        app.set_mode('model');

        this.cite = false;
        this.citeHidden = false;
    }

    oncreate() {
        let extract = (name, key, offset, replace) => {
            key = key + '=';
            let loc = window.location.toString();
            let val = loc.indexOf(key) > 0 ? loc.substring(loc.indexOf(key) + offset) : '';
            let idx = val.indexOf('&');
            val = idx > 0 ? val.substring(0, idx) : val;
            val = val.replace('#!/model', '');
            console.log(name, ': ', val);
            return replace ?
                val
                    .replace(/%25/g, '%')
                    .replace(/%3A/g, ':')
                    .replace(/%2F/g, '/')
                : val;
        };
        app.main(
            extract('fileid', 'dfId', 5),
            extract('hostname', 'host', 5),
            extract('ddiurl', 'ddiurl', 7, true),
            extract('dataurl', 'dataurl', 8, true),
            extract('apikey', 'key', 4));
    }

    view(vnode) {
        let {mode, variate, vars} = vnode.attrs;

        // after calling m.route.set, the params for mode, variate, vars don't update in the first redraw.
        // checking window.location.href is a workaround, permits changing mode from url bar
        if (window.location.href.includes(mode) && mode !== app.currentMode)
            app.set_mode(mode);

        let expnodes = [];
        vars = vars ? vars.split('/') : [];

        let exploreVars = (() => {
            vars.forEach(x => {
                let node = app.findNode(x);
                node && expnodes.push(node);
            });
            if (variate==="problem") {
                let problem = app.disco.find(problem => problem.problem_id === app.selectedProblem);
                return m('', [
                m('#plot', {style: 'display: block', oncreate: _ => exp.plot([],"",problem)})
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

            return m('', [
                m('', {style: 'margin-bottom: 1em; max-width: 1000px; overflow: scroll; white-space: nowrap'},
                  filtered.split(' ').map(x => {
                      return m("figure", {style: 'display: inline-block'}, [
                          m(`img#${x}_img[alt=${x}][height=140px][width=260px][src=/static/images/${x}.png]`, {
                              onclick: _ => exp.plot(expnodes, x),
                              style: exp.thumbsty(expnodes,x)
//                              style: {border: "2px solid #ddd", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}
                          }),
                          m("figcaption", {style: {"text-align": "center"}}, plotMap[x])
                      ]);
                  })),
                m('#plot', {style: 'display: block', oncreate: _ => expnodes.length > 1 ? exp.plot(expnodes) : plot(expnodes[0], 'explore', true)})
            ]);
        })();

        let spaceBtn = (id, onclick, title, icon) =>
            m(`button#${id}.btn.btn-default`, {onclick, title}, glyph(icon, true));
        let discovery = app.leftTab === 'Discovery';
        let overflow = app.is_explore_mode ? 'auto' : 'hidden';
        let style = `position: absolute; left: ${app.panelWidth.left}; top: 0; margin-top: 10px`;

        if (app.domainIdentifier && !(app.domainIdentifier.name in subset.manipulations))
            subset.manipulations[app.domainIdentifier.name] = [];

        let problem = app.disco.find(prob => prob.problem_id === app.selectedProblem);
        let problemPipeline = app.is_model_mode && (manipulate.getProblemPipeline(app.selectedProblem) || []);

        return m('main', [
            m(Modal),
            this.header(app.currentMode),
            this.footer(app.currentMode),
            leftpanel(app.currentMode),
            rightpanel(app.currentMode),

            (app.is_manipulate_mode || (app.is_model_mode && app.rightTab === 'Manipulate')) && manipulate.menu(
                [...subset.manipulations[app.domainIdentifier.name], ...problemPipeline], // the complete pipeline to build menus with
                app.is_model_mode ? problem.pipelineId : app.domainIdentifier.name),  // the identifier for which pipeline to edit

            m(`#main`, {style: {overflow, display: app.is_manipulate_mode || (app.rightTab === 'Manipulate' && manipulate.constraintMenu) ? 'none' : 'block'}},
                m("#innercarousel.carousel-inner", {style: {height: '100%', overflow}},
                app.is_explore_mode && [variate === 'problem' ?
                    m('', {style},
                        m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                        m('br'),
                        exploreVars)
//                        JSON.stringify(app.disco[app.selectedProblem]))
                    : exploreVars ?
                    m('', {style},
                      m('a', {onclick: _ => m.route.set('/explore')}, '<- back to variables'),
                      m('br'),
                      exploreVars)
                    : m('', {style},
                        m(ButtonRadio,
                          {id: 'exploreButtonBar',
                           attrsAll: {style: {width: '400px'}},
                           attrsButtons: {class: ['btn-sm']},
                           onclick: x => {nodesExplore = []; app.setVariate(x)},
                           activeSection: app.exploreVariate,
                           sections: discovery ? [{value: 'Problem'}] : [{value: 'Univariate'}, {value: 'Bivariate'}, {value: 'Trivariate'}, {value: 'Multiple'}]}),
                        m(PanelButton, {
                            id: 'exploreGo',
                            classes: 'btn-success',
                            onclick: _ => {
                                let variate = app.exploreVariate.toLowerCase();
                                let selected = discovery ? [app.selectedProblem] : nodesExplore.map(x => x.name);
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
                          (discovery ? app.disco : app.valueKey).map((x, i) => {
                              let {problem_id} = x;
                              let selected = discovery ? problem_id === app.selectedProblem : nodesExplore.map(x => x.name).includes(x);
                              let {predictors} = x;
                              if (x.predictors) {
                                  x = x.target;
                              }
                              let node = app.findNodeIndex(x, true);
                              let show = app.exploreVariate === 'Bivariate' || app.exploreVariate === 'Trivariate';
                              let [n0, n1, n2] = nodesExplore;
                              return m('span', {
                                  onclick:  _ => discovery ? app.setSelectedProblem(problem_id) : app.clickVar(x, nodesExplore),
                                  onmouseover: function() {
                                      $(this).popover('toggle');
                                      $('body div.popover')
                                          .addClass('variables');
                                      $('body div.popover div.popover-content')
                                          .addClass('form-horizontal');
                                  },
                                  onmouseout: "$(this).popover('toggle');",
                                  'data-container': 'body',
                                  'data-content': node.labl || '<i>none provided</i>',
                                  'data-html': 'true',
                                  'data-original-title': 'Description',
                                  'data-placement': 'top',
                                  'data-toggle': 'popover',
                                  'data-trigger': 'hover',
                                  style: {
                                      border: '1px solid rgba(0, 0, 0, .2)',
                                      'border-radius': '5px',
                                      'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)',
                                      display: 'flex',
                                      'flex-direction': 'column',
                                      height: '250px',
                                      margin: '.5em',
                                      width: '250px',
                                      'align-items': 'center',
                                      'background-color': app.hexToRgba(common[selected ? 'selVarColor' : 'varColor'])
                                  }
                              }, [m('', {
                                  oninit() {
                                      this.node = app.findNodeIndex(x, true);
                                  },
                                  oncreate(vnode) {
                                      let plot = this.node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                      plot(this.node, vnode.dom, 110, true);
                                  },
                                  onupdate(vnode) {
                                      let node = app.findNodeIndex(x, true);
                                      if (node != this.node) {
                                          let plot = node.plottype === 'continuous' ? plots.densityNode : plots.barsNode;
                                          plot(node, vnode.dom, 110, true);
                                          this.node = node;
                                      }
                                  },
                                  style: 'height: 65%'}),
                                  m('', {style: 'margin: 1em'},
                                    show && n0 && n0.name === x ? `${x} (x)`
                                    : show && n1 && n1.name === x ? `${x} (y)`
                                    : show && n2 && n2.name === x ? `${x} (z)`
                                    : predictors ? [
                                        m('b', x),
                                        m('p', predictors.join(', '))]
                                    : x)
                                 ]);
                          }))
                       )],
                m('svg#whitespace')),
              app.is_model_mode && m("#spacetools.spaceTool", {style: {right: app.panelWidth.right, 'z-index': 16}},
                              spaceBtn('btnAdd', async function() {
                                  app.zPop();
                                  let rookpipe = await app.makeRequest(ROOK_SVC_URL + 'pipelineapp', app.zparams);
                                  rookpipe.target = rookpipe.depvar[0];
                                  let myn = app.findNodeIndex(rookpipe.target, true);
                                  let currentTaskType = app.d3mProblemDescription.taskType;
                                  let currentMetric = app.d3mProblemDescription.performanceMetrics[0].metric;
                                  if (myn.nature == "nominal"){
                                    rookpipe.task = currentTaskType === 'taskTypeUndefined' ? 'classification' : currentTaskType;
                                    rookpipe.metric = currentMetric === 'metricUndefined' ? 'f1Macro' : currentMetric;
                                  }else{
                                    rookpipe.task = currentTaskType === 'taskTypeUndefined' ? 'regression' : currentTaskType;
                                    rookpipe.metric = currentMetric === 'metricUndefined' ? 'meanSquaredError' : currentMetric;
                                  };
                                  rookpipe.meaningful = "yes";
                                  rookpipe.subsetObs = 0;
                                  rookpipe.subsetFeats = 0;
                                  rookpipe.transform = 0;
                                  rookpipe.system = "user";
                                  let problemId = app.disco.length + 1;
                                  rookpipe.problem_id = "problem" + problemId;
                                  console.log("pushing this:");
                                  console.log(rookpipe);
                                  app.disco.push(rookpipe);
                                    app.setSelectedProblem(app.disco.length - 1);
                                  app.setLeftTab('Discovery');
                                  m.redraw();
                              }, 'Add model to problems.', 'plus'),
                              spaceBtn('btnJoin', _ => {
                                  let links = [];
                                  console.log("doing connect all");
                                  if (app.is_explore_mode) {
                                      for (let node of app.nodes) {
                                          for (let node1 of app.nodes) {
                                              if (node !== node1 && links.filter(l => l.target === node1 && l.source === node).length === 0) {
                                                  links.push({left: false, right: false, target: node, source: node1});
                                              }
                                          }
                                      }
                                  } else {
                                      let dvs = app.nodes.filter(n => app.zparams.zdv.includes(n.name));
                                      let nolink = app.zparams.zdv.concat(app.zparams.zgroup1).concat(app.zparams.zgroup2);
                                      let ivs = app.nodes.filter(n => !nolink.includes(n.name));

                                      links = dvs.map(dv => ivs.map(iv => ({
                                          left: true,
                                          right: false,
                                          target: iv,
                                          source: dv
                                      })));
                                  }
                                  app.restart([].concat(...links));
                              }, 'Make all possible connections between nodes', 'link'),
                              spaceBtn('btnDisconnect', _ => app.restart([]), 'Delete all connections between nodes', 'remove-circle'),
                              spaceBtn('btnForce', app.forceSwitch, 'Pin the variable pebbles to the page', 'pushpin'),
                              spaceBtn('btnEraser', app.erase, 'Wipe all variables from the modeling space', 'magnet')),
              app.is_model_mode && m(Subpanel, {
                    title: "Legend",
                    buttons: [
                        ['timeButton', 'ztime', 'Time'],
                        ['csButton', 'zcross', 'Cross Sec'],
                        ['dvButton', 'zdv', 'Dep Var'],
                        ['nomButton', 'znom', 'Nom Var'],
                        ['gr1Button', 'zgroup1', 'Group 1'],
                        ['gr2Button', 'zgroup2', 'Group 2']],
                    attrsStyle: {bottom: app.rightTab === 'Manipulate' ? `calc(${manipulate.showTable ? manipulate.tableSize : '0px'} + 23px)` : '0px'}
                }),
                app.currentMode !== 'manipulate' && m(Subpanel, {title: "History"}))
        ]);
    }

    header(mode) {
        let userlinks = username === '' ? [
            {title: "Log in", url: login_url},
            {title: "Sign up", url: signup_url}
        ] : [{title: "Workspaces", url: workspaces_url},
             {title: "Settings", url: settings_url},
             {title: "Links", url: devlinks_url},
             {title: "Logout", url: logout_url}];

        let _navBtn = (id, left, right, onclick, args, min) => m(
            `button#${id}.btn.navbar-right`,
            {onclick: onclick,
             style: {'margin-left': left + 'em',
                     'margin-right': right + 'em',
                     'min-width': min}},
            args);
        let navBtn = (id, left, right, onclick, args, min) => _navBtn(
            id + '.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
            left, right, onclick, args, min);
        let navBtnGroup = (id, onclick, args, min) => m(
            `button#${id}.btn.navbar-left`,
            {onclick: onclick,
             style: {'min-width': min}},
            args);
        let navBtn1 = (id, onclick, args, title) => _navBtn(
            `${id}.btn-default[title=${title}]`, 2, 0, onclick, args);

        return m(Header, {
            style: mode === 'explore' ? {'background-image': '-webkit-linear-gradient(top, #fff 0, rgb(227, 242, 254) 100%)'} : {}
        }, [m('#dataField.field[style=text-align: center]', [
            m('h4#dataName[style=display: inline-block; margin-right:2em; margin-top: 7px]',
              {onclick: _ => this.cite = this.citeHidden = !this.citeHidden,
               onmouseout: _ => this.citeHidden || (this.cite = false),
               onmouseover: _ => this.cite = true},
              'Dataset Name'),
            m('#cite.panel.panel-default',
              {style: `display: ${this.cite ? 'block' : 'none'}; position: absolute; right: 50%; width: 380px; text-align: left; z-index: 50`},
              m('.panel-body')),
            m('span',
              m('.dropdown[style=float: right; padding-right: 1em]',
                m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                  [username, " ", glyph('triangle-bottom')]),
                m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                  userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
              mode !== 'model' ? null : navBtn('btnEstimate.btn-default', 2, 1, app.estimate, m("span.ladda-label", mode === 'explore' ? 'Explore' : 'Solve This Problem'), '150px'),
              m('div.btn-group[role=group][aria-label="..."]', {style:{"float":"right", "margin-left": "2em"}},
                navBtnGroup('btnTA2.btn-default', _ => hopscotch.startTour(app.mytour, 0), ['Help Tour ', glyph('road')]),
                navBtnGroup('btnTA2.btn-default', _ => app.helpmaterials('video'), ['Video ', glyph('expand')]),
                navBtnGroup('btnTA2.btn-default', _ => app.helpmaterials('manual'), ['Manual ', glyph('book')])),
              navBtn1("btnReset", app.reset, glyph('repeat'), 'Reset'),
              navBtn1('btnEndSession', app.endsession, m("span.ladda-label", 'Mark Problem Finished'), 'Mark Problem Finished'))
        ])]);
    }

    footer(mode) {

        let manipulateRecordCount;
        let pipeline = subset.manipulations[(app.domainIdentifier || {}).name];
        if (pipeline) manipulateRecordCount = {
            'subset': subset.totalSubsetRecords,
            'aggregate': subset.tableData && subset.tableData.length
        }[(pipeline[pipeline.length - 1] || {}).type];

        return m(Footer, [
            m(ButtonRadio, {
                id: 'modeButtonBar',
                attrsAll: {style: {margin: '2px', width: 'auto'}, class: 'navbar-left'},
                onclick: app.set_mode,
                activeSection: mode || 'model',
                sections: [{value: 'Model'}, {value: 'Explore'}, {value: 'Manipulate'}],

                // attrsButtons: {class: ['btn-sm']}, // if you'd like small buttons (btn-sm should be applied to individual buttons, not the entire component)
                attrsButtons: {style: {width: 'auto'}}
            }),
            m("a#logID[href=somelink][target=_blank]", "Replication"),
            m("span[style=color:#337ab7]", " | "),
            // dev links...
            m("a[href='/dev-raven-links'][target=_blank]", "raven-links"),
            m("span[style=color:#337ab7]", " | "),
            m("span[style=color:#337ab7]", `TA2: ${TA2_SERVER}`),
            m("span[style=color:#337ab7]", " | "),
            m("span[style=color:#337ab7]", `TA3TA2 api: ${TA3TA2_API_VERSION}`),
            m(Button, {
                id: 'datasetConsoleLogUrl',
                onclick: async () =>
                    console.log(await manipulate.buildDatasetUrl(app.disco.find(prob => prob.problem_id === app.selectedProblem)))
            }, 'LOG DATASET URL'),
            m('div.btn.btn-group', {style: 'float: right; padding: 0px'},
                m(Button, {
                    class: manipulate.showTable && ['active'],
                    onclick: _ => manipulate.setShowTable(!manipulate.showTable)
                }, 'Peek'),
                m(Button, {onclick: _ => window.open('#!/data', 'data')}, glyph('new-window'))),
            // Manipulate Record Count
            app.is_manipulate_mode && manipulateRecordCount !== undefined && m("span.label.label-default#recordCount", {
                style: {
                    float: 'right',
                    "margin-left": "5px",
                    "margin-top": "10px",
                    "margin-right": "2em"
                }
            }, manipulateRecordCount + ' Records')
        ]);
    }
}

if (IS_EVENTDATA_DOMAIN) {
    m.route(document.body, '/home', {
        '/data': {render: () => m(Peek_EventData, {id: 'eventdata', image: '/static/images/TwoRavens.png'})},
        '/:mode': Body_EventData
    });
}
else {
    m.route(document.body, '/model', {
        '/explore/:variate/:vars...': Body,
        '/data': {render: () => m(Peek, {id: 'tworavens', image: '/static/images/TwoRavens.png'})},
        '/:mode': Body,

        /*'/results': {
          onmatch() {
          app.set_mode('results');
          state.get_pipelines();
          layout.init();
            },
            render() {
                return m(Body, {mode: 'results'});
            }
        },*/
    });
}