"""Views for User Workspaces"""
import json
import os
from os.path import abspath, dirname, isfile, join, splitext
from django.shortcuts import render

from django.http import HttpResponse, Http404, JsonResponse, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.conf import settings

from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from tworaven_apps.solver_interfaces.models import KEY_MESSAGE
from tworaven_apps.ta2_interfaces.tasks import create_destination_directory
from tworaven_apps.utils.view_helper import get_authenticated_user
from tworaven_apps.data_prep_utils import static_vals as dp_static
from tworaven_apps.utils.random_info import \
    (get_alpha_string,
     get_timestamp_string,
     get_alphanumeric_lowercase)

from tworaven_apps.utils.file_util import \
    (create_directory,
     create_directory_add_timestamp,
     read_file_contents)

from tworaven_apps.utils.view_helper import \
    (get_request_body_as_json,
     get_json_error,
     get_json_success)

from tworaven_apps.configurations.models_d3m import D3MConfiguration
from tworaven_apps.configurations.utils import \
    (clear_output_directory,
     check_build_output_directories)

from tworaven_apps.user_workspaces import utils as ws_util
from tworaven_apps.user_workspaces import static_vals as ws_static

from tworaven_apps.user_workspaces.reset_util import ResetUtil

from tworaven_apps.utils.view_helper import \
    (get_authenticated_user,)
from tworaven_apps.configurations.utils import \
    (get_latest_d3m_config,)
from tworaven_apps.utils.static_keys import KEY_SUCCESS, KEY_DATA
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.user_workspaces.utils import get_latest_user_workspace
from tworaven_apps.data_prep_utils.user_dataset_util import UserDatasetUtil



@csrf_exempt
def view_load_eventdata_dataset(request, **kwargs):
    """
    Create a new dataset based on an EventData file

    url query str:
        "http://127.0.0.1:8080/user-workspaces/load-evtdata?fpath=%2Fravens_volume%2Fevtdata_user_datasets%2F2020-02-27_00-07-06%2Fcline_speed%2F9rh9%2FlearningData.csv&name=cline_speed+subset"
    """
    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))

    user_workspace = user_workspace_info.result_obj

    if not ws_static.EVENT_DATA_FILEPATH_KEY in request.GET:
        user_msg = (f'Expected key {ws_static.EVENT_DATA_FILEPATH_KEY}'
                    f' in GET query string')
        return JsonResponse(get_json_error(user_msg))

    fpath = request.GET[ws_static.EVENT_DATA_FILEPATH_KEY]
    if dp_static.DATASET_NAME_FROM_UI in request.GET:
        dataset_name = request.GET[dp_static.DATASET_NAME_FROM_UI]
    else:
        dataset_name = f'EvtData {get_timestamp_string()}'
    print(request.GET)


    try:
        fpath = abspath(fpath) # resolve any sym links, .., etc..
    except TypeError:
        user_msg = (f'Invalid value for key {ws_static.EVENT_DATA_FILEPATH_KEY}'
                    f' in GET query string')
        return JsonResponse(get_json_error(user_msg))

    if not fpath.startswith(settings.EVTDATA_2_TWORAVENS_DIR):
        user_msg = (f'Invalid path in GET query string: {fpath}'
                    f' (Does not match EVTDATA_2_TWORAVENS_DIR)')
        return JsonResponse(get_json_error(user_msg))

    if not isfile(fpath):
        user_msg = (f'This is not a file: {fpath}')
        return JsonResponse(get_json_error(user_msg))

    dest_directory = dirname(fpath)

    # Save the about.json
    #
    #json_info = json_loads(request.POST.get('metadata'))
    #if not json_info.success:
    #    return JsonResponse(get_json_error(json_info.err_msg))

    # save json data
    #dataset_name = None
    #if dp_static.DATASET_NAME_FROM_UI in json_info.result_obj:
    #    dataset_name = json_info.result_obj[dp_static.DATASET_NAME_FROM_UI]

    # Create new dataset folders/etc
    #
    additional_inputs_dir = user_workspace.d3m_config.additional_inputs
    created = create_directory(additional_inputs_dir)
    if not created.success:
        return JsonResponse(get_json_error(created.err_msg))

    new_dataset_info = UserDatasetUtil.make_new_dataset(\
                            user_workspace.user.id,
                            dest_directory,
                            settings.TWORAVENS_USER_DATASETS_DIR,
                            **{dp_static.DATASET_NAME: dataset_name})

    if not new_dataset_info.success:
        return JsonResponse(get_json_error(new_dataset_info.err_msg))
    #udu = UserDatasetUtil(1, input_files, output_dir)

    if kwargs.get('json_resp') is True:
        return JsonResponse(get_json_success('New dataset ready.'))

    return HttpResponseRedirect(reverse('home'))


