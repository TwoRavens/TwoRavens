import '../css/app.css';
import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';

import hopscotch from 'hopscotch';

import m from 'mithril';

import * as app from './app';
import * as exp from './explore';
import * as layout from './layout';
import * as results from './results';

import Button from './views/PanelButton';
import List from './views/PanelList';
import Search from './views/Search';
import Subpanel from './views/Subpanel';
import Table from '../common/app/views/Table'

import * as common from '../common/app/common'
import Panel from '../common/app/views/Panel';
import MenuTabbed from '../common/app/views/MenuTabbed';
import ButtonRadio from '../common/app/views/ButtonRadio';
import Footer from '../common/app/views/Footer';
import Header from '../common/app/views/Header';
import PanelList from '../common/app/views/PanelList'
import TextField from '../common/app/views/TextField'

let state = {
    pipelines: [],
    async get_pipelines() {
        this.pipelines = await app.listpipelines();
        m.redraw();
    }
};

function setBackgroundColor(color) {
    return function() {
        this.style['background-color'] = color;
    };
}

function leftpanel(mode) {
    if (mode === 'results') {
        return results.leftpanel(Object.keys(app.allPipelineInfo));
    }

    let discoveryAllCheck = m('input#discoveryAllCheck[type=checkbox]', {
        onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked)),
        checked: app.probtable.length === app.checkedDiscoveryProblems.size
    })

    let discoveryTableData = app.probtable.map((problem) => [...problem, m('input[type=checkbox]', {
        onclick: m.withAttr("checked", (checked) => app.setCheckedDiscoveryProblem(checked, problem[0])),
        checked: app.checkedDiscoveryProblems.has(problem[0])
    })])

    return m(Panel, {
        side: 'left',
        label: 'Data Selection',
        hover: true,
        width: app.modelLeftPanelWidths[app.leftTab],
        contents: m(MenuTabbed, {
            id: 'leftpanelMenu',
            attrsAll: {style: {height: 'calc(100% - 39px)'}},
            currentTab: app.leftTab,
            callback: app.setLeftTab,
            sections: [
                {
                    value: 'Variables',
                    title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                    contents: [
                        m(TextField, {
                            id: 'searchVar',
                            placeholder: 'Search variables and labels',
                            oninput: app.searchVariables
                        }),
                        m(PanelList, {
                            id: 'varList',
                            items: app.valueKey,
                            colors: {
                                [app.hexToRgba(common.selVarColor)]: app.nodes.map(n => n.name),
                                [app.hexToRgba(common.nomColor)]: app.zparams.znom,
                                [app.hexToRgba(common.dvColor)]: app.zparams.zdv
                            },
                            classes: {'item-bordered': app.matchedVariables},
                            callback: app.clickVar,
                            popup: (variable) => app.popoverContent(app.findNodeIndex(variable, true)),
                            attrsItems: {'data-placement': 'right', 'data-original-title': 'Summary Statistics'}
                        }),
                    ],
                },
                {
                    value: 'Discovery',
                    contents: [
                        m(Table, {
                            id: 'discoveryTable',
                            headers: ['Hidden_UID', 'Target', 'Predictors', 'Task', 'Metric', discoveryAllCheck],
                            data: discoveryTableData,
                            activeRow: app.selectedProblem,
                            onclick: app.setSelectedProblem,
                            showUID: false,
                            attrsAll: {style: {height: '80%', overflow: 'auto', display: 'block', 'margin-right': '16px', 'margin-bottom': 0, 'max-width': (window.innerWidth - 90) + 'px'}}
                        }),
                        m('textarea#discoveryInput[style=display:block; float: left; width: 100%; height:calc(20% - 35px); overflow: auto; background-color: white]', {
                            value: app.disco[app.selectedProblem] === undefined ? '' : app.disco[app.selectedProblem].description
                        }),
                        m(Button, {id: 'btnSave', onclick:_=>app.saveDisc('btnSave'),title: 'Saves your revised problem description.'}, 'Save Desc.'),
                        m(Button, {id: 'btnSubmitDisc', classes: 'btn-success', style: 'float: right', onclick:_=>app.submitDiscProb(), title: 'Submit all checked discovered problems.'}, 'Submit Disc. Probs.')
                    ]
                },
                {
                    value: 'Summary',
                    title: 'Select a variable from within the visualization in the center panel to view its summary statistics.',
                    contents: [
                        m('center',
                            m('b', app.summary.name),
                            m('br'),
                            m('i', app.summary.labl)),
                        m('table', app.summary.data.map(tr => m('tr', tr.map(
                            td => m('td', {
                                    onmouseover: setBackgroundColor('aliceblue'),
                                    onmouseout: setBackgroundColor('f9f9f9')
                                },
                                td)))))
                    ],
                    display: 'none'
                }]
        })
    });
}

