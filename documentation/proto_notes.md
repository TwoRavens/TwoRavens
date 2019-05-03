# Objects with status code 0

This is a list of enums where the values are zero.
  - In most cases, the zero value is used when the enum connotation is "UNKNOWN" or "UNDEFINED"
  - However, there are 2 cases where a value of 0 is a specific status.  In these cases, consider changing the value to a non-zero.
    - 2 cases to consider changing:
      - core.proto: `Progress.SUBMITTED`
      - dataflow_ext.proto: `ModuleResult.PENDING`

## core.proto objects

1. StatusCode.UNKNOWN
  - *OK* It is UNKNOWN/UNDEFINED.  Plus, it is going away in favor of gRPC status
1. Progress.SUBMITTED
  - *Consider changing* as this is something other than UNKNOWN/UNDEFINED
1. TaskType.TASK_TYPE_UNDEFINED
  - *OK* It is UNKNOWN/UNDEFINED
1. OutputType.OUTPUT_TYPE_UNDEFINED
  - *OK* It is UNKNOWN/UNDEFINED
1. Metric.METRIC_UNDEFINED
- *OK* It is UNKNOWN/UNDEFINED

## dataflow_ext.proto objects

1. ModuleResult.PENDING
  - *Consider changing* as this is something other than UNKNOWN/UNDEFINED

## data_ext.proto objects

No enums used.
