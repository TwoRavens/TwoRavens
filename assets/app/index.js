import '../pkgs/bootstrap/css/bootstrap-theme.min.css';
import '../css/app.css';
import '../pkgs/Ladda/dist/ladda-themeless.min.css';

import m from 'mithril';

import * as app from './app';
import * as plots from './plots';
import Panel from './views/Panel';
import Button, {or} from './views/PanelButton';
import Search, {searchIndex} from './views/Search';
import Subpanel from './views/Subpanel';

let leftpanel = () => {
    return m(Panel, {
        side: 'left',
        title: 'Data Selection'},        
        m(".btn-toolbar[role=toolbar][style=margin-left: .5em; margin-top: .5em]",
          m(".btn-group",
            m(Button, {
              id: 'btnVariables', 
              id2: 'tab1',
              title: 'Click variable name to add or remove the variable pebble from the modeling space.'}, 
              'Variables'),                
            m(Button, {id: 'btnSubset', id2: 'tab2'}, 'Subset')),
          m(Button, {
            id: 'btnSelect',
            classes: 'btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in]',
            onclick: _ => app.subsetSelect('btnSelect'),
            style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
            title: 'Subset data by the intersection of all selected values.'},
            m('span.ladda-label[style=pointer-events: none]', 'Select'))),         
        m(`#tab1[style=display: ${or('left', 'tab1')}; padding: 10px 8px; text-align: center]`,
          m(Search, {placeholder: 'Search variables and labels'}),
          m('#varList[style=display: block]', app.valueKey.map((v, i) =>
            m(`p#${v.replace(/\W/g, '_')}`, {
              style: {
                'background-color': app.zparams.zdv.includes(v) ? app.hexToRgba(app.dvColor) :
                   app.zparams.znom.includes(v) ? app.hexToRgba(app.nomColor) :
                   app.nodes.map(n => n.name).includes(v) ? app.hexToRgba(plots.selVarColor) :
                   app.varColor,
                'border-color': '#000000',
                'border-style': searchIndex && i < searchIndex ? 'solid' : 'none',
              },
              onclick: app.clickVar,
              onmouseover: function() {
                $(this).popover('show');
                $("body div.popover")
                   .addClass("variables");
                $("body div.popover div.popover-content")
                   .addClass("form-horizontal");
              },
              onmouseout: "$(this).popover('hide');",
              'data-container': 'body',
              'data-content': app.popoverContent(app.findNodeIndex(v, true)),
              'data-html': 'true',
              'data-original-title': 'Summary Statistics',
              'data-placement': 'right',
              'data-toggle': 'popover',
              'data-trigger': 'hover'},
              v)))),
        m(`#tab2[style=display: ${or('left', 'tab2')}; margin-top: .5em]`),
        m('#tab3[style=height: 350px]',
          m(`p[style=padding: .5em 1em; display: ${or('left', 'tab3')}]`, {
            title: "Select a variable from within the visualization in the center panel to view its summary statistics."},
            m('center',
              m('b', app.summary.name),
              m('br'),
              m('i', app.summary.labl)),
            m('table', app.summary.data.map(
              tr => m('tr', tr.map(
                td => m('td', {
                  onmouseover: function() {this.style['background-color'] = 'aliceblue'},
                  onmouseout: function() {this.style['background-color'] = '#f9f9f9'}},
                  td))))))));
};

let rightpanel = mode => mode ? m(Panel, {
    side: 'right', 
    title: 'Result Exploration'},
    m(".btn-group.btn-group-justified[style=margin-top: .5em]",
      m(Button, {id: 'btnUnivariate'}, 'Univariate'),
      m(Button, {id: 'btnBivariate'}, 'Bivariate')),
    m(`#univariate[style=display: ${or('right', 'btnUnivariate')}]`),
    m(`#bivariate[style=display: ${or('right', 'btnBivariate')}]`)) :
    m(Panel, {
      side: 'right', 
      title: 'Model Selection'},
      m(".btn-group.btn-group-justified#modelGroup[style=margin-top: .5em]",
        m(Button, {id: 'btnModels', style: 'width: 33%'}, 'Models'),
        m(Button, {id: 'btnSetx', style: 'width: 34%'}, 'Set Covar.'),
        m(Button, {id: 'btnResults', style: 'width: 33%'}, 'Results'),
        m(Button, {id: 'btnType', style: 'width: 25%; display: none'}, 'Task Type'),
        m(Button, {id: 'btnSubtype', style: 'width: 25%; display: none'}, 'Subtype'),
        m(Button, {id: 'btnMetrics', style: 'width: 25%; display: none'}, 'Metrics'),
        m(Button, {id: 'btnOutputs', style: 'width: 25%; display: none'}, 'Outputs')),
      m(`#results[style=display: ${or('right', 'btnResults')}; margin-top: .5em]`,
        m("#resultsView.container[style=float: right; overflow: auto; width: 80%; background-color: white; white-space: nowrap]"),
        m('#modelView[style=display: none; float: left; width: 20%; background-color: white]'),
        m("p#resultsHolder[style=padding: .5em 1em]")),
      m(`#setx[style=display: ${or('right', 'btnSetx')}]`),
      m(`#models[style=display: ${or('right', 'btnModels')}; padding: 6px 12px; text-align: center]`),
      m(`#types[style=display: ${or('right', 'btnType')}; padding: 6px 12px; text-align: center]`),
      m(`#subtypes[style=display: ${or('right', 'btnSubtype')}; padding: 6px 12px; text-align: center]`),
      m(`#metrics[style=display: ${or('right', 'btnMetrics')}; padding: 6px 12px; text-align: center]`),
      m(`#outputs[style=display: ${or('right', 'btnOutputs')}; padding: 6px 12px; text-align: center]`));

