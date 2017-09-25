from __future__ import absolute_import, division, print_function

import os, sys, django
import socket
from os.path import abspath, dirname, realpath

proj_dir = dirname(dirname(dirname(realpath(__file__))))
print(proj_dir)
sys.path.append(proj_dir) #here store is root folder(means parent).

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tworavensproject.settings.local_settings")
django.setup()


import random
from concurrent import futures
import grpc
import logging
import time

from tworaven_apps.ta2_interfaces import core_pb2
from tworaven_apps.ta2_interfaces import core_pb2_grpc as core_pb2_grpc

"""
import data_ext_pb2 as data_ext_pb2
import data_ext_pb2_grpc as data_ext_pb2_grpc

import dataflow_ext_pb2 as dataflow_ext_pb2
import dataflow_ext_pb2_grpc as dataflow_ext_pb2_grpc
"""
__version__ = '0.1'


logger = logging.getLogger(__name__)

session_start_time = {}

class Core(core_pb2_grpc.CoreServicer):
    def __init__(self):
        self.sessions = set()

    def StartSession(self, request, context):
        version = core_pb2.DESCRIPTOR.GetOptions().Extensions[
            core_pb2.protocol_version]
        #import ipdb; ipdb.set_trace()
        print('version: %s' % version)
        print('request.version: %s' % request.version)

        """
        if not request.version == version:
            err_msg = 'Expecting version %s but received version %s' %\
                (version, request.version)

            return core_pb2.SessionResponse(
                response_info=core_pb2.Response(
                    status=core_pb2.Status(code=core_pb2.FAILED_PRECONDITION,
                                           details=err_msg),
                ),)
                #user_agent='ta2_stub %s' % __version__,
                #version=version,
                #context=core_pb2.SessionContext(session_id=err_msg),)
        """
        session = 'session_%d' % len(self.sessions)
        session_start_time[session] = time.time()
        self.sessions.add(session)
        logger.info("Session started: 1 (protocol version %s)", version)
        return core_pb2.SessionResponse(
            response_info=core_pb2.Response(
                status=core_pb2.Status(code=core_pb2.OK)
            ),
            #user_agent='ta2_stub %s' % __version__,
            user_agent=request.user_agent,
            version=version,
            context=core_pb2.SessionContext(session_id=session),
        )

    def EndSession(self, request, context):
        if not request.session_id in self.sessions:
            return core_pb2.Response(\
                    status=core_pb2.Status(\
                        code=core_pb2.FAILED_PRECONDITION,
                        details="Unknown session id: %s" % request.session_id))
        logger.info("Session terminated: %s", request.session_id)

        self.sessions.remove(request.session_id)
        return core_pb2.Response(
            status=core_pb2.Status(code=core_pb2.OK),
        )


    def UpdateProblemSchema(self, request, context):
        #assert context['session_id'] in self.sessions
        logger.info("UpdateProblemSchema: ")#"%s", request.session_id)
        return core_pb2.Response(
            status=core_pb2.Status(\
                    code=core_pb2.OK,
                    details='Problem Schema Updated'),)


    def CreatePipelines(self, request, context):
        sessioncontext = request.context
        if not sessioncontext.session_id in self.sessions:
            yield core_pb2.PipelineCreateResult(\
                    response_info=core_pb2.Response(\
                        status=core_pb2.Status(\
                            code=core_pb2.FAILED_PRECONDITION,
                            details="Unknown session id: %s" % sessioncontext.session_id)))
            return
        train_features = request.train_features
        task = request.task
        #assert task == core_pb2.CLASSIFICATION
        task_subtype = request.task_subtype
        task_description = request.task_description
        output = request.output
        metrics = request.metrics
        target_features = request.target_features
        max_pipelines = request.max_pipelines

        logger.info("Got CreatePipelines request, session=%s",
                    sessioncontext.session_id)

        results = [
            (core_pb2.SUBMITTED, 'pipeline_1', False),
            (core_pb2.SUBMITTED, 'pipeline_2', False),
            (core_pb2.RUNNING, 'pipeline_2', False),
            (core_pb2.RUNNING, 'pipeline_1', False),
            (core_pb2.COMPLETED, 'pipeline_1', True),
            (core_pb2.COMPLETED, 'pipeline_2', True),
        ]

        for progress, pipeline_id, send_pipeline in results:
            time.sleep(1)

            if not context.is_active():
                logger.info("Client closed CreatePipelines stream")

            msg = core_pb2.PipelineCreateResult(
                response_info=core_pb2.Response(
                    status=core_pb2.Status(code=core_pb2.OK),
                ),
                progress_info=progress,
                pipeline_id=pipeline_id,
            )
            if send_pipeline:
                msg.pipeline_info.CopyFrom(
                    core_pb2.Pipeline(
                        predict_result_uris=['file:///out/predict1.csv'],
                        output=output,
                        scores=[
                            core_pb2.Score(
                                metric=core_pb2.ACCURACY,
                                value=0.8,
                            ),
                            core_pb2.Score(
                                metric=core_pb2.ROC_AUC,
                                value=0.5,
                            ),
                        ],
                    )
                )
            yield msg


    def ListPipelines(self, request, context):
        sessioncontext = request.context
        if not sessioncontext.session_id in self.sessions:
            return core_pb2.PipelineListResult(\
                        response_info=core_pb2.Response(\
                            status=core_pb2.Status(\
                                code=core_pb2.FAILED_PRECONDITION,
                                details="Unknown session id: %s" % sessioncontext.session_id)))

        logger.info("Got ListPipelines request, session=%s",
                    sessioncontext.session_id)

        res = core_pb2.PipelineListResult()

        res.response_info.status.code = core_pb2.OK
        res.response_info.status.details = "listing the pipelines!"

        res.pipeline_ids.append('pipeline_01')
        res.pipeline_ids.append('pipeline_02')

        return res


    def GetExecutePipelineResults(self, request, context):
        sessioncontext = request.context
        if not sessioncontext.session_id in self.sessions:
            yield core_pb2.PipelineExecuteResult(\
                response_info=core_pb2.Response(\
                    status=core_pb2.Status(\
                     code=core_pb2.FAILED_PRECONDITION,
                     details="Unknown session id: %s" % sessioncontext.session_id)))
            return

        pipeline_ids = request.pipeline_ids

        logger.info("Got GetExecutePipelineResults request, session=%s",
                    sessioncontext.session_id)

        for pipeline_id in pipeline_ids:
            time.sleep(1)
            progress_info = random.choice(\
                            [core_pb2.UPDATED,
                             core_pb2.RUNNING,
                             core_pb2.COMPLETED,])

            yield core_pb2.PipelineExecuteResult(
                response_info=core_pb2.Response(
                    status=core_pb2.Status(code=core_pb2.OK),
                ),
                progress_info=progress_info,
                pipeline_id=pipeline_id,
            )


    def ExecutePipeline(self, request, context):
        sessioncontext = request.context
        if not sessioncontext.session_id in self.sessions:
            yield core_pb2.PipelineExecuteResult(\
                response_info=core_pb2.Response(\
                    status=core_pb2.Status(\
                     code=core_pb2.FAILED_PRECONDITION,
                     details="Unknown session id: %s" % sessioncontext.session_id)))
            return

        pipeline_id = request.pipeline_id

        logger.info("Got ExecutePipeline request, session=%s",
                    sessioncontext.session_id)

        time.sleep(1)
        yield core_pb2.PipelineExecuteResult(
            response_info=core_pb2.Response(
                status=core_pb2.Status(code=core_pb2.OK),
            ),
            progress_info=core_pb2.RUNNING,
            pipeline_id=pipeline_id,
        )
        time.sleep(1)
        yield core_pb2.PipelineExecuteResult(
            response_info=core_pb2.Response(
                status=core_pb2.Status(code=core_pb2.OK),
            ),
            progress_info=core_pb2.COMPLETED,
            pipeline_id=pipeline_id,
        )


