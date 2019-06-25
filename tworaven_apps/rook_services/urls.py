from django.conf.urls import url
from tworaven_apps.rook_services import views, views_files

urlpatterns = (

    url(r'^rp-test$',
        views.view_rp_test,
        name='view_rp_test'),

    url(r'^%s' % views_files.ROOK_FILES_PATH, # 'rook-files/'
        views_files.view_rook_file_passthrough,
        name='view_rook_file_passthrough'),

    url(r'^preprocessapp$',
        views.view_rook_preprocess,
        name='view_rook_preprocess'),

    url(r'^healthcheckapp$',
        views.view_rook_healthcheck,
        name='view_rook_healthcheck'),

    url(r'^(?P<app_name_in_url>(\w|-){5,25})$',
        views.view_rook_route,
        name='view_rook_route'),


)
