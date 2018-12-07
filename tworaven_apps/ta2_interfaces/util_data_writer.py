import csv
import io
from datetime import datetime
from os.path import join
from tworaven_apps.ta2_interfaces.basic_problem_writer import BasicProblemWriter
from tworaven_apps.ta2_interfaces.static_vals import KEY_DATA
from tworaven_apps.utils import random_info
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)

class UtilDataWriter(BasicErrCheck):
    """
    (1) Data is sent as JSON
    (2) Converted to .csv
    (3) Saved in the "temp_storage_root" as specified in the search_config.json
    """
    def __init__(self, json_data, filename=None):
        """
        json_data - look for "data" key
        """

        self.filename = filename
        self.json_data = json_data
        self.write_directory = None
        self.csv_data = None # list of lists
        self.final_info = None

        self.basic_check()
        self.run_process()

    def get_final_info(self):
        """
        Return the final dict: filepath + timestamp
        """
        assert not self.has_error(),\
            "Check 'has_error()' before calling get_final_info"

        if not self.final_info:
            user_msg = 'Serious problem. "final_info" is empty.'
            self.add_error_message(user_msg)
            return self.get_final_info()

        return self.final_info

    def basic_check(self):
        """
        error check...
        """
        if not self.json_data:
            self.add_error_message('json_data not specified')
            return

        if not isinstance(self.json_data, (list, tuple)):
            user_msg = 'The data was not a list (or tuple)'
            self.add_error_message(user_msg)
            return

        if not self.filename:
            self.filename = 'data_%s_%s.csv' % \
                    (random_info.get_timestamp_string(),
                     random_info.get_alphanumeric_string(5))


    def run_process(self):
        """
        Run through the process
        """
        if self.has_error():
            return

        self.load_to_csv()
        if self.has_error():
            return

        self.format_write_directory()
        if self.has_error():
            return

        self.write_data()


    def write_data(self):
        """
        Use the BasicProblemWriter to write the file
        """
        params = dict(write_directory=self.write_directory)
        bpw = BasicProblemWriter(self.filename,
                                 self.csv_data,
                                 **params)

        if bpw.has_error():
            self.add_error_message(bpw.error_message)
            return

        self.final_info = dict(filename=bpw.new_filepath,
                               timestamp=datetime.now())



    def format_write_directory(self):
        """
        Create a subdirectory under temp_storage_root
        """
        d3m_config = get_latest_d3m_config()
        if not d3m_config:
            user_msg = ('Couldn\'t create directory.'
                        ' No D3M config available to'
                        ' get the temp_storage_root')
            self.add_error_message(user_msg)
            return

        if not d3m_config.temp_storage_root:
            user_msg = ('Couldn\'t create directory.'
                        ' No temp_storage_root in the D3M config')
            self.add_error_message(user_msg)
            return

        self.write_directory = join(d3m_config.temp_storage_root, 'ta3_data')


    def load_to_csv(self):
        """Load JSON data to a csv - needs transposing

        json_data example: [["Gender","NA","NA"],["Grade","5.13492063492064","5.13492063492064"],["Age","10.4259259259259","10.4259259259259"],["Race","NA","NA"],["Urban/Rural","NA","NA"],["School","NA","NA"],["Goals","NA","NA"],["Grades","2.6031746031746","2.6031746031746"],["Sports","2.05026455026455","2.05026455026455"],["Looks","2.11640211640212","2.11640211640212"],["Money","3.23015873015873","3.23015873015873"]]
        """
        if self.has_error():
            return

        if not self.json_data:
            user_msg = 'The data list is empty'
            self.add_error_message(user_msg)
            return

        # Flip the rows and columns
        #
        try:
            flipped_data = list(map(list, zip(*self.json_data)))
        except TypeError as ex_obj:
            user_msg = ('Failed to transpose the data.'
                        ' The data should be a row of rows.'
                        ' Error: %s') % (ex_obj,)
            self.add_error_message(user_msg)
            return

        csv_output = io.StringIO()

        try:
            csv_writer = csv.writer(csv_output, delimiter=',')
            csv_writer.writerows(flipped_data)
            self.csv_data = csv_output.getvalue()
        except csv.Error as ex_obj:
            user_msg = 'Error create csv data (csv.Error): %s' % ex_obj
            self.add_error_message(user_msg)
            return
        except ValueError as ex_obj:
            user_msg = 'Error create csv data (ValueError): %s' % ex_obj
            self.add_error_message(user_msg)
            return
