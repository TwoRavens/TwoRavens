from django.conf.urls import url
from tworaven_apps.content_pages import views

urlpatterns = (

    url(r'^dev-raven-links$',
        views.view_dev_raven_links,
        name='view_dev_raven_links'),

    url(r'^monitoring/alive$',
        views.view_monitoring_alive,
        name='view_monitoring_alive'),

    url(r'^d3m-configuration-error$',
        views.view_d3m_config_error,
        name='view_d3m_config_error'),

    url(r'^$',
        views.view_pebbles_home,
        name='home'),
)
