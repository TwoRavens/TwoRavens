from django.conf.urls import url
from tworaven_apps.R_services import views

urlpatterns = (

    url(r'^rp-test$',
        views.view_rp_test,
        name='view_rp_test'),

    url(r'^partials.app$',
        views.view_partials_app,
        name='view_partials_app'),

    url(r'^preprocess.app$',
        views.view_R_preprocess,
        name='view_R_preprocess'),

    url(r'^healthCheck.app$',
        views.view_R_healthcheck,
        name='view_R_healthcheck'),

    url(r'^(?P<app_name_in_url>(\w|-|\.){5,25})$',
        views.view_R_route,
        name='view_R_route'),

)
