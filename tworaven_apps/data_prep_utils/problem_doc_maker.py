"""
For post-augment, make a problemdoc based on:
1 - new dataset metadata
2 - old problemdoc
"""
from tworaven_apps.utils.basic_response import (ok_resp, err_resp)
from tworaven_apps.utils.basic_err_check import BasicErrCheck

import logging

LOGGER = logging.getLogger(__name__)

class ProblemDocMaker(BasicErrCheck):
    """Problem Doc Maker"""

    def __init__(self, )
