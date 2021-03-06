from django.conf.urls import url
from tworaven_apps.datamart_endpoints import views

urlpatterns = (

    url(r'^api/datamart-info$',
        views.api_datamart_info,
        name='api_datamart_info'),

    url(r'^api/get_metadata$',
        views.api_get_metadata,
        name='get_metadata'),

    url(r'^api/scrape$',
        views.api_scrape,
        name='api_scrape'),

    url(r'^api/index$',
        views.api_index,
        name='api_index'),

    url(r'^api/search$',
        views.api_search,
        name='api_search'),

    url(r'^api/search-by-dataset$',
        views.api_search_by_dataset,
        name='api_search_by_dataset'),


    url(r'^api/materialize-async$',
        views.api_materialize_async,
        name='api_materialize_async'),

    # url(r'^api/materialize$',
    #    views.api_materialize,
    #    name='api_materialize'),

    url(r'^api/augment$',
        views.api_augment_async,
        name='api_augment_async'),


    #url(r'^api/augment$',
    #    views.api_augment,
    #    name='api_augment'),
)
