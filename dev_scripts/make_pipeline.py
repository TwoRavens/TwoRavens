"""
# Example on how to derive pipeline templates as a TA3, to pass over GRPC to a TA2

# pick imageName from https://dash.datadrivendiscovery.org/docker
imageName = registry.datadrivendiscovery.org/jpl/docker_images/complete:ubuntu-bionic-python36-v2019.6.7-20190620-204640
docker pull $imageName

# start the container in interactive mode, enter a bash within the container
docker run -it $imageName /bin/bash

git clone https://gitlab.com/datadrivendiscovery/ta3ta2-api.git
cd ta3ta2-api
git checkout dist-python
pip3 install -e .

python3
"""

import d3m
from d3m.metadata.pipeline import Pipeline, PrimitiveStep
from d3m.metadata.base import ArgumentType

from ta3ta2_api import utils

from google.protobuf.json_format import MessageToJson
import json

# original example pipeline is here:
# https://docs.datadrivendiscovery.org/devel/pipeline.html


# populates d3m.primitives namespace with primitives from installed packages (slow)
d3m.index.load_all()

pipeline_description = Pipeline()
pipeline_description.add_input(name='inputs')

# internal step to apply to a DataFrame
step_inside = PrimitiveStep(primitive=d3m.primitives.data_transformation.remove_columns.DataFrameCommon)
# loose steps don't get arguments or inputs/outputs
# step_inside.add_argument(name='inputs', argument_type=ArgumentType.CONTAINER, data_reference='inputs.0')
# step_inside.add_output('produce')
step_inside.add_hyperparameter(name="columns", argument_type=ArgumentType.VALUE, data=[1, 2])
pipeline_description.add_step(step_inside)

# step that applies the internal step to a DataFrame in a Dataset
step_mapper = PrimitiveStep(primitive=d3m.primitives.operator.dataset_map.DataFrameCommon)
step_mapper.add_argument(name='inputs', argument_type=ArgumentType.CONTAINER, data_reference='inputs.0')
step_mapper.add_hyperparameter(name="produce_method", argument_type=ArgumentType.VALUE, data="produce")
step_mapper.add_hyperparameter(name="primitive", argument_type=ArgumentType.PRIMITIVE, data=0)
step_mapper.add_hyperparameter(name="resources", argument_type=ArgumentType.VALUE, data=["learningData"])
step_mapper.add_output('produce')
pipeline_description.add_step(step_mapper)

# any TA2 can extend the pipeline here
step_placeholder = d3m.metadata.pipeline.PlaceholderStep()
step_placeholder.add_input('steps.1.produce')
step_placeholder.add_output('produce')
pipeline_description.add_step(step_placeholder)

pipeline_description.add_output(name='output', data_reference='steps.2.produce')


# serialization
# pipeline_description.to_json_structure()

GRPC_types = [utils.ValueType.RAW, utils.ValueType.CSV_URI, utils.ValueType.DATASET_URI, utils.ValueType.PICKLE_BLOB, utils.ValueType.PICKLE_URI]
template = MessageToJson(utils.encode_pipeline_description(pipeline_description, GRPC_types, '/working_dir'))
json.dumps(json.loads(template))



# Continuous subset
pipeline_description = Pipeline()
pipeline_description.add_input(name='inputs')

step_subset = PrimitiveStep(primitive=d3m.primitives.data_preprocessing.numeric_range_filter.DataFrameCommon)
# step_mapper.add_argument(name='inputs', argument_type=ArgumentType.CONTAINER, data_reference='inputs.0')
step_subset.add_hyperparameter(name="column", argument_type=ArgumentType.VALUE, data=1)
step_subset.add_hyperparameter(name="min", argument_type=ArgumentType.VALUE, data=23.23)
step_subset.add_hyperparameter(name="max", argument_type=ArgumentType.VALUE, data=47.58)
step_subset.add_hyperparameter(name="inclusive", argument_type=ArgumentType.VALUE, data=True)
# step_subset.add_output('produce')
pipeline_description.add_step(step_subset)

template = MessageToJson(utils.encode_pipeline_description(pipeline_description, GRPC_types, '/working_dir'))
json.dumps(json.loads(template))

# Term filter
pipeline_description = Pipeline()
pipeline_description.add_input(name='inputs')

step_subset = PrimitiveStep(primitive=d3m.primitives.data_preprocessing.term_filter.DataFrameCommon)
# step_mapper.add_argument(name='inputs', argument_type=ArgumentType.CONTAINER, data_reference='inputs.0')
step_subset.add_hyperparameter(name="column", argument_type=ArgumentType.VALUE, data=1)
step_subset.add_hyperparameter(name="terms", argument_type=ArgumentType.VALUE, data=['test0', 'test'])
step_subset.add_hyperparameter(name="match_whole", argument_type=ArgumentType.VALUE, data=True)
step_subset.add_hyperparameter(name="inclusive", argument_type=ArgumentType.VALUE, data=True)
# step_subset.add_output('produce')
pipeline_description.add_step(step_subset)

template = MessageToJson(utils.encode_pipeline_description(pipeline_description, GRPC_types, '/working_dir'))
json.dumps(json.loads(template))

# Imputer
pipeline_description = Pipeline()
pipeline_description.add_input(name='inputs')

step_impute = PrimitiveStep(primitive=d3m.primitives.data_cleaning.imputer.SKlearn)
# step_impute.add_hyperparameter(name="missing_values", argument_type=ArgumentType.VALUE, data=0)
step_impute.add_hyperparameter(name="return_result", argument_type=ArgumentType.VALUE, data="replace")
step_impute.add_hyperparameter(name="fill_value", argument_type=ArgumentType.VALUE, data=23)
step_impute.add_hyperparameter(name="strategy", argument_type=ArgumentType.VALUE, data="constant")
step_impute.add_hyperparameter(name="use_columns", argument_type=ArgumentType.VALUE, data=[1, 2])
pipeline_description.add_step(step_impute)

template = MessageToJson(utils.encode_pipeline_description(pipeline_description, GRPC_types, '/working_dir'))
json.dumps(json.loads(template))

