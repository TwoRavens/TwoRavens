import datetime
import operator
import os.path
import sys
import tempfile
import unittest

from d3m import container, index, utils as d3m_utils
from d3m.metadata import pipeline as pipeline_module, problem as problem_module

from ta3ta2_api import utils, problem_pb2

TEST_PRIMITIVES_DIR = os.path.join(os.path.dirname(__file__), 'data', 'primitives')
TEST_PROBLEMS_DIR = os.path.join(os.path.dirname(__file__), 'data', 'problems')
TEST_PIPELINES_DIR = os.path.join(os.path.dirname(__file__), 'data', 'pipelines')

sys.path.insert(0, TEST_PRIMITIVES_DIR)

# Or code above correctly sets the path, or "run_tests.py" sets it.
from test_primitives.monomial import MonomialPrimitive
from test_primitives.random import RandomPrimitive
from test_primitives.sum import SumPrimitive
from test_primitives.increment import IncrementPrimitive


class PythonValue:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        if isinstance(other, PythonValue):
            return self.value == other.value

        return NotImplemented

    def __hash__(self):
        return hash(self.value)


class TestUtils(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # To hide any logging or stdout output.
        with d3m_utils.silence():
            index.register_primitive('d3m.primitives.regression.monomial.Test', MonomialPrimitive)
            index.register_primitive('d3m.primitives.data_generation.random.Test', RandomPrimitive)
            index.register_primitive('d3m.primitives.operator.sum.Test', SumPrimitive)
            index.register_primitive('d3m.primitives.operator.increment.Test', IncrementPrimitive)

    def test_primitive(self):
        primitive_message = utils.encode_primitive(MonomialPrimitive)
        primitive_description = utils.decode_primitive(primitive_message)
        primitive_description_message = utils.encode_primitive_description(primitive_description)

        self.assertEqual(primitive_message, primitive_description_message)
        self.assertEqual(primitive_description, utils.decode_primitive(primitive_description_message))

    def test_problem(self):
        problem_description = problem_module.Problem.load('file://' + os.path.abspath(os.path.join(TEST_PROBLEMS_DIR, 'iris_problem_1', 'problemDoc.json')))

        problem_message = utils.encode_problem_description(problem_description)

        decoded_problem_description = utils.decode_problem_description(problem_message, strict_digest=True)

        self.assertEqual(decoded_problem_description._canonical_problem_description(decoded_problem_description), problem_description._canonical_problem_description(problem_description))

    def test_pipeline(self):
        with open(os.path.join(TEST_PIPELINES_DIR, 'random-sample.yml'), 'r') as pipeline_file:
            pipeline = pipeline_module.Pipeline.from_yaml(
                pipeline_file,
                resolver=pipeline_module.Resolver(),
                strict_digest=True,
            )

        with tempfile.TemporaryDirectory() as scratch_dir:
            def validate_uri(uri):
                utils.validate_uri(uri, [scratch_dir])

            pipeline_message = utils.encode_pipeline_description(
                pipeline,
                [
                    utils.ValueType.RAW,
                    utils.ValueType.CSV_URI,
                    utils.ValueType.DATASET_URI,
                    utils.ValueType.PICKLE_BLOB,
                    utils.ValueType.PICKLE_URI,
                ],
                scratch_dir,
                validate_uri=validate_uri,
            )

            decoded_pipeline = utils.decode_pipeline_description(
                pipeline_message,
                pipeline_module.Resolver(),
                validate_uri=validate_uri,
                strict_digest=True,
            )

            self.assertEqual(pipeline.to_json_structure(nest_subpipelines=True), decoded_pipeline.to_json_structure(nest_subpipelines=True))

    def test_raw_values(self):
        for value in [
            None, True, False, 42.0, 42,
            "foobar", b"foobar",
            {'value': 42}, [1, 2, 3],
        ]:
            self.assertEqual(utils.decode_raw_value(utils.encode_raw_value(value)), value, value)

    def test_timestamp(self):
        for timestamp in [
            datetime.datetime.now(tz=datetime.timezone.utc),
        ]:
            self.assertEqual(utils.decode_timestamp(utils.encode_timestamp(timestamp)), timestamp, timestamp)

    def test_value(self):
        # Values should be strings because on loading a CSV values are not parsed.
        table = container.DataFrame({
            'a': ['1', '2', '3'],
            'b': ['4', '5', '6']},
            generate_metadata=True,
        )

        with tempfile.TemporaryDirectory() as scratch_dir:
            def validate_uri(uri):
                utils.validate_uri(uri, [scratch_dir])

            def dataframe_equal(a, b):
                return a.columns.tolist() == b.columns.tolist() and a.values.tolist() == b.values.tolist()

            for value, test_value_types, equal in [
                (
                    42,
                    [
                        utils.ValueType.RAW, utils.ValueType.LARGE_RAW,
                        utils.ValueType.PICKLE_BLOB, utils.ValueType.PICKLE_URI,
                        utils.ValueType.LARGE_RAW, utils.ValueType.LARGE_PICKLE_BLOB,
                    ],
                    operator.eq,
                ),
                (
                    PythonValue(42),
                    [
                        utils.ValueType.PICKLE_BLOB, utils.ValueType.PICKLE_URI,
                        utils.ValueType.LARGE_PICKLE_BLOB,
                    ],
                    operator.eq,
                ),
                (
                    table,
                    [
                        utils.ValueType.CSV_URI, utils.ValueType.PICKLE_BLOB,
                        utils.ValueType.PICKLE_URI, utils.ValueType.LARGE_PICKLE_BLOB,
                    ],
                    dataframe_equal,
                ),
            ]:
                for allowed_value_type in test_value_types:
                    self.assertTrue(
                        equal(
                            utils.load_value(
                                utils.save_value(
                                    value,
                                    [allowed_value_type],
                                    scratch_dir,
                                    raise_error=True,
                                ),
                                validate_uri=validate_uri,
                                strict_digest=True,
                            ),
                            value,
                        ),
                        (value, allowed_value_type),
                    )
                    self.assertTrue(
                        equal(
                            utils.load_value(
                                utils.decode_value(
                                    utils.encode_value(
                                        utils.save_value(
                                            value,
                                            [allowed_value_type],
                                            scratch_dir,
                                            raise_error=True,
                                        ),
                                        [allowed_value_type],
                                        scratch_dir,
                                        validate_uri=validate_uri,
                                    ),
                                    validate_uri=validate_uri,
                                    raise_error=True,
                                ),
                                validate_uri=validate_uri,
                                strict_digest=True,
                            ),
                            value,
                        ),
                        (value, allowed_value_type),
                    )

    def test_performance_metric(self):
        grpc_message = utils.encode_performance_metric({
            'metric': 'RANK'
        })

        self.assertEqual(grpc_message.metric, problem_pb2.PerformanceMetric.Value('RANK'))

        metric = utils.decode_performance_metric(grpc_message)

        self.assertEqual(metric['metric'], 'RANK')

        grpc_message = utils.encode_performance_metric({
            # One should not really pass a string for non-custom metric, but it is supported.
            'metric': 'F1_MICRO'
        })

        self.assertEqual(grpc_message.metric, problem_pb2.PerformanceMetric.Value('F1_MICRO'))

        grpc_message = utils.encode_performance_metric({
            'metric': problem_module.PerformanceMetric.F1_MICRO
        })

        self.assertEqual(grpc_message.metric, problem_pb2.PerformanceMetric.Value('F1_MICRO'))

        metric = utils.decode_performance_metric(grpc_message)

        self.assertIsInstance(metric['metric'], problem_module.PerformanceMetric)
        self.assertIs(metric['metric'], problem_module.PerformanceMetric.F1_MICRO)


if __name__ == '__main__':
    unittest.main()
