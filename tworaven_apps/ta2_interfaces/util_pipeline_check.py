"""
(1) For each GetSearchSolutionsResults response
(2) If there's a solutionId,
(3) Make a DescribeSolution call
(4) Store/Display all of the results
"""
from collections import OrderedDict
from tworaven_apps.ta2_interfaces.models import StoredResponse
from tworaven_apps.ta2_interfaces.static_vals import \
    (KEY_PIPELINE,
     KEY_SOLUTION_ID,
     KEY_STEPS)
from tworaven_apps.ta2_interfaces.req_search_solutions import describe_solution
from tworaven_apps.utils.msg_helper import msg, msgt
from tworaven_apps.utils.basic_err_check import BasicErrCheck
from tworaven_apps.utils.basic_response import \
    (ok_resp,
     err_resp)
from tworaven_apps.utils.json_helper import json_loads
from tworaven_apps.utils.random_info import \
    (get_timestamp_string,
     get_alphanumeric_lowercase)


#    error_found = False
#    error_message = None

class PipelineSteps(BasicErrCheck):
    """Object to hold PipelineResults"""
    def __init__(self):
        """This object is created via its staticmethods"""
        self.solution_response = None   # DescribeSolutionResponse JSON

    def has_steps(self):
        """Same as 'has_error()'"""
        return not self.has_error()

    def __repr__(self):
        """repr method"""
        return self.__str__()

    def __str__(self):
        """print method"""
        #import ipdb; ipdb.set_trace()
        if self.has_steps():
            if self.solution_response:
                # hack to create a str from `django.utils.safestring.SafeText`
                return self.solution_response + ''
            else:
                return 'solution_response is None (shouldn\'t happen)'
        else:
            return self.error_message

    @staticmethod
    def create_with_error(error_message):
        """Create a PipelineSteps object with an error message"""
        ps = PipelineSteps()
        ps.add_error_message(error_message)
        return ps

    @staticmethod
    def create_with_data(steps_info):
        """Add DescribeSolutionResponse"""
        ps = PipelineSteps()
        ps.solution_response = '%s' % steps_info
        return ps

    def get_num_pipeline_steps(self):
        """Return the number of pipeline steps in the DescribeSolutionResponse"""
        if not self.has_steps():
            return -1
            #return err_resp('(no steps found--error)')

        steps_info = json_loads(self.solution_response)
        if not steps_info.success:
            return -1
            #return err_resp(steps_info.err_msg)

        steps_dict = steps_info.result_obj
        if not KEY_PIPELINE in steps_dict:
            return -1

        if not KEY_STEPS in steps_dict[KEY_PIPELINE]:
            return -1
            #return err_resp('Key "%s" not found in response' % KEY_STEPS)

        num_steps = len(steps_dict[KEY_PIPELINE][KEY_STEPS])

        #return ok_resp(num_steps)
        return num_steps


class PipelineInfoUtil(BasicErrCheck):
    """Run DescribeSolution calls and store the results for display"""
    def __init__(self):
        self.process_id = 'space: %s_%s' % \
                        (get_alphanumeric_lowercase(6),
                         get_timestamp_string())

        self.pipeline_results = OrderedDict()
        self.run_process()

    def show_results(self):
        """print the results to the screen"""
        result_cnt = 0
        for resp_id, pipeline_result in self.pipeline_results.items():
            result_cnt += 1
            msgt('(%s) id: %s, steps: %s' % \
                 (result_cnt,
                  resp_id,
                  pipeline_result.get_num_pipeline_steps()))

            print('pipeline_result', type(pipeline_result))
            msg(pipeline_result.__str__())   #[:40])

    def run_process(self):
        """
        Retrieve Pipeline results based on KEY_SOLUTION_ID
        """
        params = dict(stored_request__request_type='GetSearchSolutionsResults')

        stored_responses = StoredResponse.objects.filter(**params)

        resp_cnt = stored_responses.count()
        if resp_cnt == 0:
            user_msg = ('No StoredResponse objects found of type'
                        ' "GetSearchSolutionsResults"')
            msgt(user_msg)
            return

        # Iterate through GetSearchSolutionsResults,
        # looking instances of solutionId
        #
        loop_cnt = 0
        for sr in stored_responses:
            loop_cnt += 1
            if not sr.response:
                user_msg = 'No response found'
                self.pipeline_results[sr.id] = \
                    PipelineSteps.create_with_error(user_msg)
                return

            if not KEY_SOLUTION_ID in sr.response:
                user_msg = 'No "%s" found in the response' % KEY_SOLUTION_ID
                self.pipeline_results[sr.id] = \
                    PipelineSteps.create_with_error(user_msg)
                return

            solution_id = sr.response[KEY_SOLUTION_ID]
            if not solution_id:
                user_msg = 'Blank "%s" found in the response' % KEY_SOLUTION_ID
                self.pipeline_results[sr.id] = \
                    PipelineSteps.create_with_error(user_msg)
                return

            self.pipeline_results[sr.id] = self.run_describe_solution(solution_id)

            if loop_cnt == 5:
                break

    def run_describe_solution(self, solution_id):
        """run DescribeSolution"""
        if not solution_id:
            user_msg = 'A solution_id must be set ("run_describe_solution")'
            return PipelineSteps.create_with_error(user_msg)

        # Let's call the TA2!
        #
        search_str = '{"%s": "%s"}' % (KEY_SOLUTION_ID, solution_id)

        search_info = describe_solution(search_str)
        #print('search_info', search_info)
        if not search_info.success:
            #print('search_info err', search_info.err_msg)
            if search_info.err_msg.find('StatusCode.UNAVAILABLE, Connect Failed') > -1:
                user_msg = 'TA2 unavailable! Message: %s' % search_info.err_msg
            else:
                user_msg = search_info.err_msg
            return PipelineSteps.create_with_error(user_msg)

        #print('search_info result_obj', search_info.result_obj)
        return PipelineSteps.create_with_data(search_info.result_obj)
