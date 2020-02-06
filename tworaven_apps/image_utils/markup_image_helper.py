"""
Used to markup an image based on a JSON spec:

Example spec
{
  "file_path": "/ravens_volume/test_data/LL1_penn_fudan_pedestrian_MIN_METADATA/TRAIN/dataset_TRAIN/media/FudanPed00001.png",
  "borders": {
    "FF0000": [
      "160,182,160,431,302,431,302,182",
      "420,171,420,486,535,486,535,171"
    ],
    "00FF00": [
      "140,192,140,451,302,451,302,192",
      "400,191,400,486,515,486,515,191",
      "5,100,5,30,20,30,20,100"
    ]
  },
  "maximum_size": [
    500,
    500
  ]
}
"""
from PIL import Image, ImageDraw, UnidentifiedImageError
import csv
import os
from os.path import abspath, basename, dirname, isdir, isfile, join, splitext

from django.conf import settings

from tworaven_apps.utils import random_info
from tworaven_apps.utils.file_util import create_directory

from tworaven_apps.solver_interfaces.models import (
    KEY_SUCCESS,
    KEY_DATA,
    KEY_MESSAGE)
from tworaven_apps.user_workspaces.models import UserWorkspace

DEFAULT_COLOR = '#006699'
#COLOR_LOOKUP = dict(RED_HEX='#FF0000',
#                    GREEN_HEX='#00FF00')


def get_output_path_base():
    """Get base output path for image"""
    print('settings.DEBUG', settings.DEBUG)
    if settings.DEBUG:
        return settings.ASSETS_DIR_TEST
        # return settings.TEST_DIRECT_STATIC   # dev server
    else:
        return settings.STATIC_ROOT


def create_image_output_dir(user_workspace=None):
    """Create an image output dir based on a user workspace
    For DEMO: TEMP write this to staticfiles
    """
    if not isinstance(user_workspace, UserWorkspace):
        user_workspace_id = random_info.get_digits_string(3)
        #return {KEY_SUCCESS: False,
        #        KEY_SUCCESS: 'user_workspace is not a "UserWorkspace" object'}
    else:
        user_workspace_id = user_workspace.id

    output_path = join(\
            get_output_path_base(),
            'image-markup',
            f'{user_workspace_id}-{random_info.get_alphanumeric_lowercase(4)}',
            random_info.get_timestamp_string())

    dir_info = create_directory(output_path)

    if not dir_info.success:
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: dir_info.err_msg}

    return {KEY_SUCCESS: True,
            KEY_DATA: dir_info.result_obj}


def markup_image(image_spec, output_dir, **kwargs):
    """
    kwargs:
    - convert_name_to_url - defaults to False, use True for frontend usable info
    """
    if not isinstance(image_spec, dict):
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'Error. Image spec is not a dict.'}

    # Is the output directory valid?
    #
    if not isdir(output_dir):
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'The output_dir was not found: {output_dir}.'}

    # Is the image path valid?
    #
    img_path = image_spec.get('file_path')
    if not (img_path and isfile(img_path)):
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'The image was not a valid file: {img_path}.'}

    # Create new filename
    #
    img_filename = basename(img_path)
    old_name, old_ext = splitext(img_filename)
    new_name = join(output_dir, '%s_rs%s' % (old_name, old_ext))

    # Open image and check the size
    #
    try:
        im = Image.open(img_path)
    except AttributeError as err_obj:
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'AttributeError. Failed to open the image: {err_obj}.'}
    except FileNotFoundError as err_obj:
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'FileNotFoundError. Failed to open the image: {err_obj}.'}
    except UnidentifiedImageError as err_obj:
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'UnidentifiedImageError. Failed to open the image: {err_obj}.'}


    print(im.format, im.size, im.mode)
    width, height = im.size
    print(f'W x H: {width} x {height}')

    # Add borders
    #
    draw = ImageDraw.Draw(im)

    # Iterate through the border parameters
    #
    if ('borders' in image_spec) and (isinstance(image_spec['borders'], dict)):
        for hex_color, coords in image_spec['borders'].items():
            # get the color
            #hex_color = COLOR_LOOKUP.get(color_name, DEFAULT_COLOR)
            if not hex_color.startswith('#'):
                hex_color = f'#{hex_color}'
            hex_color = hex_color.upper()

            # Iterate through the coordinates
            for coord_str in coords:
                # Format the coordinates from a string to 4 pairs of coordinates
                #
                coord_info = format_bounding_box_coords(coord_str, (width, height))
                if not coord_info[KEY_SUCCESS]:
                    return coord_info

                # Draw lines based on the color/coordinates
                #
                bb_coords = coord_info[KEY_DATA]
                for coord_idx in range(0, 4):
                    try:
                        if coord_idx == 3:
                            draw.line(bb_coords[coord_idx] + bb_coords[0], fill=hex_color)
                        else:
                            draw.line(bb_coords[coord_idx] + bb_coords[coord_idx+1], fill=hex_color)
                    except ValueError as err_obj:
                        return {KEY_SUCCESS: False,
                                KEY_MESSAGE: (f'ValueError when drawing bounding'
                                              f' box. {err_obj}.')}


    # Check if the image should be resized (only downsizes, no upsizing)
    #
    new_size = image_spec.get('maximum_size')  # w, h

    # Are there max. size specs?
    if new_size and len(new_size) == 2:

        # Is it big enough to resize?
        if im.size[0] <= new_size[0] and im.size[1] <= new_size[1]:
            # Nope, leave it
            print('Do not resize')
        else:
            # Resize it!
            #
            print('resize:', new_size)
            im.thumbnail(new_size, Image.ANTIALIAS)
            print(f'New size: W x H: {im.size[0]} x {im.size[1]}')

    print('new_name', new_name)
    # Save using the new name
    #
    im.save(new_name, im.format)

    if kwargs.get('convert_name_to_url') is True:
        output_path_base = get_output_path_base()
        if new_name.find(output_path_base) > -1:
            url_image_name = new_name[len(output_path_base):]
            if len(url_image_name) > 1 and url_image_name[0] == '/':
                url_image_name = url_image_name[1:]
            url_path = join(settings.STATIC_URL, url_image_name)
            return {KEY_SUCCESS: True,
                    KEY_DATA: url_path}

    return {KEY_SUCCESS: True,
            KEY_DATA: new_name}

def format_bounding_box_coords(bounding_box_str, img_size=None):
    """
    input: "160,182,160,431,302,431,302,182"
    output: [(160, 182), (160, 431), (302, 431), (302, 182)]
    """
    num_items_per_group = 2
    coords = [int(x) for x in bounding_box_str.split(',')]

    if len(coords) != 8:
        return {KEY_SUCCESS: False,
                KEY_MESSAGE: f'Bounding box had {len(coords)}, expected 8'}

    coord_pairs = [tuple(coords[i * num_items_per_group:(i + 1) * num_items_per_group])
                   for i in range((len(coords) + num_items_per_group - 1) // num_items_per_group)]

    if img_size: # (w, h)
        for cpair in coord_pairs:
            # make sure bounding box width & height are within the image size
            #
            if (cpair[0] > img_size[0]) or (cpair[1] > img_size[1]):
                return {KEY_SUCCESS: False,
                        KEY_MESSAGE: (f'Bounding box size {cpair} exceeds'
                                      f' image size {img_size}')}
    return {KEY_SUCCESS: True,
            KEY_DATA: coord_pairs}