@csrf_exempt
def view_upload_dataset(request):
    """Upload dataset and metadata"""
    print('FILE_UPLOAD_MAX_MEMORY_SIZE:', settings.FILE_UPLOAD_MAX_MEMORY_SIZE)

    user_workspace_info = get_latest_user_workspace(request)
    if not user_workspace_info.success:
        return JsonResponse(get_json_error(user_workspace_info.err_msg))
    user_workspace = user_workspace_info.result_obj

    # Destination directory for learningData.csv, learningData#.csv, etc.
    #   and about.json
    #
    dest_dir_info = create_directory_add_timestamp(\
                        join(settings.TWORAVENS_USER_DATASETS_DIR,
                             f'uploads_{user_workspace.user.id}',
                             get_alpha_string(6)))

    if not dest_dir_info.success:
        return JsonResponse(get_json_error(dest_dir_info.err_msg))
    dest_directory = dest_dir_info.result_obj

    print('view_upload_dataset. dest_directory', dest_directory)

    # Save the about.json
    #
    json_info = json_loads(request.POST.get('metadata'))
    if not json_info.success:
        return JsonResponse(get_json_error(json_info.err_msg))

    # save json data
    dataset_name = None
    if dp_static.DATASET_NAME_FROM_UI in json_info.result_obj:
        dataset_name = json_info.result_obj[dp_static.DATASET_NAME_FROM_UI]

    #with open(os.path.join(dest_directory, 'about.json'), 'w') as metadata_file:
    #    json.dump(json_info.result_obj, metadata_file)

    # Save data files.  They don't have to be .csv, that's handled latter,
    #     e.g. convert from .tab, .tsv, xls, etc.
    #
    for idx, file in enumerate(request.FILES.getlist('files')):
        print(file.name)
        _fname, fext = splitext(file.name)
        if not fext.lower() in dp_static.VALID_EXTENSIONS:
            # no extension found, won't be able to open it
            user_msg = (f'The extension for this file was not recognized: "{file.name}".'
                        f' Valid extensions: {", ".join(dp_static.VALID_EXTENSIONS)}.')

            return JsonResponse(get_json_error(user_msg))

        new_filename = join(dest_directory,
                            f'learningData{idx + 1 if idx else ""}{fext.lower()}')
        with open(new_filename, 'wb+') as outfile:
            for chunk in file.chunks():
                outfile.write(chunk)

    print('dest_directory', dest_directory)

    # Create new dataset folders/etc
    #
    additional_inputs_dir = user_workspace.d3m_config.additional_inputs
    created = create_directory(additional_inputs_dir)
    if not created.success:
        return JsonResponse(get_json_error(created.err_msg))

    new_dataset_info = UserDatasetUtil.make_new_dataset(\
                            user_workspace.user.id,
                            dest_directory,
                            settings.TWORAVENS_USER_DATASETS_DIR,
                            **{dp_static.DATASET_NAME: dataset_name})

    if not new_dataset_info.success:
        return JsonResponse(get_json_error(new_dataset_info.err_msg))
    #udu = UserDatasetUtil(1, input_files, output_dir)

    return JsonResponse(get_json_success('file upload completed successfully'))

def is_ethiopia_dataset(name):
    """Names with 'TR' at start or Ethiopia"""
    return name.upper().startswith('TR') or \
           name.lower().find('ethiopia') > -1

