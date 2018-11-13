import json
import collections

from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp,
                                                err_resp_with_data)

from tworaven_apps.eventdata_queries.dataverse.get_dataset_file_info import GetDataSetFileInfo

from tworaven_apps.eventdata_queries.dataverse.dataverse_list_files_dataset import ListFilesInDataset

from tworaven_apps.eventdata_queries.models import ArchiveQueryJob



class RoutineDataverseCheck(BasicErrCheck):
    def __init__(self):
        """Check on every dataverse change with archive query model"""
        self.query_list = []
        self.dataverse_list = []
        self.error_list = []
        self.check_result = True

        self.query_error = False
        self.dataverse_error = False
        self.compare = lambda x, y: collections.Counter(x) == collections.Counter(y)
        self.dataverse_check()



    def dataverse_check(self):
        """user query_id to get the data"""
        # get all the objects in the archive query
        success, query_list = ArchiveQueryJob.get_all_objects()
        if not success:
            self.query_error = True
            self.error_list.append(query_list)
        # get the latest version ID of dataset
        version_id_obj = GetDataSetFileInfo()
        success_version_id, version_number = version_id_obj.get_version_number()
        if not success_version_id:
            self.add_err_msg(version_number)

        # get all files in laterst version ( not in draft )
        list_obj = ListFilesInDataset(version_number)
        success_dataverse_files, file_list = list_obj.return_status()
        if not success_dataverse_files:
            self.dataverse_error = True
            self.error_list.append(file_list)

        if not self.query_error:
            for query_obj in query_list:
                obj = query_obj.as_dict()
                self.query_list.append(obj['datafile_id'])

        if not self.dataverse_error:
            for dataverse_obj in file_list['data']:
                self.dataverse_list.append(dataverse_obj['dataFile']['id'])

        self.check_result = self.compare(self.query_list, self.dataverse_list)

        print("query_list", self.query_list)
        print("dataverse_list", self.dataverse_list)

        print('errors', self.error_list)
        print('result', self.check_result)


    def check_result_status(self):
        if self.check_result:
            user_res = dict(dataverse_datafile_list=self.dataverse_list,
                            archive_query_datafile_list=self.query_list,
                            message='All set to upload')
            return ok_resp(user_res)
        else:
            user_res = dict(dataverse_datafile_list=self.dataverse_list,
                            archive_query_datafile_list=self.query_list,
                            message='Check the missing files')
            return err_resp(user_res)
