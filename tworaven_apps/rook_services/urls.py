from django.conf.urls import url
from tworaven_apps.rook_services import views, views_test

urlpatterns = (

    #url(r'^{0}'.format(ZELIG_APP),
    #    views.view_zelig_route,
    #    name='view_zelig_route'),
    url(r'^rp-test$',
        views.view_rp_test,
        name='view_rp_test'),

    url(r'^(?P<app_name_in_url>\w{5,25})$',
        views.view_rook_route,
        name='view_rook_route'),

    url(r'^(?P<app_name_in_url>\w{5,25})$',
        views.view_rook_route,
        name='view_rook_route'),

    #url(r'^web-pack$',
    #    views_test.view_webpack_test,
    #    name='view_webpack_test'),
)
