"""
Save the TwoRavens workspace to a session
"""
import json
from collections import OrderedDict

from tworaven_apps.rook_services.models import UI_KEY_SOLA_JSON, ROOK_ZESSIONID
from tworaven_apps.workspaces.models import KEY_SESSION_WORKSPACE,\
    KEY_ZDATA, KEY_ALL_NODES, UI_KEY_ZDATA
from tworaven_apps.utils.view_helper import get_session_key

class WorkspaceUtil(object):
    """Prelim object for saving sessions"""

    def __init__(self, request_obj):
        """Save state based on the Django request object"""
        self.request_obj = request_obj
        self.session_key = get_session_key(request_obj)
        self.update_session()

    def update_session(self):
        """Update the session information"""
        assert self.request_obj, "self.request_obj cannot be None"

        req = self.request_obj

        if UI_KEY_SOLA_JSON in req.POST:
            self.check_session_for_data(req.POST[UI_KEY_SOLA_JSON])

    def check_session_for_data(self, json_data_str):
        if not json_data_str:
            return False, 'No json_data_str'
        #import ipdb; ipdb.set_trace()
        try:
            json_data = json.loads(json_data_str, object_pairs_hook=OrderedDict)
        except TypeError:
            return False, 'failed to convert info to JSON'

        # Save the zdata
        #
        if UI_KEY_ZDATA in json_data:
            self.request_obj.session[KEY_ZDATA] = json_data

            print('self.request_obj.session[KEY_ZDATA]', self.request_obj.session[KEY_ZDATA])
            return True, None

        return False, 'No %s info to save' % UI_KEY_ZDATA
        # save allnodes
        #
        #if KEY_ZDATA_KEY in req.POST:
        #    req.session[KEY_ALL_NODES] = req.POST[KEY_ALL_NODES]

    @staticmethod
    def record_state(request_obj):
        assert request_obj, 'request_obj cannot be None'

        util = WorkspaceUtil(request_obj)
