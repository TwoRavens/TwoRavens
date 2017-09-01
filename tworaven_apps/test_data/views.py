from django.shortcuts import render, redirect
from django.http import Http404, HttpResponse, StreamingHttpResponse
from django.conf import settings
from os.path import abspath, getsize, isdir, isfile, join
import os


def view_test_data(request, input_file_name=None):
    """
    NOT FOR PROD.
    Retrieves a file from the project's top level '/data' directory

    old: It only retrieves files in that directory, not subdirectories
    """
    #return redirect('/static/fearonLaitin.json')
    DATA_DIR = 'data/'

    data_file_dir = join(settings.BASE_DIR, DATA_DIR)

    if not isdir(data_file_dir):
        raise Http404('data file directory not avail: %s' % data_file_dir)

    # Make sure it exists directy in the data directory`
    #
    #if input_file_name not in os.listdir(data_file_dir):
    #    raise Http404('data file not found: %s (a)' % input_file_name)

    file_path = request.path
    if len(file_path) == 0 or not file_path[1:].startswith(DATA_DIR):
        raise Http404('not a valid file request: %s' % file_path)

    input_file_name = file_path[len(DATA_DIR)+1:]
    file_full_path = abspath(join(data_file_dir, input_file_name))
    if not isfile(file_full_path) or not file_full_path.startswith(data_file_dir):
        raise Http404('data file not found: %s (b)' % file_full_path)

    response = StreamingHttpResponse((line for line in open(file_full_path, 'r')))
    response['Content-Disposition'] = "attachment; filename={0}".format(input_file_name)
    response['Content-Length'] = getsize(file_full_path)
    return response



# Create your views here.
