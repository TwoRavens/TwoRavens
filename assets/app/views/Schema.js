import m from 'mithril';
import Table from "../../common/views/Table";
import TextField from "../../common/views/TextField";
import Dropdown from "../../common/views/Dropdown";
import TextFieldSuggestion from "../../common/views/TextFieldSuggestion";

// Generic component that constructs menus that mutate an instance of a JSON schema
// There are a number of features in the JSON schema spec that aren't supported... but this is a good start

// Interface specification

// ```
// m(Schema, {
//     schema: JSON object
//     data: JSON object
//     })
//  ```

let nestedStyle = {
    style: {
        background: 'rgba(0,0,0,.1)',
        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .2)',
        margin: '10px 0'
    }
};

let glyph = (icon, unstyled) =>
    m(`span.glyphicon.glyphicon-${icon}` + (unstyled ? '' : '[style=color: #818181; font-size: 1em; pointer-events: none]'));

export default class Schema {
    oninit(vnode) {
        this.schema = vnode.attrs.schema;
    }

    view(vnode) {
        let {data} = vnode.attrs;
        return this.recurse(this.schema.properties, data);
    }

    recurse(schema, data) {
        let value = key => {
            if (typeof data[key] === 'object' && 'type' in data[key] && data[key].type in this.schema.definitions)
                return this.recurse(this.schema.definitions[data[key].type].properties, data[key]);
            if (schema[key].type === 'string') {
                if ('enum' in schema[key]){
                    if (schema[key].enum.length === 1) data[key] = schema[key].enum[0];
                    return m(TextFieldSuggestion, {
                        value: data[key],
                        suggestions: schema[key].enum,
                        enforce: true,
                        oninput: val => data[key] = val
                    });
                }
                return m(TextField, {
                    value: data[key],
                    oninput: val => data[key] = val,
                    onblur: val => data[key] = val
                });
            }
            if (schema[key].type === 'number') return m(TextField, {
                value: data[key],
                class: typeof data[key] !== 'number' && 'is-invalid',
                oninput: val => data[key] = parseFloat(val) || val,
                onblur: val => data[key] = parseFloat(val) || val
            });
            if (schema[key].type === 'array') return this.recurse(schema[key], data[key]);
            if (schema[key].type === 'object') return this.recurse(schema[key].properties, data[key]);
        };

        if (Array.isArray(data)) return m(Table, {
            attrsAll: nestedStyle,
            data: 'items' in schema ? [
                ...data.map((elem, i) => [
                    value(i),
                    m('div', {onclick: () => data.splice(i, 1)}, glyph('remove'))
                ]),
                [m(Dropdown, {
                    style: {float: 'left'},
                    items: ['Add', ...schema.items.oneOf.map(item => item.$ref.split('/').slice(-1)[0])],
                    activeItem: 'Add',
                    onclickChild: child => {
                        if (child === 'Add') return;
                        data.push({
                            type: child
                        })
                    }
                }), undefined]
            ] : [
                ...data.map((elem, i) => [
                    m(TextField, {value: elem, oninput: val => data[i] = val}),
                    m('div', {onclick: () => data.splice(i, 1)}, glyph('remove'))
                ]),
                [m(TextField, {value: '', oninput: val => data.push(val)}), undefined]
            ]
        });

        if (typeof data === 'object') return m(Table, {
            attrsAll: nestedStyle,
            data: Object.keys(data).map(key => [
                m('div', {title: schema[key].description || ''}, key),
                value(key),
                m('div', {onclick: () => delete data[key]}, glyph('remove'))
            ]).concat(Object.keys(data).length === Object.keys(schema).length ? [] : [[
                m(Dropdown, {
                    style: {float: 'left'},
                    items: ['Add', ...Object.keys(schema).filter(key => !(key in data))],
                    activeItem: 'Add',
                    onclickChild: child => {
                        if (!(child in schema)) return;
                        data[child] = {
                            'string': '',
                            'object': {},
                            'array': [],
                            'number': ''
                        }[schema[child].type]
                    }
                }), undefined, undefined
            ]])
        });
    }
}