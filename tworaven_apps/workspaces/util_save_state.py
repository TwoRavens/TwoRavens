"""
Save the TwoRavens workspace to a session
"""
import json
from collections import OrderedDict

from tworaven_apps.rook_services.models import UI_KEY_SOLA_JSON, ROOK_ZESSIONID
from tworaven_apps.workspaces.models import \
    SESSION_KEY_ZPARAMS, SESSION_KEY_ALL_NODES, SESSION_KEY_LIST,\
    UI_KEY_ZDATA
from tworaven_apps.utils.view_helper import get_session_key

class WorkspaceUtil(object):
    """Prelim object for saving sessions"""

    def __init__(self, request_obj):
        """Save state based on the Django request object"""
        self.request_obj = request_obj
        self.session_key = get_session_key(request_obj)
        #self.update_session()

    def update_session(self):
        """Update the session information"""
        assert self.request_obj, "self.request_obj cannot be None"

        req = self.request_obj

        if UI_KEY_SOLA_JSON in req.POST:
            return self.check_session_for_data(req.POST[UI_KEY_SOLA_JSON])

        return False, 'No key for "%s"' % UI_KEY_SOLA_JSON

    def check_session_for_data(self, json_data_str):
        if not json_data_str:
            return False, 'No json_data_str'
        #import ipdb; ipdb.set_trace()
        try:
            json_data = json.loads(json_data_str, object_pairs_hook=OrderedDict)
        except TypeError:
            return False, 'failed to convert info to JSON'

        # ----------------------------------------------
        # Save the 'zparams' from the UI
        #   - Identified by existince of 'zdata' key
        # ----------------------------------------------
        if UI_KEY_ZDATA in json_data:
            # save to session!
            self.request_obj.session[SESSION_KEY_ZPARAMS] = json_data

            #print('self.request_obj.session[SESSION_KEY_ZPARAMS]', self.request_obj.session[SESSION_KEY_ZPARAMS])
            return True, None

        # ----------------------------------------------
        # Is this 'allNodes'?
        # Identify allNodes.  It is a list of dicts, where each dict should
        # contain the attribute 'name'
        # ----------------------------------------------
        if isinstance(json_data, list):
            if len(json_data) > 0 and 'name' in json_data[0]:
                # save to session!
                self.request_obj.session[SESSION_KEY_ALL_NODES] = json_data
                return True, None



        return False, 'No %s info to save' % UI_KEY_ZDATA
        # save allnodes
        #
        #if SESSION_KEY_ZPARAMS_KEY in req.POST:
        #    req.session[SESSION_KEY_ALL_NODES] = req.POST[SESSION_KEY_ALL_NODES]


    @staticmethod
    def clear_session_data(request_obj):
        """Clear the TwoRavens keys"""

        # iterate through key list
        for sess_key in SESSION_KEY_LIST:
            # does it exist?
            if sess_key in self.request_obj.session:
                # yes, delete it
                del self.request_obj.session[sess_key]

    @staticmethod
    def record_state(request_obj):
        """Save app state in the session"""
        assert request_obj, 'request_obj cannot be None'

        util = WorkspaceUtil(request_obj)

        return util.update_session()
