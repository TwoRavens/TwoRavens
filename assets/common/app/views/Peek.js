import m from 'mithril'

import * as common from '../common';
import Header from './Header';
import Table from './Table';
import Canvas from './Canvas';

// widget for displaying a full-page data preview

// READ FIELDS
// peekHeader: text in header label
// peekTableHeaders: headers of table
// peekTableData: contents of table

// WRITE FIELDS
// peekMore: boolean set by peek when the bottom of the page is scrolled to

export default class Peek {
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
                    contents: m(Table, {
                        id: 'peekTable',
                        headers: this.tableHeaders,
                        data: this.tableData,
                        attrsAll: {style: {overflow: 'auto'}}
                    })
                }
            )
        ]
    }
}

// there is no footer in the peek menu
common.heightFooter = 0;

let onScrollEvent = (e) => {
    let canvas = document.getElementById('canvas');
    if (canvas.scrollTopMax === canvas.scrollTop && m.route.get('/peek')) {
        localStorage.setItem('peekMore', 'true');
    }
};

let onStorageEvent = (peek, e) => {
    if (e.key !== 'peekTableData') return;

    peek.header = localStorage.getItem('peekHeader');
    peek.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders')) || [];
    peek.tableData = JSON.parse(localStorage.getItem('peekTableData')) || [];

    m.redraw();
};
