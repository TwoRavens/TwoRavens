/*
 * Datamart API, query input schema
 */
export let datamartQueryInputSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://gitlab.com/datadrivendiscovery/datamart-api/query_input_schema.json",
  "title": "DataMart Query Schema",
  "description": "JSON object that specifies queries for searching datasets in DataMart.",
  "type": "object",
  "definitions": {
    "temporal_variable": {
      "type": "object",
      "description": "Describes columns containing temporal information.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "temporal_variable"
          ]
        },
        "start": {
          "type": "string",
          "description": "Requested dates are more recent than this date."
        },
        "end": {
          "type": "string",
          "description": "Requested dates are older than this date."
        },
        "granularity": {
          "type": "string",
          "description": "Requested dates should match the requested granularity. For example, if 'day' is requested, the best match is a dataset with dates; however a dataset with hours is relevant too as hourly data can be aggregated into days.",
          "enum": [
            "year",
            "month",
            "day",
            "hour",
            "second"
          ]
        }
      },
      "required": [
        "type"
      ]
    },
    "geospatial_variable": {
      "type": "object",
      "description": "Describes columns containing geospatial entities.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "geospatial_variable"
          ]
        },
        "latitude1":{
          "type": "number",
          "description": "The latitude of the top left point."
        },
        "longitude1":{
          "type": "number",
          "description": "The longitude of the top left point."
        },
        "latitude2":{
          "type": "number",
          "description": "The latitude of the bottom right point."
        },
        "longitude2":{
          "type": "number",
          "description": "The longitude of the bottom right point."
        },
        "granularity": {
          "type": "string",
          "description": "The granularity of the entities contained in a bounding box.",
          "enum": [
            "country",
            "state",
            "city",
            "county",
            "postal_code"
          ]
        }
      },
      "required": [
        "type"
      ]
    },
    "tabular_variable": {
      "type": "object",
      "description": "Describe columns that a matching dataset should have in terms of columns of the supplied dataset.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "dataframe_variable"
          ]
        },
        "columns": {
          "type": "array",
          "description": "A set of indices that identifies a set of columns in the supplied dataset. When multiple indices are provided, the matching dataset should contain columns corresponding to each of the given columns."
        },
        "relationship": {
          "type": "string",
          "description": "The relationship between a column in the supplied dataset and a column in a matching dataset. The default is 'contains'.",
          "enum": [
            "contains",
            "similar",
            "correlated",
            "anti-correlated",
            "mutually-informative",
            "mutually-uninformative"
          ]
        }
      },
      "required": [
        "type"
      ]
    },
    "named_entity_variable": {
      "type": "object",
      "description": "Describes a set of named entities that a matching dataset must contain.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "named_entity_variable"
          ]
        },
        "entities": {
          "type": "array",
          "description": "A set of entity names. A matching dataset should contain a column with the requested names. "
        }
      },
      "required": [
        "type"
      ]
    }
  },
  "properties": {
    "keywords": {
      "type": "array",
      "description": "Keywords that match a dataset. The keywords can be matched against the dataset title, dataset description, dataset column names, etc."
    },
    "variables": {
      "type": "array",
      "description": "Describes a set of features (variables) that a matching dataset must have. Datasets with more features will be ranked higher.",
      "items": {
        "oneOf": [
          {
            "$ref": "#/definitions/temporal_variable"
          },
          {
            "$ref": "#/definitions/geospatial_variable"
          },
          // {
          //   "$ref": "#/definitions/tabular_variable"
          // },
          // {
          //   "$ref": "#/definitions/named_entity_variable"
          // }
        ]
      }
    }
  }
}
