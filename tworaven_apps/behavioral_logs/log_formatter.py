"""
Convenience methods for logging

Example:

entries = BehavioralLogEntry.objects.all()
blf = BehavioralLogFormatter(log_entry=entries)
if not blf.has_error():
    print('error: ', blf.get_error_message())
else:
    csv_output = blf.get_csv_content()

"""
from io import StringIO
import csv

from tworaven_apps.raven_auth.models import User

from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)


class BehavioralLogFormatter(BasicErrCheck):
    """Methods for working with BehavioralLogEntry objects"""

    def __init__(self, **kwargs):
        """Initialize with either:
            log_entry: BehavioralLogEntry or
            log_entries: queryset of BehavioralLogEntry objects
        Optional:
            csv_output_object: file, Django response object
        """
        # csv input
        self.log_entries = [kwargs['log_entry']] if 'log_entry' in kwargs \
                            else kwargs.get('log_entries')

        # Can these be retrieved as String
        self.can_return_as_string = False

        # output: where to write the csv,
        #    can be a file, StringIO, Django response
        self.csv_output_object = kwargs.get('csv_output_object', StringIO())

        self.initial_prep(**kwargs)
        self.run_process()


    @staticmethod
    def get_log_entries(user, session_key=None):
        """Return BehavioralLogEntry objects based on user, or session_key
        if available"""
        if not isinstance(user, User):
            user_msg = ('user must be a User object '
                        '(LogFormatter.get_log_entries)')
            return err_resp(user_msg)

        params = dict(user=user)
        #if session_key:
        #    params['session_key'] = session_key

        return ok_resp(BehavioralLogEntry.objects.filter(**params))


    def initial_prep(self, **kwargs):
        """Init object values"""
        if self.has_error():
            return

        # check that input exists
        #
        if not self.log_entries:
            self.add_err_msg(self.__init__.__doc__)
            return

        if isinstance(self.csv_output_object, StringIO):
            self.can_return_as_string = True


    def get_csv_output_object(self):
        """Return the csv output objects"""
        assert not self.has_error(), \
            ('Check that has_error() is False before calling'
             ' this method!  (BehavioralLogFormatter)')

        return self.csv_output_object


    def get_csv_content(self):
        """Get the csv content.  Works when 'csv_output_object' is a
        'io.StringIO' instance, which is the default value"""

        assert self.has_error() is False, \
            ('Check that has_error() is False before calling'
             ' this method!  (BehavioralLogFormatter)')

        assert self.can_return_as_string is True, \
            ('Cannot use this method if writing to a file or Django response'
             ' object! (BehavioralLogFormatter)')

        return self.csv_output_object.getvalue()



    def run_process(self):
        """Format the content into a csv file"""
        if self.has_error():
            return

        self.create_csv_content_from_log_entries()


    def create_csv_content_from_log_entries(self):
        """Format a list of lists into a csv line"""
        if self.has_error():
            return None

        content_to_format = [self.get_header_line_items()]
        for log_entry in self.log_entries:
            fmt_items = self.get_log_entry_as_list(log_entry)
            if self.has_error():
                return
            content_to_format.append(fmt_items)

        writer = csv.writer(self.csv_output_object,
                            quoting=csv.QUOTE_NONNUMERIC)

        writer.writerows(content_to_format)


    def get_log_entry_as_list(self, log_entry):
        """Format log entry into a list for the csv writer"""
        if not isinstance(log_entry, BehavioralLogEntry):
            user_msg = 'log_entry must be a BehavioralLogEntry object'
            self.add_err_msg(user_msg)
            return None

        csv_data = [log_entry.created,
                    log_entry.feature_id,
                    log_entry.type,
                    log_entry.activity_l1,
                    log_entry.activity_l2,
                    log_entry.other_to_string(),
                    'F' if log_entry.is_optional else 'T'
                    ]

        return csv_data

    def get_header_line_items(self):
        """Format object into csv line"""

        return ['created',
                'feature_id',
                'type',
                'activity_l1',
                'activity_l2',
                'other',
                'mandatory']
