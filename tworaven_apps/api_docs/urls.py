from django.conf.urls import url
from tworaven_apps.api_docs import views

urlpatterns = (

    url(r'^swagger/v1/index.yaml$',
        views.view_swagger_spec,
        name='view_swagger_spec'),

)
