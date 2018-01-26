import '../css/app.css';
import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';

import m from 'mithril';

import * as app from './app';
import * as exp from './explore';
import * as plots from './plots';
import Panel from './views/Panel';
import Button, {when} from './views/PanelButton';
import List from './views/PanelList';
import Search from './views/Search';
import Subpanel from './views/Subpanel';

function setBackgroundColor(color) {
    return function() {
        this.style['background-color'] = color;
    };
}

function leftpanel() {
    return m(
        Panel,
        {side: 'left',
         title: 'Data Selection',
         buttons: [
             m(Button,
               {id: 'btnVariables',
                id2: 'tab1',
                title: 'Click variable name to add or remove the variable pebble from the modeling space.'},
               'Variables'),
             m(Button, {id: 'btnSubset', id2: 'tab2'}, 'Subset'),
             m(Button,
               {id: 'btnSelect',
                classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
                onclick: _ => app.subsetSelect('btnSelect'),
                style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
                title: 'Subset data by the intersection of all selected values.'},
               m('span.ladda-label[style=pointer-events: none]', 'Select'))]},
        m(`#tab1[style=display: ${when('left', 'tab1')}; padding: 0 8px; text-align: center]`,
          m(Search, {placeholder: 'Search variables and labels'}),
          m(List, {items: app.valueKey, title: 'Summary Statistics'})),
        m(`#tab2[style=display: ${when('left', 'tab2')}; margin-top: .5em]`),
        m('#tab3[style=height: 350px]',
          m(`p[style=padding: .5em 1em; display: ${when('left', 'tab3')}]`,
            {title: "Select a variable from within the visualization in the center panel to view its summary statistics."},
            m('center',
              m('b', app.summary.name),
              m('br'),
              m('i', app.summary.labl)),
            m('table', app.summary.data.map(
                tr => m('tr', tr.map(
                    td => m('td', {onmouseover: setBackgroundColor('aliceblue'), onmouseout: setBackgroundColor('f9f9f9')},
                            td))))))));
}

let righttab = (id, btnId, task, title, probDesc) => m(
    `#${id}[style=display: ${when('right', btnId)}; padding: 6px 12px; text-align: center]`,
    m(List,
      {items: Object.keys(task || {}),
       title: title + ' Description',
       content: v => task[v][1],
       probDesc: probDesc}));

