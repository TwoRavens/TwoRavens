from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.conf import settings
import grpc
import core_pb2
from asgiref.sync import async_to_sync
import asyncio
from tworaven_apps.ta2_interfaces.ta2_connection import TA2Connection
from tworaven_apps.utils.proto_util import message_to_json

#import core_pb2_grpc
"""
from websocket import create_connection
import json

url = 'ws://127.0.0.1:8000/ws/chat/hi/'
ws = create_connection(url)  # open socket
ws.send(json.dumps(dict(message='someMessage')))  # send to socket
ws.recv(1000)  # receive from socket
ws.close()  # close socketws.send('blah')

"""

from google.protobuf.json_format import \
    (Parse, ParseError)

GROUP_NAME = 'kiwi'



class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        """Join room group"""
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name

        print ('self.channel_name', self.channel_name)
        print ('self.room_group_name', self.room_group_name)
        await self.channel_layer.group_add(
            GROUP_NAME, #self.room_group_name,
            self.channel_name
        )
        await self.accept()

        #await self.send(text_data=json.dumps({
        #    'message': 'hello there'
        #}))

        #await asyncio.sleep(5)
        #await self.send(dict(type='websocket.close',
        #                     message='closing'))


    async def disconnect(self, close_code):
        """Leave room group"""
        await self.channel_layer.group_discard(
            GROUP_NAME, #self.room_group_name,
            self.channel_name
        )


    async def receive(self, text_data):
        """Receive message from WebSocket"""
        text_data_json = json.loads(text_data)
        #message = text_data_json['message']


        orig_message = text_data_json['message']
        orig_type = text_data_json.get('type', 'data')

        #await self.send(text_data=json.dumps({
        #    'type': 'websocket.send',
        #    'message': orig_message
        #}))

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'websocket.send',
                #'type': 'chat_message',
                'message': orig_message
            }
        )
        return

        if orig_type == 'alarmo':
            message = '[%s]: %s' % \
                      (self.scope['user'],
                       text_data_json['message'])

            await self.channel_layer.group_send(\
                        GROUP_NAME, #self.room_group_name,
                        dict(type='alarmo', message=message))

            return




        self.scope["session"].save()

        # message only to current websocket
        #
        #await self.send(text_data=json.dumps({
        #    'message': message + ' (just me)'
        #}))


        '''await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )'''

        await self.channel_layer.group_send(
                    GROUP_NAME, #self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message
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


        # -----------------------------------------
        # start: another try....
        # -----------------------------------------
        core_stub, err_msg = TA2Connection.get_grpc_stub()

        for reply in core_stub.GetSearchSolutionsResults(\
             req, timeout=settings.TA2_GRPC_LONG_TIMEOUT):
             msg_json_str = message_to_json(reply)
             print('got it...')
             await self.send(text_data=json.dumps(\
                {'type': 'alarmo',
                 'message': msg_json_str}))
             #print(msg_json_str)

        # -----------------------------------------
        # end: another try....
        # -----------------------------------------
        return

        loop_num = 0
        async for msg_json_str in self.get_ta2_replies(req):
            loop_num += 1
            print('got it!')
            await self.send(text_data=json.dumps({
                'type': 'alarmo',
                'message': 'response #%d' % loop_num  # str(msg_json_str)
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

    async def alarmo(self, event):
        """Receive message from room group"""
        print('alarmo...')
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': '(muy importante) ' + message
        }))



    async def chat_message(self, event):
        """Receive message from room group"""

        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))
