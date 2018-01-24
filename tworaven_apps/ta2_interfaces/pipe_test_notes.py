import random
from google.protobuf.json_format import MessageToJson
import dataflow_ext_pb2

# init ModuleResult object
resp = dataflow_ext_pb2.ModuleResult()

# set module_id
resp.module_id = 'module_id'

# set status
resp.status = dataflow_ext_pb2.ModuleResult.PENDING

# set 2 more fields (for now)
resp.progress = round(random.uniform(0.0, 1.0), 1)

for num in range(1, 2):
    resp.outputs.add(output_name='output_name %d' % num,
                     value='value %d' % num)

# transform to JSON
content = MessageToJson(resp, including_default_value_fields=True)

print(content)




for num in range(1, 3):
    resp.outputs.add(output_name='output_name %d' % num,
                     value='value %d' % num)

    statuses_with_execution_time = [dataflow_ext_pb2.ModuleResult.DONE,
                                    dataflow_ext_pb2.ModuleResult.ERROR]

    statuses = [dataflow_ext_pb2.ModuleResult.PENDING,
                dataflow_ext_pb2.ModuleResult.RUNNING] +\
                statuses_with_execution_time
    new_status = statuses[idx]
    resp.status = new_status

    print('status: %s' % new_status)

    # progress
    resp.progress = round(random.uniform(0.0, 1.0), 1)

    # outputs
    for idx2 in range(1, 3):
        resp.outputs.add(output_name='output_name %d' % idx2,
                         value='value %d' % idx2)

    # execution_time
    if 1:   #new_status in statuses_with_execution_time:
        print('add execution_time')
        resp.execution_time = round(random.uniform(0.1, 75.0), 1) # seconds

    # response info
    resp.response_info.status.code = core_pb2.OK
    resp.response_info.status.details = "we did it, we did it, we really, really did it"

    content = MessageToJson(resp, including_default_value_fields=True)
    module_list.append(content)
    print('JSON:\n')
    print(content)
    print('-' * 40)
