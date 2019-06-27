"""
Help with zelig app names, including routing to the Rook server
"""
from django.conf import settings
from tworaven_apps.rook_services import app_names
from tworaven_apps.rook_services.app_names import \
     HEALTH_CHECK_APP



class RookAppInfo(object):
    """for convenience"""

    def __init__(self, app_info):
        """app_info is a list/tuple of 3 items:
          - (app name, frontend url suffix, rook url suffix)
          - e.g. ('ZELIG_APP', 'zeligapp', 'zeligapp')
        """
        assert app_info is not None, 'app_info cannot be None'
        assert len(app_info) == 3, 'app_info requires a length of 3'

        self.name = app_info[0]
        self.frontend_name = app_info[1]
        self.rook_name = app_info[2]


    def record_this_call(self):
        """Should this call be recorded?"""
        if not settings.RECORD_R_SERVICE_ROUTING:
            return False

        if self.is_health_check():
            return False

        return True

    def is_health_check(self):
        """Is this a call to the health check app?"""
        if self.name:
            if self.name == app_names.HEALTH_CHECK_APP:
                return True
        return False

    def is_partials_app(self):
        """Is this a call to the health check app?"""
        return self.name and self.name == app_names.PARTIALS_APP
        #if self.name:
        #    if self.name == app_names.PARTIALS_APP:
        #        return True
        #return False


    def get_rook_server_url(self):
        """Return the url for the rook server"""
        return '{0}{1}'.format(settings.R_DEV_SERVER_BASE,
                               self.rook_name)

    @staticmethod
    def get_appinfo_from_url(frontend_name):
        """e.g. given 'zelig' in url, return the RookAppInfo using zelig info
        Used for logging/tracking
        """

        info = app_names.ROOK_APP_FRONTEND_LU.get(frontend_name, None)
        if info:
            return RookAppInfo(info)

        return None


    @staticmethod
    def get_appinfo_from_name(app_name):
        """e.g. given 'zelig' in url, return ZELIG_APP
        Used for logging/tracking
        """
        info = app_names.ROOK_APP_NAME_LOOKUP.get(app_name, None)
        if info:
            return RookAppInfo(info)

        return None
