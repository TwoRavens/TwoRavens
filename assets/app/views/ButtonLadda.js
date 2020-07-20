import m from 'mithril';
import '../../pkgs/Ladda/dist/ladda-themeless.min.css';
import {mergeAttributes} from "../../common/common";

export default class ButtonLadda {
    oncreate(vnode) {
        this.button = Ladda.create(vnode.dom);
        this.activeLadda = vnode.attrs.activeLadda;
        if (this.activeLadda) this.button.start();
    }
    onupdate(vnode) {
        if (this.activeLadda === vnode.attrs.activeLadda) return;
        this.activeLadda = vnode.attrs.activeLadda;
        this.activeLadda ? this.button.start() : this.button.stop();
    }

    view({attrs, children}) {
        return m('button.btn.btn-default.ladda-label.ladda-button', mergeAttributes(attrs, {
            'data-spinner-color': "#000000",
            'data-style': 'zoom-in'
        }), children)
    }
}