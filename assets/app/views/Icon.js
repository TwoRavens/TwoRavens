import m from 'mithril';
import * as octicons from 'octicons';
import {mergeAttributes} from "../../common/common";

// icon names from here:
// https://octicons.github.com/

// m(Icon, {
//     name: 'sync'
//     *: any attributes may be passed
// })

export default class Icon {
    view({attrs}) {return attrs.name in octicons && m.trust(octicons[attrs.name].toSVG(mergeAttributes(attrs, {
        cursor: 'auto', // height: '2em', width: '2em',
        fill: '#818181',
        transform: 'scale(1.2)'
    })))}
}

// Alternative Font-Awesome implementation:
/*

import {library, icon, findIconDefinition} from '@fortawesome/fontawesome-svg-core';
import {far} from '@fortawesome/free-regular-svg-icons';
library.add(far);

import m from 'mithril';

// icon names from here:
// https://fontawesome.com/icons?d=gallery&s=regular&m=free

// m(Icon, {
//     name: 'address-book'
//     *: any attributes may be passed
// })

export default class Icon {
    setIcon({attrs, dom}) {
        if (this.name === attrs.name) return;
        this.name = attrs.name;
        dom.innerHTML = "";
        dom.appendChild(icon(findIconDefinition({
            prefix: 'far', name: this.name
        })).node[0])
    }

    oncreate(vnode) {this.setIcon(vnode)}
    onupdate(vnode) {this.setIcon(vnode)}
    view({attrs}) {return m('span', attrs)}
}

*/