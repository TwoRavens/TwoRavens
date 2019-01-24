from django.conf.urls import url
from tworaven_apps.datamart_endpoints import views

urlpatterns = (
    url(r'^api/upload',
        views.api_upload,
        name='api_upload'),

    url(r'^api/search',
        views.api_search,
        name='api_search'),

    url(r'^api/materialize',
        views.api_materialize,
        name='api_materialize'),

    url(r'^api/augment',
        views.api_augment,
        name='api_augment'),

)
