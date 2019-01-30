from django.conf.urls import url
from tworaven_apps.user_workspaces import views

urlpatterns = (

    url(r'^d3m-configs/json/latest$',
        views.view_latest_user_configs,
        name='view_latest_user_configs'),

    url(r'^d3m-configs/json/latest/reset$',
        views.view_reset_user_configs,
        name='view_reset_user_configs'),

    url(r'^d3m-configs/json/(?P<user_workspace_id>\d{1,7})$',
        views.view_user_workspace_config,
        name='view_user_workspace_config'),

)
