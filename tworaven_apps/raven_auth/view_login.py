import warnings
from django.conf import settings
from django.contrib.auth.views import LoginView
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import REDIRECT_FIELD_NAME
from tworaven_apps.configurations.models import AppConfiguration


class LoginViewExtraContext(LoginView):
    """Subclass the Django LoginView to add extra context data"""

    def get_context_data(self, **kwargs):
        """Add extra context here"""
        context = super().get_context_data(**kwargs)

        app_config = AppConfiguration.get_config()

        # add variable checking for the d3m_domain
        #
        context['is_d3m_domain'] = app_config and app_config.is_d3m_domain()
        context['just_logged_out'] = 'just_logged_out' in self.request.GET
        context['ALLOW_SOCIAL_AUTH'] = settings.ALLOW_SOCIAL_AUTH

        return context
