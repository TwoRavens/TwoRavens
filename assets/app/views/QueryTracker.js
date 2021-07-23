import Table from "../../common/views/Table";
import m from "mithril";
import {mongoURL} from "../app";

let trackedQueries = [];
let updateQueryTracker = () => m.request({
    url: mongoURL + 'get-current-ops',
    method: 'POST',
    body: {}
}).then(response => {
    if (!response.success)
        throw 'unable to update current-ops'
    trackedQueries = response.data;
    console.log('updated')
})

export class QueryTracker {
    oninit() {
        updateQueryTracker()
        this.updater = setInterval(updateQueryTracker, 1000);
    }
    view(vnode) {
        return m(Table, {data: trackedQueries})
    }
    onremove() {
        clearInterval(this.updater)
    }
}