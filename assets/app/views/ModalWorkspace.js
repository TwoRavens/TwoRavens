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
                (this.summaries.length > 1) && m('ul',
                  m('li', 'Click "Load" to ' +
                  ' restore a previous workspace or "Revert" to return' +
                  ' to the last saved version.'),),
                m(Table, {
                    data: this.summaries.map(summary => ({
                        'id': summary.user_workspace_id,
                        name: m('', {title: 'Workspace ID:' + summary.user_workspace_id}, summary.name),
                        original: summary.is_original_workspace ? 'YES' : '--',
                        created: new Date(summary.created).toUTCString(),
                        // Button to load a previous workspace
                        modified: new Date(summary.modified).toUTCString(),
                        'Restore': m(Button, {
                            class: 'btn-sm',
                            onclick: async () => {
                                // Retrieve the data
                                let response = await m.request('/user-workspaces/raven-configs/json/' + summary.user_workspace_id);

                                if (!response.success) {
                                    this.error = response.message;
                                    return
                                }

                                // Load the new workspace
                                m.request('/user-workspaces/d3m-configs/set-current-config/' + summary.user_workspace_id);
                                loadWorkspace(response.data);
                            }
                        }, workspace.user_workspace_id === summary.user_workspace_id ? 'Revert' : 'Load'),
                        'Share': m(Button, {
                            class: 'btn-sm',
                            onclick: async () => {
                                // Retrieve the data
                                /*let response = await m.request('/user-workspaces/raven-configs/json/' + summary.user_workspace_id);

                                if (!response.success) {
                                    this.error = response.message;
                                    return
                                }

                                // Load the new workspace
                                m.request('/user-workspaces/d3m-configs/set-current-config/' + summary.user_workspace_id);
                                loadWorkspace(response.data);*/
                            }
                        }, summary.sharing.is_public === true ? 'Share' : ''),
                    })),
                    activeRow: workspace.user_workspace_id,
                    showUID: false
                })
            ],
            this.error && warn(this.error)
        )
    }
}
