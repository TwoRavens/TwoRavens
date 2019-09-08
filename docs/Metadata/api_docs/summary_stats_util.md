SummaryStateUtil
================

*SummaryStatsUtil* does the calculation for the statistic variables in the *ColumnInfo* class. It takes a *Pandas.Series* and a *ColumnInfo* as input, fill all the attributes via several built-in functions.

**SummaryStatsUtil** (col_series, col_info)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a blank *SummaryStatsUtil* object, does the statistic calculation and fill corresponding variables in the given *ColumnInfo* object.

* **Parameters**:
    * **col_series** (*Pandas.Series*):    A Pandas.Series entity contains one column of the input.
    * **col_info** (*ColumnInfo*):  A ColumnInfo object that stores the information about corresponding column.

**calc_stats** ()

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Compute numeric statistic if applicable, return True if the process has done correctly and False otherwise.

* **Parameters**: None

**herfindahl_index** (col_data, char, sum_val, drop_missing=True)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Static method, calculate Herfindahl-Hirschman Index  (HHI) for the column data. For each given data, HHI is defined as a sum of squared weights of values in a col_series. It varies from 1/n to 1.

* **Parameters**:
    * **col_data** (*Pandas.Series*): A Pandas.Series entity contains one column of the input.
    * **char** (*Boolean*): A boolean flag variable that indicates the type of the input series, True if it's a character data and False otherwise.
    * **sum_val** (*Numeric*): A predefined sum value if the type of input data is character.
    * **drop_missing** (*Boolean*): A boolean flag variable controls whether the missing value will ge ignored.