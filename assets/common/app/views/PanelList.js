import m from 'mithril'
import {mergeAttributes, varColor} from '../common'

// ```
// m(PanelList, {
//         id: 'id of container',
//         items: ['Clickable 1', 'Clickable 2', 'Clickable 3'],
//
//         colors: { app.selVarColor: ['Clickable 1'] }, (optional)
//         classes: { 'item-lineout': ['Clickable 1', 'Clickable 3'] }, (optional)
//
//         callback: (item) => console.log(item + " clicked."),
//         popup: (item) => { return 'PopupContent'}, (optional)
//
//         attrsAll: {... additional attributes for the entire list},
//         attrsItems: {... additional attributes for each item}
//     })
// ```

// colors is an object that maps a color to a list or set of items with that color. Order colors by increasing priority.
// classes acts similarly, but one item may have several classes. Standard css rules apply for stacking css classes.
// popup returns the popup contents when called with the item. If not set, then popup is not drawn

export default class PanelList {
    view(vnode) {
        let {id, items, colors, classes, callback, popup, attrsAll, attrsItems} = vnode.attrs;

        // set alternate background-color if defined
        let viewColor = {};
        for (let color in colors || []) for (let item of colors[color]) viewColor[item] = color;

        // invert the class -> item object
        let viewClass = {};
        for (let css in classes || [])
            for (let item of classes[css])
                viewClass[item] ? viewClass[item].push(css) : viewClass[item] = [css];

        return m(`div#${id}`, attrsAll, items.map((item) =>
            m(`div#${id + item.replace(/\W/g, '_')}`, mergeAttributes({
                    style: {
                        'margin-top': '5px',
                        'text-align': "center",
                        'background-color': viewColor[item] || varColor
                    },
                    'class': viewClass[item],
                    onclick: () => (callback || Function)(item)
                },

                // add popup if defined
                popup ? {
                    onmouseover: function() {$(this).popover('toggle')},
                    onmouseout: function() {$(this).popover('toggle')},
                    'data-container': 'body',
                    'data-content': popup(item),
                    'data-html': 'true',
                    'data-original-title': item,
                    'data-placement': 'auto',
                    'data-toggle': 'popover',
                    'data-trigger': 'hover'
                } : {},

                // add any additional attributes if passed
                attrsItems), item)));
    }
}
