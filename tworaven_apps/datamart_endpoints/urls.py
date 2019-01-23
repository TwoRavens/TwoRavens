from django.conf.urls import url
from tworaven_apps.datamart_endpoints import views

urlpatterns = (

    url(r'^api/search',
        views.api_search,
        name='api_search'),

    url(r'^api/materialize',
        views.api_materialize,
        name='api_materialize'),

    url(r'^api/join',
        views.api_join,
        name='api_join'),

)
