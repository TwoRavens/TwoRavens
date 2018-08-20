from django.conf.urls import url
from tworaven_apps.content_pages import views

urlpatterns = (

    url(r'^dev-raven-links$',
        views.view_dev_raven_links,
        name='view_dev_raven_links'),

    url(r'^monitoring/alive$',
        views.view_monitoring_alive,
        name='view_monitoring_alive'),

    url(r'^privacy-policy$',
        views.view_privacy_policy,
        name='view_privacy_policy'),

    url(r'^test-callback$',
        views.view_test_callback,
        name='view_test_callback'),

    url(r'^app-domain-config-error-test$',
        views.view_no_domain_config_error_test,
        name='view_no_domain_config_error_test'),

    url(r'^app-domain-config-error$',
        views.view_no_domain_config_error,
        name='view_no_domain_config_error'),

    url(r'^d3m-configuration-error$',
        views.view_d3m_config_error,
        name='view_d3m_config_error'),

    url(r'^d3m-configuration-error-test$',
        views.view_d3m_config_error_test,
        name='view_d3m_config_error_test'),

    url(r'^err-500-test$',
        views.view_err_500_test,
        name='view_err_500_test'),

    url(r'^$',
        views.view_pebbles_home,
        name='home'),
)
