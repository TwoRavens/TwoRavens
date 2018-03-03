import m from 'mithril'

// ```
// m(MenuHeaders, {
//     id: id,
//     sections: [...,
//         {
//             value: string
//             contents: m(...)
//             idSuffix: (optional) suffix to add to generated id strings
//             display: if 'none', then the section will be hidden
//         }]
//     })
// ```

export default class MenuHeaders {
    view(vnode) {
        let {id, attrsAll, sections} = vnode.attrs;

        return m(`#${id}`, attrsAll, [
            sections.map((section) => m(`div#bin${section['idSuffix'] || section.value}`,
                m(`#header${section['idSuffix'] || section.value}Header.panel-heading`, m("h3.panel-title", section.value)),
                section.contents))
        ])
    }
}
