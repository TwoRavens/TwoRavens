


def call_async_create_pipelines(req_data, callback_url):
  """Call grpc remote streaming service and process results"""
  channel = get_some_grpc_channel() # instant

  # Process streaming results
  # - Unknown lag time between results:
  #   - milliseconds to 30 minutes
  # - This channel.CreatePipelines requests is grpc and already
  #   can handle async
  # 
  for pipeline_result in channel.CreatePipelines(req_data):

      # format a result (fast--string formatting)
      formatted_result = format_result(pipeline_result)

      # send data back to other service via http (requests)
      #  (fast - sending back to a django server)
      #
      requests.post(callback_url, data=pipeline_result)
