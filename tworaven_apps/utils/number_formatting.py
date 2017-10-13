import locale
locale.setlocale(locale.LC_ALL, 'en_US')

def add_commas_to_number(the_num):
    """Add commas to thousandths places--or return an error message"""
    if not the_num:
        return None, "You must specify a number"

    try:
        return locale.format("%d", the_num, grouping=True), None
    except TypeError as err_obj:
        err_msg = ('Please specify a number (not a string'
                   ' or something else). Error: %s"') % err_obj
        return None, err_msg
