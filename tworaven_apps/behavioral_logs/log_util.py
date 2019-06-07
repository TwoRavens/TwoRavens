"""
Convenience methods for logging
"""
import io
import csv
from tworaven_apps.behavioral_logs import static_vals as bl_static
from tworaven_apps.behavioral_logs.models import BehavioralLogEntry


class BehavioralLogUtil():
    """Methods for working with BehavioralLogEntry objects"""

    def __init__(self):
        """Mostly static methods"""
        #pass

    @staticmethod
    def format_items_as_csv_string(items):
        """Format a list of objects into a csv line"""
        assert isinstance(items, list), \
            "Must be a list of items (format_items_as_csv_string)"

        output = io.StringIO()

        writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
        writer.writerow(items)

        csv_line = output.getvalue()

        return csv_line

    @staticmethod
    def get_header_line():
        """Format object into csv line"""

        csv_data = ['created',
                    'feature_id',
                    'type',
                    'activity_l1',
                    'activity_l2',
                    'mandatory']

        return BehavioralLogUtil.format_items_as_csv_string(csv_data)

    @staticmethod
    def get_csv_line(log_entry):
        """Format object into csv line"""
        # ref: https://stackoverflow.com/questions/9157314/how-do-i-write-data-into-csv-format-as-string-not-file
        #timestamp,feature_id,type,activity_l1
        #2019-04-19T17:15:59.739Z,LIST_DATASETS,SYSTEM,DATA_PREPARATION

        assert isinstance(log_entry, BehavioralLogEntry), \
            "Must be a BehavioralLogEntry object (get_csv_line)"


        csv_data = [log_entry.created,
                    log_entry.feature_id,
                    log_entry.type,
                    log_entry.activity_l1,
                    log_entry.activity_l2,
                    'F' if log_entry.is_optional else 'T'
                    ]

        return BehavioralLogUtil.format_items_as_csv_string(csv_data)
