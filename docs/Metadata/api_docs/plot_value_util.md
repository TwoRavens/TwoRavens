PlotValueUtil
=============

*PlotValueUtil* does the calculation for the plot-specific variable in the *ColumnInfo* class. It follows the same pattern as *SummaryStatsUtil*, taking a *Pandas.Series* and a *ColumnInfo* as input, fill all the attributes via several built-in functions.


**PlotValueUtil** (col_series, col_info)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Return a blank *PlotValueUtil* object, does the plot variable calculation and fill corresponding variables in the given *ColumnInfo* object.

* **Parameters**:
    * **col_series** (*Pandas.Series*):    A Pandas.Series entity contains one column of the input.
    * **col_info** (*ColumnInfo*):  A ColumnInfo object that stores the information about corresponding column.
    
---

**ecdf** (data)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Compute ECDF for a one-dimensional array of measurement, where data is the list of x-axis, and return corresponding list of y-axis.

* **Parameters**:
    * **data** (List of Numeric): A list of x-axis used to compute corresponding y-axis.
    
---

**cal_plot_values** (data)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Compute all the variables related to plot operation, nothing will be returned.

* **Parameters**: None