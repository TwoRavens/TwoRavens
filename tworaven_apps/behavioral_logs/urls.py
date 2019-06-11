from django.conf.urls import url
from tworaven_apps.behavioral_logs import views

urlpatterns = (

    # Create new log entry
    #
    url(r'^create-new-entry$',
        views.view_create_log_entry,
        name='view_create_log_entry'),

    # Create new log entry and return the log entry object
    #
    url(r'^create-new-entry/verbose$',
        views.view_create_log_entry_verbose,
        name='view_create_log_entry_verbose'),

    # View the user's log for this session
    #
    url(r'^show-log/screen$',
        views.view_show_log_onscreen,
        name='view_show_log_onscreen'),

    # View the user's log for this session
    #
    url(r'^export-log/csv$',
        views.view_export_log_csv,
        name='view_export_log_csv'),

)
