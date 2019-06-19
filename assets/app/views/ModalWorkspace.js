import m from 'mithril';
import Table from "../../common/views/Table";
import ModalVanilla from "../../common/views/ModalVanilla";
import Popper from "../../common/views/Popper";
import Button from "../../common/views/Button";
import ButtonPlain from "../../common/views/ButtonPlain";
import {copyToClipboard} from '../utils';


let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-right:1em;]', text);



export default class ModalWorkspace {
    oncreate() {
        this.showUserMessage = false;
        this.sharedURL = '';
        this.sharedURLMessage = () => {
            //return 'bleh!';
            return [m('h1', 'Share Workspace'),
                    m('hr'),
                    m('p', m('i', 'URL Copied to Clipboard!')),
                    m('p', 'You may share this workspace by giving a user the url below:'),
                    m('textarea',
                      {
                        rows: 4,
                        cols: 70
                      },
                      this.sharedURL),
                    ];
        };
        this.showUserMessageOpen = (boolVal) => this.showUserMessage = boolVal;

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
                (this.summaries.length > 0) && m('ul',
                  m('li', 'Click "Load" to ' +
                  ' restore a previous workspace or "Revert" to return' +
                  ' to the last saved version.'),),

                  this.showUserMessage && m(ModalVanilla,
                        {
                          setDisplay: () => {
                            this.showUserMessageOpen(false);
                          }
                        },
                        this.sharedURLMessage()),

                  /*this.showUserMessage && m('div', {
                        class: "alert alert-primary alert-dismissible fade show",
                        role: "alert"
                      }, [this.userMsg]),*/

                m(Table, {
                    data: this.summaries.map(summary => ({
                        'Id': `${summary.user_workspace_id}`,
                        Name: m('', {title: 'Workspace ID:' + summary.user_workspace_id}, summary.name),

                        Created: new Date(summary.created).toUTCString(),
                        'Last Saved': new Date(summary.modified).toUTCString(),

                        // Button to load a previous workspace
                        'Restore': m('', [m(Button, {
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
                          summary.is_original_workspace && m('br'),
                          summary.is_original_workspace && m('span', {class: 'badge badge-success'}, 'Original')
                        ]),

                        // Button to share/stop sharing a workspace
                        'Share': m('', [
                            // Stop sharing button
                          summary.sharing.is_public === true &&
                            m(ButtonPlain, {
                                class: 'btn-sm btn-secondary',
                                onclick: async () => {
                                  // Activate sharing
                                  let response = await m.request('/user-workspaces/raven-configs/deactivate-share/' + summary.user_workspace_id);

                                  if (!response.success) {
                                      this.error = response.message;
                                      return
                                  }
                                  // Update the sharing data
                                  summary.sharing = response.data.sharing;

                                  m.redraw();
                                }
                            }, 'Stop Sharing'),

                            // Share!
                            !summary.sharing.is_public &&
                                m(ButtonPlain,
                                  {
                                    class: 'btn-sm btn-primary',
                                    onclick: async () => {
                                        // Activate sharing
                                        let response = await m.request('/user-workspaces/raven-configs/activate-share/' + summary.user_workspace_id);

                                        if (!response.success) {
                                            this.error = response.message;
                                            return
                                        }
                                        // Update the sharing data
                                        summary.sharing = response.data.sharing;
                                        m.redraw();

                                    }
                                  }, 'Share'),
                            ]),

                        // share workspace column
                        'Sharing': m('', [ summary.sharing.is_public === true &&
                                m('ButtonPlain', {
                                    class: 'btn-sm btn-success badge badge-success',
                                    onclick: async => {
                                      this.sharedURL = `${window.location.origin}${summary.sharing.shared_workspace_url}`;
                                      console.log(this.sharedURL);

                                      copyToClipboard(this.sharedURL);

                                      this.showUserMessageOpen(true);
                                      //m.redraw();
                                    }
                                  },
                                  'Copy Share URL'),
                             !summary.sharing.is_public &&
                                m('span', {class: 'badge badge-secondary'}, 'Not-Shared'),
                          ]),
                    })),
                    activeRow: workspace.user_workspace_id,
                    showUID: false
                })
            ],
            this.error && warn(this.error)
        )
    }
}
