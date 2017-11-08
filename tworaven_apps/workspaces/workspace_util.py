"""
Save the TwoRavens workspace to a session
"""
import json
from collections import OrderedDict

from tworaven_apps.workspaces.models import UI_SESSION_DICT
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

        session_updated = False
        keys_updated = []
        for ui_key, sess_key in UI_SESSION_DICT.items():
            if ui_key in self.request_obj.POST:
                ui_data = self.request_obj.POST[ui_key]
                success, user_msg = self.store_session_data(ui_data, sess_key)
                if success:
                    session_updated = True
                    keys_updated.append(ui_key)

        if not session_updated:
            return False, 'No updates made.'

        return True, 'keys updated: %s' % (keys_updated)


    def store_session_data(self, json_data_str, sess_key):
        """Store session data under the appropriate key"""
        if not json_data_str:
            return False, 'No json_data_str'

        if not sess_key:
            return False, 'No sess_key'

        try:
            json_data = json.loads(json_data_str, object_pairs_hook=OrderedDict)
        except TypeError:
            print('failed JSON conversion!')
            return False, 'failed to convert info to JSON'

        print('storing %s; data: %s' % (sess_key, json_data_str[:50]))

        self.request_obj.session[sess_key] = json_data
        self.request_obj.session.modified = True


        return True, 'Data stored for key: %s' % sess_key


    @staticmethod
    def clear_session_data(request_obj):
        """Clear the TwoRavens keys"""

        delete_occurred = False
        # iterate through key list
        for sess_key in UI_SESSION_DICT.values():
            # does it exist?
            if sess_key in request_obj.session:
                # yes, delete it
                del request_obj.session[sess_key]
                delete_occurred = True

        if delete_occurred:
            request_obj.session.modified = True

    @staticmethod
    def record_state(request_obj):
        """Save app state in the session"""
        assert request_obj, 'request_obj cannot be None'
        print(request_obj.POST)
        print(request_obj.POST.keys())
        util = WorkspaceUtil(request_obj)

        return util.update_session()
