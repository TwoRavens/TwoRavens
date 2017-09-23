from django.conf.urls import url
from tworaven_apps.ta2_interfaces import views

urlpatterns = (

    url(r'list$',
        views.view_grpc_test_links,
        name="view_grpc_test_links"),
    # We're listing each call here for now but may change in the future
    #
    url(r'^startsession/?$',
        views.view_startsession,
        name='StartSession'),

    url(r'^endsession/?$',
        views.view_endsession,
        name='EndSession'),

    url(r'^updateproblemschema/?$',
        views.view_update_problem_schema,
        name='UpdateProblemSchema'),

    url(r'^createpipeline/?$',
        views.view_create_pipeline,
        name='CreatePipelines'),

    url(r'^getexecutepipelineresults/?$',
        views.view_get_execute_pipeline_results,
        name='GetExecutePipelineResults'),

    url(r'^listpipelines/?$',
        views.view_list_pipelines,
        name='ListPipelines'),

    url(r'^',
        views.view_test_call,
        name='view_test_call'),


)
