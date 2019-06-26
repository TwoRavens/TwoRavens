/*
 * Datamart API, Metadata describing an entire dataset
 *  Last updated: 1/2019
 */

 export let datamartDatasetIndexSchema = {
       "$schema": "http://json-schema.org/draft-06/schema#",
       "$id": "http://datamart.datadrivendiscovery.org/dataset.schema.json",
       "title": "dataset",
       "description": "Metadata describing an entire dataset",
       "type": "object",
       "properties": {
           "materialization_arguments": {
               "description": "Arguments for the method to retrieve the dataset or parts of the dataset",
               "type": "object",
               "properties": {
                   "url": {
                       "type": "string"
                   },
                   "file_type": {
                       "enum": ["csv", "html", "json", "excel"]
                   }
               },
               "required": ["url"]
           },
           "title": {
               "description": "A short description of the dataset",
               "type": [
                   "string",
                   "null"
               ]
           },
           "description": {
               "description": "A long description of the dataset",
               "type": [
                   "string",
                   "null"
               ]
           },
           "url": {
               "description": "A url on the web where users can find more info if applicable",
               "type": [
                   "string",
                   "null"
               ],
               "format": "uri"
           },
           "keywords": {
               "description": "Any keywords or text useful for indexing and retrieval",
               "type": [
                   "array",
                   "null"
               ],
               "items": {
                   "type": "string"
               }
           },
           "date_published": {
               "description": "Original publication date",
               "anyOf": [
                   {
                       "type": "string",
                       "format": "date-time"
                   },
                   {
                       "type": "string",
                       "format": "date"
                   },
                   {
                       "type": "null"
                   }
               ]
           },
           "date_updated": {
               "description": "Last updated date",
               "anyOf": [
                   {
                       "type": "string",
                       "format": "date-time"
                   },
                   {
                       "type": "string",
                       "format": "date"
                   },
                   {
                       "type": "null"
                   }
               ]
           },
           "license": {
               "description": "License under which the dataset is released (TBD)",
               "type": [
                   "object",
                   "null"
               ]
           },
           "provenance": {
               "description": "Provenance of the dataset (TBD)",
               "type": [
                   "null",
                   "object"
               ]
           },
           "original_identifier": {
               "description": "Original global unique id associate with the dataset if applicable, like id in wikidata",
               "type": [
                   "string",
                   "null"
               ]
           },
           "implicit_variables": {
               "description": "Description of each implicit variable of the dataset",
               "type": "array",
               "items": {
                   "implicit_variable": {
                       "description": "implicit variables about the whole dataset, like the time coverage and entity coverage of the entire dataset. eg. A dataset from trading economics is about certain stocktickers, cannot be known from the dataset, should put it here",
                       "type": "object",
                       "properties": {
                           "name": {
                               "description": "name of the variable",
                               "type": "string"
                           },
                           "value": {
                               "description": "value of the variable",
                               "type": "string"
                           },
                           "semantic_type": {
                               "description": "List of D3M semantic types",
                               "type": [
                                   "array",
                                   "null"
                               ],
                               "items": {
                                   "type": "string",
                                   "format": "uri"
                               }
                           }
                       }
                   },
               }
           },
           "additional_info": {
               "description": "Any other information which is useful",
               "type": [
                   "object",
                   "null"
               ]
           }
       },
       "required": [
           "materialization_arguments"
       ],
       "definitions": {
           "implicit_variable": {
               "description": "implicit variables about the whole dataset, like the time coverage and entity coverage of the entire dataset. eg. A dataset from trading economics is about certain stocktickers, cannot be known from the dataset, should put it here",
               "type": "object",
               "properties": {
                   "name": {
                       "description": "name of the variable",
                       "type": "string"
                   },
                   "value": {
                       "description": "value of the variable",
                       "type": "string"
                   },
                   "semantic_type": {
                       "description": "List of D3M semantic types",
                       "type": [
                           "array",
                           "null"
                       ],
                       "items": {
                           "type": "string",
                           "format": "uri"
                       }
                   }
               }
           },
           "variable_metadata": {
               "description": "Metadata describing a variable/column",
               "type": "object",
               "properties": {
                   "name": {
                       "description": "The name given in the original dataset",
                       "type": [
                           "string",
                           "null"
                       ]
                   },
                   "semantic_type": {
                       "description": "List of D3M semantic types",
                       "type": [
                           "array",
                           "null"
                       ],
                       "items": {
                           "type": "string",
                           "format": "uri"
                       }
                   },
                   "named_entities": {
                       "description": "List of named entities referenced in column values",
                       "type": [
                           "array",
                           "null"
                       ],
                       "items": {
                           "type": "string"
                       }
                   },
                   "temporal_coverage": {
                       "description": "Temporal extent",
                       "type": [
                           "object",
                           "null"
                       ],
                       "properties": {
                           "start": {
                               "description": "Start of temporal coverage",
                               "anyOf": [
                                   {
                                       "type": "string",
                                       "format": "date-time"
                                   },
                                   {
                                       "type": "string",
                                       "format": "date"
                                   },
                                   {
                                       "type": "null"
                                   }
                               ]
                           },
                           "end": {
                               "description": "End of temporal coverage",
                               "anyOf": [
                                   {
                                       "type": "string",
                                       "format": "date-time"
                                   },
                                   {
                                       "type": "string",
                                       "format": "date"
                                   },
                                   {
                                       "type": "null"
                                   }
                               ]
                           }
                       }
                   },
                   "spatial_coverage": {
                       "description": "Spatial extent",
                       "type": [
                           "object",
                           "null"
                       ]
                   }
               }
           }
       }
   };
