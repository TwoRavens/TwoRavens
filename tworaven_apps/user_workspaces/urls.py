#from django.conf.urls import url
from django.urls import path, re_path

from tworaven_apps.user_workspaces import views
from tworaven_apps.user_workspaces import views_new_dataset

urlpatterns = (


    # ----------------------------
    # Choose a new dataset
    # ----------------------------

    re_path(r'^upload-dataset$',
            views_new_dataset.view_upload_dataset,
            name='view_upload_dataset'),
    # List datasets
    #
    re_path(r'^list-dataset-choices-html$',
            views_new_dataset.view_list_dataset_choices_html,
            name='view_list_dataset_choices_html'),

    re_path(r'^list-dataset-choices$',
            views_new_dataset.view_list_dataset_choices,
            name='view_list_dataset_choices'),

    # Select dataset - this clears A LOT from the system
    #
    re_path(r'^select-dataset/(?P<config_id>\d{1,7})$',
            views_new_dataset.view_select_dataset,
            name='view_select_dataset'),

    re_path(r'^select-dataset/$',
            views_new_dataset.view_select_dataset,
            name='view_select_dataset_base'),

    # ----------------------------
    # Retrieve user workspaces
    # ----------------------------

    # List
    re_path(r'^raven-configs/json/list$',
        views.view_latest_raven_configs,
        name='view_latest_raven_configs'),

    # List - summaries only
    re_path(r'^raven-configs/json/list/summaries$',
        views.view_latest_raven_config_summaries,
        name='view_latest_raven_config_summaries'),

    # Retrieve by UserWorkspace.id
    re_path(r'^raven-configs/json/(?P<user_workspace_id>\d{1,7})$',
        views.view_user_raven_config,
        name='view_user_raven_config'),


    # Shared workspace
    re_path(r'^raven-configs/share/(?P<hash_id>[\w]{40,200})$',
        views.view_shared_workspace_by_hash_id,
        name='view_shared_workspace_by_hash_id'),

    # Set workspace to public
    re_path(r'^raven-configs/activate-share/(?P<user_workspace_id>\d{1,7})$',
        views.view_activate_shared_workspace,
        name='view_activate_shared_workspace'),

    # Set workspace to private (default)
    re_path(r'^raven-configs/deactivate-share/(?P<user_workspace_id>\d{1,7})$',
        views.view_deactivate_shared_workspace,
        name='view_deactivate_shared_workspace'),

    # ----------------------------
    # Save user workspaces
    # ----------------------------

    # Save with updated ravens_config
    re_path(r'^raven-configs/json/save/(?P<workspace_id>\d{1,7})$',
        views.save_raven_config_to_existing_workspace,
        name='save_raven_config_to_existing_workspace'),

    # Save as new workspace with updated ravens_config
    re_path(r'^raven-configs/json/save-as-new/(?P<workspace_id>\d{1,7})$',
        views.save_raven_config_as_new_workspace,
        name='save_raven_config_as_new_workspace'),


    re_path(r'^d3m-configs/json/latest/reset$',
        views.view_reset_user_configs,
        name='view_reset_user_configs'),

    re_path(r'^d3m-configs/set-current-config/(?P<user_workspace_id>\d{1,7})$',
        views.view_set_current_config,
        name='view_set_current_config'),

    re_path(r'^d3m-configs/delete-config/(?P<user_workspace_id>\d{1,7})$',
        views.view_delete_config,
        name='view_delete_config'),

    re_path(r'^clear-user-workspaces$',
        views.clear_user_workspaces,
        name='clear_user_workspaces'),)