let righttab = (id, task, title, probDesc) => m(PanelList, {
    id: id,
    items: Object.keys(task || {}),
    colors: {
        [app.hexToRgba(common.selVarColor)]: [app.d3mProblemDescription[probDesc]],
    },
    classes: {
        'item-lineout': Object.keys(task || {})
            .filter(item => app.locktoggle && item !== app.d3mProblemDescription[probDesc])
    },
    callback: (value) => app.setD3mProblemDescription(probDesc, value),
    popup: v => task[v][1],
    attrsItems: {'data-placement': 'top', 'data-original-title': title + ' Description'}
});

function rightpanel(mode) {
    let thumb = (idx, id, title) =>
        m("th",
          m("figure", {style: {float: "left"}},
            m(`img#${id}_img[alt=${id}][src=/static/images/thumb${idx}.png]`,
              {style: {width: "75%", height: "75%", border: "1px solid #ddd", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}}),
            m("figcaption", {style: {"text-align": "center"}}, title)));
    /*let unique_link_names = () => {
        let names = [];
        for (let link of app.links) {
            if (!names.includes(link.source.name)) {
                names.push(link.source.name);
            }
            if (!names.includes(link.target.name)) {
                names.push(link.target.name);
            }
        }
        return names;
    };*/

    if (mode === 'results') return [];
    if (mode === 'explore') {
        // let link_names = unique_link_names();
        let sectionsExplore = [
            {
                value: 'Univariate',
                contents: [
                    m('#decision_prompt',
                        `Right click pebble variables to draw links between them. Select a variable in the list of linked pebbles below to draw a decision tree for that variable.`),
                    m('#decisionTree[style=width: 100%; height:80%; overflow-y:scroll; float: left; white-space: nowrap; margin-top: 2px;]'),
                    m(PanelList, {
                        id: 'varListExplore',
                        items: app.nodes.map(n => n.name),
                        colors: {[app.hexToRgba(common.selVarColor)]: [exp.exploreVar]},
                        callback: variable => exp.callTreeApp(variable, app),
                        attrsAll: {style: {float: 'left', width: '100%', height: '20%'}}
                    })
                        // m('#varList[style=display: block]',
                        //     unique_link_names().map(x => m(`p#${x.replace(/\W/g, '_')}`, {onclick: _=> exp.callTreeApp(x, app), style: {'background-color': app.varColor}}, x))))
                ]
            },
            {
                value: 'Bivariate',
                contents: [
                    m('#result_prompt', {style: {display: app.explored ? 'none' : 'block'}}, `Click 'Explore' for interactive plots.`),
                    m('#modelView_Container', {style: `width: 100%; float: left; white-space: nowrap;`},
                        m('#modelView', {style: 'width: 100%; float: left'})),
                    app.pipelineTable ? m(Table, {
                        id: 'pipelineTableExplore',
                        headers: app.pipelineHeader,
                        data: app.pipelineTable,
                        activeRow: app.selectedPipeline[app.currentMode],
                        onclick: app.setSelectedPipeline,
                        showUID: false
                    }) : undefined,
                    m('#result_left',
                        {style: {display: app.explored ? 'block' : 'none',
                                "width": "50%", "height": "100%",
                                "float": "left", "overflow-y": "auto",
                                "white-space": "nowrap", "padding-right": "10px"}},
                        m('#left_thumbnail', {style: {"width": "100%", "white-space": "nowrap"}},
                            thumb(1, 'scatterplot', "Scatter Plot"), thumb(2, 'heatmap', "Heatmap"), thumb(3, 'linechart', "Linechart")),
                        m('#result_left1', {style: {width: "100%", "text-align": "center", "white-space": "nowrap"}},
                            m(".container3[id=scatterplot]", {style: {"width": "500px", "height": "80%", "float": "left", "overflow": "hidden"}}),
                            m(".container4[id=heatchart]", {style: {"display": "none", "width": "500px", "height": "80%", "float": "left", "overflow": "hidden"}}),
                            m(".container4[id=linechart]", {style: {"display": "none", "width": "500px", "height": "80%", "float": "left", "overflow": "hidden"}})),
                        m("div", {style: {"display": "inline-block", "width": "100%", "float": "left", "text-align": "center"}},
                            m("h5#NAcount", {style: {" margin-bottom": "0"}})),
                        m(".container2[id='resultsView_statistics']",
                            {style: {"width": "100%", "float": "left", "white-space": "nowrap"}})),
                    m('#result_right',
                        {style: {display: app.explored ? 'block' : 'none',
                                width: "50%", height: "100%",
                                float: "right", "white-space": "nowrap", "padding-left": "10px"}},
                        m('#resultsView_tabular.container1',
                            {style: {width: "100%", height: "100%", float: "left", overflow: "auto", "white-space": "nowrap"}},
                            m('#SelectionData', {style: {width: "100%"}},
                                m("fieldset",
                                    m("h4", {style: {"text-align": "center"}}, "Data Distribution Selection"),
                                    m("p", "Enter number for each variable to specify the break points, and select between Equidistant/Equimass")),
                                m('#plotBreakInputs', {style: {height: '60px'}},
                                    m('#forPlotA', {style: {display: 'inline', float: "left", width: '50%'}},
                                        m("input#input1[name='fname'][type='text']", {style: {"margin-left": "2%"}}),
                                        m('span#tooltipPlotA.tooltiptext[style=visibility: hidden]'),
                                        m("button.btn.btn-default.btn-xs#Equidistance1[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIDISTANCE"),
                                        m("button.btn.btn-default.btn-xs#Equimass1[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIMASS")),
                                    m('#forPlotB', {style: {display: 'inline', float: "right", width: '50%'}},
                                        m("input#input2[name='fname1'][type='text']", {style: {"margin-left": "2%"}}),
                                        m('span#tooltipPlotB.tooltiptext1[style=visibility: hidden]'),
                                        m("button.btn.btn-default.btn-xs#Equidistance2[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIDISTANCE"),
                                        m("button.btn.btn-default.btn-xs#Equimass2[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIMASS"))
                                ),
                                m('div#statusesBivariate',
                                    m("div#plotA_status", {style: {width: '100%'}}),
                                    m("div#plotB_status", {style: {width: '100%'}}),
                                    m('h5[style=color: #ac2925; margin-top: 1%; margin-left: 2%]', 'Selection History'),
                                ),
                                m("button.btn.btn-default.btn-sm[id='SelectionData1'][type='button']", {style: {display: "block", margin: "0 auto", position: "relative"}},
                                    "Create")),
                            m('#tabular_1', {style: {width: "100%", height: "200px"}},
                                m('#plotA', {style: {width: exp.get_width('plotA') + '%', height: "100%", float: "left", overflow: "hidden"}}, "plotA"),
                                m('#plotB', {style: {width: exp.get_width('plotB') + '%', height: "100%", float: "right", overflow: "hidden"}}, "plotB")),
                            m('#tabular_2', {style: {width: "100%"}})))
                ]
            }
        ];

        return m(Panel, {
            side: 'right',
            label: 'Result Exploration',
            hover: true,
            width: app.exploreRightPanelWidths[app.rightTabExplore],
            contents: m(MenuTabbed, {
                id: 'rightPanelMenuExplore',
                currentTab: app.rightTabExplore,
                callback: app.setRightTabExplore,
                sections: sectionsExplore,
                attrsAll: {style: {height: 'calc(100% - 39px)'}}
            })
            // m('#setx[style=display: none; margin-top: .5em]')
        });
    }

    // mode == null (model mode)

    let sections = [
        // {
        //     value: 'Models',
        //     display: app.IS_D3M_DOMAIN ? 'block' : 'none',
        //     contents: righttab('models')
        // },
        {
            value: 'Task Type',
            idSuffix: 'Type',
            contents: righttab('types', app.d3mTaskType, 'Task', 'taskType')
        },
        {
            value: 'Subtype',
            contents: righttab('subtypes', app.d3mTaskSubtype, 'Task Subtype', 'taskSubtype')
        },
        {
            value: 'Metrics',
            contents: righttab('metrics', app.d3mMetrics, 'Metric', 'metric')
        },
        {
            value: 'Results',
            display: !app.swandive || app.IS_D3M_DOMAIN ? 'block' : 'none',
            idSuffix: 'Setx',
            contents: [
                m('#setxRight[style=display:block; float: right; width: 25%; height:100%; background-color: white]',
                    app.pipelineTable ? m(Table, {
                        id: 'pipelineTable',
                        headers: app.pipelineHeader,
                        data: app.pipelineTable,
                        activeRow: app.selectedPipeline[app.currentMode],
                        onclick: app.setSelectedPipeline,
                        showUID: false
                    }) : undefined),
                m('#setxTop[style=display:block; float: left; width: 75%; height:10%; overflow: auto; background-color: white]',
                    m("button.btn.btn-default.btn-xs#btnPredPlot[type='button']", {
                        onclick: () => app.showPredPlot('btnPredPlot'),
                        style: {float: "left", "margin-left": "2%"}
                    }, "Prediction Summary"),
                    m("button.btn.btn-default.btn-xs#btnGenPreds[type='button']", {
                        onclick: () => app.showGenPreds('btnGenPreds'),
                        style: {float: "left", "margin-left": "2%"}
                    }, "Generate New Predictions")),
                m('#setxLeftPlot[style=display:block; float: left; width: 75%; height:95%; overflow: auto; background-color: white]'),
                m('#setxLeft[style=display:none; float: left; width: 75%; height:95%; overflow: auto; background-color: white]'),
                m('#setxLeftGen[style=display:none; float: left; width: 75%; height:95%; overflow: auto; background-color: white]',
                    m('#setxLeftTop[style=display:block; float: left; width: 100%; height:50%; overflow: auto; background-color: white]',
                        m('#setxLeftTopLeft[style=display:block; float: left; width: 30%; height:100%; overflow: auto; background-color: white]'),
                        m('#setxLeftTopRight[style=display:block; float: left; width: 70%; height:100%; overflow: auto; background-color: white]')),
                    m('#setxLeftBottomLeft[style=display:block; float: left; width: 70%; height:50%; overflow: auto; background-color: white]'),
                    m('#setxLeftBottomRightTop[style=display:block; float: left; width: 30%; height:10%; overflow: auto; background-color: white]',
                        m(Button,
                            {
                                id: 'btnExecutePipe',
                                classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
                                onclick: () => app.executepipeline('btnExecutePipe'),
                                style: `display:inline; float: left; margin-right: 10px`,
                                title: 'Execute pipeline.'
                            },
                            m('span.ladda-label[style=pointer-events: none]', 'Execute Generation'))),
                    m('#setxLeftBottomRightBottom[style=display:block; float: left; width: 30%; height:40%; overflow: auto; background-color: white]'))
            ]
        }
    ];

    return m(Panel, {
        side: 'right',
        label: 'Model Selection',
        hover: true,
        width: app.modelRightPanelWidths[app.rightTab],
        contents: m(MenuTabbed, {
            id: 'rightpanelMenu',
            currentTab: app.rightTab,
            callback: app.setRightTab,
            hoverBonus: 10,
            selectWidth: 30,
            sections: sections,
            attrsAll: {style: {height: 'calc(100% - 39px)'}}
        })
    });
}


