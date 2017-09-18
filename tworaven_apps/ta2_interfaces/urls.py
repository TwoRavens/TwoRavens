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
        name='view_startsession'),

    url(r'^updateproblemschema/?$',
        views.view_update_problem_schema,
        name='view_update_problem_schema'),

    url(r'^',
        views.view_test_call,
        name='view_test_call'),


)
