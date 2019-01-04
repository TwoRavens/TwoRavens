from django.conf.urls import url
from tworaven_apps.configurations import views

urlpatterns = (

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

    url(r'^d3m-config/json/eval/latest$',
        views.view_d3m_details_json_eval_latest,
        name='view_d3m_details_json_eval_latest'),

    url(r'^d3m-config/get-dataset-schema/json$',
        views.view_get_dataset_schema,
        name='view_get_dataset_schema'),

    url(r'^d3m-config/get-problem-schema/json$',
        views.view_get_problem_schema,
        name='view_get_problem_schema'),

    url(r'^d3m-config/get-dataset-schema/json/(?P<d3m_config_id>\d{1,5})$',
        views.view_get_dataset_schema,
        name='view_get_dataset_schema_by_id'),

    url(r'^d3m-config/get-problem-schema/json/(?P<d3m_config_id>\d{1,5})$',
        views.view_get_problem_schema,
        name='view_get_problem_schema_by_id'),

    url(r'^d3m-config/get-problem-data-file-info/(?P<d3m_config_id>\d{1,5})$',
        views.view_get_problem_data_info,
        name='view_get_problem_data_info_by_id'),

    url(r'^d3m-config/get-problem-data-file-info$',
        views.view_get_problem_data_info,
        name='view_get_problem_data_info'),


)
