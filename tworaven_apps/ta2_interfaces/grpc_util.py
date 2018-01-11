"""
Used to pull static data from the TA3TA2 API
"""
from collections import OrderedDict
import json
import core_pb2

class TA3TA2Util(object):
    """Convenience methods for accessing grpc info/values to feed the UI"""

    @staticmethod
    def get_api_version():
        """Return the TA3TA2 API version. e.g. '2017.12.20'"""
        return core_pb2.DESCRIPTOR.GetOptions().Extensions[\
                        core_pb2.protocol_version]

    @staticmethod
    def get_problem_schema_string(indented=False):
        """Return gRPC TaskType, TaskSubtype, and PerformanceMetric values as string"""
        info_dict = TA3TA2Util.get_problem_schema()

        if indented:
            return json.dumps(info_dict, indent=4)

        return json.dumps(info_dict)

    @staticmethod
    def get_problem_schema():
        """Return gRPC TaskType, TaskSubtype, and PerformanceMetric values
        example:
            {
                "TaskType": [
                    {
                        "name": "TASK_TYPE_UNDEFINED",
                        "label": "Task Type Undefined",
                        "index": 0,
                        "number": 0
                    },
                (etc...)
            }
        """
        info_dict = OrderedDict()

        label_value_pairs = [\
                ('TaskType', core_pb2._TASKTYPE.values),
                ('TaskSubtype', core_pb2._TASKSUBTYPE.values),
                ('PerformanceMetric', core_pb2._PERFORMANCEMETRIC.values),]

        for label, grpc_info_list in label_value_pairs:
            info_list = []
            for grpc_info in grpc_info_list:
                od = OrderedDict()
                od['name'] = grpc_info.name
                od['label'] = grpc_info.name.replace('_', ' ').title()
                od['index'] = grpc_info.index
                od['number'] = grpc_info.number
                info_list.append(od)
            info_dict[label] = info_list

        return info_dict
"""
task_subtypes = []
for x in core_pb2._TASKSUBTYPE.values:
    od = OrderedDict()
    od['name'] = x.name
    od['label'] = x.name.replace('_', ' ').title()
    od['index'] = x.index
    od['number'] = x.number
    task_subtypes.append(od)

grpc_info['TaskSubtype'] = task_subtypes


metrics = []
for x in core_pb2._PERFORMANCEMETRIC.values:
    od = OrderedDict()
    od['name'] = x.name
    od['label'] = x.name.replace('_', ' ').title()
    od['index'] = x.index
    od['number'] = x.number
    metrics.append(od)

grpc_info['PerformanceMetric'] = metrics

print(json.dumps(grpc_info, indent=4))
"""
