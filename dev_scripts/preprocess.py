from raven_preprocess.preprocess_runner import PreprocessRunner
from collections import OrderedDict
import decimal


def to_serializable(val):
    if isinstance(val, (OrderedDict, dict)):
        return {k: to_serializable(v) for k, v in val.items()}
    elif isinstance(val, (tuple, list)):
        return [to_serializable(v) for v in val]
    if isinstance(val, decimal.Decimal):
        return int(val) if val % 1 == 0 else float(val)
    else:
        return val

# process a data file
#
run_info = PreprocessRunner.load_from_file('/home/shoe/Desktop/beijing-air-quality.csv')

# Did it work?
#
if not run_info.success:
    # nope :(
    #
    print(run_info.err_msg)
else:
    # yes :)
    #
    runner = run_info.result_obj

    # show the JSON (string)
    #
    print(runner.get_final_json(indent=4))

    # retrieve the data as a python OrderedDict
    #
    metadata = runner.get_final_dict()
    metadata = to_serializable(metadata)
