"""Flask app to log messages to the screen for TA3 search
ta3-main sends messages to the app
>FLASK_APP=ta3_listener.py flask run -p8001

"""
import logging
from datetime import datetime as dt
from flask import Flask, request, jsonify

app = Flask(__name__)

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

KEY_MESSSAGE = 'message'

def dashes():
    """Print dashes to console"""
    print('-' * 40)

def show_message(ta3_msg, with_timestamp=True):
    """Print message to console"""
    if with_timestamp:
        dashes()
        print('message received (%s)' % dt.now())
        dashes()
        print(ta3_msg)
        print('')
    else:
        dashes()
        print(ta3_msg)
        dashes()

def shutdown_server():
    """reference: http://flask.pocoo.org/snippets/67/"""
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

@app.route("/heartbeat")
def heartbeat():
    """Health check/heartbeat"""
    user_msg = ('TA3 search. Heartbeat')
    show_message(user_msg)
    dinfo = dict(success=True,
                 message=user_msg)
    return jsonify(dinfo)

@app.route('/message', methods=['POST'])
def message():
    """Print message to terminal"""
    if KEY_MESSSAGE in request.form:
        show_message(request.form[KEY_MESSSAGE])

        dinfo = dict(success=True,
                     message='message received')
        return jsonify(dinfo)

    dinfo = dict(success=False,
                 message='No "message" key included')

    return jsonify(dinfo)

@app.route('/success/exit', methods=['POST'])
def success_with_exit():
    """Print message to terminal"""
    if KEY_MESSSAGE in request.form:
        show_message(request.form[KEY_MESSSAGE])
        show_message(('Search concluded.\nExiting with return code 0.'
                      ' (success)'),
                     with_timestamp=False)

        shutdown_server()

        dinfo = dict(success=True,
                     message='message received')
        return jsonify(dinfo)

    dinfo = dict(success=False,
                 message='No "message" key included')

    return jsonify(dinfo)


@app.route('/fail/exit', methods=['POST'])
def failure_with_exit():
    """Print message to terminal"""
    if KEY_MESSSAGE in request.form:
        show_message(request.form[KEY_MESSSAGE])
        show_message(('Search concluded.\nExiting with return code -1.'
                      ' (not complete)'),
                     with_timestamp=False)
        shutdown_server()

        dinfo = dict(success=True,
                     message='message received')
        return jsonify(dinfo)

    dinfo = dict(success=False,
                 message='No "message" key included')

    return jsonify(dinfo)

init_msg = ('TA3 search is now running.'
            '\nThis Terminal window receives messages'
            '\nfrom the TA3-main container.'
            '\n\nThe window will eventually exit with either:'
            '\n\t- return code 0 (success) or'
            '\n\t- return code -1 (not complete)')
show_message(init_msg)


if __name__ == '__main__':
    print('Ok now...')
