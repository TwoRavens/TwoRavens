# -*- coding: utf-8 -*-
# Generated by the protocol buffer compiler.  DO NOT EDIT!
# source: problem.proto

import sys
_b=sys.version_info[0]<3 and (lambda x:x) or (lambda x:x.encode('latin1'))
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf import reflection as _reflection
from google.protobuf import symbol_database as _symbol_database
# @@protoc_insertion_point(imports)

_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor.FileDescriptor(
  name='problem.proto',
  package='',
  syntax='proto3',
  serialized_options=_b('Z\010pipeline'),
  serialized_pb=_b('\n\rproblem.proto\"H\n\x18ProblemPerformanceMetric\x12\x0e\n\x06metric\x18\x01 \x01(\t\x12\t\n\x01k\x18\x02 \x01(\x05\x12\x11\n\tpos_label\x18\x03 \x01(\t\"X\n\x07Problem\x12\x15\n\rtask_keywords\x18\x08 \x03(\t\x12\x36\n\x13performance_metrics\x18\x07 \x03(\x0b\x32\x19.ProblemPerformanceMetric\"~\n\rProblemTarget\x12\x14\n\x0ctarget_index\x18\x01 \x01(\x05\x12\x13\n\x0bresource_id\x18\x02 \x01(\t\x12\x14\n\x0c\x63olumn_index\x18\x03 \x01(\x05\x12\x13\n\x0b\x63olumn_name\x18\x04 \x01(\t\x12\x17\n\x0f\x63lusters_number\x18\x05 \x01(\x05\"v\n\x15ProblemPrivilegedData\x12\x1d\n\x15privileged_data_index\x18\x01 \x01(\x05\x12\x13\n\x0bresource_id\x18\x02 \x01(\t\x12\x14\n\x0c\x63olumn_index\x18\x03 \x01(\x05\x12\x13\n\x0b\x63olumn_name\x18\x04 \x01(\t\"k\n\x12\x46orecastingHorizon\x12\x13\n\x0bresource_id\x18\x01 \x01(\t\x12\x14\n\x0c\x63olumn_index\x18\x02 \x01(\x05\x12\x13\n\x0b\x63olumn_name\x18\x03 \x01(\t\x12\x15\n\rhorizon_value\x18\x04 \x01(\x01\"\xa6\x01\n\x0cProblemInput\x12\x12\n\ndataset_id\x18\x01 \x01(\t\x12\x1f\n\x07targets\x18\x02 \x03(\x0b\x32\x0e.ProblemTarget\x12/\n\x0fprivileged_data\x18\x03 \x03(\x0b\x32\x16.ProblemPrivilegedData\x12\x30\n\x13\x66orecasting_horizon\x18\x04 \x01(\x0b\x32\x13.ForecastingHorizon\"4\n\x10\x44\x61taAugmentation\x12\x0e\n\x06\x64omain\x18\x01 \x03(\t\x12\x10\n\x08keywords\x18\x02 \x03(\t\"\xe1\x01\n\x12ProblemDescription\x12\x19\n\x07problem\x18\x01 \x01(\x0b\x32\x08.Problem\x12\x1d\n\x06inputs\x18\x02 \x03(\x0b\x32\r.ProblemInput\x12\n\n\x02id\x18\x03 \x01(\t\x12\x0f\n\x07version\x18\x04 \x01(\t\x12\x0c\n\x04name\x18\x05 \x01(\t\x12\x13\n\x0b\x64\x65scription\x18\x06 \x01(\t\x12\x0e\n\x06\x64igest\x18\x07 \x01(\t\x12,\n\x11\x64\x61ta_augmentation\x18\x08 \x03(\x0b\x32\x11.DataAugmentation\x12\x13\n\x0bother_names\x18\t \x03(\tB\nZ\x08pipelineb\x06proto3')
)




_PROBLEMPERFORMANCEMETRIC = _descriptor.Descriptor(
  name='ProblemPerformanceMetric',
  full_name='ProblemPerformanceMetric',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='metric', full_name='ProblemPerformanceMetric.metric', index=0,
      number=1, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='k', full_name='ProblemPerformanceMetric.k', index=1,
      number=2, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='pos_label', full_name='ProblemPerformanceMetric.pos_label', index=2,
      number=3, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=17,
  serialized_end=89,
)


