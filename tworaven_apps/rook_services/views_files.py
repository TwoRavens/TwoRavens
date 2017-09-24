import requests
import json
import urllib
import os
import tempfile

import mimetypes
#from io import BytesIO
from datetime import datetime as dt
from requests.exceptions import ConnectionError

from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect, Http404
from django.views.decorators.csrf import csrf_exempt, csrf_protect

from tworaven_apps.rook_services.rook_app_info import RookAppInfo


ROOK_FILES_PATH = 'rook-files/'


def view_rook_file_passthrough(request):
    """A bit ugly, dowload the file and then re-serve it

    http://127.0.0.1:8080/rook-custom/rook-files/data/d3m/o_196seed/preprocess.json
    """
    # start with something like: http://127.0.0.1:8080/rook-custom/rook-files/o_196seed/preprocess/preprocess.json

    req_file_path = request.get_full_path()

    filename = req_file_path.split('/')[-1]

    idx = req_file_path.find(ROOK_FILES_PATH)
    if idx > -1:
        # shorten it to: "rook-files/data/d3m/o_196seed/preprocess.json"
        req_file_path = req_file_path[idx:]

    # doublecheck there's no prepended "/"
    if req_file_path.startswith('/') and len(req_file_path) > 1:
        req_file_path = req_file_path[1:]

    # set the rook url
    rook_file_url = '{0}{1}'.format(settings.R_DEV_SERVER_BASE,
                                      req_file_path)

    print('rook_file_url: ', rook_file_url)

    #tmp_rookfile = NamedTemporaryFile()
    with tempfile.NamedTemporaryFile() as fp:
        print('open file')
        try:
            print('read/write')
            fp.write(urllib.request.urlopen(rook_file_url).read())
        except urllib.error.HTTPError as e:
            print('nope: ', e)
            #import ipdb; ipdb.set_trace()
            #tmp_rookfile.delete() # clear temp file
            err_msg = 'Failed to download rook file. HTTPError: %s \n\nurl: %s' % (str(e), rook_file_url)
            return JsonResponse(dict(status=False,
                                     error_message=err_msg))
        fp.seek(0)
        filesize = os.path.getsize(fp.name)
        response = HttpResponse(fp,#fp.read(),
                                content_type=mimetypes.guess_type(filename)[0])

        response['Content-Disposition'] = "attachment; filename={0}".format(filename)
        response['Content-Length'] = filesize

        return response

    # attempt to get the file from rook
    """
    from io import BytesIO
    tmp_rookfile = BytesIO()#NamedTemporaryFile(delete=False)

    #tmp_rookfile.write(urllib.request.urlopen(rook_file_url).read())
    try:
        print('read/write...')
        tmp_rookfile.write(urllib.request.urlopen(rook_file_url).read())
    except urllib.error.HTTPError as e:
        print('nope: ', e)
        #import ipdb; ipdb.set_trace()
        #tmp_rookfile.delete() # clear temp file
        err_msg = 'Failed to download rook file. HTTPError: %s \n\nurl: %s' % (str(e), rook_file_url)
        return JsonResponse(dict(status=False,
                                 error_message=err_msg))

    print('downloaded...')
    tmp_rookfile.flush()
    #data = tmp_rookfile.read()
    #os.unlink(tmp_rookfile.name)

    response = HttpResponse(data,
                            content_type=mimetypes.guess_type(filename)[0])

    response['Content-Disposition'] = "attachment; filename={0}".format(filename)
    #import ipdb; ipdb.set_trace()
    #response['Content-Length'] = os.path.getsize(tmp_rookfile.name)
    #response['Content-Length'] = len(tmp_rookfile)

    return response
    """
def xview_rook_file_passthrough(request):
    """Redirect rook file requests to rook.
    This is only used in the dev environment!
    In deployment, nginx acts as proxy to these rook files

    http://127.0.0.1:8080/rook-custom/rook-files/data/d3m/o_196seed/preprocess.json
    """

    # start with something like: http://127.0.0.1:8080/rook-custom/rook-files/data/d3m/o_196seed/preprocess.json
    req_file_path = request.get_full_path()
    idx = req_file_path.find(ROOK_FILES_PATH)
    if idx > -1:
        # shorten it to: "rook-files/data/d3m/o_196seed/preprocess.json"
        req_file_path = req_file_path[idx:]

    # doublecheck there's no prepended "/"
    if req_file_path.startswith('/') and len(req_file_path) > 1:
        req_file_path = req_file_path[1:]

    # set the rook url
    rook_server_url = '{0}{1}'.format(settings.R_DEV_SERVER_BASE,
                                      req_file_path)

    # redirect
    return HttpResponseRedirect(rook_server_url)
