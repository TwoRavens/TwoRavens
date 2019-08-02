import m from 'mithril';
import Table from "../../common/views/Table";
import ModalVanilla from "../../common/views/ModalVanilla";
import ButtonPlain from "../../common/views/ButtonPlain";
import {copyToClipboard} from '../utils';


let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-right:1em;]', text);



export default class ModalWorkspace {
    oncreate() {

        /*
         *  Variables used to display the shared url message
         */
        this.showUserMessage = false;
        this.sharedURL = '';
        this.sharedURLMessage = () => {
            //return 'bleh!';
            return [m('h1', 'Share Workspace'),
                    m('hr'),
                    m('p', 'You may share this workspace by giving a user the link below:'),
                    m('p',
                      m('code', this.sharedURL)),
                    m('p', {class: 'text-success'}, m('i', 'URL Copied to Clipboard!')),
                    ];
        };
        this.showUserMessageOpen = (boolVal) => this.showUserMessage = boolVal;

        /*
         *  Retrieve a list of User Workspace summaries for display
         */
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
            IS_D3M_DOMAIN && m(Table, {data: (workspace.datasetDoc || {}).about}),

            this.summaries && [
                // Intro text to the Saved Workspaces modal
                m('h4', 'Saved Workspaces'),
                (this.summaries.length > 0) && m('ul',
                  m('li', 'Click "Load" to ' +
                  ' restore a previous workspace or "Revert" to return' +
                  ' to the last saved version.'),),

                  // Modal for displaying a shared workspace link
                  this.showUserMessage && m(ModalVanilla,
                        {
                          setDisplay: () => {
                            this.showUserMessageOpen(false);
                          }
                        },
                        this.sharedURLMessage()),

                // Table describing the shared workspaces
                m(Table, {
                    data: this.summaries.map(summary => ({

                        // Id column
                        'Id': `${summary.user_workspace_id}`,

                        // Name column
                        Name: m('', {title: 'Workspace ID:' + summary.user_workspace_id}, summary.name),

                        // Button to load a previous workspace
                        'Restore': m('', [m(ButtonPlain, {
                            class: 'btn-sm btn-primary',
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

                          // original badge
                          summary.is_original_workspace && [m('br'),
                            m('span', {class: 'badge badge-success'}, 'original')],

                          // original badge
                          summary.started_as_shared_workspace && [m('br'),
                            m('span', {class: 'badge badge-success'},
                            'started as shared')],



                        ]),

                        Created: new Date(summary.created).toLocaleString(),
                        'Last Saved': new Date(summary.modified).toLocaleString(),

                        //  Sharing column.  If shared, clicking pops
                        //  up the modal with the shared url
                        'Sharing': m('div', [ summary.sharing.is_public === true &&
                                m(ButtonPlain, {
                                    class: 'btn-sm btn-success',
                                    onclick: async => {
                                      this.sharedURL = `${window.location.origin}${summary.sharing.shared_workspace_url}`;
                                      console.log(this.sharedURL);

                                      copyToClipboard(this.sharedURL);

                                      this.showUserMessageOpen(true);
                                      //m.redraw();
                                    }
                                  },
                                  'Get Workspace Link'),
                             !summary.sharing.is_public &&
                                m('span', {class: 'badge badge-secondary'}, 'Not-Shared'),
                          ]),

                        // --------------------------------------------
                        // Buttons to start/stop sharing a workspace
                        // --------------------------------------------
                        'Share': m('', [
                          // --------------------------------------------
                          // (1) Stop sharing button
                          // --------------------------------------------
                          summary.sharing.is_public === true &&
                            m(ButtonPlain, {
                                class: 'btn-sm btn-secondary',
                                onclick: async () => {
                                  // Activate sharing
                                  //
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

                            // --------------------------------------------
                            // (2) Start sharing button
                            // --------------------------------------------
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
                                  }, 'Start Sharing'),
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
