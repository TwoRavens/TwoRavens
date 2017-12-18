from flask import Flask
app = Flask(__name__)

import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


@app.route("/test")
def message():
    print('hello!')
    return 'Hello World!'


'''
import json
from collections import OrderedDict

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs
from cgi import parse_header, parse_multipart

# HTTPRequestHandler class
class TA3MessageHandler(BaseHTTPRequestHandler):

    PATH_MESSSAGE = '/message'
    PATH_SHUTDOWN_OK = '/shutdown_ok'
    PATH_SHUTDOWN_ERR = '/shutdown_err'

    def log_message(self, *args, **kwargs):
        """suppress log lines to terminal"""
        pass
        super(TA3MessageHandler, self).log_message(*args, **kwargs)

    def send_json_headers(self):
        """Send JSON header"""
        self.send_header('Content-type', 'application/json')

    # GET
    def do_GET(self):
        # Send response status code
        print('path: %s' % self.path)

        self.send_response(200)

        # Send headers
        self.send_json_headers()
        self.end_headers()

        # Send message back to client
        message = "Hello world!"

        # Write content as utf-8 data
        self.wfile.write(bytes(message, "utf8"))

    def parse_POST(self):
        """Parse a POST request"""
        ctype, pdict = parse_header(self.headers['content-type'])

        if ctype == 'multipart/form-data':
            postvars = parse_multipart(self.rfile, pdict)
        elif ctype == 'application/x-www-form-urlencoded':
            length = int(self.headers['content-length'])
            postvars = parse_qs(self.rfile.read(length),
                                keep_blank_values=1)
        else:
            postvars = {}
        return postvars

    def do_POST(self):
        """Handle a POST request"""
        postvars = self.parse_POST()

        # ---------------------------------
        # If a 'message' key is included,
        # log it to the terminal
        # ---------------------------------
        if 'message' in postvars:
            print('Message: %s' % postvars['message'])

        self.send_message_to_client(is_post=True)

    def send_message_to_client(self, is_post=False):

        self.send_response(200)

        # ---------------------------------
        # Send message back to client
        # ---------------------------------
        self.send_json_headers()
        self.end_headers()

        if is_post:
            user_msg = 'POST message received'
        else:
            user_msg = 'GET message received'


        msg_dict = dict(success=True,
                        message=user_msg)

        resp_message = json.dumps(msg_dict)

        print('resp_message:', resp_message)

        self.wfile.write(bytes(resp_message, "utf8"))


def run_server():
    print('starting server...')

    server_address = ('127.0.0.1', 8001)
    httpd = HTTPServer(server_address, TA3MessageHandler)
    print('running server... http://127.0.0.1:8001')
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
'''
