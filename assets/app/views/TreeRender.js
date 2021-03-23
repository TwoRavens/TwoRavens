import m from 'mithril';
import Icon from "../../common/views/Icon";
import Button from "../../common/views/Button";

export default class TreeRender {
    view(vnode) {
        let {data, state, renderNode, callbacks} = vnode.attrs;
        callbacks = callbacks || {};
        renderNode = renderNode || renderNodeFactory(callbacks);

        return data.filter(_=>_).map(datum => m('div',
            m('div#nodeContainer', {
                    style: {display: 'inline-block', width: '100%'}
                },
                m('div#nodeCollapse', {
                    style: {
                        display: 'inline-block',
                        'margin-left': '4px', width: '18px'
                    },
                    onclick: () => {
                        if (!datum.children) return;
                        if (!((datum.id || datum.name) in state)) state[datum.id || datum.name] = {closed: false};
                        let nodeState = state[datum.id || datum.name];
                        nodeState.closed = !nodeState.closed;
                    }
                }, datum.children && m(Icon, {name: state?.[datum.id || datum.name]?.closed ? 'triangle-right' : 'triangle-down'})),
                m('div#nodeContents', {
                    style: {width: 'calc(100% - 22px)', display: 'inline-block'}
                }, renderNode(datum, data)),
            ),

            // children nodes
            datum.children && !state?.[datum.id || datum.name]?.closed && m('div', {
                style: {
                    'border-left': '1px solid black',
                    'margin-left': '9px',
                    'padding-left': '5px'
                }
            }, m(TreeRender, {data: datum.children, state, renderNode})))
        );
    }
}

// returns a function that renders tree nodes with the specified callbacks
export let renderNodeFactory = callbacks => (datum, data) => m('div', {
        onclick: callbacks.click && ((e) => callbacks.click(datum, data, e)),
        ondblclick: callbacks.dblclick && ((e) => callbacks.dblclick(datum, data, e)),

        draggable: callbacks.draggable && callbacks.draggable(datum, data),
        ondragover: callbacks.dragover && ((e) => callbacks.dragover(datum, data, e)),
        ondragleave: callbacks.dragleave && ((e) => callbacks.dragleave(datum, data, e)),
        ondragstart: callbacks.dragstart && ((e) => callbacks.dragstart(datum, data, e)),
        ondragend: callbacks.dragend && ((e) => callbacks.dragend(datum, data, e)),
        ondrop: callbacks.drop && ((e) => callbacks.drop(datum, data, e)),

        oncreate({dom}) {dom.style.border = '3px solid transparent'}
    },
    datum.editable !== false ? [
        // logical button (d3m doesn't support and/or?)
        !IS_D3M_DOMAIN && data.indexOf(datum) !== 0 && datum.show_op !== false && m(Button, {
            'class': 'btn-xs',
            style: 'margin:1px',
            onclick: callbacks.logical && (() => callbacks.logical(datum, data))
        }, datum.operation),

        // negation button
        datum.negate !== undefined && m(Button, {
            id: 'boolToggle',
            style: 'margin:1px',
            'class': 'btn-xs' + (datum.negate ? ' active' : ''),
            onclick: callbacks.negate && (() => callbacks.negate(datum, data))
        }, 'not')
    ] : [
        data.indexOf(datum) !== 0 && datum.show_op && m('div.badge.badge-secondary', {style: 'margin:1px'}, datum.operation),
        datum.negate === 'true' && m('div.badge.badge-secondary', {style: 'margin:1px'}, 'not')
    ],
    datum.name,

    // cancel button
    datum.editable !== false && (!('cancellable' in datum) || datum.cancellable) && m('div', {
        style: 'float:right;margin-right:4px',
        onclick: callbacks.cancel && (() => callbacks.cancel(datum, data))
    }, m(Icon, {name: 'x'}))
);
