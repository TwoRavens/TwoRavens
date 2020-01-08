TypeGuessUtil
=============

*TypeGuessUtil* is the first Utility object we used during profiling process. It has several useful function to help you check the data type of current variable.

**TypeGuessUtil** (col_series, col_info)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a blank TypeGuessUtil, does the data type analysis and fill corresponding variables in the given *ColumnInfo* object.

* **Parameters**:
    * **col_series** (*Pandas.Series*):    A Pandas.Series entity contains one column of the input.
    * **col_info** (*ColumnInfo*):  A ColumnInfo object that stores the information about corresponding column.
    
---

**check_types** ()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Does the data type analysis and fill corresponding variables in the given *ColumnInfo* object.

* **Parameters**: None

---
**is_not_numeric** (var_series)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column is a numeric column or not. Return True if it is not numeric, False otherwise.

* **Parameters**:
    * **var_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.
    
---
**is_not_logical** (var_series)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column contains boolean values.

* **Parameters**:
    * **var_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.
    
---
**check_nature** (data_series, continuous_check)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check the nature of input column, return corresponding nature type.

* **Parameters**:
    * **data_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.
    * **continuous_check** (*Boolean*): A boolean flag that indicates the type of input column. Set to true if it is continuous, False otherwise.
    
---
**check_time** (var_series)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column is a time instance, return 'year', 'month', 'day', or 'datetime' if it is a time instance, 'unknown' otherwise.

* **Parameters**
    * **data_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.

---
**check_location** (var_series)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column is a location, return 'US state', 'country', or 'country subdivision' if it is, 'unknown' otherwise.

* **Parameters**
    * **data_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.    
