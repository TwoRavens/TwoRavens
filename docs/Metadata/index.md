TwoRavens Metadata Service
==========================

The TwoRaven Metadata Service (TRMS) provides the summary statistics that power the TwoRaven interface via using the preprocessed tabular data (Currently, it supports CSV, TAB, XLS and XLSX files). 
This documentation describes the JSON specification language and how to use TRMS in your application.


# Guide
* JSON Output Structure
    * [Overview](#overview)
    * [Self Section](#self-section)
    * [Dataset Section](#dataset-section)
    * [Variable Section](#variable-section)
    * [Variable Display Section](#variable-display-section)
* API Documentation
    * [Overview (Basic Usage Included)](api_docs/overview.md)
* [License](https://github.com/TwoRavens/raven-metadata-service/blob/develop/LICENSE)

Overview
========

Our service will return a JSON string that contains four main blocks: Self Section, Dataset-level information,
Variable Section and Variable Display section. Below is an example of the output.

```json

{
     "self":{
            "description": "",
            "other attributes": ""
     },
     "dataset": {
            "description": "",
            "other attributes": ""
     },
     "variables":{
        "var_1":{
            "variableName": "",
            "other attributes": ""
        },
        "var_2":{
            "variableName": "",
            "other attributes": ""
        },
        "var_n":{
            "variableName": "",
            "other attributes": ""
        }
      },
      "variableDisplay":{
        "var_1":{
            "editable":"",
            "other attributes":""
        },
        "var_2":{
            "editable":"",
            "other attributes":""
        },
        "var_n":{
            "editable":"",
            "other attributes":""
        }
      }
    }
```

Self Section
============

> **note**
>
> -   This section contains the information about the process task.

### description

A brief description that contains the link to the service which generate this output.

 * **type**: String

### created

A timestamp shows when the task is created. (YYYY-MM-DD HH:MM:SS)

 * **type**: String

### preprocessId

An automatic generated ID for current task -- Currently is 'None'.

 * **type**: Numeric/None

### version

A number describes the version of current task.

 * **type**: Numeric

### schema(Optional)

Contains the description of the schema. You need to specify the value of 'SCHEMA_INFO_DICT' if this block is required. We don't provide this information by default.

| Attribute |                   Description                              |
| --------- |:----------------------------------------------------------:|
|    Name   | Name of the followed schema                                |
|  Version  | Version of corresponding schema it applied                 |
| SchemaUrl | Source url of the schema                                   |
| SchemaDoc | Link to the corresponding schema                           |

 * **type**: Dict

Dataset Section
===============

> **note**
>
> -   This section contains the important parameters of preprocess file at dataset level.


### description

A brief description of input dataset. (Currently is null)

 * **type**: String/NULL
 
### unit of analysis

Unknown definition. (Currently is null)

 * **type**: String/NULL

### structure

The structure of the input dataset.

 * **type**: String

### rowCount

Number of observations in the dataset.

 * **type**: Integer

### variableCount

number of variables in the dataset.

 * **type**: Integer

### dataSource(Optional)

Contains some extra information about the raw file. You need to specify the value of 'data_source_info' when a process runner is created, if this block is required. This information is not provided by default.

| Attribute |                   Description                              |
| --------- |:----------------------------------------------------------:|
|    Name   | Name of input file                                         |
|    Type   | File type (.csv, .xlxs etc)                                |
|  Format   | Format of the input file                                   |
| fileSize  | Size of the file in bytes                                  |

 * **type**: Dict

### citation(Optional)

Unknown definition. default is null.
 
 * **type**: String

### error

A message shows the error happened during dataset-level analysis. This entity may not exist if there is no error occured.

 * **type**: String
    
Variable Section
================

> **note**
>
> -   Except for **invalid**, for all numeric calculations, missing
>     values are ignored.
>
> - For non-numeric values, summary statistics such as **median** and
> **mean** are set to "NA". For example:
>
> > ```json
> > {
> >  "median":"NA"
> > }
> > ```

### variableName

Name of the variable (column).

 * **type**: String

### description

Brief explanation of the variable.

 * **type**: String

### numchar

The type of this variable (column).

 * **type**: String
 * **possible values**: 'character', 'numeric'

### nature

The type of this variable (from statistic perspective), below is the table of possible values.

|    Name   |                   Definition                               |
| --------- |:----------------------------------------------------------:|
|  Nominal  | Just names, IDs                                            |
|  Ordinal  | Have/Represent rank order                                  |
|  Interval | Has a fixed size of interval between data points           |
|  Ratio    | Has a true zero point (e.g. mass, length)                  |
|  Percent  | Namely, \[0.0, 1.0] or \[0, 100]%                            |

 * **type**: String

### binary

A boolean flag indicates whether this variable is a binary variable or not.

 * **type**: Boolean

### interval

Indicate whether the variable is either continuous or discrete, if it's a numeric variable.

 * **type**: String
 * **possible values**: 'continuous', 'discrete' or 'NA'

### time

Currently not available, it should return the format of timestamp if this variable is a timestamp.

 * **type**: String/None

### invalidCount

Counts the number of invalid observations, including missing values, nulls, NA's and any observation with a value enumerated in invalidSpecialCodes.

 * **type**: Integer

### validCount

Counts the number of valid observations

 * **type**: Integer

### uniqueCount

Count of unique values, including invalid observations.

 * **type**: Integer

### median

> **note**
>       - This attribute may have incorrect value, fix is needed.

A central value in the distribution such that there are as many values equal or above, as there are equal or below this value. 
It will be 'NA' if the data is not numerical.

 * **type**: Numeric/String

### mean

Average of all numeric values, which are not contained in invalidSpecialCodes. It will be 'NA' if the data is not numerical.

 * **type**: Numeric/String

### max

Largest numeric value observed in dataset, that is not contained in invalidSpecialCodes. It will be 'NA' if the data is not numerical.

 * **type**: Numeric/String

### min

Least numeric value observed in dataset, that is not contained in invalidSpecialCodes. It will be 'NA' if the data is not numerical.

 * **type**: Numeric/String

### mode

Value that occurs most frequently.  Multiple values in the case of ties.

 * **type**: List of String/Numeric

### modeFreq

Number of times value of mode is observed in variable.

 * **type**: Integer

### fewestValues

Value that occurs least frequently.  Multiple values in the case of ties.

 * **type**: List of String/Numeric

### fewestFreq

Number of times value of fewestValues is observed in variable.

 * **type**: Integer

### midpoint

The value equidistant from the reported min and max values.

 * **type**: Numeric/String

### midpointFreq

Number of observations with value equal to midpoint.

 * **type**: Integer

### stdDev

Standard deviation of the values, measuring the spread between values, specifically using population formula.

 * **type**: Numeric

### herfindahlIndex

Measure of heterogeneity of a categorical variable which gives the probability that any two randomly sampled observations have the same value.

 * **type**: Numeric

> **warning**
> - Following attributes may be moved to **Variable Display Section** in the future.

### plotValues

Contains the y-value of the plot, available while the **plot_type** is PLOT_BAR

 * **types**: List of Numeric

### pdfPlotType

Describes default type of plot appropriate to represent the distribution of this variable.

 * **type**: String/Null
 * **possible values**: PLOT_BAR, PLOT_CONTINUOUS or None

### pdfPlotX

A list of number that specifies the x-coordinate of corresponding points of the probability density function.

 * **types**: List of Numeric/Null

### pdfPlotY

A list of number that specifies the y-coordinate of corresponding points of the probability density function.

 * **types**: List of Numeric/Null

### cdfPlotType

Describes default type of plot appropriate to represent the cumulative distribution of variable.

 * **type**: String/Null
 * **possible values**: PLOT_BAR, PLOT_CONTINUOUS or None

### cdfPlotX

A list of number that specifies the x-coordinate of corresponding points of the cumulative distribution function.

 * **types**: List of Numeric/Null

### cdfPlotY

A list of number that specifies the x-coordinate of corresponding points of the cumulative distribution function.

 * **types**: List of Numeric/Null

Variable Display Section
========================

> **note**
>
> -   This section contains additional parameters to control the behavior of final plot.

### editable

List of all the variable features which are editable. e.g `description`, `numchar`, etc.

 * **type**: List of String

### viewable

It is a boolean property set for this variable to decide whether this attribute will be showed in the processed data.

 * **type**: Boolean

### omit

A list of all the features which are to be omitted for the particular variable.

 * **type**: String/Null

### images

A list contains custom/scripted images of the variable data.

 * **type**: String/Null
