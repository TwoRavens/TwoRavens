import m from 'mithril';

import {mergeAttributes, selVarColor} from "../../common/app/common";

let natives = new Set(['number', 'string', 'boolean']);
let nestedStyle = {
    style: {
        background: 'rgba(0,0,0,.1)',
        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)',
        margin: '10px 0'
    }
};

// This is the same as the Table component, except that you can pass any json structure
// This component will recursively nest tables and tabularize arrays. The background gets darker as nesting deepens

// Interface specification
//
// ```
// m(Table, {
//     id: id (String),
//     headers: ['col1Header', 'col2Header'],
//     data: ANY JSON STRUCTURE,
//     activeRow: 'row1col1', (optional)
//     onclick: (uid, colID) => console.log(uid + " row was clicked, column number " + colID + " was clicked"), (optional)
//     showUID: true | false, (optional)

//     attrsAll: { apply attributes to all divs },(optional)
//     attrsRows: { apply attributes to each row }, (optional)
//     attrsCells: { apply attributes to each cell } (optional)
//     tableTags: [ m('colgroup', ...), m('caption', ...), m('tfoot', ...)]
//     abbreviation: int
//     })
// ```

// The UID for the table is the key for identifying a certain row.
// The UID is the first column, and its value is passed in the onclick callback.
// The first column may be hidden via showUID: false. This does not remove the first header

// The data parameter attempts to render anything it gets. Feel free to pass Arrays of Arrays, Arrays of Objects, Objects, and Arrays of mixed Objects and Arrays. It should just render.
//     Passing an Object will be rendered as a column for keys and a column for values
//     Passing an Array of Objects will render the value for a key under the header column with the same name
//     Passing an Array of Objects without a header will infer the header names from the unique keys in the objects

// Table tags allows passing colgroups, captions, etc. into the table manually. Can be a single element or list

// When abbreviation is set, strings are shortened to int number of characters
export default class TableJSON {
    view(vnode) {
        let {id, data, headers, activeRow, onclick, showUID, abbreviation} = vnode.attrs;
        // Interface custom attributes
        let {attrsAll, attrsRows, attrsCells, tableTags} = vnode.attrs;

        // optionally evaluate function to get data
        if (typeof data === 'function') data = data();
        // optionally render Objects as tables of key and value columns
        if (!Array.isArray(data)) data = Object.keys(data).map(key => [key, data[key]]);

        // deduce headers if passed an array of objects
        if (headers === undefined && data.some(row => !Array.isArray(row))) {
            let headersTemp = new Set();
            data.forEach(row => row && Object.keys(row).forEach(key => headersTemp.add(key)));
            headers = [...headersTemp];
        }

        showUID = showUID !== false; // Default is 'true'

        // if abbreviation is not undefined, and string is too long, then shorten the string and add a tooltop
        let value = (item) => {
            if (Array.isArray(item)) {
                return m(TableJSON, {
                    data: item.map((elem, i) => {
                        if (natives.has(typeof elem)) return {"index": i, "value": elem};
                        return elem;
                    }),
                    attrsAll: nestedStyle,
                    abbreviation, attrsRows, attrsCells
                })
            }
            if (typeof item === 'object')
                return m(TableJSON, {
                    data: item,
                    attrsAll: nestedStyle,
                    abbreviation, attrsRows, attrsCells
                });

            if (typeof(item) === 'string' && item.length > abbreviation) {
                return m('div', {'data-toggle': 'tooltip', title: item},
                    item.substring(0, abbreviation - 3).trim() + '...')
            }
            else return item;
        };

        return m(`table.table#${id}`, mergeAttributes({
                style: {width: '100%'}
            }, attrsAll), [
                tableTags,
                headers && m('tr', {style: {width: '100%', background: 'rgba(0,0,0,0.1)', position: 'sticky', top: 0}}, [
                    ...(showUID ? headers : headers.slice(1)).map((header) => m('th', value(header)))
                ]),

                ...data.map((row, i) => {
                        if (row === undefined || row === null) return;

                        // if a row is an Object of "header": "value" items, then convert to array with proper spacing
                        if (headers && !Array.isArray(row)) row = headers.map(header => row[header]);

                        return m('tr', mergeAttributes(
                            i % 2 === 1 ? {style: {'background': 'rgba(1,1,1,.02)'}} : {},
                            row[0] === activeRow ? {style: {'background': selVarColor}} : {},
                            attrsRows),
                            row.filter((item, j) => j !== 0 || showUID).map((item, j) =>
                                m('td', mergeAttributes(onclick ? {onclick: () => onclick(row[0], j)} : {}, attrsCells), value(item)))
                        )
                    }
                )]
        );
    };
}