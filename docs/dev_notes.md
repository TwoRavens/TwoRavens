# Misc. notes


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
