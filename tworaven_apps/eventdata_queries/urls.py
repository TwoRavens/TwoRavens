from django.urls import path, re_path

from tworaven_apps.eventdata_queries import views

urlpatterns = [

    # for adding query
    #
    path(r'api/add-query',
         views.api_add_query,
         name='api_add_query'
         )
]
