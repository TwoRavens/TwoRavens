from django.conf.urls import url
from tworaven_apps.behavioral_logs import views

urlpatterns = (

    # List
    url(r'^new-entry$',
        views.view_new_log_entry,
        name='view_new_log_entry'),
)