def get_sorted_configs(**kwargs):
    """Bit of hack to get list of sorted configs with
    Ethiopia datasets right after the default dataset"""

    params = dict(is_selectable_dataset=True)

    configs = D3MConfiguration.objects.filter(**params \
                                              ).order_by('-is_default', 'name')

    lconfigs = list(configs)

    if len(lconfigs) < 2 or not settings.SORT_BY_GATES_DATASETS:
        return lconfigs

    # Ethiopia datasets
    eth_datasets = sorted([x for x in lconfigs[1:]
                           if is_ethiopia_dataset(x.name)],
                          key=lambda obj: obj.name)

    # Non-Ethiopia datasets
    non_eth_datasets = sorted([x for x in lconfigs[1:]
                               if not is_ethiopia_dataset(x.name)],
                              key=lambda obj: obj.name)

    sorted_configs = lconfigs[:1] + eth_datasets + non_eth_datasets

    return sorted_configs

@login_required
def view_list_dataset_choices_html(request):
    """List datasets for a user to examine"""

    configs = get_sorted_configs()

    info = dict(title='Available Datasets',
                configs=configs)

    return render(request,
                  'user_workspaces/view_list_dataset_choices.html',
                  info)
    #render('view_list_dataset_choices_html')


@csrf_exempt
def view_list_dataset_choices(request):
    """List datasets for a user to examine"""

    configs = get_sorted_configs()

    configs_serializable = [{key: getattr(config, key)
                            for key in ['id', 'name']}
                            for config in configs]

    return JsonResponse({KEY_SUCCESS: True, KEY_DATA: configs_serializable})

@login_required
def view_select_dataset_json_resp(request, config_id):
    """Same as selecting a new dataset but instead of reloading
    the page, send back a JSON response."""

    return view_select_dataset(request,
                               config_id=config_id,
                               **dict(json_resp=True))


@login_required
def view_select_dataset(request, config_id=None, **kwargs):
    """Clear lots of existing data and switch datasets"""
    if config_id is None:
        raise Http404('"config_id" is required')

    json_resp = kwargs.get('json_resp', False)

    # The user is required...
    #
    user_info = get_authenticated_user(request)
    if not user_info.success:
        return JsonResponse(get_json_error(user_info.err_msg))
    user = user_info.result_obj

    # Retrieve the chosen D3M config
    #
    new_d3m_config = D3MConfiguration.objects.filter(id=config_id).first()
    if not new_d3m_config:
        raise Http404(f'D3MConfiguration not found for id {config_id}')

    if not new_d3m_config.is_selectable_dataset:
        user_msg = (f'This dataset is not available for'
                    f' selection {new_d3m_config}')
        return JsonResponse(get_json_error(user_msg))

    # Tries to fetch the UserWorkspace and is ready to "reset"
    #   by clearing logs, stopping searches, etc.
    #
    reset_util = ResetUtil(user=user, **dict(request_obj=request))
    if reset_util.has_error():
        return JsonResponse(get_json_error(reset_util.get_err_msg()))

    current_d3m_config = reset_util.get_d3m_config()

    # Don't switch to config you already have!
    #
    if current_d3m_config and current_d3m_config.id == new_d3m_config.id:
        # TODO: Need a better error here!
        #
        user_msg = (f'The dataset was not switched!'
                    f' You are already analyzing dataset:'
                    f' {current_d3m_config.name}')
        return JsonResponse(get_json_error(user_msg))

    # Now really stop searches, clears logs, etc, etc
    #
    reset_util.start_the_reset()

    # Set new default config
    #
    check_build_output_directories(new_d3m_config)

    set_info = D3MConfiguration.set_as_default(new_d3m_config)
    if set_info.success:
        print('New config set!')
    else:
        print(set_info.err_msg)

    # (7) Redirect to pebbles page or send JSON success
    #
    if json_resp:
        return JsonResponse(get_json_success('New dataset ready.'))

    return HttpResponseRedirect(reverse('home'))
