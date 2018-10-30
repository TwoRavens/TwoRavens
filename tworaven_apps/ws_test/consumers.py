# chat/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json

ROOM_GROUP_NAME = 'kiwi'
CHAT_MESSAGE_TYPE = 'chat_message'


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = self.room_name

        #self.room_group_name = ROOM_GROUP_NAME #'chat_%s' % self.room_name


        print('connect.room_name: ', self.room_name)
        print('connect.room_group_name: ', self.room_group_name)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        print('connection made!')
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        print('disconnect!')
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        print('--- receive ---')
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        print('message: ', message)
        print('room_group_name: ', self.room_group_name)

        # Send message to room group
        #text_data_json['type'] = 'chat_message'

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': CHAT_MESSAGE_TYPE,
                'message': message
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))

"""
# from a python shell
#
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from tworaven_apps.ws_test.consumers import ROOM_GROUP_NAME

def send_msg(m):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(ROOM_GROUP_NAME, {
            'type': 'chat_message',
            'message': m
    })
"""
