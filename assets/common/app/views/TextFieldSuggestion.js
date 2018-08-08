import m from 'mithril';
import {mergeAttributes} from "../common";
import levenshtein from 'js-levenshtein'

// NOTE this requires js-levenshtein to be installed from npm. Tested with version 1.1.3.
// npm install --save js-levenshtein

// ```
// m(TextField, {
//     id: string,
//     suggestions: ['possibility 1', 'possibility 2'],
//     enforce: boolean,
//     oninput: called with value of field
//     *: any attribute may be passed
//     })
// ```

// suggestions are shown below the text box.
// if enforce is true, then the value must be one of the suggestions
// Can pass attributes directly, for example 'placeholder' or 'oninput'


let distanceSort = (array, value) => array
    .map(item => [item, levenshtein(item, value)])
    .sort((a, b) => a[1] - b[1])
    .map(item => item[0]);

export default class TextFieldSuggestion {
    oninit(vnode) {
        this.value = vnode.attrs.defaultValue || '';
        this.isDropped = false;
    }

    view(vnode) {
        let {id, suggestions, value, enforce, limit, dropWidth, attrsAll} = vnode.attrs;

        // overwrite internal value if passed
        this.value = value === undefined ? this.value : value;

        // To break out of 'this' context. Redundant when value attribute is passed
        let setValue = (val) => this.value = val;
        let setIsDropped = (state) => this.isDropped = state;

        return [
            m(`input#${id}.form-control`, mergeAttributes({
                    value: this.value,
                    style: {'margin': '5px 0', 'width': '100%'},
                    onfocus: function () {
                        setIsDropped(true);
                        m.withAttr('value', (vnode.attrs.onfocus || Function));
                    },
                    oninput: function () {
                        setValue(this.value);
                        (vnode.attrs.oninput || Function)(this.value)
                    },
                    onblur: function() {
                        setTimeout(() => setIsDropped(false), 100);
                        if (enforce && this.value !== '') {
                            this.value = distanceSort(suggestions, this.value)[0];
                            setValue(this.value);
                        }
                        (vnode.attrs.onblur || Function)(this.value);
                    }
                }, attrsAll)
            ),
            m('ul.dropdown-menu', {
                    'aria-labelledby': id,
                    style: {
                        top: 'auto',
                        left: 'auto',
                        width: dropWidth,
                        'min-width': 0,
                        display: this.isDropped ? 'block' : 'none'
                    }
                },
                distanceSort(suggestions, this.value).slice(0, limit).map((item) =>
                    m('li.dropdown-item', {
                        value: item,
                        onclick: () => {
                            setValue(item);
                            (vnode.attrs.oninput || Function)(item);
                        },
                        style: {'padding-left': '10px', 'z-index': 200}
                    }, item))
            )
        ];
    }
}
