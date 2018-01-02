import '../css/app.css';
import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';
import '../../node_modules/hopscotch/dist/css/hopscotch.css';

import m from 'mithril';

import * as app from './app';
import * as plots from './plots';
import Panel from './views/Panel';
import Button, {when} from './views/PanelButton';
import List from './views/PanelList';
import Search from './views/Search';
import Subpanel from './views/Subpanel';


// EVENTDATA
import Body_EventData from '../EventData/app/Body_EventData'
import '../EventData/css/app.css'
import '../EventData/app/app'

// Used to fix hopscotch css bug
import '../EventData/pkgs/hopscotch/hopscotch.style.css'

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
    return mode ?
        m(Panel,
          {side: 'right',
           title: 'Result Exploration',
           buttons: [
               m(Button, {id: 'btnUnivariate'}, 'Univariate'),
               m(Button, {id: 'btnBivariate'}, 'Bivariate')]},
          m(`#univariate[style=display: ${when('right', 'btnUnivariate')}]`),
          m(`#bivariate[style=display: ${when('right', 'btnBivariate')}]`)) :
    // mode == null (model mode)
    m(Panel,
      {side: 'right',
       title: 'Model Selection',
       buttons: [
           m(Button, {id: 'btnModels', style: 'width: 100%'}, 'Models'),
           m(Button, {id: 'btnSetx', style: 'width: 100%'}, 'Set Covar.'),
           m(Button, {id: 'btnResults', style: 'width: 100%'}, 'Results'),
           m(Button, {id: 'btnType', style: 'width: 100%'}, 'Task Type'),
           m(Button, {id: 'btnSubtype', style: 'width: 100%'}, 'Subtype'),
           m(Button, {id: 'btnMetrics', style: 'width: 100%'}, 'Metrics'),
           m(Button, {id: 'btnOutputs', style: 'width: 100%'}, 'Output')]},
      m(`#results[style=display: ${when('right', 'btnResults')}; margin-top: .5em]`,
        m("#resultsView.container[style=float: right; overflow: auto; width: 80%; background-color: white; white-space: nowrap]"),
        m('#modelView[style=display: none; float: left; width: 20%; background-color: white]'),
        m("p#resultsHolder[style=padding: .5em 1em]")),
      m(`#setx[style=display: ${when('right', 'btnSetx')}]`,
        m('#setxLeftAll[style=display:block; float: left; width: 30%; height:100%; background-color: white]',
          m('#setxLeft[style=display:block; float: left; width: 100%; height:95%; overflow:auto; background-color: white]')),
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
      righttab('metrics', 'btnMetrics', app.d3mMetrics, 'Metric', 'metric', ),
      righttab('outputs', 'btnOutputs', app.d3mOutputType, 'Output', 'outputType'));
}

let ticker = mode => {
    let link = name => m(`a${name === mode ? '.active' : ''}[href=/${name}][style=margin-right: 0.5em]`, {oncreate: m.route.link}, name[0].toUpperCase() + name.slice(1));
    return m('#ticker[style=background: #F9F9F9; bottom: 0; height: 40px; position: fixed; width: 100%; border-top: 1px solid #ADADAD]',
        link('model'),
        link('explore'),
        m("a#logID[href=somelink][target=_blank][style=margin-right: 0.5em]", "Replication"),
        // dev links...
        m("a[href='/dev-raven-links'][target=_blank][style=margin-right: 0.5em]", "raven-links"),
        m("a[style=margin-right: 0.5em]",
          {onclick: app.record_user_metadata},
          "record-metadata"),
        //app.record_user_metadata()
        /*
        m("a[href='/Home']", {oncreate: m.route.link}, "Go to home page")
        */
      );
};

class Body {
    oninit() {
        this.about = false;
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
            if (replace) val = val
                .replace(/%25/g, '%')
                .replace(/%3A/g, ':')
                .replace(/%2F/g, '/');
            return val;
        };
        // let apikey = extract('apikey', 'key', 4);
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
            id + `.btn-default[title=${title}]`, 2, 0, onclick, args);
        let glyph = (icon, unstyled) => m(
            'span.glyphicon.glyphicon-' + icon +
                (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));
        let spaceBtn = (id, onclick, title, icon) => m(
            `button#${id}.btn.btn-default`,
            {onclick: onclick, title: title},
            glyph(icon, true));

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
                    navBtn('btnEstimate.btn-success', 2, 1, app.estimate, m("span.ladda-label", mode ? 'Explore' : 'Solve This Problem'), '150px'),
                    navBtn('btnTA2.btn-default', .5, 1, _ => app.helpmaterials('manual'), ['Help Manual ', glyph('book')]),
                    navBtn('btnTA2.btn-default', 2, .5, _ => app.helpmaterials('video'), ['Help Video ', glyph('expand')]),
                    navBtn1("btnReset", app.reset, glyph('repeat'), 'Reset'),
                    navBtn1('btnEndSession', app.endsession, m("span.ladda-label", 'Mark Problem Finished'), 'Mark Problem Finished'),
                    m('#transformations.transformTool',
                      {title: 'Construct transformations of existing variables using valid R syntax. For example, assuming a variable named d, you can enter "log(d)" or "d^2".'})))),
              m(`#about.panel.panel-default[style=display: ${this.about ? 'block' : 'none'}; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                m('.panel-body',
                  'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'))),
            m(`#main.left.carousel.slide.svg-leftpanel.svg-rightpanel[style=overflow: hidden]`,
              m("#innercarousel.carousel-inner",
                m('#m0.item.active',
                  m('svg#whitespace'))),
              m("#spacetools.spaceTool[style=z-index: 16]",
                spaceBtn('btnLock.active', app.lockDescription, 'Lock selection of problem description', 'pencil'),
                explore && spaceBtn('btnDisconnect', _ => console.log('disconnect'), 'Delete all connections between nodes', 'remove-circle'),
                explore && spaceBtn('btnJoin', _ => console.log('join'), 'Make all possible connections between nodes', 'link'),
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

if (IS_EVENTDATA_DOMAIN) {
    m.route(document.body, '/subset', {
        '/subset': {render: () => m(Body_EventData, {mode: 'subset'})},
        '/aggregate': {render: () => m(Body_EventData, {mode: 'aggregate'})}
    });
}
else {
    m.route(document.body, '/model', {
        '/model': {render: () => m(Body)},
        '/explore': {render: () => m(Body, {mode: 'explore'})}
    });
}
