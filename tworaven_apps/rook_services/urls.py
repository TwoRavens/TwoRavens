from django.conf.urls import url
from tworaven_apps.rook_services import views, views_files, views_test

urlpatterns = (

    url(r'^rp-test$',
        views.view_rp_test,
        name='view_rp_test'),

    url(r'^%s' % views_files.ROOK_FILES_PATH, # 'rook-files/'
        views_files.view_rook_file_passthrough,
        name='view_rook_file_passthrough'),

    url(r'^(?P<app_name_in_url>(\w|-){5,25})$',
        views.view_rook_route,
        name='view_rook_route'),


)
