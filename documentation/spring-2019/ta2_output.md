
## output from TA2


- Related gist:  https://gist.github.com/raprasad/f436ae7bd0c2085693e721004be5cd5f
  - gist relates to **solutionId**: `6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7`


```bash
docker run --rm --name ta2_server -e D3MRUN=ta2ta3 -e D3MINPUTDIR=/ravens_volume/test_data/DA_poverty_estimation -e D3MPROBLEMPATH=/ravens_volume/test_data/DA_poverty_estimation/TRAIN/problem_TRAIN/problemDoc.json -e D3MOUTPUTDIR=/ravens_volume/test_output/DA_poverty_estimation -e D3MLOCALDIR=/ravens_volume/test_output/DA_poverty_estimation/local_dir -e D3MSTATICDIR=/ravens_volume/test_output/DA_poverty_estimation/static_dir -e D3MTIMEOUT=600 -e D3MCPU=1 -e D3MRAM=1048576000 -p 45042:45042 -e D3MPORT=45042 -v /ravens_volume/test_data/DA_poverty_estimation:/input -v /ravens_volume/test_output/DA_poverty_estimation:/output -v /ravens_volume:/ravens_volume registry.datadrivendiscovery.org/ta2-submissions/ta2-mit/winter-2019:latest
2019-03-14 22:17:44,528 - 1 - INFO - server - Starting TA2 server on port 45042
2019-03-14 22:19:39,796 - 1 - INFO - core_servicer - Starting async search session 41b25dd9-ac90-4519-8f55-a77a65000bde
2019-03-14 22:19:39,797 - 1 - INFO - search - Timeout: 300; Max end: 2019-03-14 22:24:39.797553
2019-03-14 22:19:39,844 - 1 - INFO - search - Loading the template and the tuner
2019-03-14 22:19:39,845 - 1 - INFO - search - Loading pipeline for task type TaskType.REGRESSION
2019-03-14 22:19:39,846 - 1 - INFO - template - Loading template /user_dev/ta2/templates/gradient_boosting_regression.all_hp.yml
2019-03-14 22:19:40,494 - 1 - INFO - template - Using predefined tunable hyperparameters
2019-03-14 22:19:40,532 - 1 - INFO - search - Scoring pipeline 1: 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7
('3', 'strategy'): mean
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.1
('4', 'loss'): ls
('4', 'max_depth'): 3
('4', 'min_samples_leaf'): 1
('4', 'min_samples_split'): 2
('4', 'n_estimators'): 100
2019-03-14 22:19:40,590 - 1 - ERROR - search - Error scoring pipeline 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:40,635 - 1 - INFO - search - Pipeline 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7 score: None - 0.0
2019-03-14 22:19:40,635 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:40,678 - 1 - INFO - search - Scoring pipeline 2: f7e512d1-5c7c-407b-b53a-71104fbb0616
('3', 'strategy'): median
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.0635892524712466
('4', 'loss'): lad
('4', 'max_depth'): 31
('4', 'min_samples_leaf'): 559
('4', 'min_samples_split'): 65
('4', 'n_estimators'): 949
2019-03-14 22:19:40,754 - 1 - ERROR - search - Error scoring pipeline f7e512d1-5c7c-407b-b53a-71104fbb0616
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:40,804 - 1 - INFO - search - Pipeline f7e512d1-5c7c-407b-b53a-71104fbb0616 score: None - 0.0
2019-03-14 22:19:40,804 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:40,848 - 1 - INFO - search - Scoring pipeline 3: 08e296d4-12f3-4860-91b1-9f0262882533
('3', 'strategy'): most_frequent
('4', 'criterion'): mse
('4', 'learning_rate'): 0.0015727165399047366
('4', 'loss'): lad
('4', 'max_depth'): 8
('4', 'min_samples_leaf'): 600
('4', 'min_samples_split'): 352
('4', 'n_estimators'): 160
2019-03-14 22:19:40,930 - 1 - ERROR - search - Error scoring pipeline 08e296d4-12f3-4860-91b1-9f0262882533
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:41,003 - 1 - INFO - search - Pipeline 08e296d4-12f3-4860-91b1-9f0262882533 score: None - 0.0
2019-03-14 22:19:41,004 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:41,083 - 1 - WARNING - pipeline - Digest for pipeline '6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7' does not match a computed one. Provided digest: 73b65a9519317878a98f7533077d549237a04eea98b30b172874325b57ef93ec. Computed digest: 43e6fcb071fa2dd1e7ca121bde9198b56b9a55a544ecf14cd3dea70b5ec6033a.
2019-03-14 22:19:41,102 - 1 - INFO - search - Scoring pipeline 4: 0fc798ae-a300-425e-a558-e8b3b083eeab
('3', 'strategy'): median
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.004307608309053792
('4', 'loss'): ls
('4', 'max_depth'): 89
('4', 'min_samples_leaf'): 665
('4', 'min_samples_split'): 502
('4', 'n_estimators'): 573
2019-03-14 22:19:41,183 - 1 - ERROR - search - Error scoring pipeline 0fc798ae-a300-425e-a558-e8b3b083eeab
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:41,237 - 1 - INFO - search - Pipeline 0fc798ae-a300-425e-a558-e8b3b083eeab score: None - 0.0
2019-03-14 22:19:41,244 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:41,365 - 1 - INFO - search - Scoring pipeline 5: 22debeca-c805-4600-8746-f8571b093990
('3', 'strategy'): median
('4', 'criterion'): mae
('4', 'learning_rate'): 0.03477888041761228
('4', 'loss'): ls
('4', 'max_depth'): 26
('4', 'min_samples_leaf'): 4
('4', 'min_samples_split'): 679
('4', 'n_estimators'): 191
2019-03-14 22:19:41,492 - 1 - ERROR - search - Error scoring pipeline 22debeca-c805-4600-8746-f8571b093990
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:41,639 - 1 - WARNING - pipeline - Digest for pipeline 'f7e512d1-5c7c-407b-b53a-71104fbb0616' does not match a computed one. Provided digest: 62f9c0e1c1c2c6fab22f7ff1a8adad7b6b952096eead4e07409475329ba399b4. Computed digest: aef663664709b5b2f3d26ca4d77d968aa853ab24f09f8afa4d2a37a505aca2e8.
2019-03-14 22:19:41,677 - 1 - ERROR - search - Error saving pipeline 22debeca-c805-4600-8746-f8571b093990
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 265, in search
    self._save_pipeline(pipeline, normalized_score)
  File "/user_dev/ta2/search.py", line 142, in _save_pipeline
    pipeline_json = pipeline.to_json_structure()
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1904, in to_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/arguments'
2019-03-14 22:19:41,679 - 1 - WARNING - pipeline - Digest for pipeline '6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7' does not match a computed one. Provided digest: 73b65a9519317878a98f7533077d549237a04eea98b30b172874325b57ef93ec. Computed digest: 43e6fcb071fa2dd1e7ca121bde9198b56b9a55a544ecf14cd3dea70b5ec6033a.
2019-03-14 22:19:41,681 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:41,694 - 1 - INFO - search - Pipeline 22debeca-c805-4600-8746-f8571b093990 score: None - 0.0
2019-03-14 22:19:41,700 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:41,912 - 1 - INFO - search - Scoring pipeline 6: 17867bcd-2da7-4819-a023-40f823578bde
('3', 'strategy'): most_frequent
('4', 'criterion'): mae
('4', 'learning_rate'): 0.07588588197399965
('4', 'loss'): lad
('4', 'max_depth'): 29
('4', 'min_samples_leaf'): 969
('4', 'min_samples_split'): 365
('4', 'n_estimators'): 741
2019-03-14 22:19:42,085 - 1 - ERROR - search - Error scoring pipeline 17867bcd-2da7-4819-a023-40f823578bde
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:42,184 - 1 - WARNING - pipeline - Digest for pipeline '08e296d4-12f3-4860-91b1-9f0262882533' does not match a computed one. Provided digest: bdef786a3ba086689946e15f615ac2107a1bf7359fc6d74c32cb228609a4a8e0. Computed digest: 02703b5a998284d97e141083f4b5d9b3c6c4da4e566bfd40f129cc6903a20645.
2019-03-14 22:19:42,204 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:42,209 - 1 - WARNING - pipeline - Digest for pipeline 'f7e512d1-5c7c-407b-b53a-71104fbb0616' does not match a computed one. Provided digest: 62f9c0e1c1c2c6fab22f7ff1a8adad7b6b952096eead4e07409475329ba399b4. Computed digest: aef663664709b5b2f3d26ca4d77d968aa853ab24f09f8afa4d2a37a505aca2e8.
2019-03-14 22:19:42,278 - 1 - INFO - core_servicer - Starting async fit session 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7
2019-03-14 22:19:42,293 - 1 - INFO - search - Pipeline 17867bcd-2da7-4819-a023-40f823578bde score: None - 0.0
2019-03-14 22:19:42,322 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:42,429 - 1 - INFO - search - Scoring pipeline 7: f863aac7-22ea-4d03-9199-2ad7ee220323
('3', 'strategy'): mean
('4', 'criterion'): mae
('4', 'learning_rate'): 0.010201602310926672
('4', 'loss'): quantile
('4', 'max_depth'): 63
('4', 'min_samples_leaf'): 569
('4', 'min_samples_split'): 800
('4', 'n_estimators'): 810
2019-03-14 22:19:42,611 - 1 - ERROR - search - Error scoring pipeline f863aac7-22ea-4d03-9199-2ad7ee220323
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:42,735 - 1 - INFO - search - Pipeline f863aac7-22ea-4d03-9199-2ad7ee220323 score: None - 0.0
2019-03-14 22:19:42,826 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:42,838 - 1 - INFO - core_servicer - Starting async fit session f7e512d1-5c7c-407b-b53a-71104fbb0616
2019-03-14 22:19:42,988 - 1 - INFO - search - Scoring pipeline 8: e3352e90-65ab-4a9b-a2f7-374ccbe99936
('3', 'strategy'): median
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.041931626770290956
('4', 'loss'): huber
('4', 'max_depth'): 27
('4', 'min_samples_leaf'): 783
('4', 'min_samples_split'): 555
('4', 'n_estimators'): 826
2019-03-14 22:19:43,012 - 1 - WARNING - pipeline - Digest for pipeline '08e296d4-12f3-4860-91b1-9f0262882533' does not match a computed one. Provided digest: bdef786a3ba086689946e15f615ac2107a1bf7359fc6d74c32cb228609a4a8e0. Computed digest: 02703b5a998284d97e141083f4b5d9b3c6c4da4e566bfd40f129cc6903a20645.
2019-03-14 22:19:43,014 - 1 - ERROR - _server - Exception calling application: Unresolvable JSON pointer: 'definitions/data_arguments'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1068, in DescribeSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1289, in _get_pipeline
    pipeline = Pipeline.from_json_structure(solution)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1795, in from_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 352, in oneOf_draft4
    more_valid = [s for i, s in subschemas if validator.is_valid(instance, s)]
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 352, in <listcomp>
    more_valid = [s for i, s in subschemas if validator.is_valid(instance, s)]
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 148, in is_valid
    error = next(self.iter_errors(instance, _schema), None)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/data_arguments'
2019-03-14 22:19:43,014 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:43,142 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:43,197 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:43,240 - 1 - WARNING - pipeline - Digest for pipeline '17867bcd-2da7-4819-a023-40f823578bde' does not match a computed one. Provided digest: f46710859e4890812bd050d41b74d497548aa9f2f04b9fcb4107b4ebf7c7b163. Computed digest: a6314909d8f5bb17a03c2e64e4c6b856dd5cb8614d79c8e42dfa811601a464ac.
2019-03-14 22:19:43,531 - 1 - ERROR - search - Error scoring pipeline e3352e90-65ab-4a9b-a2f7-374ccbe99936
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:43,777 - 1 - INFO - search - Pipeline e3352e90-65ab-4a9b-a2f7-374ccbe99936 score: None - 0.0
2019-03-14 22:19:43,804 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:43,971 - 1 - INFO - search - Scoring pipeline 9: e56bf16e-312f-4ead-b06b-d84ec83c47c1
('3', 'strategy'): most_frequent
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.03931651145090664
('4', 'loss'): huber
('4', 'max_depth'): 1
('4', 'min_samples_leaf'): 449
('4', 'min_samples_split'): 205
('4', 'n_estimators'): 553
2019-03-14 22:19:44,317 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:44,392 - 1 - WARNING - pipeline - Digest for pipeline '17867bcd-2da7-4819-a023-40f823578bde' does not match a computed one. Provided digest: f46710859e4890812bd050d41b74d497548aa9f2f04b9fcb4107b4ebf7c7b163. Computed digest: a6314909d8f5bb17a03c2e64e4c6b856dd5cb8614d79c8e42dfa811601a464ac.
2019-03-14 22:19:44,452 - 1 - WARNING - pipeline - Digest for pipeline 'f863aac7-22ea-4d03-9199-2ad7ee220323' does not match a computed one. Provided digest: 2bc043955c6adbf00debab87575ea27ea4b876f73306b4d4ba595a8c120c5b75. Computed digest: b06ddbe90f12d8630bd75b46eafdcf95dd5a86af765be5fb3f8d4aea7b742571.
2019-03-14 22:19:44,455 - 1 - ERROR - search - Error scoring pipeline e56bf16e-312f-4ead-b06b-d84ec83c47c1
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:44,646 - 1 - INFO - search - Pipeline e56bf16e-312f-4ead-b06b-d84ec83c47c1 score: None - 0.0
2019-03-14 22:19:44,705 - 1 - INFO - gp - Using Uniform sampler as user specified r_minimum threshold is not met to start the GP based learning
2019-03-14 22:19:44,794 - 1 - INFO - core_servicer - Starting async fit session 08e296d4-12f3-4860-91b1-9f0262882533
2019-03-14 22:19:44,925 - 1 - INFO - search - Scoring pipeline 10: eafc267c-61e6-4265-a5c8-ba7d17c02fe5
('3', 'strategy'): most_frequent
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.09180484671663663
('4', 'loss'): ls
('4', 'max_depth'): 74
('4', 'min_samples_leaf'): 281
('4', 'min_samples_split'): 897
('4', 'n_estimators'): 557
2019-03-14 22:19:45,275 - 1 - ERROR - core_servicer - Exception in fit session 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 496, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, outputs=outputs)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 512, in _fit_multi_produce
    self.set_training_data(**arguments)  # type: ignore
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 358, in set_training_data
    self._training_outputs, self._target_names, self._target_column_indices = self._get_targets(outputs, self.hyperparams)
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 539, in _get_targets
    targets = common_utils.select_columns(data, target_column_indices)
  File "/usr/local/lib/python3.6/dist-packages/d3m/deprecate.py", line 55, in wrapper
    return f(*args, **kwargs)
  File "/src/common-primitives/common_primitives/utils.py", line 171, in select_columns
    raise exceptions.InvalidArgumentValueError("No columns selected.")
d3m.exceptions.InvalidArgumentValueError: No columns selected.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 4 for pipeline 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/ta3/core_servicer.py", line 730, in _run_session
    method(*args, **kwargs)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1305, in _fit_solution
    fit_results.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:45,288 - 1 - INFO - core_servicer - Ending fit session 6e5b2e09-654d-4afa-9b5b-b4ae2d7242b7
2019-03-14 22:19:45,422 - 1 - INFO - core_servicer - Closing stream
2019-03-14 22:19:45,476 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:45,483 - 1 - ERROR - search - Error scoring pipeline eafc267c-61e6-4265-a5c8-ba7d17c02fe5
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:45,483 - 1 - WARNING - pipeline - Digest for pipeline 'e3352e90-65ab-4a9b-a2f7-374ccbe99936' does not match a computed one. Provided digest: 15c044608d38c80e1f9c42814b2b5ed35371d12927c2cb6096965a179db5b034. Computed digest: f1766eb29cb77325a0c943b8d4d6f671b8df765d1e79dfae83c93ac61a1ef194.
2019-03-14 22:19:45,505 - 1 - WARNING - pipeline - Digest for pipeline 'f863aac7-22ea-4d03-9199-2ad7ee220323' does not match a computed one. Provided digest: 2bc043955c6adbf00debab87575ea27ea4b876f73306b4d4ba595a8c120c5b75. Computed digest: b06ddbe90f12d8630bd75b46eafdcf95dd5a86af765be5fb3f8d4aea7b742571.
2019-03-14 22:19:45,836 - 1 - INFO - search - Pipeline eafc267c-61e6-4265-a5c8-ba7d17c02fe5 score: None - 0.0
2019-03-14 22:19:46,037 - 1 - ERROR - core_servicer - Exception in fit session f7e512d1-5c7c-407b-b53a-71104fbb0616
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 496, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, outputs=outputs)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 512, in _fit_multi_produce
    self.set_training_data(**arguments)  # type: ignore
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 358, in set_training_data
    self._training_outputs, self._target_names, self._target_column_indices = self._get_targets(outputs, self.hyperparams)
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 539, in _get_targets
    targets = common_utils.select_columns(data, target_column_indices)
  File "/usr/local/lib/python3.6/dist-packages/d3m/deprecate.py", line 55, in wrapper
    return f(*args, **kwargs)
  File "/src/common-primitives/common_primitives/utils.py", line 171, in select_columns
    raise exceptions.InvalidArgumentValueError("No columns selected.")
d3m.exceptions.InvalidArgumentValueError: No columns selected.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 4 for pipeline f7e512d1-5c7c-407b-b53a-71104fbb0616 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/ta3/core_servicer.py", line 730, in _run_session
    method(*args, **kwargs)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1305, in _fit_solution
    fit_results.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:46,040 - 1 - INFO - core_servicer - Ending fit session f7e512d1-5c7c-407b-b53a-71104fbb0616
2019-03-14 22:19:46,121 - 1 - INFO - core_servicer - Closing stream
2019-03-14 22:19:46,135 - 1 - INFO - search - Scoring pipeline 11: a4b95721-cc66-45d9-94d8-e3fe48faad2f
('3', 'strategy'): median
('4', 'criterion'): mae
('4', 'learning_rate'): 0.01634856297120727
('4', 'loss'): quantile
('4', 'max_depth'): 97
('4', 'min_samples_leaf'): 95
('4', 'min_samples_split'): 612
('4', 'n_estimators'): 596
2019-03-14 22:19:46,285 - 1 - INFO - core_servicer - Starting async fit session 17867bcd-2da7-4819-a023-40f823578bde
2019-03-14 22:19:46,500 - 1 - ERROR - search - Error scoring pipeline a4b95721-cc66-45d9-94d8-e3fe48faad2f
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:46,639 - 1 - INFO - core_servicer - Starting async fit session f863aac7-22ea-4d03-9199-2ad7ee220323
2019-03-14 22:19:46,647 - 1 - INFO - search - Pipeline a4b95721-cc66-45d9-94d8-e3fe48faad2f score: None - 0.0
2019-03-14 22:19:46,848 - 1 - INFO - search - Scoring pipeline 12: ae37c251-f90f-4857-9baa-1da450d93223
('3', 'strategy'): median
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.06872903611272568
('4', 'loss'): lad
('4', 'max_depth'): 100
('4', 'min_samples_leaf'): 713
('4', 'min_samples_split'): 245
('4', 'n_estimators'): 587
2019-03-14 22:19:47,141 - 1 - ERROR - core_servicer - Exception in fit session f863aac7-22ea-4d03-9199-2ad7ee220323
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/user_dev/ta2/ta3/core_servicer.py", line 730, in _run_session
    method(*args, **kwargs)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1304, in _fit_solution
    fit_results = runtime.fit(inputs=[dataset])
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 946, in fit
    return self._run(inputs, metadata_base.PipelineRunPhase.FIT, return_values)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 846, in _run
    self._check_pipeline(inputs)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 305, in _check_pipeline
    self.pipeline.check(allow_placeholders=False, standard_pipeline=self.is_standard_pipeline, input_types=input_types)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1450, in check
    self._check(allow_placeholders, standard_pipeline, input_types)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1456, in _check
    self.to_json_structure()
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1904, in to_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/data_argument'
2019-03-14 22:19:47,218 - 1 - ERROR - search - Error scoring pipeline ae37c251-f90f-4857-9baa-1da450d93223
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:47,220 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:47,236 - 1 - WARNING - pipeline - Digest for pipeline 'e3352e90-65ab-4a9b-a2f7-374ccbe99936' does not match a computed one. Provided digest: 15c044608d38c80e1f9c42814b2b5ed35371d12927c2cb6096965a179db5b034. Computed digest: f1766eb29cb77325a0c943b8d4d6f671b8df765d1e79dfae83c93ac61a1ef194.
2019-03-14 22:19:47,247 - 1 - WARNING - pipeline - Digest for pipeline 'e56bf16e-312f-4ead-b06b-d84ec83c47c1' does not match a computed one. Provided digest: 2b22efd0326c638e5ab9f56e5aa4e402532b423fa0631a80880ddb068d3dffb5. Computed digest: 8f40fa38f061c7baac7ab6585a3cf4ca023da2e67fac1f20cb621b12c9c56d39.
2019-03-14 22:19:47,248 - 1 - INFO - core_servicer - Ending fit session f863aac7-22ea-4d03-9199-2ad7ee220323
2019-03-14 22:19:47,519 - 1 - INFO - search - Pipeline ae37c251-f90f-4857-9baa-1da450d93223 score: None - 0.0
2019-03-14 22:19:47,686 - 1 - INFO - core_servicer - Closing stream
2019-03-14 22:19:47,799 - 1 - INFO - search - Scoring pipeline 13: f7b33574-1e0b-44f6-acf4-25e2afc7796a
('3', 'strategy'): median
('4', 'criterion'): mae
('4', 'learning_rate'): 0.020707016722054397
('4', 'loss'): ls
('4', 'max_depth'): 67
('4', 'min_samples_leaf'): 334
('4', 'min_samples_split'): 736
('4', 'n_estimators'): 675
2019-03-14 22:19:48,113 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:48,138 - 1 - ERROR - _server - Exception calling application: Unresolvable JSON pointer: 'definitions/data_argument'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1289, in _get_pipeline
    pipeline = Pipeline.from_json_structure(solution)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1795, in from_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/data_argument'
2019-03-14 22:19:48,154 - 1 - ERROR - _server - Exception calling application: Unresolvable JSON pointer: 'definitions/data_argument'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1068, in DescribeSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1289, in _get_pipeline
    pipeline = Pipeline.from_json_structure(solution)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1795, in from_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/data_argument'
2019-03-14 22:19:48,187 - 1 - ERROR - search - Error scoring pipeline f7b33574-1e0b-44f6-acf4-25e2afc7796a
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:48,300 - 1 - INFO - core_servicer - Starting async fit session e3352e90-65ab-4a9b-a2f7-374ccbe99936
2019-03-14 22:19:48,333 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:48,362 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:48,411 - 1 - WARNING - pipeline - Digest for pipeline 'a4b95721-cc66-45d9-94d8-e3fe48faad2f' does not match a computed one. Provided digest: fa2f2f99897cf251c0e91291ae27b81ab828f08c6a05bad4177662455caf6edf. Computed digest: 48b15894c768de602aa59398ce19008a40782834bc60c26909bed7c9e64e08a3.
2019-03-14 22:19:48,415 - 1 - INFO - search - Pipeline f7b33574-1e0b-44f6-acf4-25e2afc7796a score: None - 0.0
2019-03-14 22:19:48,675 - 1 - INFO - search - Scoring pipeline 14: 7e2a46b3-f9ce-4c39-89b8-0c259fb30a97
('3', 'strategy'): most_frequent
('4', 'criterion'): friedman_mse
('4', 'learning_rate'): 0.06253392452840757
('4', 'loss'): huber
('4', 'max_depth'): 52
('4', 'min_samples_leaf'): 189
('4', 'min_samples_split'): 377
('4', 'n_estimators'): 740
2019-03-14 22:19:48,773 - 1 - ERROR - search - Error scoring pipeline 7e2a46b3-f9ce-4c39-89b8-0c259fb30a97
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:48,841 - 1 - INFO - search - Pipeline 7e2a46b3-f9ce-4c39-89b8-0c259fb30a97 score: None - 0.0
2019-03-14 22:19:48,995 - 1 - INFO - search - Scoring pipeline 15: 1ac4cd9e-51a6-4333-acab-a3eb83e25963
('3', 'strategy'): most_frequent
('4', 'criterion'): mae
('4', 'learning_rate'): 0.026016991016654337
('4', 'loss'): quantile
('4', 'max_depth'): 74
('4', 'min_samples_leaf'): 905
('4', 'min_samples_split'): 145
('4', 'n_estimators'): 548
2019-03-14 22:19:49,205 - 1 - ERROR - search - Error scoring pipeline 1ac4cd9e-51a6-4333-acab-a3eb83e25963
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:49,295 - 1 - INFO - search - Pipeline 1ac4cd9e-51a6-4333-acab-a3eb83e25963 score: None - 0.0
2019-03-14 22:19:49,521 - 1 - INFO - search - Scoring pipeline 16: 40a641e7-4b55-4257-bfb9-24b0d22deb45
('3', 'strategy'): median
('4', 'criterion'): mse
('4', 'learning_rate'): 0.07457891215491955
('4', 'loss'): huber
('4', 'max_depth'): 98
('4', 'min_samples_leaf'): 709
('4', 'min_samples_split'): 266
('4', 'n_estimators'): 685
2019-03-14 22:19:49,640 - 1 - ERROR - search - Error scoring pipeline 40a641e7-4b55-4257-bfb9-24b0d22deb45
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:49,724 - 1 - ERROR - search - Error saving pipeline 40a641e7-4b55-4257-bfb9-24b0d22deb45
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 265, in search
    self._save_pipeline(pipeline, normalized_score)
  File "/user_dev/ta2/search.py", line 142, in _save_pipeline
    pipeline_json = pipeline.to_json_structure()
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1904, in to_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/container_argument'
2019-03-14 22:19:49,740 - 1 - INFO - search - Pipeline 40a641e7-4b55-4257-bfb9-24b0d22deb45 score: None - 0.0
2019-03-14 22:19:49,823 - 1 - WARNING - pipeline - Digest for pipeline 'a4b95721-cc66-45d9-94d8-e3fe48faad2f' does not match a computed one. Provided digest: fa2f2f99897cf251c0e91291ae27b81ab828f08c6a05bad4177662455caf6edf. Computed digest: 48b15894c768de602aa59398ce19008a40782834bc60c26909bed7c9e64e08a3.
2019-03-14 22:19:49,826 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:49,841 - 1 - WARNING - pipeline - Digest for pipeline 'ae37c251-f90f-4857-9baa-1da450d93223' does not match a computed one. Provided digest: ab02b78a54d26f8327d5c73f9e581bbf6b4481e44b5bc4e1d1d807091c650ba2. Computed digest: 255a2da3e5e3781a6db6f2892466c94be5d7e5eaee162583e53f241b0f5115ec.
2019-03-14 22:19:50,039 - 1 - INFO - search - Scoring pipeline 17: 3a8b59fe-52c1-4d94-bec9-751834858296
('3', 'strategy'): mean
('4', 'criterion'): mse
('4', 'learning_rate'): 0.058409073245368974
('4', 'loss'): lad
('4', 'max_depth'): 33
('4', 'min_samples_leaf'): 479
('4', 'min_samples_split'): 806
('4', 'n_estimators'): 706
2019-03-14 22:19:50,160 - 1 - ERROR - search - Error scoring pipeline 3a8b59fe-52c1-4d94-bec9-751834858296
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:50,264 - 1 - INFO - search - Pipeline 3a8b59fe-52c1-4d94-bec9-751834858296 score: None - 0.0
2019-03-14 22:19:50,575 - 1 - INFO - search - Scoring pipeline 18: fc733914-02a1-4c98-990d-2e6cf3174d5f
('3', 'strategy'): most_frequent
('4', 'criterion'): mse
('4', 'learning_rate'): 0.017601160847963742
('4', 'loss'): ls
('4', 'max_depth'): 25
('4', 'min_samples_leaf'): 113
('4', 'min_samples_split'): 930
('4', 'n_estimators'): 425
2019-03-14 22:19:50,766 - 1 - WARNING - pipeline - Digest for pipeline 'ae37c251-f90f-4857-9baa-1da450d93223' does not match a computed one. Provided digest: ab02b78a54d26f8327d5c73f9e581bbf6b4481e44b5bc4e1d1d807091c650ba2. Computed digest: 255a2da3e5e3781a6db6f2892466c94be5d7e5eaee162583e53f241b0f5115ec.
2019-03-14 22:19:50,806 - 1 - ERROR - search - Error scoring pipeline fc733914-02a1-4c98-990d-2e6cf3174d5f
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:50,818 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:50,821 - 1 - ERROR - core_servicer - Exception in fit session e3352e90-65ab-4a9b-a2f7-374ccbe99936
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 496, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, outputs=outputs)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 512, in _fit_multi_produce
    self.set_training_data(**arguments)  # type: ignore
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 358, in set_training_data
    self._training_outputs, self._target_names, self._target_column_indices = self._get_targets(outputs, self.hyperparams)
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 539, in _get_targets
    targets = common_utils.select_columns(data, target_column_indices)
  File "/usr/local/lib/python3.6/dist-packages/d3m/deprecate.py", line 55, in wrapper
    return f(*args, **kwargs)
  File "/src/common-primitives/common_primitives/utils.py", line 171, in select_columns
    raise exceptions.InvalidArgumentValueError("No columns selected.")
d3m.exceptions.InvalidArgumentValueError: No columns selected.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 4 for pipeline e3352e90-65ab-4a9b-a2f7-374ccbe99936 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/ta3/core_servicer.py", line 730, in _run_session
    method(*args, **kwargs)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1305, in _fit_solution
    fit_results.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:50,846 - 1 - INFO - core_servicer - Ending fit session e3352e90-65ab-4a9b-a2f7-374ccbe99936
2019-03-14 22:19:50,895 - 1 - WARNING - pipeline - Digest for pipeline 'f7b33574-1e0b-44f6-acf4-25e2afc7796a' does not match a computed one. Provided digest: dbdcaab06b797bb5c0cd74d6f5d350142f6d52defdb19e3eea0e4a6f7b6b55db. Computed digest: 6faf90fe617edc4c658231db9669cf0544c5d3ac6e6747718637715aa6709ee6.
2019-03-14 22:19:50,961 - 1 - INFO - search - Pipeline fc733914-02a1-4c98-990d-2e6cf3174d5f score: None - 0.0
2019-03-14 22:19:51,171 - 1 - ERROR - core_servicer - Exception in fit session 08e296d4-12f3-4860-91b1-9f0262882533
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 496, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, outputs=outputs)
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 512, in _fit_multi_produce
    self.set_training_data(**arguments)  # type: ignore
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 358, in set_training_data
    self._training_outputs, self._target_names, self._target_column_indices = self._get_targets(outputs, self.hyperparams)
  File "/src/sklearn-wrap/sklearn_wrap/SKGradientBoostingRegressor.py", line 539, in _get_targets
    targets = common_utils.select_columns(data, target_column_indices)
  File "/usr/local/lib/python3.6/dist-packages/d3m/deprecate.py", line 55, in wrapper
    return f(*args, **kwargs)
  File "/src/common-primitives/common_primitives/utils.py", line 171, in select_columns
    raise exceptions.InvalidArgumentValueError("No columns selected.")
d3m.exceptions.InvalidArgumentValueError: No columns selected.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 4 for pipeline 08e296d4-12f3-4860-91b1-9f0262882533 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/ta3/core_servicer.py", line 730, in _run_session
    method(*args, **kwargs)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1305, in _fit_solution
    fit_results.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:51,176 - 1 - INFO - core_servicer - Ending fit session 08e296d4-12f3-4860-91b1-9f0262882533
2019-03-14 22:19:51,255 - 1 - INFO - search - Scoring pipeline 19: 767285f1-3b03-40a1-a6fb-9fd3fb63c5e2
('3', 'strategy'): mean
('4', 'criterion'): mae
('4', 'learning_rate'): 0.08044641750862547
('4', 'loss'): quantile
('4', 'max_depth'): 51
('4', 'min_samples_leaf'): 50
('4', 'min_samples_split'): 746
('4', 'n_estimators'): 619
2019-03-14 22:19:51,282 - 1 - WARNING - pipeline - Digest for pipeline 'ae37c251-f90f-4857-9baa-1da450d93223' does not match a computed one. Provided digest: ab02b78a54d26f8327d5c73f9e581bbf6b4481e44b5bc4e1d1d807091c650ba2. Computed digest: 255a2da3e5e3781a6db6f2892466c94be5d7e5eaee162583e53f241b0f5115ec.
2019-03-14 22:19:51,299 - 1 - WARNING - pipeline - Digest for pipeline 'a4b95721-cc66-45d9-94d8-e3fe48faad2f' does not match a computed one. Provided digest: fa2f2f99897cf251c0e91291ae27b81ab828f08c6a05bad4177662455caf6edf. Computed digest: 48b15894c768de602aa59398ce19008a40782834bc60c26909bed7c9e64e08a3.
2019-03-14 22:19:51,385 - 1 - ERROR - search - Error scoring pipeline 767285f1-3b03-40a1-a6fb-9fd3fb63c5e2
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 823, in _do_run_step
    self._run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 815, in _run_step
    self._run_primitive(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 720, in _run_primitive
    multi_call_result = self._call_primitive_method(primitive.fit_multi_produce, fit_multi_produce_arguments)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 796, in _call_primitive_method
    raise error
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 789, in _call_primitive_method
    result = method(**arguments)
  File "/src/common-primitives/common_primitives/base.py", line 347, in fit_multi_produce
    return self._fit_multi_produce(produce_methods=produce_methods, timeout=timeout, iterations=iterations, inputs=inputs, dataset=dataset)  # type: ignore
  File "/usr/local/lib/python3.6/dist-packages/d3m/primitive_interfaces/base.py", line 523, in _fit_multi_produce
    fit_result = self.fit(timeout=timeout, iterations=iterations)
  File "/src/common-primitives/common_primitives/base.py", line 333, in fit
    targets, target_columns = self._get_target_columns(self._dataset, self._main_resource_id)
  File "/src/common-primitives/common_primitives/base.py", line 358, in _get_target_columns
    raise ValueError("No target columns.")
ValueError: No target columns.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 852, in _run
    self._do_run()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 840, in _do_run
    self._do_run_step(step)
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 832, in _do_run_step
    ) from error
d3m.exceptions.StepFailedError: Step 0 for pipeline eb0103ad-927a-47a8-8b60-a096d1dbfe58 failed.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/user_dev/ta2/search.py", line 257, in search
    score = self.score_pipeline(dataset, problem, pipeline)
  File "/user_dev/ta2/search.py", line 133, in score_pipeline
    scoring_random_seed=random_seed,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1258, in evaluate
    runtime_environment=runtime_environment,
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 1222, in prepare_data
    result.check_success()
  File "/usr/local/lib/python3.6/dist-packages/d3m/runtime.py", line 49, in check_success
    raise exceptions.PipelineRunError("Pipeline run failed.", [self.pipeline_run]) from self.error
d3m.exceptions.PipelineRunError: Pipeline run failed.
2019-03-14 22:19:51,527 - 1 - INFO - core_servicer - Closing stream
2019-03-14 22:19:51,596 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1350, in FitSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'
2019-03-14 22:19:51,620 - 1 - INFO - search - Pipeline 767285f1-3b03-40a1-a6fb-9fd3fb63c5e2 score: None - 0.0
2019-03-14 22:19:51,693 - 1 - WARNING - pipeline - Digest for pipeline 'f7b33574-1e0b-44f6-acf4-25e2afc7796a' does not match a computed one. Provided digest: dbdcaab06b797bb5c0cd74d6f5d350142f6d52defdb19e3eea0e4a6f7b6b55db. Computed digest: 6faf90fe617edc4c658231db9669cf0544c5d3ac6e6747718637715aa6709ee6.
2019-03-14 22:19:51,702 - 1 - ERROR - _server - Exception calling application: Unresolvable JSON pointer: 'definitions/value_argument'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 418, in resolve_fragment
    document = document[part]
KeyError: 'definitions'

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1068, in DescribeSolution
    pipeline, session = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1289, in _get_pipeline
    pipeline = Pipeline.from_json_structure(solution)
  File "/usr/local/lib/python3.6/dist-packages/d3m/metadata/pipeline.py", line 1795, in from_json_structure
    PIPELINE_SCHEMA_VALIDATOR.validate(pipeline_description)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 129, in validate
    for error in self.iter_errors(*args, **kwargs):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 55, in items
    for error in validator.descend(item, items, path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 304, in properties_draft4
    schema_path=property,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 333, in allOf_draft4
    for error in validator.descend(instance, subschema, schema_path=index):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 216, in ref
    for error in validator.descend(instance, resolved):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 16, in patternProperties
    v, subschema, path=k, schema_path=pattern,
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 341, in oneOf_draft4
    errs = list(validator.descend(instance, subschema, schema_path=index))
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 121, in descend
    for error in self.iter_errors(instance, schema):
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 105, in iter_errors
    for error in errors:
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/_validators.py", line 212, in ref
    scope, resolved = validator.resolver.resolve(ref)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 375, in resolve
    return url, self._remote_cache(url)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 387, in resolve_from_url
    return self.resolve_fragment(document, fragment)
  File "/usr/local/lib/python3.6/dist-packages/jsonschema/validators.py", line 421, in resolve_fragment
    "Unresolvable JSON pointer: %r" % fragment
jsonschema.exceptions.RefResolutionError: Unresolvable JSON pointer: 'definitions/value_argument'
2019-03-14 22:19:51,810 - 1 - ERROR - _server - Exception calling application: 'session'
Traceback (most recent call last):
  File "/usr/local/lib/python3.6/dist-packages/grpc/_server.py", line 392, in _call_behavior
    return behavior(argument, context), True
  File "/user_dev/ta2/ta3/core_servicer.py", line 1198, in ScoreSolution
    pipeline, _ = self._get_pipeline(solution_id)
  File "/user_dev/ta2/ta3/core_servicer.py", line 1288, in _get_pipeline
    session = solution.pop('session')
KeyError: 'session'

```
