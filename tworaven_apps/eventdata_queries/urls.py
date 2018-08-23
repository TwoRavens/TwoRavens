from django.urls import path, re_path

from tworaven_apps.eventdata_queries import views

urlpatterns = [

    # for adding query
    #
    path(r'api/add-query',
         views.api_add_query,
         name='api_add_query'),

    path(r'api/list',
         views.api_get_list,
         name='api_get_list'),

    re_path(r'api/get/(?P<job_id>[0-9]{1,10})$',
            views.api_retrieve_object,
            name='api_retrieve_object'),

    path(r'api/search',
         views.api_search,
         name='api_search'),

    re_path(r'api/upload-dataverse/(?P<query_id>[0-9]{1,10})$',
            views.api_upload_to_dataverse,
            name='api_upload_to_dataverse'),

    re_path(r'api/publish-dataset/(?P<dataset_id>[0-9]{1,10})$',
            views.api_publish_dataset,
            name='api_publish_dataset'),

    re_path(r'api/get-archive-query-object/get/(?P<query_id>[0-9]{1,10})$',
            views.api_get_archive_query_object,
            name='api_get_archive_query_object'),

    path(r'api/archive_list',
         views.api_get_archive_list,
         name='api_get_archive_list'),

    re_path(r'api/dataverse-get-files-list/(?P<version_id>[0-9]{1,10})$',
            views.api_get_files_list,
            name='api_get_files_list'),

    path(r'api/get-data',
         views.api_get_data,
         name='api_get_data'),

    path(r'api/get-metadata',
         views.api_get_metadata,
         name='api_get_metadata'),

]
