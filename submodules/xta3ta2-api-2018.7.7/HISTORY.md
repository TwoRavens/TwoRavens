## v2018.7.7

* Message `Value` has replaced most simple types with a message `ValueRaw` 
  that enumerates those types and also includes a `null`.  This crucially 
  allows nulls to be passed as arguments in templates in the API.
  [!100](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/100)

## v2018.6.2

* Fitted solutions now have separate id, and field `solution_id` changed to
  `fitted_solution_id` where appropriate.
  [!92](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/92)
* The field `rank` in `SolutionExportRequest` has changed from type `int32` to 
  type `double` and the comments defining this field have also changed, in 
  combination with revisions to NIST's solution export spec.
  [!93](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/93)
* New task `OBJECT_DETECTION` and new metric `OBJECT_DETECTION_AVERAGE_PRECISION`
  are added to mirror changes in ProblemDoc v3.1.1.
  [!93](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/93)
* Metrics `PRECISION` and `RECALL` added to mirror changes in ProblemDoc v3.1.
  [!93](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/93)
* Field `clusters_number` added to message `ProblemTarget`.
  [!93](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/93)
* Lists of raw values are now supported in the `Value` message.
  [!98](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/98)
* The README has been updated, particularly with a flow diagram of calls.
  [!94](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/94)
  [!95](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/95)

## v2018.5.1

* API has been completely rewritten to utilize the pipeline template format.
  See the README.md for overview of rpc calls. In particular, TA3 systems can
  specify early ("preprocessing") steps of pipelines, and TA2 systems can 
  communicate a description of the pipeline of any found solution.
  [!82](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/82)
* As part of this change, API now uses native gRPC error codes.
  [#49](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/49)
* The CONTRIBUTING.md has been updated to reflect current API development process
  and define baseline functionality in the core API.
  [!90](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/90)

## v2017.12.20

* Data extension has been updated according to changes to a D3M dataset structure.
* Numerous changes were introduced to update calls, enumerated types and values 
  to conform to changes in newly released version 3.0 of the problem schema. All 
  of these required breaking changes.  These include (in order of likely relevance):
    1. The call `UpdateProblemSchema` was renamed `SetProblemDoc` to reflect this
       file is now named a "Problem Doc" rather than a "Problem Schema", and to
       better reflect the functionality of this message.  The related messages
       `UpdateProblemSchemaRequest` and `ReplaceProblemSchemaField` were similarly 
       renamed.
    2. New enum values were added to `TaskType` and old values deleted. 
    3. Enum values under type `TaskType` and `TaskSubtype` were rearranged to 
       follow current order in problem schema.
    4. Enum values, which are generally SEPARATED\_BY\_UNDERSCORES, were 
       standardized with respect to hyphens.  Compound words using hyphens are 
       separated, but hyphens for prefixes are not separated.  So "Time-series"
       and "Root-mean-squared error" become `TIME_SERIES` and `ROOT_MEAN_SQUARED_ERROR`
       but "Non-overlapping" and "Multi-class" are `NONOVERLAPPING` and `MULTICLASS`.
    5. Enum type `Metric` was renamed to `PerformanceMetric`.
  [#53](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/53)
* Instead of pointing to a set of features to train from and to target which can each have
  its own dataset URI, we now point to just one dataset URI and then a set of features and
  targets inside that dataset. A breaking change because of retagging of enums.
  [#54](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/54)
* Dataset URIs should now point to files: `datasetDoc.json` for D3M datasets and files
  with `.csv` extension for CSV files.
* `Progress` and `ModuleResult.Status` enums have now `UNKNOWN` value for tag 0
  which serves as a default value for enums. Backwards incompatible change because
  it forced retagging of other values in enums.
  [#56](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/56)
* Added `PipelineCancelRequest` to cancel pipeline processing (creation or execution).
  [#39](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/39)
* Repository migrated to gitlab.com and made public.

## v2017.10.10

* Added comments to clarify various aspects of the API.
* `Metric` was extended by `MEAN_SQUARED_ERROR`.
* `UpdateProblemSchemaRequest` message now has `context` field. 
* Added `ERRORED` value to `Progress` so that TA2 can set a reasonable
  value for responses when a pipeline fails.
* Made CI add `__init__.py` and `.gitignore` files to Python `dist` branches
  so that it can be used as a git submodule.

## v2017.9.11

* Added automatic building of `.proto` files using CI into `dist-*` and `dev-dist-*` branches.
* Renamed `.proto` files to make clearer what is core and what are extensions.
* Added `UNKNOWN` value to `StatusCode`. A breaking change because of reordering of tag numbers.
  The idea is that a missing value should not be equal to `OK` status.
* Added unofficial `EXECUTION_TIME` metric.
* Made `PipelineExecuteRequest` accept a list of features instead of list of dataset URIs.
* Added `DeletePipelines` and `ExportPipeline` calls to core.
* Dataflow extension now passes `Response` in responses, and provides `execution_time`
  for each dataflow module.

## v2017.8.23

* Initial version of the TA3-TA2 API.
