# Misc. notes

## Loading D3M config information

D3M config information may be saved in the Django layer and be made available to app.js via an API endpoint.

Information from multiple configurations may be saved with one of them being marked as the "default".

To load test config information into a dev environment, try these lines from the Terminal (within the TwoRavens directory with the virtualenv activated):

```
# creates config settings with fully qualified paths based on your local system for the o_196 and o_4550 test data
#
fab make_d3m_config

# run the django server
#
fab run
```

- View the available config information and urls to retrieve it:
  - http://127.0.0.1:8080/config/d3m-config/list


### Setting config information via the admin

Config file information may be entered directly into the django admin:

  http://127.0.0.1:8080/admin/configurations/d3mconfiguration/

Upon saving config information, the paths are evaluated (e.g. do they exist?) and any error information is shown at the bottom of the entry form.  

  - Note: This will allow any paths to be saved, even if they are unreachable.

### Loading a config file

A config file may also be added using this line.  
- Default: A config file loaded this way will immediately become the default available through:
  - http://127.0.0.1:8080/config/d3m-config/json/latest
- This command will FAIL if any of the paths in the config file are unreachable.

```
fab load_d3m_config:[path to config]
```

- Example config file contents:
  - `name` is optional

  ```json
  {
    "name": "o_196seed",
    "dataset_schema": "/Users/yourname/Documents/github/TwoRavens/data/d3m/o_196seed/data/dataSchema.json",
    "problem_schema": "/Users/yourname/Documents/github/TwoRavens/data/d3m/o_196seed/problemSchema.json",
    "training_data_root": "/Users/yourname/Documents/github/TwoRavens/data/d3m/o_196seed/data",
    "executables_root": "/Users/yourname/Documents/github/TwoRavens/test_setup_local/d3m_output_o_196seed/temp",
    "pipeline_logs_root": "/Users/yourname/Documents/github/TwoRavens/test_setup_local/d3m_output_o_196seed/temp",
    "temp_storage_root": "/Users/yourname/Documents/github/TwoRavens/test_setup_local/d3m_output_o_196seed/temp",
  }
  ```



## Adding a new rook app: django

For a new rook app, please add its name to `tworaven_apps/rook_services/app_names.py`.

This will allow better logging/tracking of calls to that app.

Example: if the new app is `pipelineapp`, add this line to the `app_names.py`
file listed above:

```python
          ('PIPELINE_APP', 'pipelineapp', 'pipelineapp'), # format pipeline
```

This is how the new line looks in the context of the `app_names.py` file.

```python
# Used for tracking rook routing.
#
# Example ZELIG_APP is the constant used in logs
#
# format:        (app name, frontend url suffix, rook url suffix)
#
ROOK_APP_NAMES = [('ZELIG_APP', 'zeligapp', 'zeligapp'),    # run models
                  ('DATA_APP', 'dataapp', 'dataapp'),       # session id?
                  ('SUBSET_APP', 'subsetapp', 'subsetapp'), # subset file
                  ('TRANSFORM_APP', 'transformapp', 'transformapp'), # transfor file
                  ('PREPROCESS_APP', 'preprocessapp', 'preprocessapp'), # preprocess
                  ('PIPELINE_APP', 'pipelineapp', 'pipelineapp'), # format pipeline
                 ]
```

## snippet to run gRPC start_session from shell

- ```python manage.py dbshell```

```python
import json
from tworaven_apps.ta2_interfaces.req_start_session import start_session

test_req = json.dumps(dict(user_agent='tworavens'))
start_session(test_req)

```


## snippet to start_session from shell

- ```python manage.py dbshell```

```python
from django.conf import settings
import json
from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from google.protobuf.json_format import MessageToJson, Parse, ParseError

settings.TA2_TEST_SERVER_URL = 'docker.for.mac.localhost:50051'

content = json.dumps(dict(user_agent='tworavens'))
req = Parse(content, core_pb2.SessionRequest())

core_stub, err_msg = TA2Connection.get_grpc_stub()
reply = core_stub.StartSession(req)

MessageToJson(reply)

```
