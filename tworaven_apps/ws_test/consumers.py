from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
import grpc
import core_pb2
#import core_pb2_grpc

from google.protobuf.json_format import \
    (Parse, ParseError)


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Join room group"""
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """Leave room group"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Receive message from WebSocket"""
        text_data_json = json.loads(text_data)
        #message = text_data_json['message']

        message = '[%s]: %s' % \
                  (self.scope['user'],
                   text_data_json['message'])


        self.scope["session"].save()

        # message only to current websocket
        #
        await self.send(text_data=json.dumps({
            'message': message + ' (just me)'
        }))

        # send message to room group (including user, again)
        #
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
                #'message': message + ' (%d)' % (loop + 1,)
            }
        )

        # --------------------------------
        # try streaming result
        # --------------------------------
        raven_json_str = """{"searchId": "searchId_hwdjip"}"""

        try:
            req = Parse(raven_json_str, core_pb2.GetSearchSolutionsResultsRequest())
        except ParseError as err_obj:
            err_msg = 'Failed to convert JSON to gRPC: %s' % (err_obj)
            await self.send(text_data=json.dumps({
                'message': err_msg
            }))



        async for msg_json_str in self.get_ta2_replies(req):
            print('got it!')
            await self.send(text_data=json.dumps({
                'message': str(msg_json_str)
            }))

        await self.send(text_data=json.dumps({
            'message': '(call complete)'
        }))

        await self.send(text_data=json.dumps({
            'message': '(call complete)'
        }))
        await self.send(text_data=json.dumps({
            'message': '(call complete)'
        }))


    async def get_ta2_replies(self, req):
        """working on it..."""
        from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
        from tworaven_apps.utils.proto_util import message_to_json

        core_stub, err_msg = TA2Connection.get_grpc_stub()

        for reply in core_stub.GetSearchSolutionsResults(\
                         req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):

            msg_json_str = message_to_json(reply)
            yield str(msg_json_str)


        """
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
                #'message': message + ' (%d)' % (loop + 1,)
            }
        )
        """



    async def chat_message(self, event):
        """Receive message from room group"""

        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
