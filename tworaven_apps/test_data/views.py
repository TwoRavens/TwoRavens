from django.shortcuts import render, redirect
from django.http import Http404, HttpResponse, StreamingHttpResponse
from django.conf import settings
from os.path import getsize, isdir, isfile, join
import os


def view_test_data(request, input_file_name):
    """
    NOT FOR PROD.
    Retrieves a file from the project's top level '/data' directory
    It only retrieves files in that directory, not subdirectories
    """
    #return redirect('/static/fearonLaitin.json')

    data_file_dir = join(settings.BASE_DIR, 'data')

    if not isdir(data_file_dir):
        raise Http404('data file directory not avail: %s' % data_file_dir)

    # Make sure it exists directy in the data directory`
    #
    if input_file_name not in os.listdir(data_file_dir):
        raise Http404('data file not found: %s (a)' % input_file_name)

    file_full_path = join(data_file_dir, input_file_name)
    if not isfile(file_full_path):
        raise Http404('data file not found: %s (b)' % file_full_path)

    response = StreamingHttpResponse((line for line in open(file_full_path, 'r')))
    response['Content-Disposition'] = "attachment; filename={0}".format(input_file_name)
    response['Content-Length'] = getsize(file_full_path)
    return response



# Create your views here.