function rightpanel(mode) {
    let thumb = (idx, id, title) =>
        m("th",
          m("figure", {style: {float: "left"}},
            m(`img#${id}_img[alt=${id}][src=/static/images/thumb${idx}.png]`,
              {style: {width: "75%", height: "75%", border: "1px solid #ddd", "border-radius": "3px", padding: "5px", margin: "3%", cursor: "pointer"}}),
            m("figcaption", {style: {"text-align": "center"}}, title)));
    let unique_link_names = () => {
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
    };
    return mode ?
        m(Panel,
          {side: 'right',
           title: 'Result Exploration',
           is_explore_mode: true,
           buttons: [
               m(Button, {id: 'btnUnivariate'}, 'Univariate'),
               m(Button, {id: 'btnBivariate'}, 'Bivariate')]},
          m('#modelView_Container', {style: 'width: 100%; height: auto; background-color: white; float: left; overflow-x: auto; overflow-y: hidden; white-space: nowrap;'},
            m('#modelView', {style: 'width: 100%; height: 100%; background-color: white; float: left; overflow: auto; margin-top: 2px;'})),
          m('#decisionTree[style=width: 100%; height: 100%; background: #ff5932]'),
          m('#result_left',
            {style: {"width": "50%", "height": "90%", "float": "left", "background-color": "white", "border-right": "ridge", "border-bottom": "ridge", "overflow": "auto", "white-space": "nowrap"}},
            m('#left_thumbnail',
              {style: {"width": "100%", "height": "20%", "background-color": "white", "margin-top": "3%", "margin-right": "3%", "border-bottom": "ridge", "overflow": "auto", "white-space": "nowrap"}},
              m("table",
                m("tbody",
                  m("tr", thumb(1, 'scatterplot', "Scatter Plot"), thumb(2, 'heatmap', "Heatpmap"), thumb(3, 'linechart', "Linechart"))))),
            m('#result_left1', {style: {width: "100%", height: "320px", "text-align": "center", "margin-top": "3%", "background-color": "white", "white-space": "nowrap"}},
              m(".container3[id=scatterplot]", {style: {"width": "500px", "height": "80%", "background-color": "white", "float": "left", "overflow": "hidden", "margin": "5% 5% 0 5%"}}),
              m(".container4[id=heatchart]", {style: {"width": "500px", "height": "80%", "float": "left", "overflow": "hidden", "background-color": "#FFEBEE", "margin": "5%  "}}),
              m(".container4[id=linechart]", {style: {"width": "500px", "height": "80%", "background-color": "white", "float": "left", "overflow": "hidden", "margin": "5% "}})),
            m("div", {style: {"border-bottom": "ridge", "display": "inline-block", "width": "100%", "margin-bottom": "2%", "text-align": "center"}},
              m("h5#NAcount", {style: {" margin-bottom": "0"}})),
            m(".container2[id='resultsView_statistics']",
              {style: {"width": "100%", "height": "15%", "background-color": "white", "float": "left", "white-space": "nowrap", "margin-bottom": "3%", "border-bottom": "ridge"}})),
          m('#result_right',
            {style: {width: "50%", height: "90%", float: "right", "background-color": "white", "border-right": "groove", "white-space": "nowrap"}},
            m('#resultsView_tabular.container1',
              {style: {width: "100%", height: "100%", "background-color": "white", float: "left", overflow: "auto", "white-space": "nowrap", "border-right": "groove", "border-bottom": "groove"}},
              m('#SelectionData', {style: {width: "100%", height: "50%", overflow: "auto", "margin-top": "10px", "border-bottom-style": "inset"}},
                m("fieldset", {style: {margin: "3%"}},
                  m("h4", {style: {"text-align": "center"}}, "Data Distribution Selection"),
                  m("p", {style: {"font-family": "Arial, Helvetica, sans-serif", "font-size": "12px"}},
                    "Enter number for each variable to specify the break points"),
                  m('p#boldstuff', {style: {color: "#2a6496", "font-family": "Arial, Helvetica, sans-serif", "font-size": "12px"}},
                    "Select between Equidistant and Equimass")),
                m('#forPlotA', {style: {display: 'block', "margin": "2%"}},
                  m("input#input1[name='fname'][type='text']", {style: {"margin-left": "2%"}}),
                  m('span#tooltipPlotA.tooltiptext[style=visibility: hidden]'),
                  m("button.btn.btn-default.btn-xs#Equidistance1[type='button']", {style: {float: "left", "margin-left": "2%"}},
                    "EQUIDISTANCE"),
                  m("button.btn.btn-default.btn-xs#Equimass1[type='button']", {style: {float: "left", "margin-left": "2%"}},
                    "EQUIMASS")),
                m('#forPlotB', {style: {display: "block", margin: "2%"}},
                  m("input#input2[name='fname1'][type='text']", {style: {"margin-left": "2%"}}),
                  m('span#tooltipPlotB.tooltiptext1[style=visibility: hidden]'),
                  m("button.btn.btn-default.btn-xs#Equidistance2[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIDISTANCE"),
                  m("button.btn.btn-default.btn-xs#Equimass2[type='button']", {style: {float: "left", "margin-left": "2%"}}, "EQUIMASS")),
                m("#plotA_status[style=margin-top: 1%; margin-left: 2%]"),
                m("#plotB_status[style=margin-top: 1%; margin-left: 2%]"),
                m('h5[style=color: #ac2925; margin-top: 1%; margin-left: 2%]', 'Selection History'),
                m('#breakspace[style=display: inline-block; overflow: auto; width: 100%]'),
                m("button.btn.btn-default.btn-sm[id='SelectionData1'][type='button']", {style: {display: "block", margin: "0 auto", position: "relative"}},
                  "Create")),
              m('#tabular_1', {style: {width: "100%", height: "200px", "border-bottom-style": "inset"}},
                m('#plotA', {style: {width: exp.get_width('plotA') + '%', height: "100%", float: "left", overflow: "hidden"}}, "plotA"),
                m('#plotB', {style: {width: exp.get_width('plotB') + '%', height: "100%", float: "right", overflow: "hidden"}}, "plotB")),
              m('#tabular_2', {style: {width: "100%", height: "50%", "border-bottom-style": "inset", overflow: "hidden"}}))),
          m("p#resultsHolder", {style: {padding: ".5em 1em"}},
            m('#varList[style=display: block]',
              unique_link_names().map(x => m(`p#${x.replace(/\W/g, '_')}`, {style: {'background-color': app.varColor}}, x)))),
          m('#setx[style=display: none; margin-top: .5em]')) :
    // mode == null (model mode)
    m(Panel,
      {side: 'right',
       title: 'Model Selection',
       buttons: (!app.IS_D3M_DOMAIN ? [] : [
           m(Button, {id: 'btnModels'}, 'Models'),
           m(Button, {id: 'btnSetx'}, 'Set Covar.'),
           m(Button, {id: 'btnResults'}, 'Results'),
       ]).concat([
           m(Button, {id: 'btnType', is_explore_mode: exp.explore}, 'Task Type'),
           m(Button, {id: 'btnSubtype', is_explore_mode: exp.explore}, 'Subtype'),
           m(Button, {id: 'btnMetrics', is_explore_mode: exp.explore}, 'Metrics'),
           m(Button, {id: 'btnSetx', is_explore_mode: exp.explore}, 'Set Covar.'),
           m(Button, {id: 'btnResults', is_explore_mode: exp.explore}, 'Results')])},
      m(`#results[style=display: ${when('right', 'btnResults')}; margin-top: .5em]`,
        m("#resultsView.container[style=float: right; overflow: auto; width: 80%; background-color: white; white-space: nowrap]"),
        m('#modelView[style=display: none; float: left; width: 20%; background-color: white]'),
        m("p#resultsHolder[style=padding: .5em 1em]")),
      m(`#setx[style=display: ${when('right', 'btnSetx')}]`,
        m('#setxLeftAll[style=display:block; float: left; width: 30%; height:100%; background-color: white]',
          m('#setxLeft[style=display:block; float: left; width: 100%; height:95%; overflow: auto; background-color: white]')),
        m('#setxRightAll[style=display:block; float: left; width: 70%; height:100%; background-color: white]',
          m('#setxRightTop[style=display:block; float: left; width: 100%; height:65%; overflow:auto; background-color: white]',
            m('#setxMiddle[style=display:block; float: left; width: 70%; height:100%; background-color: white]'),
            m('#setxRight[style=display:block; float: right; width: 30%; height:100%; background-color: white]'))),
        m('#setxRightBottom[style=display:block; float: left; width: 100%; height:35%; overflow:auto; background-color: white]',
          m('#setxRightBottomLeft[style=display:block; float: left; width: 75%; height:100%; background-color: white]'),
          m('#setxRightBottomMiddle[style=display:block; float: left; width: 15%; height:100%; background-color: white]',
            m(Button,
              {id: 'btnExecutePipe',
               classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
               onclick: _ => app.executepipeline('btnExecutePipe'),
               style: `display:inline; float: left; margin-right: 10px`,
               title: 'Execute pipeline.'},
              m('span.ladda-label[style=pointer-events: none]', 'Execute'))),
          m('#setxRightBottomRight[style=display:block; float: left; width: 10%; height:100%; background-color: white]'))),
      righttab('models', 'btnModels'),
      righttab('types', 'btnType', app.d3mTaskType, 'Task', 'taskType'),
      righttab('subtypes', 'btnSubtype', app.d3mTaskSubtype, 'Task Subtype', 'taskSubtype'),
      righttab('metrics', 'btnMetrics', app.d3mMetrics, 'Metric', 'metric'));
}

