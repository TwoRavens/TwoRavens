export let inputSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "htty://www.isi.edu/datamart-query.schema.json",
  "title": "Datamart query schema",
  "description": "Domain-specific language to specify queries for searching datasets in Datamart.",
  "type": "object",
  "definitions": {
    "temporal_entity": {
      "type": "object",
      "description": "Describe columns containing temporal information.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "temporal_entity"
          ]
        },
        "start": {
          "type": "string",
          "description": "Requested dates are older than this date."
        },
        "end": {
          "type": "string",
          "description": "Requested dates are more recent than this date."
        },
        "granularity": {
          "type": "string",
          "description": "Requested dates are well matched with the requested granularity. For example, if 'day' is requested, the best match is a dataset with dates; however a dataset with hours is relevant too as hourly data can be aggregated into days.",
          "enum": [
            "year",
            "month",
            "day",
            "hour",
            "minute",
            "second"
          ]
        }
      },
      "required": [
        "type"
      ]
    },
    "geospatial_entity": {
      "type": "object",
      "description": "Describe columns containing geospatial entities such as cities, countries, etc.",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "geospatial_entity"
          ]
        },
        "circle": {
          "type": "object",
          "description": "Geospatial circle area identified using a radius and a center point on the surface of the earth. ",
          "properties": {
            "latitude":{
              "type": "number",
              "description": "The latitude of the center point"
            },
            "longitude":{
              "type": "number",
              "description": "The longitude of the center point"
            },
            "radius": {
              "type": "string",
              "description": "A string specify the radius of the area. "
            },
            "granularity": {
              "type": "string",
              "description": "The granularity of the entities contained in a bounding box. ",
              "enum": [
                "country",
                "state",
                "city",
                "county",
                "postalcode"
              ]
            }
          }
        },
        "bounding_box": {
          "type": "object",
          "description": "Geospatial bounding box identified using two points on the surface of the earth.",
          "properties": {
            "latitude1":{
              "type": "number",
              "description": "The latitude of the first point"
            },
            "longitude1":{
              "type": "number",
              "description": "The longitude of the first point"
            },
            "latitude2":{
              "type": "number",
              "description": "The latitude of the second point"
            },
            "longitude2":{
              "type": "number",
              "description": "The longitude of the second point"
            },
            "granularity": {
              "type": "string",
              "description": "The granularity of the entities contained in a bounding box. ",
              "enum": [
                "country",
                "state",
                "city",
                "county",
                "postalcode"
              ]
            }
          }
        },
        "named_entities": {
          "type": "object",
          "description": "A set of names of geospatial entities. This should be used when the requestor doesn't know what type of geospatial entities are provided, they could be cities, states, countries, etc. A matching dataset should have a column containing the requested entities.",
          "properties": {
            "semantic_type": {
              "type": "string",
              "enum": [
                "http://schema.org/AdministrativeArea",
                "http://schema.org/Country",
                "http://schema.org/City",
                "http://schema.org/State"
              ]
            },
            "items": {
              "type": "array"
            }
          }
        }
      },
      "required": [
        "type"
      ]
    },
    "dataframe_columns": {
      "type": "object",
      "description": "Describe columns that a matching dataset should have in terms of columns of a known dataframe. ",
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "dataframe_columns"
          ]
        },
        "index": {
          "type": "array",
          "description": "A set of indices that identifies a set of columns in the known dataset. When multiple indices are provides, the matching dataset should contain columns corresponding to each of the given columns."
        },
        "names": {
          "type": "array",
          "description": "A set of column headers that identifies a set of columns in the known dataset. When multiple headers are provides, the matching dataset should contain columns corresponding to each of the given columns."
        },
        "relationship": {
          "type": "string",
          "description": "The relationship between a column in the known dataset and a column in a matching dataset. The default is 'contains'. ",
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
    "generic_entity": {
      "type": "object",
      "description": "A description of any entity that is not temporal or geospatial. Temporal and geospatial entities receive special treatment. Datamart can re-aggregate and disaggregate temporal and geo-spatial entities so that the granularity of the requested data and an existing dataset does not need to match exactly.",
      "properties": {
        "about": {
          "type": "string",
          "description": "A query sting that is matched with all information contained in a column including metadata and values. A matching dataset should contain a column whose metadata or values matches at least one of the words in the query string. The matching algorithm gives preference to phrases when possible. "
        },
        "type": {
          "type": "string",
          "enum": [
            "generic_entity"
          ]
        },
        "variable_name": {
          "type": "array",
          "description": "A set of header names. A matching dataset should have a column that matches closely one of the provided names."
        },
        "variable_metadata": {
          "type": "array",
          "description": "A set of keywords to be matched with all the words appearing in the metadata of a column. A matching dataset should contain a column whose metadata matches at least one of the keywords. "
        },
        "variable_description": {
          "type": "array",
          "description": "A set of keywords to be matched with all the words in the description of a column in a dataset. A matching dataset should contain a column whose description matches at least one of the keywords. "
        },
        "variable_syntactic_type": {
          "type": "array",
          "description": "A set of syntactic types. A matching dataset should contain a column with any of the provided syntactic types. Comment: this should be defined using an enum."
        },
        "variable_semantic_type": {
          "type": "array",
          "description": "A set of semantic types. A matching dataset should contain a column whose semantic types have a non empty intersection with the provided semantic types. "
        },
        "named_entities": {
          "type": "array",
          "description": "A set of entity names. A matching dataset should contain a column with the requested names. "
        },
        "column_values": {
          "type": "object",
          "descriptions": "A set of arbitrary values of any type, and the relationship to the values in a column in a matching dataset. ",
          "properties": {
            "items": {
              "type": "array",
              "description": "A set of arbitrary values of any type, string, number, date, etc. To be used with the caller doesn't know whether the values represent named entities. A matching dataset shold contain a column with the requested values. "
            },
            "relationship": {
              "type": "string",
              "description": "The relationship between the specified valuesand the values in a column in a matching dataset. The default is 'contains'. ",
              "enum": [
                "contains",
                "similar",
                "correlated",
                "anti-correlated",
                "mutually-informative",
                "mutually-uninformative"
              ]
            }
          }
        }
      },
      "dependencies": {
        "relationship": [
          "named_entities"
        ]
      },
      "required": [
        "type"
      ]
    }
  },
  "properties": {
    "dataset": {
      "type": "object",
      "description": "An object to describe desired features in the metadata of a dataset. A query can specify multiple features, and a matching dataset should match at least one of the features. Datasets that match multiple features are ranked higher. The features correspond to the properties in http://schema.org/Dataset. ",
      "properties": {
        "about": {
          "type": "string",
          "description": "A query string that is matched with all information in a dataset, including all dataset and column metadata and all values. A matching dataset should match at least one of the words in the query string. The matching algorithm gives preference to phrases when possible. "
        },
        "name": {
          "type": "array",
          "description": "The names of a dataset (http://schema.org/name). "
        },
        "description": {
          "type": "array",
          "description": "The descriptions of a dataset (http://schema.org/description). "
        },
        "keywords": {
          "type": "array",
          "description": "The keywords of a dataset (http://schema.org/keywords). "
        },
        "creator": {
          "type": "array",
          "description": "The creators of a dataset (http://schema.org/creator). A creator can be a person or an organization; organizations can be specified using names of paylevel domains. Note: the creator and publisher ofa dataset may be different; for example, a NOAA dataset was created by NOAA and may be published in multiple web sites."
        },
        "date_published": {
          "type": "object",
          "description": "The date range to show when the dataset was published (http://schema.org/datePublished).",
          "properties": {
            "after": {
              "type": "string",
              "description": "The earliest date published (http://schema.org/datePublished)."
            },
            "before": {
              "type": "string",
              "description": "The latest date published (http://schema.org/datePublished)."
            }
          }
        },
        "date_created": {
          "type": "object",
          "description": "The date range to show when the dataset was created (http://schema.org/dateCreated).",
          "properties": {
            "after": {
              "type": "string",
              "description": "The earliest date created (http://schema.org/datePublished)."
            },
            "before": {
              "type": "string",
              "description": "The latest date created (http://schema.org/datePublished)."
            }
          }
        },
        "publisher": {
          "type": "array",
          "description": "The publishers of a dataset (http://schema.org/publisher). A publisher can be a person or an organization; organizations can be specified using names of paylevel domains."
        },
        "url": {
          "type": "array",
          "description": "The URLs where the dataset is published (http://schema.org/url). In case of RESTful APIs, a match of the URL up to the `?` is sufficient. More complete matches are ranked higher. "
        }
      }
    },
    "required_variables": {
      "type": "array",
      "description": "The 'required' section of a query describes a set of columns that a matching dataset must have. All items in the 'required' set must be match by at least one column in a matching dataset. It is possible that an item is matched using a combination of columns. For example, a temporal item with day resolution can be matched by a dataset that represents dates using multiple columns, for year, month and date.  Typically, the 'required' section is used to list columns to be used to perform a join.  The 'required' section is optional. ",
      "items": {
        "oneOf": [
          {
            "$ref": "#/definitions/temporal_entity"
          },
          {
            "$ref": "#/definitions/geospatial_entity"
          },
          {
            "$ref": "#/definitions/dataframe_columns"
          },
          {
            "$ref": "#/definitions/generic_entity"
          }
        ]
      }
    },
    "desired_variables": {
      "type": "array",
      "description": "The 'desired' section of a query describes the minimum set of columns that a matching dataset must have. A matching dataset must contain columns that match at least one of the 'desired' item. Typically, the 'desired' items are used to specify columns that will be used for augmentation. The 'desired' section is optional. ",
      "items": {
        "oneOf": [
          {
            "$ref": "#/definitions/temporal_entity"
          },
          {
            "$ref": "#/definitions/geospatial_entity"
          },
          {
            "$ref": "#/definitions/dataframe_columns"
          },
          {
            "$ref": "#/definitions/generic_entity"
          }
        ]
      }
    }
  }
};