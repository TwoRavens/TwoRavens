from django.http import HttpResponse#, JsonResponse, Http404, HttpResponseRedirect

from django.shortcuts import render
from django.utils.safestring import mark_safe

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

import json

def index(request):
    return render(request, 'ws_test/index.html', {})

def room(request, room_name):
    return render(request, 'ws_test/room.html', {
        'room_name_json': mark_safe(json.dumps(room_name))
    })

def view_alarm(request):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(\
        'kiwi',
        dict(type='alarmo',
             message='triggered'))
    return HttpResponse('<p>Done</p>')
