"""Functions to convert csv to JSON
Based on: https://stackoverflow.com/questions/38170071/csv-to-json-convertion-with-python
"""
from io import StringIO
from os.path import isfile, join
import csv
import json


def convert_csv_file_to_json(csv_fname, to_string=True):
    """
    Convert a CSV file to a JSON string

    return json_string, None
    return None, err_msg
    """
    if not csv_fname:
        return (None, 'No file specified')

    # Does the file exist
    #
    if not isfile(csv_fname):
        return (None, 'File not found: %s' % csv_fname)

    # Read the CSV file into python dicts
    #
    rows = None
    with open(csv_fname) as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Failed to read csv into rows
    #
    if not rows:
        return (None, 'Failed to read file as a csv: %s' % csv_fname)

    # Format the rows into a JSON string
    #
    try:
        json_content = json.dumps(rows)
    except TypeError:
        return (None, 'Failed to convert csv content to JSON: %s' % csv_fname)

    if to_string:
        return (json_content, None)

    return (rows, None)


def convert_csv_content_to_json(csv_content):
    """
    Convert CSV content to a JSON string

    return json_string, None
    return None, err_msg
    """
    if not csv_content:
        return (None, 'No content specified')

    # Read the CSV content into python dicts
    #
    string_io = StringIO(csv_content)

    rows = None
    with string_io as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Failed to read csv into rows
    #
    if not rows:
        return (None, 'Failed to read content as a csv')

    # Format the rows into a JSON string
    #
    try:
        json_content = json.dumps(rows)
    except TypeError:
        return (None, 'Failed to convert csv content to JSON')

    return (json_content, None)

"""
python manage shell

from tworaven_apps.utils.csv_to_json import convert_csv_content_to_json

content = '''"preds"
3
6
7
4
4
'''

convert_csv_content_to_json(content)

#reload(convert_csv_content_to_json)
#convert_csv_file_to_json()
"""
