"""
An object with some basic methods for capturing errors
"""

class BasicErrCheck(object):

    error_found = False
    error_message = None

    def has_error(self):
        """Did an error occur?"""
        return self.error_found

    def get_error_message(self):
        """Return the error message if 'has_error' is True"""
        assert self.has_error(),\
            "Please check that '.has_error()' is True before using this method"

        return self.error_message

    def add_err_msg(self, err_msg):
        """Add an error message"""
        self.error_found = True
        self.error_message = err_msg

def try_it():
    """quick check"""
    b = BasicErrCheck()
    print('error_found', b.error_found)
    print('error_message', b.error_message)
    print(b.has_error())
    b.add_err_msg('uh oh')
    print(b.has_error())
    print(b.get_error_message())

if __name__ == '__main__':
    try_it()