_PROBLEM = _descriptor.Descriptor(
  name='Problem',
  full_name='Problem',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='task_keywords', full_name='Problem.task_keywords', index=0,
      number=8, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='performance_metrics', full_name='Problem.performance_metrics', index=1,
      number=7, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=91,
  serialized_end=179,
)


_PROBLEMTARGET = _descriptor.Descriptor(
  name='ProblemTarget',
  full_name='ProblemTarget',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='target_index', full_name='ProblemTarget.target_index', index=0,
      number=1, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='resource_id', full_name='ProblemTarget.resource_id', index=1,
      number=2, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_index', full_name='ProblemTarget.column_index', index=2,
      number=3, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_name', full_name='ProblemTarget.column_name', index=3,
      number=4, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='clusters_number', full_name='ProblemTarget.clusters_number', index=4,
      number=5, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=181,
  serialized_end=307,
)


_PROBLEMPRIVILEGEDDATA = _descriptor.Descriptor(
  name='ProblemPrivilegedData',
  full_name='ProblemPrivilegedData',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='privileged_data_index', full_name='ProblemPrivilegedData.privileged_data_index', index=0,
      number=1, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='resource_id', full_name='ProblemPrivilegedData.resource_id', index=1,
      number=2, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_index', full_name='ProblemPrivilegedData.column_index', index=2,
      number=3, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_name', full_name='ProblemPrivilegedData.column_name', index=3,
      number=4, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=309,
  serialized_end=427,
)


_FORECASTINGHORIZON = _descriptor.Descriptor(
  name='ForecastingHorizon',
  full_name='ForecastingHorizon',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='resource_id', full_name='ForecastingHorizon.resource_id', index=0,
      number=1, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_index', full_name='ForecastingHorizon.column_index', index=1,
      number=2, type=5, cpp_type=1, label=1,
      has_default_value=False, default_value=0,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='column_name', full_name='ForecastingHorizon.column_name', index=2,
      number=3, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='horizon_value', full_name='ForecastingHorizon.horizon_value', index=3,
      number=4, type=1, cpp_type=5, label=1,
      has_default_value=False, default_value=float(0),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=429,
  serialized_end=536,
)


_PROBLEMINPUT = _descriptor.Descriptor(
  name='ProblemInput',
  full_name='ProblemInput',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='dataset_id', full_name='ProblemInput.dataset_id', index=0,
      number=1, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='targets', full_name='ProblemInput.targets', index=1,
      number=2, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='privileged_data', full_name='ProblemInput.privileged_data', index=2,
      number=3, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='forecasting_horizon', full_name='ProblemInput.forecasting_horizon', index=3,
      number=4, type=11, cpp_type=10, label=1,
      has_default_value=False, default_value=None,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=539,
  serialized_end=705,
)


_DATAAUGMENTATION = _descriptor.Descriptor(
  name='DataAugmentation',
  full_name='DataAugmentation',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='domain', full_name='DataAugmentation.domain', index=0,
      number=1, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='keywords', full_name='DataAugmentation.keywords', index=1,
      number=2, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=707,
  serialized_end=759,
)


