
### snippet to run gRPC start_session from shell

```
python manage.py dbshell
import json
from tworaven_apps.ta2_interfaces.req_start_session import start_session

test_req = json.dumps(dict(user_agent='tworavens'))
start_session(test_req)

```


### snippet to start_session from shell

```
python manage.py dbshell

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
