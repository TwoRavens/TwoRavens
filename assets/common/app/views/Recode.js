import m from 'mithril'

import Header from './Header';
import Table from './Table';
import Canvas from './Canvas';
import * as common from "../common";

export default class Recode {
    oncreate() {
        window.addEventListener('storage', (e) => onStorageEvent(this, e));
        document.getElementById('canvas').addEventListener('scroll', onScrollEvent);
    }

    oninit() {
        this.header = localStorage.getItem('peekHeader') || '';
        this.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders')) || [];
        this.tableData = JSON.parse(localStorage.getItem('peekTableData')) || [];

        if (this.tableData.length === 0) {
            localStorage.removeItem('peekMore');
            localStorage.setItem('peekMore', 'true');
        }
    }
    view() {
        return [
            m(Header, [
                m('div', {style: {'flex-grow': 1}}),
                m("h4", m("span#headerLabel.label.label-default", this.header)),
                m('div', {style: {'flex-grow': 1}}),
            ]),
            m(Canvas, {
                    attrsAll: {style: {'margin-top': common.heightHeader + 'px', height: `calc(100% - ${common.heightHeader}px)`}}
                }, m(Table, {
                    id: 'peekTable',
                    headers: this.tableHeaders,
                    data: this.tableData,
                    attrsAll: {style: {overflow: 'auto'}}
                }), m('nav.navbar.navbar-default',
                [
                    m('div.container-fluid',[
                        m('ul.nav.navbar-nav',[
                            m('li.active',
                            m('a[href=/newVar]', {oncreate: m.route.link}, "Create New Variable")),
                            m('li',
                            m('a[href=/formulaBuilder]', {oncreate: m.route.link}, "Formula Builder")),
                            m('li',
                            m('a[href=/recode]', {oncreate: m.route.link}, "Recode")),
                            m('li',
                            m('a[href=/reorder]', {oncreate: m.route.link}, "Reorder")),
                        ])
                    ])
                ])
            )
        ]
    }

}

function onScrollEvent() {
    let canvas = document.getElementById('canvas');
    if (canvas.scrollTop + canvas.clientHeight === canvas.scrollHeight) {
        localStorage.removeItem('peekMore');
        localStorage.setItem('peekMore', 'true');
    }
}

function onStorageEvent (peek, e) {
    if (e.key !== 'peekTableData') return;

    peek.header = localStorage.getItem('peekHeader');
    peek.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders')) || [];
    peek.tableData = JSON.parse(localStorage.getItem('peekTableData')) || [];

    if (peek.tableData.length === 0) localStorage.setItem('peekMore', 'true');
    m.redraw();
}