let ticker = mode => {
    let link = name => m(`a${name === mode ? '.active' : ''}[href=/${name}][style=margin-right: 0.5em]`, {oncreate: m.route.link}, name[0].toUpperCase() + name.slice(1));
    return m('#ticker[style=background: #F9F9F9; bottom: 0; height: 40px; position: fixed; width: 100%; border-top: 1px solid #ADADAD]',
        link('model'),
        link('explore'),
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
         m("span[style=color:#337ab7]", "TA3TA2 api: " + TA3TA2_API_VERSION));
};

class Body {
    oninit(vnode) {
        if (vnode.attrs.mode) {
            m.route.set('/model');
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
            if (replace) val = val
                .replace(/%25/g, '%')
                .replace(/%3A/g, ':')
                .replace(/%2F/g, '/');
            return val;
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
        let explore = mode === 'explore';
        app.is_results_mode = mode === 'results';
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
        let navBtn1 = (id, onclick, args, title) => _navBtn(
            `${id}.btn-default[title=${title}]`, 2, 0, onclick, args);
        let glyph = (icon, unstyled) => m(
            `span.glyphicon.glyphicon-${icon}` + (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));
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
            },
            list.map(x => m('li', x)));
        let spaceBtn = (id, onclick, title, icon) => m(
            `button#${id}.btn.btn-default`, {onclick, title}, glyph(icon, true));

