## v2019.6.11

* Updating d3m core package dependency to v2019.6.7.

## v2019.5.23

* Removing list of minimally required primitives that TA2s need to support
  as whitelisting/blacklisting is no longer considered best practice.
  [#115](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/115)
  [!147](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/147)
* `PipelineContext` has been deprecated.
  `normalized` field has been added to `Score` message.
  `PipelineSource.pipelines` is now a list of `PipelineDescription`s and not
  string pipeline IDs.
  [!140](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/140)
* `SearchSolutions` call has now additional `rank_solutions_limit` field
  which allows requesting both searching and ranking at the same time.
  [!141](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/142)
* Documented that DataFrame and list values should be represented as container
  types and have metadata. Updated Python utility functions to adhere to that.
  [!143](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/143)
  [!145](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/145)

## v2019.4.11

* Added support for custom metrics to Python utilities.
  [#112](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/112)
  [!138](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/138)
* Added `DataAvailable` call which TA3 can use to notify TA2 about availability
  of (new) datasets.
  [#81](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/81)
  [!97](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/97)
* Fields in problem description deprecated in the previous version has now been
  removed.
  [#110](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/110)
  [!134](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/134)
* Added `RANK` metric (and corresponding `RANKING` evaluation method) to allow
  ranking of found solutions for the purpose of TA2-only evaluation.
  [!125](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/125)
* Updated to new changes in the d3m v2019.4.4 core package release:

    * Python package now requires pip 19+.
    * `targets` and `dataset_id` fields have been removed from `Score` message.
    * `random_seed` field was added to `Score` message.
    * `TaskType` enumeration have been updated and renumbered.
    * `PerformanceMetric` enumeration have been updated and renumbered.
    * `ProblemInput` now has `privileged_data` field.
    * `ProblemDescription` now has `other_names` field.

    [#109](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/109)
    [!133](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/133)

* Python utility functions `encode_problem_description` and `decode_problem_description`
  now accept and return instances of `Problem` class, respectively. Moreover, problem
  description's digest is now the same whether problem description is loaded
  from the file or transmitted over the TA3-TA2 API.
  [#106](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/106)
  [#107](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/107)
  [!130](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/130)
* Changed `time_bound` name to `time_bound_search` in `SearchSolutionsRequest`
  and clarified description. Added `time_bound_run` to `SearchSolutionsRequest`
  as place to specify anticipated limit on time to one pass of the pipeline run.
  [#108](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/108)
  [!131](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/131)
  [!136](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/136)
* Clarified that pipeline templates can accept multiple Dataset input vlues,
  given that the input to the placeholder in the template is just one Dataset
  input value.
  [!128](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/128)

## v2019.2.27

* Changed `SolutionExportRequest` message to use `solution_id` instead of
  `fitted_solution_id`.
  [#104](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/104)
  [!124](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/124)
* Fixed the structure of problem description's `data_augmentation` field.
  Now it can be repeated.
  [!127](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/127)
* Doc change to provide clarification on primitive types allowed for use in 
  pipeline template.
  [!128](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/128)
* Doc change to update the flow diagram titled "API Structures" in the 
  documentation to include Save and Load procedures.
  [!126](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/126)

## v2019.1.22

* Fixed d3m core package paths.
  [!123](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/123)
* Doc-only change to highlight the fact that prepends should now accept 
  multiple input datasets.
  [#102](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/102)
  [!120](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/120)
* Updated messages to align with the latest D3M core package.
  `DataArgument` message got a new field `container_list`
  of type `ContainerArguments`. `PipelineDescription` message
  got a new field `digest` of type `string`. `ProblemDescription`
  message has fields moved from `Problem` message: `id`, `version`,
  `name`, and `description`. Fields `digest` and `data_augmentation`
  added to `ProblemDescription` message.
  [#103](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/103)
  [!117](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/117)
* Added `SaveSolution`, `LoadSolution`, `SaveFittedSolution`, `LoadFittedSolution`
  optional calls.
  [#87](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/87)
  [!109](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/109)
* Made compiled Python branch into a full Python package with additional
  utility functions for conversion between Python objects and GRPC messages.
  [#47](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/47)
  [!112](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/112)
* Defined that it is allowed to support `RAW` and `PICKLE_BLOB` values only
  up to 64KB of size. Added large value types `LARGE_RAW` and `LARGE_PICKLE_BLOB`
  without this limit.
  [#92](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/92)
  [!113](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/113)
* Added `dataset_id` to `Score` message.
  [#98](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/98)
  [!114](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/114)
* Documented that the standard port is 45042.
  [#86](https://gitlab.com/datadrivendiscovery/ta3ta2-api/issues/86)
  [!108](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/108)
* In message `StepProgress` renamed field `choosen` to `chosen`.
  [!105](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/105)
* Updated documentation to note that pipeline templates and fully specified pipelines
  accept multiple inputs.
  [!120](https://gitlab.com/datadrivendiscovery/ta3ta2-api/merge_requests/120)

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
