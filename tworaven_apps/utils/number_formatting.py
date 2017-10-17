"""convenience methods"""

def add_commas_to_number(the_num):
    """Add commas to thousandths places--or return an error message"""
    if not the_num:
        return None, "You must specify a number"
    #
    try:
        return None, f"{int(the_num):,d}"
        #return locale.format("%d", the_num, grouping=True), None
    except ValueError as err_obj:
        err_msg = ('Please specify a number (not a string'
                   ' or something else). Error: %s"') % err_obj
        return None, err_msg
