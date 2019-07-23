TwoRavens Metadata Service
==========================

The TwoRavens metadata service is used preprocess tabular data to to
provide summary statistics that power the TwoRavens interface. The
preprocess output (defaults to JSON) may be used by programs and
services to explore, query, and compare metadata.

# Guide
* Preprocess File Description
    * [Preprocess Parameters](#preprocess-parameters)
    * [Self Section](self_section.md)
    * [Dataset Section](dataset_section.md)
    * [Variable Section](defn_variables.md)
    * [Variable Display Section](variable_display_section.md)
    * [Custom Statistics Section](custom_statistics_section.md)
* [License](license.md)
* [Help](help.md)

## Preprocess Parameters

.. data:: variables

  Dictionary containing variable metadata

  .. code-block:: json

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
    
Self Section
============

> **note**
>
> -   This section contains the structure and description of the
>     preprocessed file.

.. data:: description

    contains the link to the source.


    * **type**: URL

.. data:: created

    The data and time when the preprocessed file was created.


    * **type**: string

.. data:: preprocessId

    It is the auto-generated ID given by the service to every preprocess file.


    * **type**: numeric

.. data:: version

    It describes the version of the preprocessed file.


    * **type**: numeric

.. data:: schema

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

.. data:: description

    some definition.


    * **type**: URL

.. data:: unit of analysis

    some definition.


    * **type**: string

.. data:: structure

    some definition.


    * **type**: string

.. data:: rowCount

    number of observations in the dataset.


    * **type**: numeric

.. data:: variableCount

    number of variables in the dataset.


    * **type**: numeric

.. data:: dataSource

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
> > ``` {.sourceCode .json}
> > {
> >  "median":"NA"
> > }
> > ```



.. data:: variableName

    Name of the variable


    * **type**: string



.. data:: description

    Brief explanation of the variable


    * **type**: string



.. data:: numchar

    Describes the variable as numeric or character valued


    * **type**: string
    * **possible values**: character, numeric


.. data:: nature

    Describes the classification of data into Nominal, Ordinal, Ratio, Interval, Percentage.


    * **type**: string
    * **possible values**: interval, nominal, ordinal, percent, ratio, other


.. data:: binary

    Signifies that the data can only take two values


    * **type**: boolean



.. data:: interval

    Describes numeric variables as either continuously valued, or discretely valued


    * **type**: string
    * **possible values**: continuous, discrete


.. data:: time

    Signifies that the variable describes points in time






.. data:: invalidCount

    Counts the number of invalid observations, including missing values, nulls, NA's and any observation with a value enumerated in invalidSpecialCodes


    * **type**: integer



.. data:: invalidSpecialCodes

    Any numbers that represent invalid observations


    * **type**: array



.. data:: validCount

    Counts the number of valid observations


    * **type**: integer



.. data:: uniqueCount

    Count of unique values, including invalid signifiers


    * **type**: integer



.. data:: median

    A central value in the distribution such that there are as many values equal or above, as there are equal or below this value.

    * **types**: number or string




.. data:: mean

    Average of all numeric values, which are not contained in invalidSpecialCodes

    * **types**: number or string




.. data:: max

    Largest numeric value observed in dataset, that is not contained in invalidSpecialCodes

    * **types**: number or string




.. data:: min

    Least numeric value observed in dataset, that is not contained in invalidSpecialCodes

    * **types**: number or string




.. data:: mode

    Value that occurs most frequently.  Multiple values in the case of ties.

    * **types**: array or string




.. data:: modeFreq

    Number of times value of mode is observed in variable

    * **types**: integer or string




.. data:: fewestValues

    Value that occurs least frequently.  Multiple values in the case of ties.

    * **types**: array or string




.. data:: fewestFreq

    Number of times value of fewestValues is observed in variable

    * **types**: integer or string




.. data:: midpoint

    The value equidistant from the reported min and max values

    * **types**: number or string




.. data:: midpointFreq

    Number of observations with value equal to minpoint

    * **types**: integer or string




.. data:: stdDev

    Standard deviation of the values, measuring the spread between values, specifically using population formula

    * **types**: number or string




.. data:: herfindahlIndex

    Measure of heterogeneity of a categorical variable which gives the probability that any two randomly sampled observations have the same value

    * **types**: number or string




.. data:: plotValues

    Plot points of a bar chart for tracing distribution of variable

    * **types**: object or string




.. data:: pdfPlotType

    Describes default type of plot appropriate to represent distribution of variable

    * **types**: string or null




.. data:: pdfPlotX

    Plot points along x dimension for tracing distribution of variable

    * **types**: array or null




.. data:: pdfPlotY

    Plot points along y dimension for tracing distribution of variable

    * **types**: array or null




.. data:: cdfPlotType

    Describes default type of plot appropriate to represent cumulative distribution of variable

    * **types**: string or null




.. data:: cdfPlotX

    Plot points along x dimension for tracing cumulative distribution of variable

    * **types**: array or null




.. data:: cdfPlotY

    Plot points along y dimension for tracing cumulative distribution of variable

    * **types**: array or null




.. data:: interpretation

    Object containing descriptors to interpret variable

    * **types**: object or string




.. data:: tworavens

    Object containing metadata specifically used by TwoRavens platform

    * **types**: object or string

Variable Display Section
========================

> **note**
>
> -   This section contains the modified object/parameters in the
>     particular version of preprocessed dataset.

.. data:: editable

    list of all the variable features which are editable. e.g `description`, `numchar`, etc.


    * **type**: string or null

.. data:: viewable

    It is a boolean property set for a variable to decide to show it or not in the preprocessed data.


    * **type**: boolean

.. data:: omit

    A list of all the features which are to be omitted for the particular variable.


    * **type**: string or null

.. data:: images

    list containing custom/ scripted images of the variable data.


    * **type**: string or null
    
Custom Statistics Section
=========================

> **note**
>
> -   This section contains the custom statistics added by the user on
>     the dataset.

.. data:: id

    unique id assigned by system to the custom statistic. e.g id_000001


    * **type**: string

.. data:: name

    Name of the custom statistic.


    * **type**: string

.. data:: variables

    list of variables involved in the custom statistic.

    * **type**: string

.. data:: images

    list of images associated with the custom statistic.

    * **type**: string

.. data:: value

    value of the custom statistic. e.g mean : `12`

    * **type**: string or null

.. data:: description

    brief description of the custom statistics.

    * **type**: string or null

.. data:: replication

    the concept/formula behind the custom statistic generation. e.g `sum of obs/ size`.

    * **type**: string or null

.. data:: display

    owner of the custom statistic has an option to display the statistic or not.
    This can be done by changing a value of **viewable** to true or false.

    Default: true

    * **type**: boolean
