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
import io
import csv
from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry
from tworaven_apps.utils.basic_err_check import BasicErrCheck


class BehavioralLogFormatter(BasicErrCheck):
    """Methods for working with BehavioralLogEntry objects"""

    def __init__(self, **kwargs):
        """Initialize with either:
            log_entry: BehavioralLogEntry or
            log_entries: queryset of BehavioralLogEntry objects
        """
        self.log_entries = None
        self.csv_content = None

        log_entry = kwargs.get('log_entry')
        if log_entry:
            self.log_entries = [log_entry]
        else:
            self.log_entries = kwargs.get('log_entries')

        if not self.log_entries:
            self.add_err_msg(self.__init__.__doc__)

        self.run_process()

    def get_csv_content(self):
        """Get the csv content"""
        assert self.has_error() is False, \
            ('Check that has_error() is False before calling'
             ' this method!  (BehavioralLogFormatter)')

        return self.csv_content

    def run_process(self):
        """Format the content into a csv file"""
        if self.has_error():
            return

        self.csv_content = self.get_csv_content_from_log_entries()


    def get_csv_content_from_log_entries(self):
        """Format a list of lists into a csv line"""
        if self.has_error():
            return None

        content_to_format = [self.get_header_line_items()]
        for log_entry in self.log_entries:
            fmt_items = self.get_log_entry_as_list(log_entry)
            if self.has_error():
                return
            content_to_format.append(fmt_items)

        output = io.StringIO()

        writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
        writer.writerows(content_to_format)

        csv_lines = output.getvalue()

        return csv_lines


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
                    log_entry.other,
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
