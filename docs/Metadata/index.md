TwoRavens Metadata Service
==========================

The TwoRavens metadata service is used preprocess tabular data to to
provide summary statistics that power the TwoRavens interface. The
preprocess output (defaults to JSON) may be used by programs and
services to explore, query, and compare metadata.

# Guide
* Preprocess File Description
    * [Preprocess Parameters](#preprocess-parameters)
    * [Self Section](#self-section)
    * [Dataset Section](#dataset-section)
    * [Variable Section](#variable-section)
    * [Variable Display Section](#variable-display-section)
    * [Custom Statistics Section](#custom-statistics-section)
* [License](https://github.com/TwoRavens/raven-metadata-service/blob/develop/LICENSE)

Preprocess Parameters
=====================

### variables

  Dictionary containing variable metadata

```json

   {
     "dataset": {
            ...dataset-level information...
     },
     "variables":{
        "var_1":{
            ...variable-level data...
        },
        "var_2":{
            ..variable-level data...
        }
      },
      "variableDisplay":{
        "var_1":{
            ...variable-level display data...
        }
      },
    }
```

Self Section
============

> **note**
>
> -   This section contains the structure and description of the
>     preprocessed file.

### description

 contains the link to the source.


 * **type**: URL

### created

 The data and time when the preprocessed file was created.


 * **type**: string

### preprocessId

 It is the auto-generated ID given by the service to every preprocess file.


 * **type**: numeric

### version

 It describes the version of the preprocessed file.


 * **type**: numeric

### schema

 contains the description of the schema the service follows.

 - **name**: name of the schema it follows.
 - **version**: version of the schema it follows.
 - **schema_url**: source url of the schema it follows.
 - **schema_docs**: link to the documentation of the schema it follows.


 * **type**: string

Dataset Section
===============

> **note**
>
> -   This section contains the important parameters of preprocess file
>     at dataset level.


### description

 some definition.


 * **type**: URL


### unit of analysis

 some definition.


 * **type**: string


### structure

 some definition.


 * **type**: string


### rowCount

 number of observations in the dataset.


 * **type**: numeric


### variableCount

 number of variables in the dataset.


 * **type**: numeric


### dataSource

 contains the following details of the source file.

 - **name**: name of the source file.
 - **type**: file type.
 - **format**: format of the file.
 - **fileSize**: size of the file.


 * **type**: string
    
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

 Name of the variable


 * **type**: string



### description

 Brief explanation of the variable


 * **type**: string




### numchar

 Describes the variable as numeric or character valued


 * **type**: string
 * **possible values**: character, numeric



### nature

 Describes the classification of data into Nominal, Ordinal, Ratio, Interval, Percentage.


 * **type**: string
 * **possible values**: interval, nominal, ordinal, percent, ratio, other



### binary

 Signifies that the data can only take two values


 * **type**: boolean




### interval

 Describes numeric variables as either continuously valued, or discretely valued


 * **type**: string
 * **possible values**: continuous, discrete


### time

 Signifies that the variable describes points in time






### invalidCount

 Counts the number of invalid observations, including missing values, nulls, NA's and any observation with a value enumerated in invalidSpecialCodes


 * **type**: integer



### invalidSpecialCodes

 Any numbers that represent invalid observations


 * **type**: array



### validCount

 Counts the number of valid observations


 * **type**: integer



### uniqueCount

 Count of unique values, including invalid signifiers


 * **type**: integer



### median

 A central value in the distribution such that there are as many values equal or above, as there are equal or below this value.

 * **types**: number or string




### mean

 Average of all numeric values, which are not contained in invalidSpecialCodes

 * **types**: number or string




### max

 Largest numeric value observed in dataset, that is not contained in invalidSpecialCodes

 * **types**: number or string




### min

 Least numeric value observed in dataset, that is not contained in invalidSpecialCodes

 * **types**: number or string




### mode

 Value that occurs most frequently.  Multiple values in the case of ties.

 * **types**: array or string




### modeFreq

 Number of times value of mode is observed in variable

 * **types**: integer or string




### fewestValues

 Value that occurs least frequently.  Multiple values in the case of ties.

 * **types**: array or string




### fewestFreq

 Number of times value of fewestValues is observed in variable

 * **types**: integer or string




### midpoint

 The value equidistant from the reported min and max values

 * **types**: number or string




### midpointFreq

 Number of observations with value equal to minpoint

 * **types**: integer or string




### stdDev

 Standard deviation of the values, measuring the spread between values, specifically using population formula

 * **types**: number or string




### herfindahlIndex

 Measure of heterogeneity of a categorical variable which gives the probability that any two randomly sampled observations have the same value

 * **types**: number or string




### plotValues

 Plot points of a bar chart for tracing distribution of variable

 * **types**: object or string




### pdfPlotType

 Describes default type of plot appropriate to represent distribution of variable

 * **types**: string or null




### pdfPlotX

 Plot points along x dimension for tracing distribution of variable

 * **types**: array or null




### pdfPlotY

 Plot points along y dimension for tracing distribution of variable

 * **types**: array or null




### cdfPlotType

 Describes default type of plot appropriate to represent cumulative distribution of variable

 * **types**: string or null




### cdfPlotX

 Plot points along x dimension for tracing cumulative distribution of variable

 * **types**: array or null




### cdfPlotY

 Plot points along y dimension for tracing cumulative distribution of variable

 * **types**: array or null




### interpretation

 Object containing descriptors to interpret variable

 * **types**: object or string




### tworavens

 Object containing metadata specifically used by TwoRavens platform

 * **types**: object or string

Variable Display Section
========================

> **note**
>
> -   This section contains the modified object/parameters in the
>     particular version of preprocessed dataset.

### editable

    list of all the variable features which are editable. e.g `description`, `numchar`, etc.


    * **type**: string or null

### viewable

    It is a boolean property set for a variable to decide to show it or not in the preprocessed data.


    * **type**: boolean

### omit

    A list of all the features which are to be omitted for the particular variable.


    * **type**: string or null

### images

    list containing custom/ scripted images of the variable data.


    * **type**: string or null
    
Custom Statistics Section
=========================

> **note**
>
> -   This section contains the custom statistics added by the user on
>     the dataset.

### id

    unique id assigned by system to the custom statistic. e.g id_000001


    * **type**: string

### name

    Name of the custom statistic.


    * **type**: string

### variables

    list of variables involved in the custom statistic.

    * **type**: string

### images

    list of images associated with the custom statistic.

    * **type**: string

### value

    value of the custom statistic. e.g mean : `12`

    * **type**: string or null

### description

    brief description of the custom statistics.

    * **type**: string or null

### replication

    the concept/formula behind the custom statistic generation. e.g `sum of obs/ size`.

    * **type**: string or null

### display

    owner of the custom statistic has an option to display the statistic or not.
    This can be done by changing a value of **viewable** to true or false.

    Default: true

    * **type**: boolean
