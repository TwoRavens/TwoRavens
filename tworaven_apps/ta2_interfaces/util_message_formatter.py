"""
These requests have the same return logic:
    CreatePipelines
    GetCreatePipelineResults
    ExecutePipeline
    GetExecutePipelineResults
"""
from tworaven_apps.ta2_interfaces.util_embed_results import FileEmbedUtil
from tworaven_apps.ta2_interfaces.ta2_util import (\
    get_failed_precondition_response,
    get_reply_exception_response)



class MessageFormatter(object):
    """Return streaming messages and embed results, if needed"""

    @staticmethod
    def format_messages(messages, embed_data=False):
        """format the message list"""

        # Make sure messages have been received
        #
        if not messages:
            return False, 'No messages received.'

        # convert to JSON string
        #
        result_str = '['+', '.join(messages)+']'

        # No data embed, send result
        #
        if not embed_data:
            return True, result_str

        # If file references exist, pull out data and
        # embed it in the JSON
        #
        print('embed file contents')
        embed_util = FileEmbedUtil(result_str)
        if embed_util.has_error:    # Error!
            print('file embed error')
            return False, embed_util.error_message

        # Return result with embedded data
        #
        return True, embed_util.get_final_results()
