---
title: Preprocess File Description
...

This document describes the variables contained in the preprocess output
file.

Preprocess Parameters
=====================

Self Section
============

> **note**
>
> -   This section contains the structure and description of the
>     preprocessed file.

Dataset Section
===============

> **note**
>
> -   This section contains the important parameters of preprocess file
>     at dataset level.

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

Variable Display Section
========================

> **note**
>
> -   This section contains the modified object/parameters in the
>     particular version of preprocessed dataset.

Custom Statistics Section
=========================

> **note**
>
> -   This section contains the custom statistics added by the user on
>     the dataset.
