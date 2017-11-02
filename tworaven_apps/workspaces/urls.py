from django.conf.urls import url
from tworaven_apps.workspaces import views

urlpatterns = (

    # We're listing each call here for now but may change in the future
    #
    url(r'^test-show-workspace$',
        views.view_session_info,
        name='view_session_info'),

    url(r'^record-user-metadata$',
        views.record_user_metadata,
        name='record_user_metadata'),

    url(r'^clear-user-metadata$',
        views.clear_user_metadata,
        name='clear_user_metadata'),

)
