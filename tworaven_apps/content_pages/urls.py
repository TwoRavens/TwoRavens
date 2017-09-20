from django.conf.urls import url
from tworaven_apps.content_pages import views

urlpatterns = (

    url(r'^monitoring/alive$',
        views.view_monitoring_alive,
        name='view_monitoring_alive'),

    url(r'^$',
        views.view_pebbles_home,
        name='home'),
)
