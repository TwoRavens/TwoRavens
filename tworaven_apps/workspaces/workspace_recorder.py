"""
Save the TwoRavens workspace to a session
"""
import json
from collections import OrderedDict

from tworaven_apps.workspaces.models import (\
    DataSourceType, SavedWorkspace)
from tworaven_apps.configurations.models import AppConfiguration
from tworaven_apps.workspaces.models import \
    (UI_KEY_APP_DOMAIN, UI_KEY_LIST, UI_KEY_DOMAIN_IDENTIFIER)

from tworaven_apps.utils.view_helper import get_session_key

class WorkspaceRecorder(object):
    """Prelim object for saving sessions"""

    def __init__(self, request_obj):
        """Save state based on the Django request object"""

        self.request_obj = request_obj
        self.session_key = get_session_key(request_obj)

        # Set user
        if request_obj.user.is_authenticated():
            self.is_authenticated = True
            self.loggedin_user = request_obj.user
        else:
            self.is_authenticated = False
            self.loggedin_user = None

    def get_saved_workspace(self, app_domain, domain_identifier):
        """Retrieve or create a SavedWorkspace object"""

        params = dict(app_domain=app_domain,
                      session_key=self.session_key)

        # (1) Look for an existing SavedWorkspace by session
        #
        saved_workspace = SavedWorkspace.objects.filter(**params).first()
        if saved_workspace:
            return True, saved_workspace


        # (2) Get or create object with domain and user
        #   - TO DO: Add problem id!!!
        # ------------------------------

        # ---------------------------------------
        # (2a) Parse the domain_identifier and
        #      Retrieve or create a DataSourceType
        # sample value:
        # domain_identifier = {"name": "o_185",
        #                      "source_url": "/config/d3m-config/details/json/1",
        #                      "description": "D3M config file"}
        # ---------------------------------------
        try:
            ds_json = json.loads(domain_identifier)
        except TypeError:
            return False, 'domain_identifier is not valid JSON: %s' % domain_identifier

        ds_type, _ = DataSourceType.objects.get_or_create(\
                            name=ds_json['name'],
                            source_url=ds_json['source_url'])

        ds_type.description = ds_json.get('description', 'n/a')

        ds_type.save()

        assert self.loggedin_user, "Only D3M right now, requires logged in user"
        params2 = dict(app_domain=app_domain,
                       user=self.loggedin_user,
                       data_source_type=ds_type)

        saved_workspace, created = SavedWorkspace.objects.get_or_create(**params2)

        # could be an existing workspace that needs an updated session key
        #
        saved_workspace.session_key = self.session_key

        return True, saved_workspace


    def update_session(self):
        """Update the session information"""
        assert self.request_obj, "self.request_obj cannot be None"

        if not self.request_obj.POST:
            return False, "request does not contain POST data"

        # Check the app_domain
        #
        app_domain = None
        if UI_KEY_APP_DOMAIN in self.request_obj.POST:
            app_domain = self.request_obj.POST[UI_KEY_APP_DOMAIN]

        if not app_domain:
            return False, 'No "app_domain" found in request POST. (%s)' % \
                   self.request_obj.POST.keys()

        if not AppConfiguration.is_valid_app_domain(app_domain):
            return False, 'This "app_domain" is not valid: %s' % (app_domain)

        # Check the domainIdentifier
        #
        domain_identifier = None
        if UI_KEY_DOMAIN_IDENTIFIER in self.request_obj.POST:
            domain_identifier = self.request_obj.POST[UI_KEY_DOMAIN_IDENTIFIER]

        if not domain_identifier:
            return False, ('No "domainIdentifier" found'
                           ' in request POST. (%s)' % \
                           self.request_obj.POST.keys())


        success, saved_workspace_or_err = self.get_saved_workspace(app_domain, domain_identifier)
        if not success:
            return False, saved_workspace_or_err

        saved_workspace = saved_workspace_or_err

        info_found = False
        keys_updated = []
        for ui_key in UI_KEY_LIST:
            if ui_key in self.request_obj.POST:
                # This is a string
                json_data_str = self.request_obj.POST[ui_key]

                # Attempt to conver to JSON (e.g. python OrderedDict or [])
                try:
                    json_data = json.loads(json_data_str,
                                           object_pairs_hook=OrderedDict)
                except TypeError:
                    print('failed JSON conversion!')
                    return False, 'failed to convert info to JSON'

                saved_workspace.__dict__[ui_key] = json_data
                info_found = True
                keys_updated.append(ui_key)

        if info_found:
            saved_workspace.save()
            return True, 'keys updated: %s' % (keys_updated)

        return False, "Data keys not found: %s" % (UI_KEY_LIST,)


    @staticmethod
    def record_workspace(request_obj):
        """Save app state in the session"""
        assert request_obj, 'request_obj cannot be None'
        #print(request_obj.POST)
        #print(request_obj.POST.keys())
        wspace_recorder = WorkspaceRecorder(request_obj)

        return wspace_recorder.update_session()
