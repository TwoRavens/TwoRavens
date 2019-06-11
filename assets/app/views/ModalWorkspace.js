import m from 'mithril';
import Table from "../../common/views/Table";
import ModalVanilla from "../../common/views/ModalVanilla";
import Button from "../../common/views/Button";


let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-right:1em;]', text);

export default class ModalWorkspace {
    oncreate() {
        m.request('/user-workspaces/raven-configs/json/list/summaries').then(response => {
            if (!response.success) this.error = response.message;
            else this.summaries = response.data;

            m.redraw()
        })
    }

    view(vnode) {
        let {workspace, setDisplay, loadWorkspace} = vnode.attrs;

        return m(ModalVanilla, {id: 'workspaceModal', setDisplay},
            m('h4', 'Current Workspace'),
            IS_D3M_DOMAIN && m(Table, {data: workspace.datasetDoc.about}),

            this.summaries && [
                m('h4', 'Saved Workspaces'),
                m(Table, {
                    data: this.summaries.map(summary => ({
                        id: summary.user_workspace_id,
                        name: m('', {title: 'Workspace ID:' + summary.user_workspace_id}, summary.name),
                        dataset: summary.orig_dataset_id,
                        created: new Date(summary.created).toUTCString(),
                        modified: new Date(summary.modified).toUTCString(),
                        '': m(Button, {
                            class: 'btn-sm',
                            onclick: async () => {
                                let response = await m.request('/user-workspaces/raven-configs/json/' + summary.user_workspace_id);

                                if (!response.success) {
                                    this.error = response.message;
                                    return
                                }
                                m.request('/user-workspaces/d3m-configs/set-current-config/' + summary.user_workspace_id);
                                loadWorkspace(response.data);
                            }
                        }, workspace.user_workspace_id === summary.user_workspace_id ? 'Revert' : 'Load')
                    })),
                    activeRow: workspace.user_workspace_id,
                    showUID: false
                })
            ],
            this.error && warn(this.error)
        )
    }
}