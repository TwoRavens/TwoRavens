"""Send messages to any available listeners"""
import requests
from urllib.parse import urljoin
from tworaven_apps.ta3_search.models import MessageListener

KEY_MESSSAGE = 'message'

URL_MESSAGE = '/message'
URL_SUCCESS_EXIT = '/success/exit'
URL_FAIL_EXIT = '/fail/exit'

class MessageUtil(object):
    """Util class to send messages to MessageListener"""
    TIMEOUT_SEC = 3 # seconds

    @staticmethod
    def add_listener(web_url, name=None):
        """Create a MessageListener"""
        mlistener, created = MessageListener.objects.get_or_create(\
                                        web_url=web_url)
        if name:
            mlistener.name = name

        mlistener.save()

        return True, mlistener


    @staticmethod
    def send_shutdown_message(message, is_success=True):
        """Send message to the listeners"""
        for mlistener in MessageListener.objects.filter(is_active=True):

            if is_success:
                # send success message, return code 0
                murl = urljoin(mlistener.web_url, URL_SUCCESS_EXIT)
            else:
                # send fail message, return code -1
                murl = urljoin(mlistener.web_url, URL_FAIL_EXIT)

            data = {KEY_MESSSAGE: message}

            try:
                req = requests.POST(murl,
                                    data=data,
                                    timeout=MessageUtil.TIMEOUT_SEC)
            except ConnectionError:
                err_msg = 'MessageListener not responding: %s' % mlistener.web_url
                # log this
                continue



    @staticmethod
    def send_message(message, is_post=False):
        """Send message to the listeners"""
        for mlistener in MessageListener.objects.filter(is_active=True):

            murl = urljoin(mlistener.web_url, URL_MESSAGE)
            data = {KEY_MESSSAGE: message}

            try:
                req = requests.POST(murl,
                                    data=data,
                                    timeout=MessageUtil.TIMEOUT_SEC)
            except ConnectionError:
                err_msg = 'MessageListener not responding: %s' % mlistener.web_url
                # log this
                continue
