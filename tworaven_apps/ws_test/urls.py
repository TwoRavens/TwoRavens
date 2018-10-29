# chat/urls.py
from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'alarm-ok', views.view_alarm, name='view_alarm'),
    url(r'^(?P<room_name>[^/]+)/$', views.room, name='room'),
    url(r'^$', views.index, name='index'),

]
