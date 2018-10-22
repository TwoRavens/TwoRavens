# ws_test/consumers.py
from asgiref.sync import async_to_sync

from channels.generic.websocket import WebsocketConsumer
import json

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        # Join room group
        async_to_sync(self.channel_layer.group_add)(\
            self.room_group_name,
            self.channel_name)

        # e.g. may want to check that the user is authorized
        # before accepting the connection

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(\
            self.room_group_name,
            self.channel_name)

    def receive(self, text_data):
        """

        """
        #import ipdb; ipdb.set_trace()
        text_data_json = json.loads(text_data)
        message = '[%s]: %s' % \
                  (self.scope['user'],
                   text_data_json['message'])

        # Send message to room group
        message_info = dict(type='chat_message',
                            message=message)

        async_to_sync(self.channel_layer.group_send)(self.room_group_name,
                                                     message_info)

        #self.send(text_data=json.dumps({
        #    'message': message
        #}))

    # Receive message from room group
    def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        self.send(text_data=json.dumps({
            'message': message
        }))
