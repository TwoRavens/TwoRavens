import m from 'mithril';

let text = "Default modal text";
let header = "Default modal header";
let btnDisplay = 'block';
let close = false;
let func = _ => {};
let btn = "Close";
let vis = false;

// text and header are text
// show is boolean
// btnText is the text to go inside the button (eg "Reset"), but if false then no button appears
// func is the function to execute when button is clicked
export function set(text_, header_, show, btnText, close_, func_) {
    if (text_) text = text_;
    if (header_) header = header_;
    if (btnText) {
        btn = btnText;
        close = close;
        btnDisplay = 'block';
    } else {
        btnDisplay = 'none';
    };
    if (func) func = func_;
    m.redraw();
    show ? byId('modal').modal({show, backdrop: 'static', keyboard: false}) : byId('modal').modal("hide");
}

export default class Modal {
    view(vnode) {
        return m(".modal.fade[id=modal][role=dialog]", [
            m(".modal-dialog",
              m(".modal-content", [
                  m(".modal-header",
                    m("h4.modal-title", header)),
                  m(".modal-body",
                    m("p", text)),
                  m(".modal-footer",
                    m("button.btn.btn-default[type=button]",
                      {style: {display: btnDisplay, float: 'right'},
                       onclick: _ => {
                           if (close) {
                               close = false;
                               byId('modal').modal('hide');
                               return;
                           } else {
                               func();
                           }
                           location.reload();
                       }},
                      btn))
              ]))
        ]);
    }
}

