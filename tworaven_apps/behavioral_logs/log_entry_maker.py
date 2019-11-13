"""
Convenience methods for creating BehavioralLogEntry objects
"""
import csv
import io

from django.conf import settings

from django.core.files.base import ContentFile
from django.utils.text import slugify

from tworaven_apps.utils.random_info import get_timestamp_string

from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.behavioral_logs.forms import BehavioralLogEntryForm
from tworaven_apps.behavioral_logs.log_formatter \
    import BehavioralLogFormatter as LogFormatter
from tworaven_apps.behavioral_logs.log_formatter import BehavioralLogFormatter

from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.raven_auth.models import User
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace

from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

class LogEntryMaker:
    """util for creating BehavioralLogEntry objects"""
    def __init__(self,):
        pass

    @staticmethod
    def create_system_entry(user, log_data):
        """Add a TA2TA3 entry"""
        assert isinstance(log_data, dict),\
            'log_data must be a python dict. (create_system_entry)'

        log_data['is_optional'] = True

        return LogEntryMaker.create_log_entry(\
                        user,
                        bl_static.ENTRY_TYPE_SYSTEM,
                        log_data)

    @staticmethod
    def create_system_entry_with_workspace(user_workspace, log_data):
        """Add a TA2TA3 entry"""
        assert isinstance(log_data, dict),\
            'log_data must be a python dict. (create_system_entry_with_workspace)'

        log_data['is_optional'] = True

        return LogEntryMaker.create_log_entry_with_workspace(\
                        user_workspace,
                        bl_static.ENTRY_TYPE_SYSTEM,
                        log_data)

    @staticmethod
    def create_datamart_entry(user_workspace, log_data):
        """Add a TA2TA3 entry"""
        assert isinstance(log_data, dict),\
            'log_data must be a python dict. (create_datamart_entry)'

        print('log_data', log_data)

        return LogEntryMaker.create_log_entry_with_workspace(\
                        user_workspace,
                        bl_static.ENTRY_TYPE_DATAMART,
                        log_data)

    @staticmethod
    def create_ta2ta3_entry(user, log_data):
        """Add a TA2TA3 entry"""
        assert isinstance(log_data, dict),\
            'log_data must be a python dict. (create_ta2ta3_entry)'

        return LogEntryMaker.create_log_entry(\
                        user,
                        bl_static.ENTRY_TYPE_TA23API,
                        log_data)


    @staticmethod
    def create_log_entry_with_workspace(user_workspace, entry_type, log_data):
        """Add a log entry"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp("user must be a User object")

        return LogEntryMaker.create_log_entry(user_workspace.user,
                                              entry_type,
                                              log_data)

    @staticmethod
    def create_log_entry(user, entry_type, log_data):
        """Create a BehavioralLogEntry object"""
        if not isinstance(user, User):
            return err_resp("user must be a User object")

        if not isinstance(log_data, dict):
            return err_resp("log_data must be a dict object")

        # set entry type
        log_data['type'] = entry_type

        f = BehavioralLogEntryForm(log_data)
        if not f.is_valid():
            err_msg = 'Log entry params are not valid: %s' % \
                        (dict(f.errors))
            print(f'ERROR!: {err_msg}')
            return err_resp(err_msg)

        new_entry = BehavioralLogEntry(**f.cleaned_data)
        new_entry.user = user
        new_entry.save()

        # Write the entry to the Log File
        #
        #LogEntryMaker.write_to_log_file(user_workspace, new_entry)

        # user_msg = 'Log entry saved!'

        return ok_resp(new_entry)

    @staticmethod
    def write_user_log_from_request(request_obj):
        """
        Write out the user log, based on the HttpRequest
        """
        ws_info = get_latest_user_workspace(request_obj)
        if not ws_info.success:
            user_msg = 'User workspace not found: %s' % ws_info.err_msg
            return err_resp(user_msg)

        return LogEntryMaker.write_user_log(ws_info.result_obj)

    @staticmethod
    def write_user_log(user_workspace):
        """Dump the existing log entries to a file or GCE Bucket"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp("user must be a UserWorkspace object")

        # Log file name...
        #
        log_name = slugify((f'{settings.RAVENS_SERVER_NAME}`_'
                            f'{user_workspace.user.id}_'
                            f'{user_workspace.d3m_config.name}_'
                            f'{get_timestamp_string()}'))
        log_name = f'{log_name}.csv'


        # Retrieve the BehavioralLogEntry objects
        #
        log_entry_info = BehavioralLogFormatter.get_log_entries(user_workspace.user)
        if not log_entry_info.success:
            return err_resp(log_entry_info.err_msg)

        # Write the CSV content to a ContentFile object
        #
        csv_output = io.StringIO()
        blf = BehavioralLogFormatter(csv_output_object=csv_output,
                                     log_entries=log_entry_info.result_obj)

        if blf.has_error():
            user_msg = 'Error: %s' % blf.get_error_message()
            return err_resp(user_msg)

        #csv_output = blf.get_csv_output_object()

        user_workspace.behavioral_log.save(log_name, csv_output)

        return ok_resp(log_name)

        """
        try:
            user_workspace.behavioral_log.size
        except ValueError as err_obj:
            return err_resp('File size check failed! %s' % err_obj)

        log_items = BehavioralLogFormatter.get_log_entry_as_list(log_entry)

        writer = csv.writer(user_workspace.behavioral_log,
                            quoting=csv.QUOTE_NONNUMERIC)

        writer.writerows([log_items])
        print('rows written!')

        return ok_resp('written!')


        with open(user_workspace.behavioral_log, "a") as csv_file:
            writer = csv.writer(csv_file, delimiter=',')
        for line in data:
            writer.writerow(line)
        """
