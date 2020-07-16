import json
import tempfile
import zipfile
from io import BytesIO
from os.path import join, isfile
from urllib.parse import quote

from django.conf import settings

from tworaven_apps.data_prep_utils.new_dataset_util import NewDatasetUtil
from tworaven_apps.ta2_interfaces.websocket_message import WebsocketMessage
from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.utils.basic_response import ok_resp, err_resp
from tworaven_apps.utils.json_helper import json_loads, json_dumps
from tworaven_apps.utils.random_info import get_timestamp_string_readable
from tworaven_apps.datamart_endpoints import static_vals as dm_static

from tworaven_apps.datamart_endpoints.datamart_info_util import get_nyu_url
from tworaven_apps.datamart_endpoints.datamart_util_base import DatamartJobUtilBase
from tworaven_apps.user_workspaces.utils import get_user_workspace_by_id
from tworaven_apps.utils.file_util import create_directory, read_file_rows
import requests
import logging
import os
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker
from tworaven_apps.behavioral_logs import static_vals as bl_static
import time

from tworavensproject.celery import celery_app

LOGGER = logging.getLogger(__name__)

PREVIEW_SIZE = 100

DATAMART_POLL_ATTEMPTS = 60 * 10


# based on documentation here:
# https://gitlab.com/ViDA-NYU/datamart/datamart/blob/master/examples/rest-api-fifa2018_manofmatch.ipynb
class DatamartJobUtilNYU(DatamartJobUtilBase):
    def get_datamart_source(self):
        """Return the datamart.  e.g. ISI, NYU, etc"""
        return dm_static.DATAMART_NYU_NAME

    @staticmethod
    def datamart_upload(data):
        response = requests.post(
            get_nyu_url() + "/new/upload_data", files={"file": ("config.json", data)}
        ).json()

        print(response)
        if response["code"] != "0000":
            return err_resp(response["message"])

        return ok_resp(response["data"])

    @staticmethod
    def search_with_dataset(dataset_path, query=None, **kwargs):
        """return the url to a new session"""

        profile_url = get_nyu_url() + "/api/v1/profile"
        new_session_url = get_nyu_url() + "/api/v1/session/new"

        if "user_workspace_id" not in kwargs:
            return err_resp(
                "user_workspace_id is a required argument when searching NYU with a dataset"
            )
        if "websocket_id" not in kwargs:
            return err_resp(
                "websocket_id is a required argument when searching NYU with a dataset"
            )

        ws_info = get_user_workspace_by_id(kwargs["user_workspace_id"])
        if not ws_info.success:
            return ws_info
        user_workspace = ws_info.result_obj

        # --------------------------------
        # Behavioral logging
        # --------------------------------
        log_data = dict(
            feature_id=f"POST|by-dataset|{new_session_url}",
            activity_l1=bl_static.L1_DATA_PREPARATION,
            activity_l2=bl_static.L2_DATA_SEARCH,
            path=new_session_url,
        )
        LogEntryMaker.create_datamart_entry(user_workspace, log_data)

        # PROFILE DATA
        try:
            with open(dataset_path, "rb") as dataset_p:
                try:
                    response = requests.post(
                        profile_url,
                        files={"data": dataset_p},
                        timeout=settings.DATAMART_LONG_TIMEOUT,
                    )

                except requests.exceptions.Timeout as err_obj:
                    return err_resp(f"Request timed out. responded with: {err_obj}")

        except IOError as err_obj:
            user_msg = (
                f"Failed to search with the dataset file." f"  Technical: {err_obj}"
            )
            return err_resp(user_msg)

        if response.status_code != 200:
            print(str(response))
            print(response.text)
            return err_resp(
                f"NYU Datamart internal server error (profile). status_code: {response.status_code}"
            )

        data_token = response.json().get("token")
        if not data_token:
            return err_resp(f"NYU Datamart: invalid token")

        # START NEW SESSION
        try:
            response = requests.post(
                new_session_url,
                json={
                    "data_token": data_token,
                    "format": "d3m",
                    "system_name": "TwoRavens",
                },
            )

        except requests.exceptions.Timeout as err_obj:
            return err_resp(f"Request timed out. responded with: {err_obj}")

        if response.status_code != 200:
            print(str(response))
            print(response.text)
            return err_resp(
                f"NYU Datamart internal server error (new session). status_code: {response.status_code}"
            )

        session = response.json()

        url_query = {"relatedFile": {"kind": "localFile", "token": data_token}}

        if query:
            print("query", query)
            query_result = json_loads(query)
            if not query_result.success:
                return query_result
            query = query_result.result_obj

            if "keywords" in query:
                url_query["query"] = " ".join(query["keywords"])

        # begin searching for results asynchronously
        DatamartJobUtilNYU.poll_for_results.delay(
            kwargs["user_workspace_id"],
            kwargs["websocket_id"],
            session["session_id"],
            kwargs.get("attempts", DATAMART_POLL_ATTEMPTS),
        )

        auctus_query = {"relatedFile": {"kind": "localFile", "token": data_token}}
        if query:
            terms = " ".join(query.get("keywords", []))
            if terms:
                auctus_query["query"] = terms
        return ok_resp(
            {
                "datamart_url": f"{get_nyu_url()}{session['link_url']}&q={quote(json.dumps(auctus_query))}"
            }
        )

    @staticmethod
    @celery_app.task(ignore_result=True)
    def poll_for_results(user_workspace_id, websocket_id, session_id, attempts=None):

        ws_info = get_user_workspace_by_id(user_workspace_id)
        if not ws_info.success:
            return ws_info
        user_workspace = ws_info.result_obj

        poll_url = f"{get_nyu_url()}/api/v1/session/{session_id}"

        while attempts > 0:
            if attempts:
                attempts -= 1

            print("polling")

            try:
                response = requests.get(poll_url)
            except requests.exceptions.Timeout as err_obj:
                WebsocketMessage.get_fail_message(
                    dm_static.DATAMART_AUGMENT_PROCESS,
                    f"Request timed out. responded with: {err_obj}",
                    msg_cnt=1,
                ).send_message(websocket_id)
                return

            if response.status_code != 200:
                print(str(response))
                print(response.text)

                WebsocketMessage.get_fail_message(
                    dm_static.DATAMART_AUGMENT_PROCESS,
                    f"NYU Datamart internal server error (session poll). status_code: {response.status_code}",
                    msg_cnt=1,
                ).send_message(websocket_id)
                return

            # attempt to retrieve the first augmentation
            augment_result = next(
                (
                    i
                    for i in response.json()["results"]
                    if i["type"] == "join" and "url" in i
                ),
                None,
            )

            if not augment_result:
                time.sleep(1)
                continue

            print("matched",)
            # extract and switch workspace
            with tempfile.TemporaryDirectory() as temp_dir:
                augment_zip_path = os.path.join(temp_dir, "temp.zip")

                response = requests.get(augment_result["url"])
                with open(augment_zip_path, "wb") as augment_zip_file:
                    for chunk in response.iter_content(chunk_size=512):
                        if chunk:
                            augment_zip_file.write(chunk)

                with open(augment_zip_path, "rb") as augment_zip_file:
                    zipfile.ZipFile(augment_zip_file).extractall(path=temp_dir)

                os.remove(augment_zip_path)

                new_dataset_util = NewDatasetUtil(
                    user_workspace.id,
                    os.path.join(temp_dir, "tables", "learningData.csv"),
                    **{
                        dm_static.KEY_DATASET_DOC_PATH: os.path.join(
                            temp_dir, "datasetDoc.json"
                        )
                    },
                )

                new_workspace = new_dataset_util.new_workspace

                ws_string_info = json_dumps(new_workspace.to_dict())
                if not ws_string_info.success:
                    WebsocketMessage.get_fail_message(
                        dm_static.DATAMART_AUGMENT_PROCESS,
                        f"Sorry! An error occurred.  (Created workspace but failed JSON conversion.)",
                        msg_cnt=1,
                    ).send_message(websocket_id)
                    return

                ws_msg = WebsocketMessage.get_success_message(
                    dm_static.DATAMART_AUGMENT_PROCESS,
                    "The dataset has been augmented and a new workspace created",
                    msg_cnt=99,
                    data={"workspace_json_string": ws_string_info.result_obj,},
                )
                ws_msg.send_message(websocket_id)
                return

    # @staticmethod
    # def search_with_dataset(dataset_path, query=None, **kwargs):
    #     """Search the datamart using a dataset"""
    #     if not isfile(dataset_path):
    #         user_msg = "The dataset file could not be found."
    #         return err_resp(user_msg)
    #
    #     search_url = get_nyu_url() + "/search"
    #
    #     # --------------------------------
    #     # Behavioral logging
    #     # --------------------------------
    #     if "user_workspace" in kwargs:
    #         log_data = dict(
    #             feature_id=f"POST|by-dataset|{search_url}",
    #             activity_l1=bl_static.L1_DATA_PREPARATION,
    #             activity_l2=bl_static.L2_DATA_SEARCH,
    #             path=search_url,
    #         )
    #
    #         LogEntryMaker.create_datamart_entry(kwargs["user_workspace"], log_data)
    #     # --------------------------------
    #
    #     # --------------------------------
    #     # Query the datamart
    #     # --------------------------------
    #     try:
    #         with open(dataset_path, "rb") as dataset_p:
    #             search_files = dict(data=dataset_p)
    #             if query:
    #                 search_files["query"] = query
    #
    #             try:
    #                 response = requests.post(
    #                     search_url,
    #                     files=search_files,
    #                     timeout=settings.DATAMART_LONG_TIMEOUT,
    #                 )
    #
    #             except requests.exceptions.Timeout as err_obj:
    #                 return err_resp("Request timed out. responded with: %s" % err_obj)
    #
    #     except IOError as err_obj:
    #         user_msg = (
    #             f"Failed to search with the dataset file." f"  Technical: {err_obj}"
    #         )
    #         return err_resp(user_msg)
    #
    #     if response.status_code != 200:
    #         print(str(response))
    #         print(response.text)
    #         return err_resp(
    #             ("NYU Datamart internal server error." " status_code: %s")
    #             % response.status_code
    #         )
    #
    #     json_results = response.json()["results"]
    #
    #     if not json_results:
    #         return err_resp(
    #             "No datasets found. (%s)"
    #             % (get_timestamp_string_readable(time_only=True),)
    #         )
    #
    #     print("num results: ", len(json_results))
    #
    #     return ok_resp(json_results)

    @staticmethod
    def datamart_search(query_dict=None, dataset_path=None, **kwargs):
        """Search the NYU datamart"""

        # in practice, dataset_path is not used, in favor of search_with_dataset
        if query_dict is None and dataset_path is None:
            return err_resp("Either a query or dataset path must be supplied.")

        if query_dict is not None and not isinstance(query_dict, dict):
            return err_resp(
                "There is something wrong with the search parameters. Please try again. (expected a dictionary)"
            )

        search_url = get_nyu_url() + "/search"

        # --------------------------------
        # Behavioral logging
        # --------------------------------
        if kwargs.get("user_workspace"):
            log_data = dict(
                feature_id=f"POST|{search_url}",
                activity_l1=bl_static.L1_DATA_PREPARATION,
                activity_l2=bl_static.L2_DATA_SEARCH,
                path=search_url,
            )

            LogEntryMaker.create_datamart_entry(kwargs["user_workspace"], log_data)
        # --------------------------------

        # --------------------------------
        # Query the datamart
        # --------------------------------

        if dataset_path:
            try:
                with open(dataset_path, "rb") as dataset_p:
                    try:
                        response = requests.post(
                            search_url,
                            json=query_dict,
                            files=dict(data=dataset_p),
                            timeout=settings.DATAMART_LONG_TIMEOUT,
                        )

                    except requests.exceptions.Timeout as err_obj:
                        return err_resp(
                            "Request timed out. responded with: %s" % err_obj
                        )

            except IOError as err_obj:
                user_msg = (
                    f"Failed to search with the dataset file." f"  Technical: {err_obj}"
                )
                return err_resp(user_msg)

        else:
            try:
                response = requests.post(
                    search_url,
                    json=query_dict,
                    stream=True,
                    timeout=settings.DATAMART_LONG_TIMEOUT,
                )
            except requests.exceptions.Timeout as err_obj:
                return err_resp("Request timed out. responded with: %s" % err_obj)
            if response.status_code != 200:
                print(str(response))
                print(response.text)
                return err_resp(
                    ("NYU Datamart internal server error." " status_code: %s")
                    % response.status_code
                )

        json_results = response.json()["results"]

        if not json_results:
            return err_resp(
                "No datasets found. (%s)"
                % (get_timestamp_string_readable(time_only=True),)
            )

        # print('num results: ', len(json_results))

        return ok_resp(json_results)

    @staticmethod
    def datamart_materialize(user_workspace, search_result):
        """Materialize an NYU dataset!"""
        LOGGER.info("-- atttempt to materialize NYU dataset --")
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp("user_workspace must be a UserWorkspace")

        if not isinstance(search_result, dict):
            return err_resp("search_result must be a python dictionary")

        print("\nsearch_result", search_result)
        print("\nsearch_result.keys()", search_result.keys())
        if not dm_static.KEY_NYU_DATAMART_ID in search_result:
            user_msg = (
                f'"search_result" did not contain'
                f' "{dm_static.KEY_NYU_DATAMART_ID}" key'
            )
            return err_resp(user_msg)

        # -----------------------------------------
        # Build the folder path where the .zip will
        #   be unbundled
        # -----------------------------------------
        LOGGER.info("(1) build path")
        datamart_id = search_result[dm_static.KEY_NYU_DATAMART_ID]

        dest_folderpath_info = DatamartJobUtilNYU.get_output_folderpath(
            user_workspace, datamart_id, dir_type=dm_static.KEY_MATERIALIZE
        )

        # Failed to get/create the output folder
        #
        if not dest_folderpath_info.success:
            return err_resp(dest_folderpath_info.err_msg)

        # Set the output folder
        #
        dest_folderpath = dest_folderpath_info.result_obj

        # Set the output file path
        #
        dest_filepath = join(dest_folderpath, "tables", "learningData.csv")

        LOGGER.info("(2) Download file")

        # -----------------------------------------
        # Has the file already been downloaded?
        # -----------------------------------------
        print("dest_filepath", dest_filepath)

        LOGGER.info("(2a) Has the file already been downloaded?")
        if isfile(dest_filepath):
            LOGGER.info("Yes, already downloaded")

            # Get preview rows
            #
            preview_info = read_file_rows(dest_filepath, dm_static.NUM_PREVIEW_ROWS)
            if not preview_info.success:
                user_msg = (
                    f"Failed to retrieve preview rows." f" {preview_info.err_msg}"
                )
                return err_resp(user_msg)

            info_dict = DatamartJobUtilNYU.format_materialize_response(
                datamart_id, dm_static.DATAMART_NYU_NAME, dest_filepath, preview_info
            )

            return ok_resp(info_dict)

        # -----------------------------------------
        # Download the file
        # -----------------------------------------
        LOGGER.info("(2b) File not yet downloaded. Attempting download")

        if not "id" in search_result:
            user_msg = f'search_result did not contain the key "id"'
            return err_resp(user_msg)

        download_url = (
            f"{get_nyu_url()}/download/"
            f"{search_result[dm_static.KEY_NYU_DATAMART_ID]}"
        )

        # ----------------------------
        # Behavioral logging
        # ----------------------------
        log_data = dict(
            feature_id=f"GET|{download_url}",
            activity_l1=bl_static.L1_DATA_PREPARATION,
            activity_l2=bl_static.L2_DATA_DOWNLOAD,
            path=download_url,
        )

        LogEntryMaker.create_datamart_entry(user_workspace, log_data)

        # ----------------------------
        # Download the file!
        # ----------------------------
        try:
            response = requests.get(
                download_url,
                params={"format": "d3m"},
                verify=False,
                stream=True,
                timeout=settings.DATAMART_LONG_TIMEOUT,
            )
        except requests.exceptions.Timeout as err_obj:
            return err_resp("Request timed out. responded with: %s" % err_obj)

        if response.status_code != 200:
            user_msg = (
                f"Materialize failed.  Status code:"
                f" {response.status_code}.  response: {response.text}"
            )
            return err_resp(user_msg)

        save_info = DatamartJobUtilNYU.save_datamart_file(
            dest_folderpath, response, expected_filepath=dest_filepath
        )

        if not save_info.success:
            return err_resp(save_info.err_msg)
        save_info = save_info.result_obj

        # ----------------------------
        # Get preview rows
        # ----------------------------
        preview_info = read_file_rows(
            save_info[dm_static.KEY_DATA_PATH], dm_static.NUM_PREVIEW_ROWS
        )
        if not preview_info.success:
            user_msg = f"Failed to retrieve preview rows." f" {preview_info.err_msg}"
            return err_resp(user_msg)

        info_dict = DatamartJobUtilNYU.format_materialize_response(
            datamart_id,
            dm_static.DATAMART_NYU_NAME,
            dest_filepath,
            preview_info,
            **save_info,
        )

        return ok_resp(info_dict)

    @staticmethod
    def datamart_augment(user_workspace, dataset_path, task_data, **kwargs):
        """Augment the file via the NYU API"""
        if not isinstance(user_workspace, UserWorkspace):
            return err_resp("user_workspace must be a UserWorkspace")

        # Make sure the soure file exists
        #
        if not isfile(dataset_path):
            user_msg = f"Original data file not found: {dataset_path}"
            return err_resp(user_msg)

        # Make sure the NYU datamart id is in the task_data
        #
        if not dm_static.KEY_NYU_DATAMART_ID in task_data:
            user_msg = (
                f'"task_data" did not contain' f' "{dm_static.KEY_NYU_DATAMART_ID}" key'
            )
            return err_resp(user_msg)

        # used for folder naming
        #
        datamart_id = task_data[dm_static.KEY_NYU_DATAMART_ID]

        # ---------------------------------
        # The augment url...
        # ---------------------------------
        augment_url = f"{ get_nyu_url() }/augment"

        # ----------------------------
        # Behavioral logging
        # ----------------------------
        log_data = dict(
            feature_id=f"POST|{augment_url}",
            activity_l1=bl_static.L1_DATA_PREPARATION,
            activity_l2=bl_static.L2_DATA_AUGMENT,
            path=augment_url,
        )

        LogEntryMaker.create_datamart_entry(user_workspace, log_data)
        # ----------------------------

        # ---------------------------------
        # Ready the query parameters
        # ---------------------------------
        data_params = dict(data=open(dataset_path, "rb"), task=json.dumps(task_data))

        # ---------------------------------
        # Make the augment request
        # ---------------------------------
        try:
            response = requests.post(
                augment_url,
                files=data_params,
                stream=True,
                allow_redirects=True,
                verify=False,
                timeout=settings.DATAMART_LONG_TIMEOUT,
            )
        except requests.exceptions.Timeout as err_obj:
            return err_resp("Request timed out. responded with: %s" % err_obj)

        # Any errors?
        #
        if response.status_code != 200:
            user_msg = (
                f"NYU Datamart internal server error. Status code:"
                f' "{response.status_code}".'
                f" <hr />Technical: {response.content}"
            )
            # print(response.content)

            return err_resp(user_msg)

        # Write the augmented file
        #
        dest_folderpath_info = DatamartJobUtilNYU.get_output_folderpath(
            user_workspace, datamart_id, dir_type=dm_static.KEY_AUGMENT
        )

        if not dest_folderpath_info.success:
            return err_resp(dest_folderpath_info.err_msg)

        augment_folderpath = dest_folderpath_info.result_obj

        # Set the output file
        #
        dest_filepath = join(augment_folderpath, "tables", "learningData.csv")

        save_info = DatamartJobUtilNYU.save_datamart_file(
            augment_folderpath, response, expected_filepath=dest_filepath
        )

        if not save_info.success:
            return err_resp(save_info.err_msg)
        save_info = save_info.result_obj

        # -----------------------------------------
        # Retrieve preview rows and return response
        # -----------------------------------------

        # preview rows
        #
        preview_info = read_file_rows(
            save_info[dm_static.KEY_DATA_PATH], dm_static.NUM_PREVIEW_ROWS
        )
        if not preview_info.success:
            user_msg = f"Failed to retrieve preview rows." f" {preview_info.err_msg}"
            return err_resp(user_msg)

        # Format/return reponse
        #
        info_dict = DatamartJobUtilNYU.format_materialize_response(
            datamart_id,
            dm_static.DATAMART_NYU_NAME,
            save_info[dm_static.KEY_DATA_PATH],
            preview_info,
            **save_info,
        )

        return ok_resp(info_dict)

    @staticmethod
    def save(folderpath, response):

        if not os.path.exists(folderpath):
            with zipfile.ZipFile(BytesIO(response.content), "r") as data_zip:
                data_zip.extractall(folderpath)

        metadata_filepath = os.path.join(folderpath, "datasetDoc.json")
        data_filepath = os.path.join(folderpath, "tables", "learningData.csv")

        data = []
        with open(data_filepath, "r") as datafile:
            for i in range(100):
                try:
                    data.append(next(datafile))
                except StopIteration:
                    pass

        return {
            "data_path": data_filepath,
            "metadata_path": metadata_filepath,
            "data_preview": "".join(data),
            "metadata": json.load(open(metadata_filepath)),
        }

    @staticmethod
    def get_data_paths(metadata_path):
        with open(metadata_path, "r") as metadata_file:
            resources = json.load(metadata_file)["dataResources"]

        return [
            os.path.join(
                os.path.basename(metadata_path), *resource["resPath"].split("/")
            )
            for resource in resources
        ]
