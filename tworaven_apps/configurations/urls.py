from django.conf.urls import url
from tworaven_apps.configurations import views

urlpatterns = (

    #url(r'^{0}'.format(ZELIG_APP),
    #    views.view_zelig_route,
    #    name='view_zelig_route'),
    url(r'^d3m-config/list$',
        views.view_d3m_list,
        name='view_d3m_list'),

    url(r'^d3m-config/details/(?P<d3m_config_id>\d{1,5})$',
        views.view_d3m_details_page,
        name='view_d3m_details_page'),

    url(r'^d3m-config/details/json/(?P<d3m_config_id>\d{1,5})$',
        views.view_d3m_details_json,
        name='view_d3m_details_json'),

    url(r'^d3m-config/json/latest$',
        views.view_d3m_details_json_latest,
        name='view_d3m_details_json_latest'),

    #url(r'^(?P<app_name_in_url>\w{5,25})$',
    #    views.view_rook_route,
    #    name='view_rook_route'),

    #url(r'^web-pack$',
    #    views_test.view_webpack_test,
    #    name='view_webpack_test'),
)
