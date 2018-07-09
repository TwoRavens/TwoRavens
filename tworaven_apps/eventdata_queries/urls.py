from django.urls import path, re_path

from tworaven_apps.eventdata_queries import views

urlpatterns = [

    # for adding query
    #
    path(r'api/add-query',
         views.api_add_query,
         name='api_add_query'
         ),

    path(r'api/list',
         views.api_get_list,
         name='api_get_list'
         ),
    re_path(r'api/get/(?P<job_id>[0-9]{1,10})$',
         views.api_retrieve_object,
         name='api_retrieve_object'
         ),
    path(r'api/search',
         views.api_search,
         name='api_search'
         ),
    re_path(r'api/upload-dataverse/get/(?P<query_id>[0-9]{1,10})$',
         views.api_upload_to_dataverse,
         name='api_upload_to_dataverse'
        ),

]