"""
class DataflowExt(dataflow_ext_pb2_grpc.DataflowExtServicer):
    def __init__(self):
        self.sessions = set()

    def DescribeDataflow(self, request, context):
        sessioncontext = request.context
        logger.info("Got DescribeDataflow request, session=%s",
                    sessioncontext.session_id)
        return dataflow_ext_pb2.DataflowDescription(
                pipeline_id = "pipeline_51334-0",
                modules = [
                        dataflow_ext_pb2.DataflowDescription.Module(
                                id="module_1",
                                type= "reading_data",
                                label="Read Data",
                                inputs=[],
                                outputs=[
                                    dataflow_ext_pb2.DataflowDescription.Output(name="data_out", type="numpy_array")
                                ]
                        ),
                        dataflow_ext_pb2.DataflowDescription.Module(
                            id="module_2",
                            type= "whitening_preprocessing",
                            label="Whitening",
                            inputs=[
                                dataflow_ext_pb2.DataflowDescription.Input(name="data_in", type="numpy_array")
                            ],
                            outputs=[
                                dataflow_ext_pb2.DataflowDescription.Output(name="data_out", type="numpy_array")
                            ]
                        ),
                        dataflow_ext_pb2.DataflowDescription.Module(
                            id="module_3",
                            type= "classification",
                            label="Linear SVM",
                            inputs=[
                                dataflow_ext_pb2.DataflowDescription.Input(name="data_in", type="numpy_array")
                            ],
                            outputs=[
                                dataflow_ext_pb2.DataflowDescription.Output(name="labels", type="numpy_array")
                            ]
                        )
                    ],
                connections = [
                        dataflow_ext_pb2.DataflowDescription.Connection(
                            from_module_id="module_1",
                            to_module_id="module_2",
                            from_output_name="data_out",
                            to_input_name="data_in"
                        ),
                        dataflow_ext_pb2.DataflowDescription.Connection(
                            from_module_id="module_2",
                            to_module_id="module_3",
                            from_output_name="data_out",
                            to_input_name="data_in"
                        ),
                    ]
            )

    def GetDataflowResults(self, request, context):
        sessioncontext = request.context
        logger.info("Got GetDataflowResults request, session=%s",
                    sessioncontext.session_id)


        time.sleep(1)
        yield dataflow_ext_pb2.ModuleResult(
                module_id = "module_1",
                status = dataflow_ext_pb2.ModuleResult.DONE,
                progress = 1.0
            )
        time.sleep(1)
        yield dataflow_ext_pb2.ModuleResult(
                module_id = "module_2",
                status = dataflow_ext_pb2.ModuleResult.DONE,
                progress = 1.0,
            )
        time.sleep(1)

        # changing the status of a module if the session has more than 10 seconds
        # if time.time() - session_start_time[sessioncontext.session_id] < 10:
        #     yield dataflow_ext_pb2.ModuleResult(
        #             module_id = "module_3",
        #             status = dataflow_ext_pb2.ModuleResult.RUNNING,
        #             progress = 0.5,
        #             execution_time = 5.58123
        #         )
        # else:
        #     yield dataflow_ext_pb2.ModuleResult(
        #             module_id = "module_3",
        #             status = dataflow_ext_pb2.ModuleResult.DONE,
        #             progress = 1.0,
        #             execution_time = 15.243
        #         )

        yield dataflow_ext_pb2.ModuleResult(
                    module_id = "module_3",
                    status = dataflow_ext_pb2.ModuleResult.DONE,
                    progress = 1.0,
                    execution_time = 15.243
                )

class DataExt(data_ext_pb2_grpc.DataExtServicer):
    def AddFeatures(self, request, context):
        sessioncontext = request.context
        logger.info("Got AddFeatures request, session=%s",
                    sessioncontext.session_id)
        return core_pb2.Response(
            status = core_pb2.Status(
                    code = core_pb2.OK,
                    details = "Ok adding features..."
                )
            )

    def RemoveFeatures(self, request, context):
        return core_pb2.Response(
            status = core_pb2.Status(
                    code = core_pb2.OK,
                    details = "OK removing features..."
                )
            )
"""
def main():
    logging.basicConfig(level=logging.INFO)

    with futures.ThreadPoolExecutor(max_workers=10) as executor:
        server = grpc.server(executor)
        core_pb2_grpc.add_CoreServicer_to_server(
            Core(), server)
        """
        dataflow_ext_pb2_grpc.add_DataflowExtServicer_to_server(
            DataflowExt(), server)
        data_ext_pb2_grpc.add_DataExtServicer_to_server(
            DataExt(), server)
        """
        hostname = socket.gethostname()
        if not hostname:
            hostname = '[::]'
        run_port = '50051'
        hostport = '%s:%s' % (hostname, run_port)
        print('running on port: %s' % hostport)
        server.add_insecure_port(hostport)
        server.start()
        while True:
            time.sleep(60)


if __name__ == '__main__':
    main()
