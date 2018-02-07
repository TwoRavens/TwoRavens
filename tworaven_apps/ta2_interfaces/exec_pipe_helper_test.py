import os, sys, django
from os.path import abspath, dirname, realpath

proj_dir = dirname(dirname(dirname(realpath(__file__))))
print(proj_dir)
sys.path.append(proj_dir) #here store is root folder(means parent).

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tworavensproject.settings.local_settings")
django.setup()



from tworaven_apps.ta2_interfaces.execute_pipeline_helper import ExecutePipelineHelper

test_info = {
    "context": {
        "sessionId": "session_0"
    },
    "pipelineId": "pipeline_1",
    "new_dataset_uri": "file:///Users/ramanprasad/Documents/github-rp/TwoRavens/ravens_volume/config_26_radon_seed.json"
}

def runit():
    eph = ExecutePipelineHelper(test_info)
    if eph.has_error:
        print(eph.error_message)
    else:
        print(eph.get_updated_request())


if __name__ == '__main__':
    runit()
