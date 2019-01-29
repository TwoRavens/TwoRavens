import os
import csv
import json
import logging
import shutil

from django.conf import settings
from collections import OrderedDict

from tworaven_apps.utils.view_helper import get_json_error
from tworaven_apps.utils.mongo_util import infer_type
from tworaven_apps.utils.basic_response import (ok_resp,
                                                err_resp)
from tworaven_apps.eventdata_queries.models import \
    (EventDataSavedQuery, ArchiveQueryJob, UserNotification,
     SEARCH_PARAMETERS, SEARCH_KEY_NAME,
     SEARCH_KEY_DESCRIPTION,
     IN_PROCESS, ERROR, COMPLETE,
     DATA_PARTITIONS)
from tworaven_apps.eventdata_queries.dataverse.temporary_file_maker import TemporaryFileMaker
from tworaven_apps.eventdata_queries.dataverse.dataverse_publish_dataset import DataversePublishDataset
from tworaven_apps.eventdata_queries.dataverse.dataverse_list_files_dataset import ListFilesInDataset
from tworaven_apps.eventdata_queries.dataverse.get_dataset_file_info import GetDataSetFileInfo
from tworaven_apps.eventdata_queries.mongo_retrieve_util import MongoRetrieveUtil
from tworaven_apps.eventdata_queries.generate_readme import GenerateReadMe
from tworaven_apps.eventdata_queries.dataverse.routine_dataverse_check import RoutineDataverseCheck
from tworaven_apps.ta2_interfaces.basic_problem_writer import BasicProblemWriter

from tworaven_apps.raven_auth.models import User

from tworaven_apps.user_workspaces.utils import \
    (get_latest_d3m_user_config,)

LOGGER = logging.getLogger(__name__)


