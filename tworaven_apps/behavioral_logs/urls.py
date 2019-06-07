from django.conf.urls import url
from tworaven_apps.behavioral_logs import views

urlpatterns = (

    # Create new log entry
    url(r'^create-new-entry$',
        views.view_create_log_entry,
        name='view_create_log_entry'),

    # List
    url(r'^create-new-entry/verbose$',
        views.view_create_log_entry_verbose,
        name='view_create_log_entry_verbose'),
)