let glyph = (icon, unstyled) => m(
    `span.glyphicon.glyphicon-${icon}` + (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));

class Body {
    oninit(vnode) {
        if (vnode.attrs.mode) {
            m.route.set('/model');
            vnode.attrs.mode = null;
        };
        this.about = false;
        this.usertasks = false;
        this.cite = false;
        this.citeHidden = false;
        this.last_mode = null;
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
        let {mode} = vnode.attrs;
        let explore_mode = mode === 'explore';
        let results_mode = mode === 'results';

        let spaceBtn = (id, onclick, title, icon) => m(
            `button#${id}.btn.btn-default`, {onclick, title}, glyph(icon, true));

        if (mode != this.last_mode) {
            app.set_mode(mode);
            if (explore_mode) {
                app.explored = false;
                app.univariate_finished = false;
                app.setRightTabExplore('Univariate');
            } else if (results_mode) {
                app.setRightTab(IS_D3M_DOMAIN ? 'Task Type' : 'Models');
            } else if (!mode) {
                app.setRightTab(IS_D3M_DOMAIN ? 'Task Type' : 'Models');
            }
            app.restart && app.restart();
            this.last_mode = mode;
        }

        return m('main',
            this.modal(),
            this.header(mode),
            this.footer(mode),
            m(`#main.left.carousel.slide.svg-leftpanel.svg-rightpanel[style=overflow: hidden]`,
              m("#innercarousel.carousel-inner", {style: {height: `calc(100% + ${app.marginTopCarousel}px)`}},
                m('#m0.item.active', {style: {height: '100%', 'text-align': "center"}},
                  m('svg#whitespace'))),
              m("#spacetools.spaceTool", {style: {right: app.panelWidth['right'], 'z-index': 16}},
                  m(`button#btnLock.btn.btn-default`, {
                      class: app.locktoggle ? 'active' : '',
                      onclick: () => app.lockDescription(!app.locktoggle),
                      title: 'Lock selection of problem description'
                  }, glyph(app.locktoggle ? 'lock' : 'pencil', true)),
                spaceBtn('btnJoin', _ => {
                    let links = [];
                    console.log("doing connect all");
                    if (explore_mode) {
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
                            source: dv,
                        })));
                    }
                    app.restart([].concat(...links));
                }, 'Make all possible connections between nodes', 'link'),
                spaceBtn('btnDisconnect', _ => app.restart([]), 'Delete all connections between nodes', 'remove-circle'),
                spaceBtn('btnForce', app.forceSwitch, 'Pin the variable pebbles to the page', 'pushpin'),
                spaceBtn('btnEraser', app.erase, 'Wipe all variables from the modeling space', 'magnet')),
              m(Subpanel,
                {title: "Legend",
                 buttons: [
                     ['timeButton', 'ztime', 'Time'],
                     ['csButton', 'zcross', 'Cross Sec'],
                     ['dvButton', 'zdv', 'Dep Var'],
                     ['nomButton', 'znom', 'Nom Var'],
                     ['gr1Button', 'zgroup1', 'Group 1'],
                     ['gr2Button', 'zgroup2', 'Group 2']]}),
              m(Subpanel, {title: "History"}),
              //footer(),
              leftpanel(mode),
              rightpanel(mode)));
    }

    header(mode) {

        let userlinks = username === 'no logged in user' ? [
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
        let transformation = (id, list) => m(
            `ul#${id}`, {
                style: {display: 'none', 'background-color': app.varColor},
                onclick: function(evt) {
                    // if interact is selected, show variable list again
                    if ($(this).text() === 'interact(d,e)') {
                        $('#tInput').val(tvar.concat('*'));
                        selInteract = true;
                        $(this).parent().fadeOut(100);
                        $('#transSel').fadeIn(100);
                        evt.stopPropagation();
                        return;
                    }

                    let tvar = $('#tInput').val();
                    let tfunc = $(this).text().replace("d", "_transvar0");
                    let tcall = $(this).text().replace("d", tvar);
                    $('#tInput').val(tcall);
                    $(this).parent().fadeOut(100);
                    evt.stopPropagation();
                    transform(tvar, tfunc, typeTransform = false);
                }
            }, list.map(x => m('li', x)));

        return m(Header, {
            attrsInterface: {style: mode === 'explore' ? {'background-image': '-webkit-linear-gradient(top, #fff 0, rgb(227, 242, 254) 100%)'} : {}},
            contents: m('#dataField.field[style=text-align: center]', [
                m('h4#dataName[style=display: inline-block; margin-right:2em; margin-top: 7px]', {
                    onclick: _ => this.cite = this.citeHidden = !this.citeHidden,
                    onmouseout: _ => this.citeHidden || (this.cite = false),
                    onmouseover: _ => this.cite = true
                }, "Dataset Name"),
                m('#cite.panel.panel-default', {
                    style: `display: ${this.cite ? 'block' : 'none'}; position: absolute; right: 50%; width: 380px; text-align: left; z-index: 50`
                }, m(".panel-body")),
                m('span',
                  m('.dropdown[style=float: right; padding-right: 1em]',
                    m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                      [username, " ", glyph('triangle-bottom')]),
                    m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                      userlinks.map(link => m('a[style=padding: 0.5em]', {href: link.url}, link.title, m('br'))))),
                  navBtn('btnEstimate.btn-default', 2, 1, mode === 'explore' ? _ => {
                      if (app.links.length === 0) {
                          app.setModal('Please link pebbles first.', 'Warning', true, 'Ok', true);
                          return;
                      }

                      exp.explore();
                      app.setRightTabExplore('Bivariate');
                  } : app.estimate, m("span.ladda-label", mode === 'explore' ? 'Explore' : 'Solve This Problem'), '150px'),
                  m('div.btn-group[role=group][aria-label="..."]', {style:{"float":"right", "margin-left": "2em"}},
                    navBtnGroup('btnTA2.btn-default', _ => hopscotch.startTour(app.mytour, 0), ['Help Tour ', glyph('road')]),
                    navBtnGroup('btnTA2.btn-default', _ => app.helpmaterials('video'), ['Video ', glyph('expand')]),
                    navBtnGroup('btnTA2.btn-default', _ => app.helpmaterials('manual'), ['Manual ', glyph('book')])),
                  navBtn1("btnReset", app.reset, glyph('repeat'), 'Reset'),
                  navBtn1('btnEndSession', app.endsession, m("span.ladda-label", 'Mark Problem Finished'), 'Mark Problem Finished')),
                m('#tInput', {
                    style: {display: 'none'},
                    onclick: _ => {
                        if (byId('transSel').style.display !== 'none') { // if variable list is displayed when input is clicked...
                            $('#transSel').fadeOut(100);
                            return false;
                        }
                        if (byId('transList').style.display !== 'none') { // if function list is displayed when input is clicked...
                            $('#transList').fadeOut(100);
                            return false;
                        }

                        // highlight the text
                        $(this).select();
                        let pos = $('#tInput').offset();
                        pos.top += $('#tInput').width();
                        $('#transSel').fadeIn(100);
                        return false;
                    },
                    keyup: evt => {
                        let t = byId('transSel').style.display;
                        let t1 = byId('transList').style.display;
                        if (t !== 'none') {
                            $('#transSel').fadeOut(100);
                        } else if (t1 !== 'none') {
                            $('#transList').fadeOut(100);
                        }

                        if (evt.keyCode == 13) { // keyup on Enter
                            let t = transParse($('#tInput').val());
                            if (!t) {
                                return;
                            }

                            transform(t.slice(0, t.length - 1), t[t.length - 1], typeTransform = false);
                        }
                    }
                }),
                m('#transformations.transformTool', {
                    title: `Construct transformations of existing variables using valid R syntax.
                              For example, assuming a variable named d, you can enter "log(d)" or "d^2".`
                }, [
                    transformation('transSel', ['a', 'b']),
                    transformation('transList', app.transformList)
                ])
            ])
        });
    }

    footer(mode) {
        return m(Footer, {
            contents: [
                m(ButtonRadio, {
                        id: 'modeButtonBar',
                        attrsAll: {style: {width: '200px', margin: '0 .2em'}, class: 'navbar-left btn-sm'},
                        onclick: app.set_mode,
                        activeSection: mode === undefined ? 'model' : mode,
                        sections: [{value: 'Model'}, {value: 'Explore'}] // {value: 'Results', id: 'btnResultsMode'}] VJD: commenting out the results mode button since we don't have this yet
                    }),
                m("a#logID[href=somelink][target=_blank]", "Replication"),
                m("span[style=color:#337ab7]", " | "),
                // dev links...
                m("a[href='/dev-raven-links'][target=_blank]", "raven-links"),
                //m("a[style=margin-right: 0.5em]",
                //  {onclick: app.record_user_metadata},
                //  "record-metadata"),
                m("span[style=color:#337ab7]", " | "),
                m("span[style=color:#337ab7]", "TA2: " + TA2_SERVER),
                m("span[style=color:#337ab7]", " | "),
                m("span[style=color:#337ab7]", "TA3TA2 api: " + TA3TA2_API_VERSION)
            ]
        });
    }

    modal() {
        return m(".modal.fade[id='myModal'][role='dialog']", [
            m(".modal-dialog",
              m(".modal-content", [
                  m(".modal-header",
                    //  m("button.close[data-dismiss='modal'][type='button']",
                    //  m.trust("&times;")),
                    m("h4.modal-title", app.modalHeader)),
                  m(".modal-body",
                    m("p", app.modalText)),
                  m(".modal-footer",
                    // m("button.btn.btn-default[data-dismiss='modal'][type='button']",{
                    // onclick: () => app.reset}, app.modalButton))
                    m("button.btn.btn-default[type='button']", {
                        style: {display: app.modalBtnDisplay, float:'right'},
                        onclick: _ => {
                            if (app.modalClose) {
                                app.modalClose = false;
                                $('#myModal').modal('hide');
                                return;
                            } else {
                                eval(app.modalFunc);
                            }
                            location.reload();
                        }
                    }, app.modalButton))
              ]))
        ]);
    }
}

m.route(document.body, '/model', {
    '/model': {render: () => m(Body)},
    '/explore': {render: () => m(Body, {mode: 'explore'})},
    '/results': {
        onmatch() {
            app.set_mode('results');
            state.get_pipelines();
            layout.init();
        },
        render() {
            return m(Body, {mode: 'results'});
        }
    }
});
