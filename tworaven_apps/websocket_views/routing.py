from django.conf.urls import url

from . import consumers

websocket_urlpatterns = [
    url(r'^ws/connect/(?P<room_name>[^/]+)/$', consumers.ChatConsumer),

]
