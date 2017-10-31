import json
from collections import OrderedDict
from django.shortcuts import render
from tworaven_apps.workspaces.models import KEY_SESSION_WORKSPACE,\
    KEY_ZDATA, KEY_ALL_NODES, UI_KEY_ZDATA

def view_session_info(request):
    """test to show session info, zdata, etc"""

    # pull some session info, if there are any
    #
    #import ipdb; ipdb.set_trace()

    if KEY_ZDATA in request.session:
        try:
            session_info = json.dumps(request.session[KEY_ZDATA], indent=4)
        except TypeError:
            session_info = request.session[KEY_ZDATA]
    else:
        session_info = '(nothing saved)'

    info = dict(title='test session info',
                session_info=session_info)

    return render(request, 'view_session_info.html', info)
