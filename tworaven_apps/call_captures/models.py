import json

from django.db import models
# Create your models here.
from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.utils.safestring import mark_safe
from model_utils.models import TimeStampedModel
from tworaven_apps.utils.json_helper import format_json_for_admin
from tworaven_apps.ta2_interfaces.models import STATUS_VAL_FAILED_PRECONDITION

# Create your models here.
ZELIG_APP = 'zelig'
DATA_APP = 'dataapp'

SERVICE_TYPE_ROOK = 'ROOK SERVICE'
SERVICE_TYPE_D3M = 'D3M SERVICE'
SERVICE_TYPE_NOT_SPECIFIED = 'service not specified'
SERVICE_TYPES = (SERVICE_TYPE_ROOK,
                 SERVICE_TYPE_D3M,
                 SERVICE_TYPE_NOT_SPECIFIED)
SERVICE_TYPE_CHOICES = ((x, x) for x in SERVICE_TYPES)

class ServiceCallEntry(TimeStampedModel):

    service_type = models.CharField(choices=SERVICE_TYPE_CHOICES,
                                    max_length=100)

    call_type = models.CharField(max_length=255,
                                 help_text='Name of D3M call or zeligapp')

    session_id = models.CharField(max_length=255,
                                  blank=True,
                                  db_index=True,
                                  help_text='Used for grouping calls together')

    user = models.ForeignKey(User, blank=True, null=True)

    outgoing_url = models.URLField(blank=True)
    request_msg = models.TextField(blank=True)

    response_msg = models.TextField(blank=True)
    status_code = models.CharField(max_length=50, blank=True)
    success = models.BooleanField(default=False)

    def __str__(self):
        return '%s - (%s)' % (self.call_type, self.created)

    class Meta:
        ordering = ('-created',)
        verbose_name = 'Service Call Request'
        verbose_name_plural = 'Service Call Requests'

    def request_msg_json(self):
        return format_json_for_admin(self.request_msg)

    def response_msg_json(self):
        return format_json_for_admin(self.response_msg)

    def add_error_message(self, msg, status_code='n/a'):
        """Shortcut to populate fields for a failed response"""
        self.success = False
        self.response_msg = msg
        self.status_code = status_code

    def add_success_message(self, msg, status_code=200):
        """Shortcut to populate fields for a successful response"""
        self.success = True
        self.response_msg = msg
        self.status_code = status_code

    @staticmethod
    def record_d3m_call():
        return settings.RECORD_D3M_SERVICE_ROUTING

    @staticmethod
    def get_rook_entry(request_obj, call_type, outgoing_url, request_msg):
        """Init ServiceCallEntry object for a ROOK call"""
        assert request_obj is not None,\
               "request_obj cannot be None"
        session_id = request_obj.session._get_or_create_session_key()

        user = None
        if request_obj.user.is_authenticated():
            user = request_obj.user

        return ServiceCallEntry(call_type=call_type,
                                service_type=SERVICE_TYPE_ROOK,
                                outgoing_url=outgoing_url,
                                session_id=session_id,
                                user=user,
                                request_msg=request_msg)

    @staticmethod
    def get_dm3_entry(request_obj, call_type, request_msg):
        """Init ServiceCallEntry object for a D3M call"""
        assert request_obj is not None,\
                       "request_obj cannot be None"

        session_id = request_obj.session._get_or_create_session_key()

        user = None
        if request_obj.user.is_authenticated():
            user = request_obj.user

        if settings.TA2_STATIC_TEST_MODE:
            outgoing_url = '(no TA2, static test mode)'
        else:
            outgoing_url = settings.TA2_TEST_SERVER_URL

        return ServiceCallEntry(call_type=call_type,
                                service_type=SERVICE_TYPE_D3M,
                                outgoing_url=outgoing_url,
                                session_id=session_id,
                                user=user,
                                request_msg=request_msg)

    def save_d3m_response(self, json_dict):
        """Save the gRPC log response"""
        if not json_dict:
            err_dict = dict(success=False, message='json response was none')
            self.add_error_message(json.dumps(err_dict), '(n/a)')

        if self.is_failed_failed_response(json_dict):
            self.add_error_message(json.dumps(json_dict), '(n/a)')
        else:
            self.add_success_message(json.dumps(json_dict), '(n/a)')
        self.save()


    def is_failed_failed_response(self, json_dict):
        """Does this JSON indicate failure?"""
        if json_dict is None:
            return True

        if str(json_dict).find(STATUS_VAL_FAILED_PRECONDITION) > -1:
            return True

        if not hasattr(json_dict, 'items'):
            """There is a valid gRPC response which is a list"""
            return False

        if 'success' in json_dict:
            if json_dict['success'] is False:
                return True

        # check for something like this:
        #  '"responseInfo": { "status": { "code": "FAILED_PRECONDITION",'
        #
        if 'responseInfo' in json_dict:
            if 'status' in json_dict['responseInfo']:
                if 'code' in json_dict['responseInfo']['status']:
                    if json_dict['responseInfo']['status']['code'] != 'OK':
                        return True

        # check for something like this:
        #  { "status": { "code": "FAILED_PRECONDITION",'
        #
        if 'status' in json_dict:
            if 'code' in json_dict['status']:
                if json_dict['status']['code'] != 'OK':
                    return True


        return False
