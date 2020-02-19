"""
11/6/2019
Methods for resetting the state of the application.
This is during a transition period of eval setups only allowing one TA2 and output area, but needing the users to switch datasets for testing and other purposes.
e.g. Hack working with environment constraints, etc.

Usage Example:

reset_util = ResetUtil(user=user, **dict(request=requeset_obj))
if not reset_util.has_error():
    reset_util.start_the_reset()
"""
from celery.task import control as celery_control
from tworavensproject.celery import celery_app

from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.ta2_interfaces.stored_data_util import StoredRequestUtil
from tworaven_apps.ta2_interfaces.search_history_util import SearchHistoryUtil

from tworaven_apps.behavioral_logs.log_formatter import BehavioralLogFormatter
from tworaven_apps.behavioral_logs.log_entry_maker import LogEntryMaker

from tworaven_apps.raven_auth.models import User

from tworaven_apps.user_workspaces.models import UserWorkspace
from tworaven_apps.user_workspaces import utils as ws_util

from tworaven_apps.configurations.utils import get_latest_d3m_config

from tworaven_apps.configurations.utils import \
    (clear_output_directory,
     check_build_output_directories)


class ResetUtil(BasicErrCheck):
    """Convenience methods for resetting the application environment"""

    def __init__(self, user, **kwargs):
        """
        Optional kwargs:

        - user_workspace - UserWorkspace object
        - request object - used to retrieve a UserWorkspace, if one is not set
        - d3m_config - Note, if a user_workspace is set via kwargs, the
                        user_workspace.d3m_config will be used,
                        overriding this d3m_config kwarg
        """
        self.user = user
        self.request_obj = kwargs.get('request_obj')
        self.user_workspace = kwargs.get('user_workspace')
        self.d3m_config = kwargs.get('d3m_config')

        self.retrieve_examine_workspace()


    def get_d3m_config(self):
        """Return the d3m_config--it can be None"""
        return self.d3m_config


    @staticmethod
    def write_and_clear_behavioral_logs(user, user_workspace):
        """Write out any behavioral logs files
        and delete the entries from the database"""
        if not isinstance(user, User):
            return err_resp('user was not a User object')

        if user_workspace and not isinstance(user_workspace, UserWorkspace):
            return err_resp('user_workspace was not a UserWorkspace object')

        # Write out any behavioral logs for the workspace
        #
        if user_workspace:
            log_info = LogEntryMaker.write_user_log(user_workspace)
            if log_info.success:
                print('log written: ', log_info.result_obj)
            else:
                print('log writing failed: ', log_info.err_msg)

        # clear behavioral logs for current user
        #
        log_clear = BehavioralLogFormatter.delete_logs_for_user(user)
        if log_clear.success:
            print('\n'.join(log_clear.result_obj))
        else:
            print(log_clear.err_msg)


    def retrieve_examine_workspace(self):
        """Was the workspace set.  If not, see if it can be retrieved"""
        if self.has_error():
            return

        # If the workspace is set, make sure it's the right type
        #
        if self.user_workspace:
            if not isinstance(self.user_workspace, UserWorkspace):
                self.add_err_msg(('user_workspace must be a UserWorkspace'
                                  ' object or None'))
                return
            # Looks like we have a user workspace!

        # If there's not a user workspace, see if we can get it
        #   via the request_obj
        #
        if self.request_obj and not self.user_workspace:
            ws_info = ws_util.get_latest_user_workspace(self.request_obj)
            if ws_info.success:
                # Got one!
                self.user_workspace = ws_info.result_obj

                # Also use the d3m_config from it
                # This overrides a manually set d3m_config
                self.d3m_config = self.user_workspace.d3m_config

        #  See if there's a default d3m_config
        #
        if not self.d3m_config:
            self.d3m_config = get_latest_d3m_config()

    @staticmethod
    def clear_celery_tasks():
        """Remove pending, active, and reserved Celery tasks
        ref: https://stackoverflow.com/questions/7149074/deleting-all-pending-tasks-in-celery-rabbitmq
        """
        print('-- clear_celery_tasks --')
        print('- redis flush too...')
        import shlex, subprocess


        try:
            process = subprocess.Popen(shlex.split('redis-cli FLUSHALL'), stdout=subprocess.PIPE)
            presult = process.communicate()
            print('redis flush result: ', presult)
        except ValueError as err_obj:
            print('redis flush ValueError: ', err_obj)
            pass
        except OSError as err_obj:
            print('redis flush OSError: ', err_obj)
            pass


        # return

        # ----------------------------
        # (1) remove pending tasks
        # ----------------------------
        print('(1) celery: remove pending tasks')
        celery_app.control.purge()

        # ----------------------------
        # (2) remove active tasks
        # ----------------------------
        print('(2) celery: remove active tasks')
        i = celery_control.inspect()
        active_tasks = i.active()
        if active_tasks:
            for hostname in active_tasks:
                tasks = active_tasks[hostname]
                for task in tasks:
                    celery_control.revoke(task['id'], terminate=True)

        # ----------------------------
        # (3) remove reserved tasks
        # ----------------------------
        print('(3) celery: remove reserved tasks')
        jobs = i.reserved()
        if jobs:
            for hostname in jobs:
                tasks = jobs[hostname]
                for task in tasks:
                    celery_control.revoke(task['id'], terminate=True)


    def start_the_reset(self):
        """Reset various logs/directories, as appropriate"""
        if self.has_error():
            return


        # (1) stop any TA2 Searches using the request history
        #
        StoredRequestUtil.stop_search_requests(**dict(user=self.user))

        # (1a) Stop/Delete any celery tasks
        #
        ResetUtil.clear_celery_tasks()

        # (2) Clear TA2/TA3 output directory
        #
        if self.d3m_config:
            clear_output_directory(self.d3m_config)


        # (2a) Re-build output directories, if needed
        #
        check_build_output_directories(self.d3m_config)


        # (3) Clear StoredRequest/StoredResponse objects for current user
        #
        clear_info = SearchHistoryUtil.clear_grpc_stored_history(self.user)
        if clear_info.success:
            print('\n'.join(clear_info.result_obj))
        else:
            print(clear_info.err_msg)

        # (4) Write out and clear behavioral_logs
        #
        ResetUtil.write_and_clear_behavioral_logs(self.user, self.user_workspace)

        # (5) Clear user workspaces
        #
        delete_info = ws_util.delete_user_workspaces(self.user)
        if not delete_info.success:
            print(delete_info.err_msg)
        else:
            print('workspaces cleared')
