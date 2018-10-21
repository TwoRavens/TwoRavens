import m from 'mithril';

import Header from './Header';
import Table from './Table';
import Canvas from './Canvas';
import {heightHeader} from "../common";

// widget for displaying a full-page data preview
// Handle all logic for loading and preparing the data from within your app.
// There is code at the bottom of this file that belongs in the app you're implementing the preview for.

// ```
// m(Peek, {image: src image for header})
// ```

// localstorage entries:

// READ FIELDS
// peekHeader: text in header label
// peekTableHeaders: headers of table
// peekTableData: contents of table

// WRITE FIELDS
// peekMore: boolean set by peek when the bottom of the page is scrolled to

export default class Peek {
    oncreate(vnode) {
        let {id} = vnode.attrs;
        window.addEventListener('storage', (e) => onStorageEvent(this, id, e));
        document.getElementById('canvas' + id).addEventListener('scroll', () => onScrollEvent(id));
    }

    oninit(vnode) {
        let {id} = vnode.attrs;
        this.header = localStorage.getItem('peekHeader' + id) || '';
        this.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders' + id)) || [];
        this.tableData = JSON.parse(localStorage.getItem('peekTableData' + id)) || [];

        if (this.tableData.length === 0) {
            console.log("SENDING UPDATE")
            localStorage.removeItem('peekMore' + id);
            localStorage.setItem('peekMore' + id, 'true');
        }
    }

    view(vnode) {
        let {id, image} = vnode.attrs;

        return [
            m(Header, {image}, [
                m('div', {style: {'flex-grow': 1}}),
                m("h4", m("span#headerLabel.label.label-default", this.header)),
                m('div', {style: {'flex-grow': 1}}),
            ]),
            m(Canvas, {
                    attrsAll: {
                        id: 'canvas' + id,
                        style: {
                            'padding-left': 0,
                            'padding-right': 0,
                            'margin-top': heightHeader + 'px',
                            height: `calc(100% - ${heightHeader})`
                        }
                    }
                }, m(Table, {
                    id: 'peekTable' + id,
                    headers: this.tableHeaders,
                    data: this.tableData,
                    abbreviation: 25,
                    attrsAll: {style: {overflow: 'auto'}}
                })
            )
        ]
    }
}

let onScrollEvent = (id) => {
    let canvas = document.getElementById('canvas' + id);
    if (canvas.scrollTop + canvas.clientHeight === canvas.scrollHeight) {
        localStorage.removeItem('peekMore' + id);
        localStorage.setItem('peekMore' + id, 'true');
    }
};

let onStorageEvent = (peek, id, e) => {
    if (e.key !== 'peekTableData' + id) return;

    peek.header = localStorage.getItem('peekHeader' + id);
    peek.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders' + id)) || [];
    peek.tableData = JSON.parse(localStorage.getItem('peekTableData' + id)) || [];

    if (peek.tableData.length === 0) localStorage.setItem('peekMore' + id, 'true');
    m.redraw();
};

// Adapt the following code in your codebase to update the Peek tab

/*
// this keeps the localstorage tags unique, so that, for example, peek for D3M is separate from EventData
let peekId = 'myName'

let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];
let peekAllDataReceived = false;
let peekIsGetting = false;
function onStorageEvent(e) {
    if (e.key !== 'peekMore' + peekId || peekIsGetting) return;
    if (localStorage.getItem('peekMore' + peekId) === 'true' && !peekAllDataReceived) {
        localStorage.setItem('peekMore'  + peekId, 'false');
        peekIsGetting = true;
        updatePeek();
    }
}
window.addEventListener('storage', onStorageEvent);
function updatePeek() {
    m.request({
        method: 'POST',
        url: data_url,
        data: {
            skip: peekSkip,
            limit: peekBatchSize,
        }
    }).then((response) => {
        // stop blocking new requests
        peekIsGetting = false;
        let newData = response['data'];
        // start blocking new requests until peekReset() is called
        if (newData.length === 0) peekAllDataReceived = true;
        peekData = peekData.concat(newData);
        peekSkip += newData.length;
        localStorage.setItem('peekTableHeaders' + peekId, JSON.stringify(headers));
        localStorage.setItem('peekTableData' + peekId, JSON.stringify(peekData));
    });
}
function resetPeek() {
    peekSkip = 0;
    peekData = [];
    peekAllDataReceived = false;
    peekIsGetting = false;
    // provoke a redraw from the peek menu
    localStorage.removeItem('peekTableData' + peekId);
}
*/