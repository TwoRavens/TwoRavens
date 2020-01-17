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
[**check_time** (var_series)](#check_time)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column is a time instance, return date format where possible, '?' if the format can not be determined, and None if it is not a time instance.

This does a series of tests for each value in the series to verify the (currently predefined) threshold is met for good/bad matches, then returns the most common match (or None).

1. Sanitize value
2. If value is an int between 1600 and 2100, is a year
3. Check if value is a month such as Jul or July
4. Check if value is a day such as Sat or Saturday
5. Filter out non-date values such as 0.1
6. Check if value passes [dateutil.parser.parse](https://dateutil.readthedocs.io/en/stable/parser.html#dateutil.parser.parse)
7. Check if variable is called 'year'
8. If "pandas.core.tools.datetimes._guess_datetime_format" is valid, return that value, otherwise '?'

---
[**check_location** (var_series)](#check_location)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, check whether the input column is a location, return 'US state', 'country', or 'country subdivision' if it is, None otherwise.

This does a series of tests for each value in the series to verify the (currently predefined) threshold is met for good/bad matches, then returns the most common match (or None).

1. Sanitize value
2. Check if value is a US state using [us](https://github.com/unitedstates/python-us)
3. Check if value is a country using [pycountry](https://github.com/flyingcircusio/pycountry)
4. Check if value is a country subdivision using pycountry

* **Parameters**
    * **data_series** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.    
