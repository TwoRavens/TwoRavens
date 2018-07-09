import os
import tempfile
import json
from tworaven_apps.eventdata_queries.dataverse.dataverse_file_upload import DataverseFileUpload
from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

class NamedTemporaryFile(object):

    def __init__(self, query_json):
        """generate temp file"""

        self.success_status = True
        self.temp_obj = None
        # ---------------------------
        # Create the temp file object
        # ---------------------------
        named_temp_file = tempfile.NamedTemporaryFile(delete=False)

        # ---------------------------
        # Retrieve its path
        # ---------------------------
        temp_file_path = named_temp_file.name
        self.msgt('(1) create file')
        print('temp_file_path', temp_file_path)
        print('filesize: ', os.path.getsize(temp_file_path))

        # ---------------------------
        # Write to it
        # ---------------------------
        self.msgt('(2) add data to file')
        # self.dict_to_binary(query_json)
        some_json_str = query_json.encode()
        named_temp_file.write(some_json_str)
        named_temp_file.close()
        print('file written')
        print('does file exist?', os.path.isfile(temp_file_path))
        print('filesize: ', os.path.getsize(temp_file_path))

        # ---------------------------
        # Do something (like send it to Dataverse)
        # ---------------------------
        self.msgt('(3) show file contents')

        temp_obj = DataverseFileUpload(temp_file_path)

        succ, res_obj = temp_obj.return_status()
        self.success_status = succ
        self.temp_obj = res_obj

        print(open(temp_file_path, 'r').read())

        # ---------------------------
        # Delete the temp file
        # ---------------------------
        self.msgt('(4) delete the file')
        os.unlink(temp_file_path)
        print('does file exist?', os.path.isfile(temp_file_path))
        self.dashes()


        # ---------------------------
        # --- Other notes ----
        # ---------------------------
        """
        # If reading a large file, which may be doing from Mongo,
        # then would use something like:
        for block in request.iter_content(1024 * 8):
            # If blocks, then stop
            if not block:
                break
            # Write image block to temporary file
            named_temp_file.write(block)
        """

    def dashes(self): print('-' * 40)

    def msgt(self, amsg): self.dashes(); print(amsg); self.dashes()
    #
    # def dict_to_binary(self, the_dict):
    #     str_out = json.dumps(the_dict)
    #     print(str_out)
    #     return str_out

    def return_status(self):
        if not self.success_status:
            return err_resp(self.temp_obj)
        else:
            return ok_resp(self.temp_obj)

