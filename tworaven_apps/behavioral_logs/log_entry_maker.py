from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.behavioral_logs.forms import BehavioralLogEntryForm
from tworaven_apps.behavioral_logs.log_formatter \
    import BehavioralLogFormatter as LogFormatter
from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.raven_auth.models import User

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

class LogEntryMaker:
    """util for creating BehavioralLogEntry objects"""

    def __init__(self,):
        pass

    @staticmethod
    def create_ta2ta3_entry(user, log_data):
        """Add a TA2TA3 entry"""
        assert isinstance(user, User), \
            "user must be a User object"
        assert isinstance(log_data, dict), \
            "log_data must be a dict object"

        # set entry type
        log_data['type'] = bl_static.ENTRY_TYPE_TA23API

        f = BehavioralLogEntryForm(log_data)
        if not f.is_valid():
            err_msg = 'Log entry params are not valid: %s' % \
                        (dict(f.errors))
            print(f'ERROR!: {err_msg}')
            return err_resp(err_msg)

        new_entry = BehavioralLogEntry(**log_data)
        new_entry.user = user

        new_entry.save()

        user_msg = 'Log entry saved!'

        return ok_resp(new_entry)
