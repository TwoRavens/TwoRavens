from django.conf.urls import url
from tworaven_common_apps.datamart_endpoints import views

urlpatterns = (
    url(r'^api/get_metadata',
        views.api_get_metadata,
        name='get_metadata'),

    url(r'^api/scrape',
        views.api_scrape,
        name='api_scrape'),

    url(r'^api/index',
        views.api_index,
        name='api_index'),

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
