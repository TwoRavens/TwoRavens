from django.conf.urls import url
from tworaven_apps.api_docs import views, views_swagger
# workspaces
from tworaven_apps.workspaces import views_api as workspaces_api

urlpatterns = (

    url(r'^grpc-test-form$',
        views.view_test_form,
        name='view_test_form'),

    url(r'^v1/swagger.yml$',
        views_swagger.view_swagger_doc_v1,
        name='view_swagger_doc_v1'),

    url(r'^v1/workspace/list$',
        workspaces_api.list_user_workspaces,
        name='list_user_workspaces'),

    url(r'^v1/workspace/current$',
        workspaces_api.view_current_workspace,
        name='view_current_workspace'),

    # url for documentation purposes
    url(r'^v1/workspace/id/$',
        workspaces_api.view_workspace_by_id_base,
        name='view_workspace_by_id_base'),

    url(r'^v1/workspace/id/(?P<workspace_id>\d{1,7})$',
        workspaces_api.view_workspace_by_id_json,
        name='view_workspace_by_id_json'),



)
