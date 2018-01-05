"""URLs for the UI to initiate TA2 calls"""
from django.conf.urls import url
from tworaven_apps.ta2_interfaces import views, view_execute_pipeline

urlpatterns = (

    # We're listing each call here for now but may change in the future
    #
    url(r'^startsession/?$',
        views.view_startsession,
        name='StartSession'),

    url(r'^endsession/?$',
        views.view_endsession,
        name='EndSession'),

    url(r'^SetProblemDoc/?$',
        views.view_set_problem_doc,
        name='SetProblemDoc'),

    url(r'^createpipeline/?$',
        views.view_create_pipeline,
        name='CreatePipelines'),

    url(r'^GetCreatePipelineResults/?$',
        views.view_get_create_pipeline_results,
        name='GetCreatePipelineResults'),

    url(r'^listpipelines/?$',
        views.view_list_pipelines,
        name='ListPipelines'),

    url(r'^deletepipelines/?$',
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