_PROBLEMDESCRIPTION = _descriptor.Descriptor(
  name='ProblemDescription',
  full_name='ProblemDescription',
  filename=None,
  file=DESCRIPTOR,
  containing_type=None,
  fields=[
    _descriptor.FieldDescriptor(
      name='problem', full_name='ProblemDescription.problem', index=0,
      number=1, type=11, cpp_type=10, label=1,
      has_default_value=False, default_value=None,
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='inputs', full_name='ProblemDescription.inputs', index=1,
      number=2, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='id', full_name='ProblemDescription.id', index=2,
      number=3, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='version', full_name='ProblemDescription.version', index=3,
      number=4, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='name', full_name='ProblemDescription.name', index=4,
      number=5, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='description', full_name='ProblemDescription.description', index=5,
      number=6, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='digest', full_name='ProblemDescription.digest', index=6,
      number=7, type=9, cpp_type=9, label=1,
      has_default_value=False, default_value=_b("").decode('utf-8'),
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='data_augmentation', full_name='ProblemDescription.data_augmentation', index=7,
      number=8, type=11, cpp_type=10, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
    _descriptor.FieldDescriptor(
      name='other_names', full_name='ProblemDescription.other_names', index=8,
      number=9, type=9, cpp_type=9, label=3,
      has_default_value=False, default_value=[],
      message_type=None, enum_type=None, containing_type=None,
      is_extension=False, extension_scope=None,
      serialized_options=None, file=DESCRIPTOR),
  ],
  extensions=[
  ],
  nested_types=[],
  enum_types=[
  ],
  serialized_options=None,
  is_extendable=False,
  syntax='proto3',
  extension_ranges=[],
  oneofs=[
  ],
  serialized_start=762,
  serialized_end=987,
)

_PROBLEM.fields_by_name['performance_metrics'].message_type = _PROBLEMPERFORMANCEMETRIC
_PROBLEMINPUT.fields_by_name['targets'].message_type = _PROBLEMTARGET
_PROBLEMINPUT.fields_by_name['privileged_data'].message_type = _PROBLEMPRIVILEGEDDATA
_PROBLEMINPUT.fields_by_name['forecasting_horizon'].message_type = _FORECASTINGHORIZON
_PROBLEMDESCRIPTION.fields_by_name['problem'].message_type = _PROBLEM
_PROBLEMDESCRIPTION.fields_by_name['inputs'].message_type = _PROBLEMINPUT
_PROBLEMDESCRIPTION.fields_by_name['data_augmentation'].message_type = _DATAAUGMENTATION
DESCRIPTOR.message_types_by_name['ProblemPerformanceMetric'] = _PROBLEMPERFORMANCEMETRIC
DESCRIPTOR.message_types_by_name['Problem'] = _PROBLEM
DESCRIPTOR.message_types_by_name['ProblemTarget'] = _PROBLEMTARGET
DESCRIPTOR.message_types_by_name['ProblemPrivilegedData'] = _PROBLEMPRIVILEGEDDATA
DESCRIPTOR.message_types_by_name['ForecastingHorizon'] = _FORECASTINGHORIZON
DESCRIPTOR.message_types_by_name['ProblemInput'] = _PROBLEMINPUT
DESCRIPTOR.message_types_by_name['DataAugmentation'] = _DATAAUGMENTATION
DESCRIPTOR.message_types_by_name['ProblemDescription'] = _PROBLEMDESCRIPTION
_sym_db.RegisterFileDescriptor(DESCRIPTOR)

ProblemPerformanceMetric = _reflection.GeneratedProtocolMessageType('ProblemPerformanceMetric', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEMPERFORMANCEMETRIC,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ProblemPerformanceMetric)
  ))
_sym_db.RegisterMessage(ProblemPerformanceMetric)

Problem = _reflection.GeneratedProtocolMessageType('Problem', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEM,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:Problem)
  ))
_sym_db.RegisterMessage(Problem)

ProblemTarget = _reflection.GeneratedProtocolMessageType('ProblemTarget', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEMTARGET,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ProblemTarget)
  ))
_sym_db.RegisterMessage(ProblemTarget)

ProblemPrivilegedData = _reflection.GeneratedProtocolMessageType('ProblemPrivilegedData', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEMPRIVILEGEDDATA,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ProblemPrivilegedData)
  ))
_sym_db.RegisterMessage(ProblemPrivilegedData)

ForecastingHorizon = _reflection.GeneratedProtocolMessageType('ForecastingHorizon', (_message.Message,), dict(
  DESCRIPTOR = _FORECASTINGHORIZON,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ForecastingHorizon)
  ))
_sym_db.RegisterMessage(ForecastingHorizon)

ProblemInput = _reflection.GeneratedProtocolMessageType('ProblemInput', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEMINPUT,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ProblemInput)
  ))
_sym_db.RegisterMessage(ProblemInput)

DataAugmentation = _reflection.GeneratedProtocolMessageType('DataAugmentation', (_message.Message,), dict(
  DESCRIPTOR = _DATAAUGMENTATION,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:DataAugmentation)
  ))
_sym_db.RegisterMessage(DataAugmentation)

ProblemDescription = _reflection.GeneratedProtocolMessageType('ProblemDescription', (_message.Message,), dict(
  DESCRIPTOR = _PROBLEMDESCRIPTION,
  __module__ = 'problem_pb2'
  # @@protoc_insertion_point(class_scope:ProblemDescription)
  ))
_sym_db.RegisterMessage(ProblemDescription)


DESCRIPTOR._options = None
# @@protoc_insertion_point(module_scope)
