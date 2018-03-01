import m from 'mithril';

// Interface specification

// id: this is assigned to the button, not the external div. All the dropdown options are linked with this id
// items: list of dropdown options
// onclickChild: callback for when a child is clicked
// dropWidth: manually set width of dropdown

// *: in addition, any attribute may be passed in. Example: { class: 'btn-sm' } will make dropdown smaller

export default class Dropdown {
    oninit(vnode) {
        this.activeItem = vnode.attrs.items[0];
    }

    view(vnode) {
        let {id, items, onclickChild, dropWidth} = vnode.attrs;

        return m('.dropdown[style=display: block]', [
            m('button.btn.btn-default.dropdown-toggle',
              Object.assign(vnode.attrs, {'data-toggle': 'dropdown'}), [
                  this.activeItem,
                  m('b.caret', {style: {'margin-left': '5px'}})]),

            m('ul.dropdown-menu', {'aria-labelledby': id, style: {width: dropWidth, 'min-width': 0}},
                items.map((item) => m('li.dropdown-item', {
                    value: item,
                    onclick: () => {
                        this.activeItem = item;
                        onclickChild(item);
                    },
                    style: {'padding-left': '10px'}
                }, item))
            )
        ]);
    }
}