        if (mode != this.last_mode) {
            if (explore) {
                app.set_explore_mode(explore);
                app.set_righttab('btnUnivariate');
            } else if (!mode) {
                app.set_righttab(IS_D3M_DOMAIN ? 'btnType' : 'btnModels');
            }
            app.restart && app.restart();
            this.last_mode = mode;
        }

        return m(
            'main',
            m("nav#navbar.navbar.navbar-default.navbar-fixed-top[role=navigation]",
              {style: mode === 'explore' && 'background-image: -webkit-linear-gradient(top, #fff 0, rgb(227, 242, 254) 100%)'},
              m("a.navbar-brand",
                m("img[src=/static/images/TwoRavens.png][alt=TwoRavens][width=100][style=margin-left: 1em; margin-top: -0.5em]",
                  {onmouseover: _ => this.about = true, onmouseout: _ => this.about = false})),
              m('#navbarNav[style=padding: 0.5em]',
                m('#dataField.field[style=margin-top: 0.5em; text-align: center]',
                  m('h4#dataName[style=display: inline]',
                    {onclick: _ => this.cite = this.citeHidden = !this.citeHidden,
                     onmouseout: _ => this.citeHidden || (this.cite = false),
                     onmouseover: _ => this.cite = true},
                    "Dataset Name"),
                  m('#cite.panel.panel-default',
                    {style: `display: ${this.cite ? 'block' : 'none'}; position: absolute; right: 50%; width: 380px; text-align: left; z-index: 50`},
                    m(".panel-body")),
                  m('span',
                    m('.dropdown[style=float: right; padding-right: 1em]',
                      m('#drop.button.btn[type=button][data-toggle=dropdown][aria-haspopup=true][aria-expanded=false]',
                        [username, glyph('heart-empty')]),
                      m('ul.dropdown-menu[role=menu][aria-labelledby=drop]',
                        m('li[style=padding: 0.5em]', 'something here 1'),
                        m('li[style=padding: 0.5em]', 'something here 2'))),
                    /*m('h5#userName[style=float: right; padding-right: 0.5em]',
                      {onmouseover: _ => this.usertasks = true, onmouseout: _ => this.usertasks = false},
                      [username, glyph('heart-empty')],  // const username defined in templates/index.html
                      m(`#usertasks.panel.panel-default[style=display: ${this.usertasks ? 'block' : 'none'}; position: absolute; z-index: 50]`,
                        m('.panel-body[style=text-align: left; padding: 1em]','logout'))),*/
                    navBtn('btnEstimate.btn-success', 2, 1, explore ? exp.explore : app.estimate, m("span.ladda-label", explore ? 'Explore' : 'Solve This Problem'), '150px'),
                    navBtn('btnTA2.btn-default', .5, 1, _ => app.helpmaterials('manual'), ['Help Manual ', glyph('book')]),
                    navBtn('btnTA2.btn-default', 2, .5, _ => app.helpmaterials('video'), ['Help Video ', glyph('expand')]),
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
                              For example, assuming a variable named d, you can enter "log(d)" or "d^2".`},
                    transformation('transSel', ['a', 'b']),
                    transformation('transList', app.transformList)))),
              m(`#about.panel.panel-default[style=display: ${this.about ? 'block' : 'none'}; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                m('.panel-body',
                  'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'))),
            m(`#main.left.carousel.slide.svg-leftpanel.svg-rightpanel[style=overflow: hidden]`,
              m("#innercarousel.carousel-inner",
                m('#m0.item.active',
                  m('svg#whitespace'))),
              m("#spacetools.spaceTool[style=z-index: 16]",
                spaceBtn('btnLock.active', app.lockDescription, 'Lock selection of problem description', 'pencil'),
                spaceBtn('btnJoin', _ => {
                    let links = [];
                    if (explore) {
                        for (let node of app.nodes) {
                            for (let node1 of app.nodes) {
                                if (node !== node1 && links.filter(l => l.target === node1 && l.source === node).length === 0) {
                                    links.push({left: false, right: false, target: node, source: node1});
                                }
                            }
                        }
                    } else {
                        let dvs = app.nodes.filter(n => app.zparams.zdv.includes(n.name));
                        let ivs = app.nodes.filter(n => !dvs.includes(n));
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
              ticker(mode),
              leftpanel(),
              rightpanel(mode)));
    }
}

m.route(document.body, '/model', {
    '/model': {render: () => m(Body)},
    '/explore': {render: () => m(Body, {mode: 'explore'})},
    '/results': {render: () => m(Body, {mode: 'results'})},
});
