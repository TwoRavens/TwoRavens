import json
from django.http import JsonResponse    #, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from tworaven_apps.ta2_interfaces.req_execute_pipeline import \
    execute_pipeline
from tworaven_apps.utils.view_helper import get_request_body
from tworaven_apps.call_captures.models import ServiceCallEntry
from tworaven_apps.utils.view_helper import get_session_key

@csrf_exempt
def view_execute_pipeline(request):
    """
    This is a more complex request that does 2 things:
    (1) Writes the data portion of the JSON from the UI to a file in "temp_storage_root"
        - e.g. create a directory and add the file with a unique name
    (2) Send a gRPC request message replacing "some uri" with reference to the file written in
        - e.g. `file://{temp_storage_root}/the_file_with_data.json`

    {"context": {"sessionId": "session_01"}, "pipelineId": "pipeline_1", "predictFeatures": [{"featureId": "cylinders", "dataUri": "<<DATA_URI>>"}, {"featureId": "displacement", "dataUri": "<<DATA_URI>>"}, {"featureId": "horsepower", "dataUri": "<<DATA_URI>>"}, {"featureId": "weight", "dataUri": "<<DATA_URI>>"}, {"featureId": "acceleration", "dataUri": "<<DATA_URI>>"}, {"featureId": "model", "dataUri": "<<DATA_URI>>"}, {"featureId": "class", "dataUri": "<<DATA_URI>>"}], "data": [[5.4496644295302, 5.4496644295302], [192.81711409396, 192.81711409396], [103.211604095563, 103.211604095563], [2978.70469798658, 2978.70469798658], [15.6577181208054, 15.6577181208054], [76.0771812080537, 76.0771812080537], [1.5738255033557, 1.5738255033557], [23.5268456375839, 23.5268456375839]]}
    """
    session_key = get_session_key(request)

    success, raven_data_or_err = get_request_body(request)
    if not success:
        return JsonResponse(dict(status=False,
                                 message=raven_data_or_err))

    # Begin to log D3M call
    #
    call_entry = None
    if ServiceCallEntry.record_d3m_call():
        call_entry = ServiceCallEntry.get_dm3_entry(\
                        request_obj=request,
                        call_type='execute_pipeline',
                        request_msg=raven_data_or_err)

    # Let's call the TA2 and start the session!
    #
    fmt_request, json_str_or_err = execute_pipeline(raven_data_or_err)

    if fmt_request is None:
        if call_entry:
            call_entry.save_d3m_response(json_str_or_err)
        return JsonResponse(dict(status=False,
                                 message=json_str_or_err))


    # Convert JSON str to python dict - err catch here
    #
    json_dict = {}
    json_dict['grpcResp'] = json.loads(json_str_or_err)
    json_dict['data2'] = json.loads(fmt_request)    # request with updated file uris

    # Save D3M log
    #
    if call_entry:
        call_entry.save_d3m_response(json_dict)

    return JsonResponse(json_dict, safe=False)
