from django.conf.urls import url
from tworaven_apps.api_docs import views, views_swagger

urlpatterns = (

    url(r'^grpc-test-form$',
        views.view_test_form,
        name='view_test_form'),

    url(r'^v1/swagger.yml$',
        views_swagger.view_swagger_doc_v1,
        name='view_swagger_doc_v1'),

)
