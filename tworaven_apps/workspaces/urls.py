from django.conf.urls import url
from tworaven_apps.workspaces import views, views_api

urlpatterns = (

    # Show saved workspaces for the logged in user
    #
    url(r'^show-workspaces$',
        views.view_workspace_info,
        name='view_workspace_info'),

    url(r'^current$',
        views_api.view_current_workspace,
        name='view_current_workspace'),

    url(r'^by-id-json/(?P<workspace_id>\d{1,5})$',
        views_api.view_workspace_by_id_json,
        name='view_workspace_by_id_json'),

    # We're listing each call here for now but may change in the future
    #
    url(r'^test-show-session-info$',
        views.view_session_info,
        name='view_session_info'),


    url(r'^clear-user-metadata$',
        views.clear_user_metadata,
        name='clear_user_metadata'),

    # Test version
    url(r'^record-user-metadata$',
        views.record_user_metadata,
        name='record_user_metadata'),

    # Getting to the serious stuff
    url(r'^record-user-workspace$',
        views.record_user_workspace,
        name='record_user_workspace'),

)

"""
url(r'^record-user-metadata/zdata$',
    views.record_user_metadata_zdata,
    name='record_user_metadata_zdata'),

url(r'^record-user-metadata/allnodes$',
    views.record_user_metadata_allnodes,
    name='record_user_metadata_allnodes'),
"""
