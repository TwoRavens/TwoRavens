import m from 'mithril';
import TextField from "../../../common/views/TextField";

export default class CanvasSavedQueries {
    view(vnode) {
        return m('#canvasSavedQueries',
            m(TextField, {

            })
        )
    }
}