class EventJobUtil(object):
    """Convenience class for the eventdata queries """
    dataverse_server = settings.DATAVERSE_SERVER  # no trailing slash
    api_key = settings.DATAVERSE_API_KEY  # generated from kripanshu's account
    persistentId = settings.DATASET_PERSISTENT_ID  # doi or hdl of the dataset


    @staticmethod
    def get_by_id_and_user(query_id, user):
        """get object by id"""
        if not isinstance(user, User):
            user_msg = 'A user was not specified'
            return err_resp(user_msg)

        try:
            saved_query = EventDataSavedQuery.objects.get(\
                                pk=query_id,
                                user=user)
        except EventDataSavedQuery.DoesNotExist:
            user_msg = ('A query was not found for the'
                        ' given query id and user')
            return err_resp(user_msg)

        return ok_resp(saved_query)


    @staticmethod
    def search_objects(user, json_search_info):
        """Search for EventDataSavedQuery objects saved by the given user"""
        if not isinstance(json_search_info, dict):
            user_msg = ('Expected a the search info to be a python dict'
                        ' (unusual error)')
            return err_resp(user_msg)

        if not json_search_info:
            user_msg = 'Please enter at least 1 search term.'
            return err_resp(user_msg)

        if not isinstance(user, User):
            user_msg = 'A user was not specified'
            return err_resp(user_msg)

        # Make sure the search parameters are valid
        #
        for key, val in json_search_info.items():
            if key not in SEARCH_PARAMETERS:
                user_msg = ('"%s" is not a valid search parameter.'
                            ' Valid parameters: %s') % \
                            (key, ', '.join(SEARCH_PARAMETERS))
                return err_resp(user_msg)

            if not val:
                user_msg = ('A value is needed for the search'
                            ' parameter "%s"') % \
                            (key,)
                return err_resp(user_msg)

        filters = dict()
        if SEARCH_KEY_DESCRIPTION in json_search_info:
            filters['description__icontains'] = json_search_info[SEARCH_KEY_DESCRIPTION]

        if SEARCH_KEY_NAME in json_search_info:
            filters['name__icontains'] = json_search_info[SEARCH_KEY_NAME]

        if not filters: # shouldn't happen b/c just checked
            user_msg = 'Please enter at least 1 search term.'
            return err_resp(user_msg)


        query_results = EventDataSavedQuery.get_query_list_for_user(\
                            user, **filters)

        if not query_results.success:
            return err_resp(query_results.err_msg)


        final_results = query_results.result_obj
        final_results['search_params'] = json_search_info
        final_results.move_to_end('search_params', last=False)
        return ok_resp(final_results)


    @staticmethod
    def get_query_from_object(query_id, user):
        """ return query obj"""
        return get_json_error('temp disabled!!')

        print('-' * 40)
        print('getting object for query_id %s' % query_id)
        print('-' * 40)
        success, event_obj = EventJobUtil.get_by_id_and_user(query_id, user)

        if not success:
            return get_json_error(event_obj)

        # print("event data obj ", event_obj.as_dict()['query'])
        # check if the entry is allowed to be saved on dataverse
        if not event_obj.as_dict()['save_to_dataverse']:
            return err_resp('save to dataverse is set to False')

        print('-' * 40)
        print('Routine Dataverse Check')
        print('-' * 40)

        # run dataverse check :
        success_dataverse_check, check_obj = EventJobUtil.run_dataverse_check()
        if not success_dataverse_check:
            # add to user notification model
            EventJobUtil.add_to_user_model('test_user', query_id, check_obj)
            return err_resp(check_obj)

        print('-' * 40)
        print('Uploading query file')
        print('-' * 40)
        # send query_file to dataverse:
        success_query, query_obj = EventJobUtil.upload_query_result(event_obj)
        if not success_query:
            return get_json_error(query_obj)

        # make readme file and upload
        print('-' * 40)
        print('Uploading query result')
        print('-' * 40)
        success_readme, readme_ob = EventJobUtil.upload_query_readme(event_obj.as_dict())
        if not success_readme:
            return get_json_error(readme_ob)

        print("Generated read me uploaded to dataverse", readme_ob)

        # publish dataset
        print('-' * 40)
        print('publishing dataset')
        print('-' * 40)
        success_publish_dataset, published_dataset_obj = EventJobUtil.publish_dataset()
        if not success_publish_dataset:
            # add to user notification model
            EventJobUtil.add_to_user_model('test_user', query_id, published_dataset_obj)
            return err_resp(published_dataset_obj)

        print('-' * 40)
        print('Adding Query Object')
        print('-' * 40)
        # add to query obj
        # first get the dataset file info of latest version
        job_file_info = GetDataSetFileInfo()
        success_file_info, res_info = job_file_info.return_status()

        if not success_file_info:
            return err_resp(res_info)
        latest_version = res_info['data']['latestVersion']['versionNumber']
        has_error = False
        error_list = []
        ok_response = []
        for d in res_info['data']['latestVersion']['files']:
            file_id = d['dataFile']['id']
            file_url = EventJobUtil.dataverse_server + '/file.xhtml?fileId=' + str(
                file_id) + '&version=' + str(latest_version)
            try:
                saved_query = EventDataSavedQuery.objects.get(id=query_id)

            except ValueError:
                return err_resp('Could not retrieve query for id %s' % query_id)

            try:
                search_obj = ArchiveQueryJob.objects.get(datafile_id=file_id)
            except ArchiveQueryJob.DoesNotExist:
                search_obj = None
            if search_obj is None:
                succ, add_archive = EventJobUtil.add_archive_query_job(\
                    datafile_id=file_id,
                    saved_query=saved_query,
                    status=COMPLETE,
                    is_finished=True,
                    is_success=True,
                    message='query result successfully created',
                    dataverse_response=d,
                    archive_url=file_url)
            if not succ:
                has_error = True
                error_list.append('Could not add the object with file id %s' % file_id)
            else:
                has_error = True
                error_list.append('Object with file ID %s already exists' % file_id)

        if has_error:
            # save to user notification
            return err_resp(error_list)

        else:
            return ok_resp(ok_response)


    @staticmethod
    def add_archive_query_job(**kwargs):
        """ add to the database of archive jobs"""
        job = ArchiveQueryJob(**kwargs)

        job.save()
        # return True,"All good"
        # print("job :", job.as_dict())
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query job archived",
                            data=job.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to archive query",
                            id=job.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_all_archive_query_objects():
        """ get list of all objects"""
        success, get_list_obj = ArchiveQueryJob.get_all_objects()

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)


    @staticmethod
    def publish_dataset():
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        # job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if not succ:
            print("message from dataverse publish fail ", res)
            return err_resp(res)
        else:
            print("message from dataverse publish success ", res)
            return ok_resp(res)

    @staticmethod
    def get_dataverse_files(version_id):
        """ get list"""
        list_obj = ListFilesInDataset(version_id)
        succ, res = list_obj.return_status()
        if succ:
            return ok_resp(res)

        else:
            return err_resp(res)

    @staticmethod
    def add_archive_query_job(**kwargs):
        """ add to the database of archive jobs"""
        job = ArchiveQueryJob(**kwargs)

        job.save()
        # return True,"All good"
        print("job :", job.as_dict())
        if job.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query job archived",
                            data=job.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to archive query",
                            id=job.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_archive_query_object(datafile_id):
        """ get the data for datafile_id object"""
        success, get_list_obj = ArchiveQueryJob.get_objects_by_id(datafile_id)
        print("event util obj", get_list_obj)

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)

    @staticmethod
    def get_all_archive_query_objects():
        """ get list of all objects"""
        success, get_list_obj = ArchiveQueryJob.get_all_objects()

        if success:
            return ok_resp(get_list_obj)

        else:
            return err_resp(get_list_obj)


    @staticmethod
    def publish_dataset(dataset_id):
        """ publish dataset
        might be using dataset_id later according to actual API request
        """
        job = DataversePublishDataset()
        job2 = GetDataSetFileInfo()
        succ, res = job.return_status()
        if succ:
            success, res_info = job2.return_status()
            print("Res : ********* : ", res_info)
            if success:
                for d in res_info['data']['latestVersion']['files']:
                    print("*******")
                    file_id = d['dataFile']['id']
                    file_url = d['dataFile']['pidURL']
                    success, archive_job = ArchiveQueryJob.get_objects_by_id(file_id)
                    if success:
                        archive_job.archive_url = file_url
                        archive_job.save()
                        return ok_resp(res)
                    else:
                        return err_resp(archive_job)
            else:
                return err_resp(res_info)

        else:
            return err_resp(res)

    @staticmethod
    def get_dataverse_files(version_id):
        """ get list"""
        list_obj = ListFilesInDataset(version_id)
        succ, res = list_obj.return_status()
        if succ:
            return ok_resp(res)

        else:
            return err_resp(res)

    @staticmethod
    def upload_query_result(event_obj):
        """upload query result to dataverse"""
        collection_name = event_obj.as_dict()['collection_name']
        query_obj = event_obj.as_dict()['query']
        query_id = event_obj.as_dict()['id']
        filename = '%s_%s.txt' % (str(query_id), str(collection_name))
        obj = MongoRetrieveUtil(settings.EVENTDATA_DB_NAME, collection_name)
        success, mongo_obj = obj.run_query(query_obj, 'aggregate')

        if not mongo_obj:
            return err_resp(mongo_obj)

        json_dump = json.dumps(mongo_obj)
        temp_file_obj = TemporaryFileMaker(filename, json_dump)

        succ, res_obj = temp_file_obj.return_status()
        print("query result upload : ", res_obj)

        if succ:
            return ok_resp(res_obj)

        else:
            return err_resp(res_obj)


    @staticmethod
    def upload_query_readme(kwargs):
        """upload query_readme result to dataverse """
        obj = GenerateReadMe(kwargs)
        success, readme_obj = obj.generate_readme()

        if not success:
            return err_resp(readme_obj)

        return ok_resp(readme_obj)


    @staticmethod
    def run_dataverse_check():
        """ check dataverse"""

        check_obj = RoutineDataverseCheck()
        success_check, check = check_obj.check_result_status()
        if not success_check:
            return err_resp(check)

        else:
            return ok_resp(check)

    @staticmethod
    def add_to_user_model(user_name, query_id, message):
        """ add to user notification model """
        user_object = User.objects.get(username=user_name)

        if not user_object:
            return err_resp('could not find user with name %s' % user_name)

        try:
            saved_query = EventDataSavedQuery.objects.get(id=query_id)

        except ValueError:
            return err_resp('Could not retrieve query for id %s' % query_id)

        query = saved_query.as_dict()['query']
        input_data = dict(user=user_object,
                          message=message,
                          read=False,
                          archived_query=query)
        user_notify = UserNotification(**input_data)
        user_notify.save()

        if user_notify.id:
            """no error"""
            usr_dict = dict(success=True,
                            message="query saved",
                            data=user_notify.as_dict())
            return ok_resp(usr_dict)
        else:
            """error"""
            usr_dict = dict(success=False,
                            message="failed to save query",
                            id=user_notify.id)
            return err_resp(usr_dict)


    @staticmethod
    def get_metadata(folder, names=None):
        # `folder` is not a user-defined value
        directory = os.path.join(os.getcwd(), 'tworaven_apps', 'eventdata_queries', folder)

        if names:
            # make sure name is in directory and has file extension
            names = [name + '.json' for name in names if name + '.json' in os.listdir(directory)]
        else:
            names = sorted(os.listdir(directory))

        return {
            filename.replace('.json', ''): json.load(open(directory + os.sep + filename, 'r'), object_pairs_hook=OrderedDict) for filename in names
        }


    @staticmethod
    def get_data(database, collection, method, query, distinct=None, host=None):
        """Return data from a Mongo query"""

        if method == 'distinct' and not distinct:
            return err_resp("the distinct method requires a 'keys' argument")

        retrieve_util = MongoRetrieveUtil(database, collection, host)
        success, data = retrieve_util.run_query(query, method, distinct)

        return ok_resp(data) if success else err_resp(data)


    @staticmethod
    def import_dataset(database, collection, datafile, reload=False):
        """Key method to load a Datafile (csv) into Mongo as a new collection"""
        retrieve_util = MongoRetrieveUtil(database, collection)
        db_info = retrieve_util.get_mongo_db(database)
        if not db_info.success:
            return err_resp(db_info.err_msg)

        db = db_info.result_obj

        # upload dataset if it does not exist
        #
        if settings.MONGO_COLLECTION_PREFIX + collection in db.list_collection_names():
            if reload:
                db[settings.MONGO_COLLECTION_PREFIX + collection].drop()
            else:
                return ok_resp(settings.MONGO_COLLECTION_PREFIX + collection)

        if not os.path.exists(datafile):
            return err_resp(collection + ' not found')

        with open(datafile, 'r') as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=',')
            columns = next(csv_reader)
            for observation in csv_reader:
                db[settings.MONGO_COLLECTION_PREFIX + collection].insert_one({
                    col: infer_type(val) for col, val in zip(columns, observation)
                })

        return ok_resp({'collection': settings.MONGO_COLLECTION_PREFIX + collection})


    @staticmethod
    def export_dataset(user_obj, collection, data):
        """Export the dataset using the 'BasicProblemWriter' """
        if not isinstance(data, list):
            user_msg = 'export_dataset failed.  "data" must be a list'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        filename = os.path.join('manipulation_data',
                                collection,
                                'TRAIN',
                                'tables',
                                'learningData.csv')

        params = {BasicProblemWriter.IS_CSV_DATA: True,
                  BasicProblemWriter.INCREMENT_FILENAME: True,
                  BasicProblemWriter.QUOTING: csv.QUOTE_NONNUMERIC}

        bpw = BasicProblemWriter(user_obj, filename, data, **params)
        if bpw.has_error():
            return err_resp(bpw.get_error_message())

        return ok_resp(bpw.new_filepath)


    @staticmethod
    def export_problem(user_obj, data, metadata):
        """Export the problem in a D3M-compatible format"""

        if not isinstance(data, list):
            user_msg = 'export_problem failed.  "data" must be a list'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        if not data:
            user_msg = 'export_problem failed.  "data" must be non-empty'
            LOGGER.error(user_msg)
            return err_resp(user_msg)

        d3m_config_info = get_latest_d3m_user_config(user_obj)
        if not d3m_config_info.success:
            user_msg = 'export_problem failed. no d3m config'
            LOGGER.error(user_msg)
            return err_resp(user_msg)
        d3m_config = d3m_config_info.result_obj

        manipulations_folderpath = os.path.join(d3m_config.temp_storage_root, 'manipulations')

        extension = 0
        while os.path.exists(os.path.join(manipulations_folderpath, str(extension))):
            extension += 1

        # directory that contains entire dataset
        temp_dataset_folderpath = os.path.join(manipulations_folderpath, str(extension))

        # paths to datasetDoc and .csv
        temp_metadata_filepath = os.path.join(temp_dataset_folderpath, 'datasetDoc.json')
        temp_data_filepath = os.path.join(temp_dataset_folderpath, 'tables', 'learningData.csv')

        try:
            os.makedirs(os.path.join(temp_dataset_folderpath, 'tables'))
        except OSError:
            pass

        # the BasicProblemWriter doesn't write to write_directory, and this doesn't seem trivial to change
        columns = list(data[0].keys())

        with open(temp_data_filepath, 'w', newline='') as output_file:
            dict_writer = csv.DictWriter(output_file,
                                         fieldnames=columns,
                                         extrasaction='ignore')
            dict_writer.writeheader()
            dict_writer.writerows(data)

        resource = next(res for res in metadata['dataResources'] if res['resType'] == 'table')
        column_lookup = {struct['colName']: struct for struct in resource['columns']}
        resource['columns'] = [{**column_lookup[name], 'colIndex': i} for i, name in enumerate(columns)]

        with open(temp_metadata_filepath, 'w') as metadata_file:
            json.dump(metadata, metadata_file)

        return ok_resp({
            'data_path': temp_data_filepath,
            'metadata_path': temp_metadata_filepath
        })
