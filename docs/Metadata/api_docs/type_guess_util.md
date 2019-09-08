TypeGuessUtil
=============

*TypeGuessUtil* is the first Utility object we used during profiling process. It has several useful function to help you check the data type of current variable.

**TypeGuessUtil** (col_series, col_info)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a blank PreprocessRunner with specified setting.

* **Parameters**:
    * **col_series** (*Pandas.Series*):    A Pandas.Series entity contains one column of the input.
    * **col_info** (*ColumnInfo*):  A ColumnInfo object that stores the information about corresponding column.

**run_preprocess** ()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Let the PreprocessRuner execute the data profiling process. Return True is the process is done correctly, otherwise, an error message will be logged and False will be returned.

* **Parameters**: None

**load_from_file** (input_file)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, it will create a dataframe item by read given file. Return a None and an error message if any error happened. Return an initialized *PreprocessRunner* and a None if everything goes well.

* **Parameters**:
    * **input_file** (*String*):    Path to the input dataset file.

**load_update_file** (preprocess_input, update_input)
    
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, it will initialize the PreprocessRunner via the JSON file contains sufficient information. The JSON file should have the same content after calling *get_final_json_indented*().

* **Parameters**:
    * **preprocess_input** (*String*):    Path to the original JSON result file.
    * **update_input** (*String*):  Path to the new JSON result file.

**get_self_section** ()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a JSON string contains only the information in the self section.

* **Parameters**: None

**get_datset_level_section** ()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a JSON string contains only the information in the dataset-level section.

* **Parameters**: None

**show_final_info** (indent=None)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Print a JSON string contains self section, dataset-level section, variable section and variable display section.

* **Parameters**:
    * **indent** (*Integer*):    The number of blank you want to use for indent.
