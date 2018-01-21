import m from 'mithril'

// Interface specification

// selectWidth: if set, force the selected element to be this integer number of pixels wide. Spacing of other sections evenly compensate

// sections: A list of properties for each radio
// [..., {
//     value: string to display on button
//     onclick: function, which is called with the value of the button
// }]

// attrsAll: pass any attributes to apply to the entire button bar. Example: { style: { margin: '0, 10px'} }
// attrsButtons: pass any attributes to apply to individual buttons. Example: { class: 'btn-sm' }


export default class ButtonRadio {
    oninit(vnode) {
        this.active = vnode.attrs.sections[0].value;
    }

    view(vnode) {
        let {id, sections, selectWidth, attrsAll, attrsButtons} = vnode.attrs;

        return m(`div#${id}.btn-group[data-toggle=buttons]`, Object.assign({style: {'width': '100%'}}, attrsAll),
            sections.map((section) =>
                m(`label.btn.btn-default${section.value === this.active ? '.active' : ''}`, Object.assign({
                        style: {
                            width: selectWidth === undefined
                                ? 100. / sections.length + '%'
                                : this.active === section.value
                                    ? selectWidth + 'px'
                                    : `calc(${100. / (sections.length - 1)}% - ${selectWidth / (sections.length - 1)}px)`
                        }, onclick: () => {
                            this.active = section.value;
                            section.onclick(section.value)
                        }
                    }, attrsButtons), [
                        m(`input#${id}${section.value}`, {'name': id, 'title': section.title, 'type': 'radio'}),
                        section.value
                    ]
                ))
        );
    }
}