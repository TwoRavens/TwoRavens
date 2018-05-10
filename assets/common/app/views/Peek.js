import m from 'mithril';

import * as app from "../../../app/app";

import Header from './Header';
import Table from './Table';
import Canvas from './Canvas';
import {heightHeader} from "../common";

// widget for displaying a full-page data preview

// localstorage entries:

// READ FIELDS
// peekHeader: text in header label
// peekTableHeaders: headers of table
// peekTableData: contents of table

// WRITE FIELDS
// peekMore: boolean set by peek when the bottom of the page is scrolled to

let data = [];

export default class Peek {
    oncreate() {
        m.request('rook-custom/rook-files/299_libras_move/data/trainData.tsv', {deserialize: x => x.split('\n').map(y => y.split('\t'))})
            .then(x => {
                data = x;
                data[0] = data[0].map(x => x.replace(/"/g, ''));
            });
        //window.addEventListener('storage', e => onStorageEvent(this, e));
        //document.getElementById('canvas').addEventListener('scroll', onScrollEvent);
    }

    /*oninit() {
        this.header = localStorage.getItem('peekHeader') || '';
        this.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders')) || [];
        this.tableData = JSON.parse(localStorage.getItem('peekTableData')) || [];

        if (this.tableData.length === 0) {
            localStorage.removeItem('peekMore');
            localStorage.setItem('peekMore', 'true');
        }
    }*/

    view() {
        return [
            m(Header,
              m('div', {style: {'flex-grow': 1}}),
              m("h4", m("span#headerLabel.label.label-default", 'header')),
              m('div', {style: {'flex-grow': 1}})),
            m(Canvas, {
                attrsAll: {style: {'margin-top': heightHeader + 'px', height: `calc(100% - ${heightHeader}px)`}}
            }, m(Table, {
                id: 'peekTable',
                headers: data[0],
                data: data.slice(1),
                attrsAll: {style: {overflow: 'auto'}}
            }))
        ];
    }
}

function onScrollEvent() {
    let canvas = document.getElementById('canvas');
    if (canvas.scrollTop + canvas.clientHeight === canvas.scrollHeight) {
        localStorage.removeItem('peekMore');
        localStorage.setItem('peekMore', 'true');
    }
}

function onStorageEvent(peek, e) {
    if (e.key !== 'peekTableData') return;

    peek.header = localStorage.getItem('peekHeader');
    peek.tableHeaders = JSON.parse(localStorage.getItem('peekTableHeaders')) || [];
    peek.tableData = JSON.parse(localStorage.getItem('peekTableData')) || [];

    if (peek.tableData.length === 0) localStorage.setItem('peekMore', 'true');
    m.redraw();
}

// Adapt the following code in your codebase to update the Peek tab

/*
let peekBatchSize = 100;
let peekSkip = 0;
let peekData = [];

let peekAllDataReceived = false;
let peekIsGetting = false;

let onStorageEvent = (e) => {
    console.log(e);
    if (e.key !== 'peekMore' || peekIsGetting) return;

    if (localStorage.getItem('peekMore') === 'true' && !peekAllDataReceived) {
        localStorage.setItem('peekMore', 'false');
        peekIsGetting = true;
        updatePeek();
    }
};

  let updatePeek = () => {
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

  peekData.concat(newData);
  peekSkip += newData.length;

  localStorage.setItem('peekTableHeaders', JSON.stringify(headers));
  localStorage.setItem('peekTableData', JSON.stringify(peekData));
  });
  };

  let resetPeek = () => {
  peekSkip = 0;
  peekData = [];

  peekAllDataReceived = false;
  peekIsGetting = false;

  // provoke a redraw from the peek menu
  localStorage.removeItem('peekTableData');
  };
*/
