from django.conf.urls import url
from tworaven_apps.rook_services import views

urlpatterns = (

    url(r'^rp-test$',
        views.view_rp_test,
        name='view_rp_test'),

    url(r'^partials.app$',
        views.view_partials_app,
        name='view_partials_app'),

    url(r'^preprocess.app$',
        views.view_rook_preprocess,
        name='view_rook_preprocess'),

    url(r'^healthCheck.app$',
        views.view_rook_healthcheck,
        name='view_rook_healthcheck'),

    url(r'^(?P<app_name_in_url>(\w|-|\.){5,25})$',
        views.view_rook_route,
        name='view_rook_route'),

)
