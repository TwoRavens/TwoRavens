from django.conf.urls import url
from tworaven_apps.api_docs import views

urlpatterns = (

    url(r'^grpc-test-form$',
        views.view_test_form,
        name='view_test_form'),
)
