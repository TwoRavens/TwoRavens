"""
For testing/displaying session info
"""
import json
from tworaven_apps.workspaces.models import \
    SESSION_KEY_ZPARAMS, SESSION_KEY_ALL_NODES, SESSION_KEY_LIST,\
    UI_KEY_ZDATA

class SessionDisplayInfo(object):
    """Show a single key/val session pair"""

    def __init__(self, session_key, session_data):
        """pull TwoRavens request info for display"""
        self.session_key = session_key
        self.session_data = session_data

        self.data_size = None
        self.data_formatted = None

        self.note = None
        try:
            self.data_formatted = json.dumps(self.session_data, indent=4)
        except TypeError:
            self.data_formatted = None

        if self.session_data:
            self.data_size = len(str(self.session_data))#.get_display_data())

    def is_data_fomatted(self):
        """Get the list!"""
        if self.data_formatted:
            return True

        return False

    def get_display_data(self):
        """Return display data as string"""
        if self.is_data_fomatted():
            return self.data_formatted

        return '%s' % self.session_data



class SessionDisplayList(object):
    """Creates a list of SessionDisplayInfo objects"""

    def __init__(self, request_obj):
        """Pull session info from an HTTPRequest object"""
        assert request_obj, 'request_obj cannot be None'

        self.display_list = []

        self.load_session_info(request_obj)

    def load_session_info(self, request_obj):
        """Based on the session keys, pull session info from the request object"""
        assert request_obj, 'request_obj cannot be None'

        for sess_key in SESSION_KEY_LIST:
            if sess_key in request_obj.session:
                # pull data
                sess_data = request_obj.session[sess_key]

                # pull create SessionDisplayInfo object
                display_info = SessionDisplayInfo(sess_key, sess_data)

                # add SessionDisplayInfo object to list
                self.display_list.append(display_info)

    def get_list(self):
        """Get the list!"""
        return self.display_list
