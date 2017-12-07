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
from tworaven_apps.utils.view_helper import (\
    get_session_key, get_request_body_as_json)


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
        if not domain_identifier:
            return False, "domain_identifier is None"

        # ---------------------------------------
        # (1) Look for an existing SavedWorkspace by:
        #    session and DataSourceType
        # ---------------------------------------

        # (1)(a) Look for an existing DataSourceType
        # ---------------------------------------
        ds_type = DataSourceType.objects.filter(\
                        name=domain_identifier['name'],
                        source_url=domain_identifier['source_url']).first()
        if ds_type:
            # DataSourceType found, use it + session key to find an existing workspace
            #
            params = dict(app_domain=app_domain,
                          session_key=self.session_key,
                          data_source_type=ds_type)

            # (1)(b) Look for an existing SavedWorkspace by session and problem
            # ---------------------------------------
            saved_workspace = SavedWorkspace.objects.filter(**params).first()
            if saved_workspace: # Got it!! Workspace found
                return True, saved_workspace


        # ---------------------------------------
        # (2) Look for an existing SavedWorkspace by:
        #    logged-in user and DataSourceType
        #     Retrieve or create a DataSourceType
        # sample value:
        # domain_identifier = {"name": "o_185",
        #                      "source_url": "/config/d3m-config/details/json/1",
        #                      "description": "D3M config file"}
        # ---------------------------------------
        # (2)(a) Retrieve the DataSourceType if not already found
        # ---------------------------------------
        if not ds_type:
            ds_type, _ = DataSourceType.objects.get_or_create(\
                                name=domain_identifier['name'],
                                source_url=domain_identifier['source_url'])

        # Update the description
        ds_type.description = domain_identifier.get('description', 'n/a')

        ds_type.save()

        assert self.loggedin_user, "Only D3M right now, requires logged in user"
        params2 = dict(app_domain=app_domain,
                       user=self.loggedin_user,
                       data_source_type=ds_type)

        saved_workspace, _ = SavedWorkspace.objects.get_or_create(**params2)

        # could be an existing workspace that needs an updated session key
        #
        saved_workspace.session_key = self.session_key

        return True, saved_workspace


    def update_session(self):
        """Update the session information"""
        assert self.request_obj, "self.request_obj cannot be None"

        # -----------------------------
        # Retrieve the request.body and
        # convert it to JSON (python OrderedDict)
        # -----------------------------
        success, json_data_or_err = get_request_body_as_json(self.request_obj)
        if not success:
            return False, json_data_or_err

        # rename...
        json_data = json_data_or_err

        # -----------------------------
        # Check the app_domain
        # -----------------------------
        app_domain = None
        if UI_KEY_APP_DOMAIN in json_data:
            app_domain = json_data[UI_KEY_APP_DOMAIN]

        if not app_domain:
            return False, 'No "app_domain" found in request POST. (%s)' % \
                   json_data.keys()

        if not AppConfiguration.is_valid_app_domain(app_domain):
            return False, 'This "app_domain" is not valid: %s' % (app_domain)

        # -----------------------------
        # Check the domainIdentifier
        # -----------------------------
        domain_identifier = None
        if UI_KEY_DOMAIN_IDENTIFIER in json_data:
            domain_identifier = json_data[UI_KEY_DOMAIN_IDENTIFIER]

        if not domain_identifier:
            return False, ('No "domainIdentifier" found'
                           ' in request POST. (%s)' % \
                           json_data.keys())


        # -----------------------------
        # Check for a saved workspace
        # -----------------------------
        success, saved_workspace_or_err = self.get_saved_workspace(\
                                            app_domain, domain_identifier)
        if not success:
            return False, saved_workspace_or_err

        saved_workspace = saved_workspace_or_err

        # -----------------------------
        # Update the data
        # -----------------------------
        info_found = False
        keys_updated = []
        for ui_key in UI_KEY_LIST:
            if ui_key in json_data:
                # This is a string
                single_item_json = json_data[ui_key]

                saved_workspace.__dict__[ui_key] = single_item_json
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
