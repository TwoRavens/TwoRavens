"""convenience methods"""

def add_commas_to_number(the_num):
    """Add commas to thousandths places--or return an error message
    https://stackoverflow.com/questions/5180365/python-add-comma-into-number-string
    """
    if not the_num:
        return None, "You must specify a number"
    #
    if type(the_num) == int:
        return '{:,}'.format(the_num), None
    elif type(the_num) == float:
        return '{:,.2f}'.format(the_num), None # Rounds to 2 decimal places
    else:
        err_msg = ('Please use an int or float.')
        return None, err_msg
