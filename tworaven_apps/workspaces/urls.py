from django.conf.urls import url
from tworaven_apps.workspaces import views

urlpatterns = (

    # We're listing each call here for now but may change in the future
    #
    url(r'^test-show-workspace/?$',
        views.view_session_info,
        name='view_session_info'),

)
