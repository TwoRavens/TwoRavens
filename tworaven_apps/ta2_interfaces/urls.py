"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.ta2_interfaces import (\
        views,
        views_additional,
        view_execute_pipeline)

urlpatterns = (

    url(r'^get-problem-schema$',
        views_additional.view_get_problem_schema,
        name='get_problem_schema'),

    url(r'^startsession/?$',
        views.view_startsession,
        name='StartSession'),

    url(r'^endsession/?$',
        views.view_endsession,
        name='EndSession'),

    url(r'^SetProblemDoc/?$',
        views.view_set_problem_doc,
        name='SetProblemDoc'),

    url(r'^CreatePipelines/?$',
        views.view_create_pipeline,
        name='CreatePipelines'),

    url(r'^GetCreatePipelineResults/?$',
        views.view_get_create_pipeline_results,
        name='GetCreatePipelineResults'),

    url(r'^listpipelines/?$',
        views.view_list_pipelines,
        name='ListPipelines'),

    url(r'^DeletePipelines/?$',
        views.view_delete_pipelines,
        name='DeletePipelines'),

    url(r'^CancelPipelines/?$',
        views.view_cancel_pipelines,
        name='CancelPipelines'),

    url(r'^executepipeline/?$',
        view_execute_pipeline.view_execute_pipeline,
        name='ExecutePipeline'),

    url(r'^getexecutepipelineresults/?$',
        views.view_get_execute_pipeline_results,
        name='GetExecutePipelineResults'),

    url(r'^exportpipeline/?$',
        views.view_export_pipeline,
        name='ExportPipeline'),

    url(r'^DescribeDataflow/?$',
        views.view_describe_dataflow,
        name='DescribeDataflow'),

    url(r'^GetDataflowResults/?$',
        views.view_get_dataflow_results,
        name='GetDataflowResults'),

    url(r'^',
        views.view_test_call,
        name='view_test_call'),


)
