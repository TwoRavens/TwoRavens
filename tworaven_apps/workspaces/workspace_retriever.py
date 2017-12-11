"""Used for retrieving SavedWorkspace objects"""
from tworaven_apps.utils.error_messages import *
from tworaven_apps.workspaces.models import SavedWorkspace
from tworaven_apps.utils.view_helper import \
    (get_session_key,
     get_authenticated_user)

KW_SESSION_KEY = 'session_key'

def workspace_queryset_base():
    """All queries in WorkspaceRetriever user this base"""
    return SavedWorkspace.objects.select_related(\
                            'user',
                            'data_source_type')

class WorkspaceRetriever(object):
    """Convenience class for retrieving SavedWorkspace objects"""

    def __init__(self, **kwargs):
        """Various keyword options:

            app_domain
                - as specified in configurations.models.DOMAIN_LIST

            session_key
                - django session key, stored in SavedWorkspace.session_key

            user
                - raven_auth.models.User

            data_source_type_id
                - workspaces.models.DataSourceType.id

            workspace_id
                - SavedWorkspace.id
        """

        self.app_domain = kwargs.get('app_domain')
        self.session_key = kwargs.get('session_key')
        self.user = kwargs.get('user')
        self.data_source_type_id = kwargs.get('data_source_type_id')
        self.workspace_id = kwargs.get('workspace_id')


    @staticmethod
    def list_workspaces_by_request(request, as_dict=False, **kwargs):
        """Retrieve a list of all workspaces"""
        success, user_or_err = get_authenticated_user(request)
        if not success:
            return False, user_or_err

        return WorkspaceRetriever.list_workspaces_by_user(\
                                            user_or_err,
                                            as_dict,
                                            **kwargs)

    @staticmethod
    def list_workspaces_by_user(auth_user, as_dict=False, **kwargs):
        """Retrieve a of workspaces for a user"""
        if not auth_user:
            return False, ERR_AUTH_USER_IS_NONE

        session_key = kwargs.get(KW_SESSION_KEY, None)
        ws_list = workspace_queryset_base().filter(user=auth_user)

        if not as_dict:
            return True, ws_list

        # Iterate through list and convert each one to json (python list/dict)
        #
        fmt_list = []
        for workspace in ws_list:
            ws_dict = workspace.as_dict_lite()
            ws_dict['is_current_session'] = bool(\
                                session_key and\
                                session_key == workspace.session_key)

            fmt_list.append(ws_dict)

        return True, fmt_list

    @staticmethod
    def get_by_id_and_request(ws_id, request, as_json=False):
        """Get SavedWorkspace by id"""
        if ws_id is None:
            return False, ERR_WORKSPACE_ID_IS_NONE

        if request is None:
            return False, ERR_REQUEST_OBJ_IS_NONE

        success, user_or_err = get_authenticated_user(request)
        if not success:
            return False, user_or_err

        return WorkspaceRetriever.get_by_user_and_id(user_or_err, ws_id, as_json)

    @staticmethod
    def get_by_user_and_id(auth_user, ws_id, as_json=False):
        """Get SavedWorkspace by id"""
        if not auth_user:
            return False, ERR_AUTH_USER_IS_NONE

        if not ws_id:
            return False, ERR_WORKSPACE_ID_IS_NONE

        # ---------------------------------
        # Retrieve the workspace
        # ---------------------------------
        qparams = dict(id=ws_id)
        if auth_user.is_active and auth_user.is_superuser:
            # Superusers have access to all workspaces
            #
            workspace = workspace_queryset_base().filter(**qparams).first()
        else:
            # Query by user and workspace id
            #
            qparams['user'] = auth_user  # add user param
            workspace = workspace_queryset_base().filter(**qparams).first()

        # ---------------------------------
        # Return the workspace (or error)
        # ---------------------------------
        if workspace:
            if as_json:
                return True, workspace.as_json()
            return True, workspace

        return False, ('Workspace not found with user:'
                       ' [%s] and  id: [%s]') % (auth_user, ws_id)

"""
from tworaven_apps.workspaces.models import *
from tworaven_apps.workspaces.workspace_retriever import WorkspaceRetriever
import json
from django.core.serializers.json import json, DjangoJSONEncoder

l = DataSourceType.objects.all()
dst = None
for dst in l:
    jstr = json.dumps(dst.as_json(), cls=DjangoJSONEncoder)
    print(jstr)

ws = SavedWorkspace.objects.all()[0]
wstr = json.dumps(ws.as_json(), cls=DjangoJSONEncoder)
print(wstr)

print()


from tworaven_apps.workspaces.models import *
ws = SavedWorkspace.objects.all()[0]
ws.as_json()
ws.user.as_json()
ws.data_source_type.as_json()

"""
