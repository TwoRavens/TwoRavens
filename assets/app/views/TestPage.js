import m from 'mithril';

import * as app from "../app";

import Header from "../../common/views/Header";
import Canvas from "../../common/views/Canvas";
import Footer from "../../common/views/Footer";
import Button from "../../common/views/Button";

import ForceDiagram from "./ForceDiagram";


export default class TestPage {
    oninit() {
        m.request(`rook-custom/rook-files/185_bl_problem_TRAIN/preprocess/preprocess.json`)
            .then(response => testProblem.summaries = response.variables)
    }

    view() {
        return m('div',
            m(Header, {image: '/static/images/TwoRavens.png', aboutText: 'TwoRavens Test Page'}),
            m(Canvas,
                m(ForceDiagram, Object.assign({
                    isPinned: app.forceToggle,
                    radius: app.defaultPebbleRadius,
                    nodes: app.nodesReadOnly,
                    builder: app.buildForceDiagram(testProblem),
                }, app.forceDiagramStatic, app.buildForceData(testProblem)))
            ),
            m(Footer,
                m(Button, {style: {margin: '8px'}, class: ['btn-sm']}, 'Test')
            )
        )
    }
}

let testProblem = {
    problemID: 'Problem 0',
    system: 'auto',
    version: '1.0',
    predictors: ['At_bats', 'Batting_average'],
    targets: ['Doubles'],
    description: undefined,
    metric: undefined,
    task: 'regression',
    subTask: undefined,
    model: 'modelUndefined',
    meaningful: false,
    manipulations: [],
    solutions: {
        d3m: {},
        rook: {}
    },
    tags: {
        transformed: [],
        weights: [], // singleton list
        crossSection: [],
        time: [],
        nominal: [],
        loose: [] // variables displayed in the force diagram, but not in any groups
    },
    summaries: {}
};
