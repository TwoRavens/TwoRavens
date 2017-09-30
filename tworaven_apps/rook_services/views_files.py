import requests
import json
import urllib
import os

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

def get_rook_file_url(req_file_path):
    # start with something like:
    # http://127.0.0.1:8080/rook-custom/rook-files/o_196seed/preprocess/preprocess.json
    #
    idx = req_file_path.find(ROOK_FILES_PATH)
    if idx > -1:
        # shorten it to: "rook-files/data/d3m/o_196seed/preprocess.json"
        req_file_path = req_file_path[idx:]

    # doublecheck there's no prepended "/"
    #
    if req_file_path.startswith('/') and len(req_file_path) > 1:
        req_file_path = req_file_path[1:]

    # set the rook url
    #
    rook_file_url = '{0}{1}'.format(settings.R_DEV_SERVER_BASE,
                                    req_file_path)

    return rook_file_url

def view_rook_file_passthrough(request):
    """A bit ugly, download the file content from rook and
    send it to the UI
    http://127.0.0.1:8080/rook-custom/rook-files/data/d3m/o_196seed/preprocess.json
    """
    req_file_path = request.get_full_path()
    filename = req_file_path.split('/')[-1]
    rook_file_url = get_rook_file_url(req_file_path)


    # Read the file content into memory (assuming small files in dev)
    try:
        file_content = urllib.request.urlopen(rook_file_url).read()
    except urllib.error.HTTPError as ex_obj:
        err_msg = ('Failed to download rook file.'
                   ' HTTPError: %s \n\nurl: %s') % (str(ex_obj), rook_file_url)
        raise Http404('file not found: %s' % rook_file_url)
        return JsonResponse(dict(status=False,
                                 error_message=err_msg))
    except urllib.error.URLError as ex_obj:
        err_msg = ('Failed to download rook file.'
                   ' URLError: %s \n\nurl: %s') % (str(ex_obj), rook_file_url)
        return JsonResponse(dict(status=False,
                                 error_message=err_msg))

    # get the filesize and content type
    #
    content_type = mimetypes.guess_type(filename)[0]

    # prepare the response
    #
    response = HttpResponse(file_content,
                            content_type=content_type)

    #response['Content-Disposition'] = "attachment; filename={0}".format(filename)
    filesize = len(file_content)
    response['Content-Length'] = filesize

    return response