let ticker = mode => {
    let link = name => m(`a${name === mode ? '.active' : ''}[href=/${name}][style=margin-right: 0.5em]`, {oncreate: m.route.link}, name[0].toUpperCase() + name.slice(1));
    return m('#ticker[style=background: #F9F9F9; bottom: 0; height: 40px; position: fixed; width: 100%; border-top: 1px solid #ADADAD]',
        link('model'),
        link('explore'),
        m("a#logID[href=somelink][target=_blank][style=margin-right: 0.5em]", "Replication"));
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
        return m('main',
            m("nav#navbar.navbar.navbar-default.navbar-fixed-top[role=navigation]",
              m("a.navbar-brand[style=margin-left: 0]",
                m("img[src=/static/images/TwoRavens.png][alt=TwoRavens][width=100][style=margin-left: 2em; margin-top: -0.5em]", {
                  onmouseover: _ => this.about = true,
                  onmouseout: _ => this.about = false})),
              m('#navbarNav[style=padding: 0.5em]',
                m('#dataField.field[style=margin-top: 0.5em; text-align: center]',
                  m('h4#dataName[style=display: inline]', {
                    onclick: _ => this.cite = this.citeHidden = !this.citeHidden,
                    onmouseout: _ => this.citeHidden || (this.cite = false),
                    onmouseover: _ => this.cite = true},
                    "Dataset Name"),
                  m(`#cite.panel.panel-default[style=display: ${this.cite ? 'block' : 'none'}; position: absolute; right: 50%; width: 380px; text-align: left; z-index: 50]`,
                    m(".panel-body")),
                  m("button#btnEstimate.btn.btn-default.ladda-button.navbar-right[data-spinner-color=#000000][data-style=zoom-in][style=margin-left: 2em; margin-right: 1em]", {
                    onclick: _ => app.estimate('btnEstimate')},
                    m("span.ladda-label", mode ? 'Explore' : 'Estimate')),
                  m("button#btnTA2.btn.btn-default.ladda-button.navbar-right[data-spinner-color=#000000][data-style=zoom-in][style=margin-left: 15em; margin-right: 1em]", {
                      onclick: _ => app.ta2stuff('btnTA2')}, 
                      'TA2'),
                  m("button#btnReset.btn.btn-default.navbar-right[title=Reset][style=margin-left: 2.0em]", {
                    onclick: app.reset},
                    m("span.glyphicon.glyphicon-repeat[style=color: #818181; font-size: 1em; pointer-events: none]")),
                  m('#transformations.transformTool', {
                    title: 'Construct transformations of existing variables using valid R syntax. For example, assuming a variable named d, you can enter "log(d)" or "d^2".'}))),
              m(`#about.panel.panel-default[style=display: ${this.about ? 'block' : 'none'}; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                m('.panel-body',
                  'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'))),
            m(`#main.left.carousel.slide.svg-leftpanel.svg-rightpanel[style=overflow: auto]`,
              m("#innercarousel.carousel-inner",
                m('#m0.item.active',
                  m('svg#whitespace'))),
              m("#spacetools.spaceTool[style=z-index: 16]",
                m("button#btnLock.btn.active[title=Lock selections of problem description.]", {
                  onclick: app.lockDescription},
                  m("span.glyphicon.glyphicon-pencil")),
                m("button#btnForce.btn.btn-default[title=Pin the variable pebbles to the page.]", {
                  onclick: app.forceSwitch},
                  m("span.glyphicon.glyphicon-pushpin")),
                m("button#btnEraser.btn.btn-default[title=Wipe all variables from the modeling space.]", {
                  onclick: app.erase},
                  m("span.glyphicon.glyphicon-magnet"))),
              m(Subpanel, {
                title: "Legend",
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
    '/explore': {render: () => m(Body, {mode: 'explore'})}
});
