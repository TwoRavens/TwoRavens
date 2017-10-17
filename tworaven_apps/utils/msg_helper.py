"""Convenience print methods"""

def msg(message):
    """print a string to the screen"""
    print(message)

def msgt(message):
    """Print a string, separated by dashes before and after"""
    print('-' * 40)
    msg(message)
    print('-' * 40)
