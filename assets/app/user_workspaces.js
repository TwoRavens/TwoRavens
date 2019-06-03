import m from 'mithril';

/*
 *  saveUserWorkspace() save the current
 *  ravens_config data to the user workspace.
 *    e.g. updates the workspace saved in the database
 */
export let saveUserWorkspace = (workspace_info) => {
  console.log('-- saveUserWorkspace --');

  // let workspace_info = getSelectedWorkspace();
  if(!('user_workspace_id' in workspace_info)) {
    alertError('Cannot save the workspace. The workspace id was not found. (saveUserWorkspace)');
    return;
  }

  let raven_config_save_url = '/user-workspaces/raven-configs/json/save/' + workspace_info.user_workspace_id;

  console.log('data to save: ' + JSON.stringify(workspace_info.raven_config))

  m.request({
      method: "POST",
      url: raven_config_save_url,
      data: {raven_config: workspace_info.raven_config}
  })
  .then(function(save_result) {
    console.log(save_result);
    if (save_result.success){
      console.log('Workspace saved')
    }else{
      alertError('Failed to save the workspace. ' + save_result.message + ' (saveUserWorkspace)');
    }
  })
};
/*
 * END: saveUserWorkspace
 */
