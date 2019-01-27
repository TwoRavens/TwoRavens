"""Helper for winter 2019 config loaded through env variables

Conforming to the 1/12/19 version of:
    - https://datadrivendiscovery.org/wiki/display/work/Evaluation+Workflow
"""
from os.path import isdir, isfile
from django.conf import settings

from tworaven_apps.utils.basic_response import BasicErrCheck

from tworaven_apps.configurations.models_d3m import \
    (D3MConfiguration)
from tworaven_apps.configurations.static_vals import \
    (D3M_VARIABLE_LIST,
     D3M_DIRECTORY_VARIABLES,
     D3M_OUTPUT_SUBDIRECTORIES)


class EnvConfigLoader(BasicErrCheck):
    """Create a config based on environment variables
    - Verify required directories
    - Create any needed subdirectories"""

    def __init__(self):
        """Make that config"""
        self.run_make_config()


    def run_make_config(self):
        if self.has_error():
            return

        if not self.verify_variable_existence():
            return

        self.verify_problem_path()

    def verify_problem_path(self):
        """Verify the problem path"""
        if self.has_error():
            return False

        if not isfile(settings.D3MPROBLEMPATH):
            user_msg = ('D3MPROBLEMPATH file non-existent or'
                        ' can\'t be reached') % settings.D3MPROBLEMPATH
            self.add_err_msg(user_msg)
            return False

        return True


    def verify_variable_existence(self):
        """Iterate through env variables and make sure they exist.
        If it's a directory, make sure it exists.
        """
        if self.has_error():
            return False

        for attr in D3M_VARIABLE_LIST:

            # Is it in settings?
            #
            if not hasattr(settings, attr):
                user_msg = 'Variable must be in settings: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # Is a value set?
            #
            attr_val = getattr(settings, attr)
            if not attr_val:
                user_msg = 'Environment variable must be set: %s' % attr
                self.add_err_msg(user_msg)
                return False

            # If it's a directory, does it exist?
            #
            if attr in D3M_DIRECTORY_VARIABLES:
                if not isdir(attr_val):
                    user_msg = 'Directory not found for variable %s: %s' % \
                            (attr, attr_val)
                    self.add_err_msg(user_msg)
                    return False

        return True


    def verify_env_directories(self):
        """Check that the high-level directories exist"""
        if self.has_error():
            return False

        for attr in D3M_DIRECTORY_VARIABLES:
            if not hasattr(settings, attr):
                user_msg = 'Variable must be in settings: %s' % attr
                self.add_err_msg(user_msg)
                return False
            elif not getattr(settings, attr):
                user_msg = 'Environment variable must be set: %s' % attr
                self.add_err_msg(user_msg)
                return False
        return True
