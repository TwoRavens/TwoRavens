import m from 'mithril';

import JSONSchema from "../../common/views/JSONSchema";
import Button from "../../common/views/Button";
import * as common from "../../common/common";
import Table from "../../common/views/Table";
import ListTags from "../../common/views/ListTags";
import ButtonRadio from "../../common/views/ButtonRadio";
import * as app from "../app";
import ModalVanilla from "../../common/views/ModalVanilla";
import PanelList from "../../common/views/PanelList";
import TextField from "../../common/views/TextField";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../views/Icon";
import ButtonLadda from "../views/LaddaButton";

// maximum number of records to display at once
let resultLimit = 100;

let inputSchema = {
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
          {
            "$ref": "#/definitions/tabular_variable"
          },
          {
            "$ref": "#/definitions/named_entity_variable"
          }
        ]
      }
    }
  }
}

let indexSchema = {
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


let joinSchema = {
    "$schema": "http://json-schema.org/draft-06/schema#",
    "$id": "http://datamart.datadrivendiscovery.org/implicit.schema.json",
    "title": "implicit variables",
    "description": "Metadata describing a join's implicit variables",
    "type": "object",
    "properties": {
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
        }
    }
};


let setDefault = (obj, id, value) => obj[id] = id in obj ? obj[id] : value;
let warn = (text) => m('[style=color:#dc3545;display:inline-block;margin-right:1em;]', text);

export default class Datamart {
    oninit(vnode) {
        // all menu state is held in preferences
        let {preferences} = vnode.attrs;

        // access information from NYU/ISI responses along these paths
        setDefault(preferences, 'infoPaths', {
            'NYU': {
                'id': ['id'],
                'name': ['metadata', 'name'],
                'score': ['score'],
                'description': ['metadata', 'description'],
                'keywords': undefined,
                'data': ['metadata'],
                'join_columns': ['join_columns'],
                'union_columns': ['union_columns']
            },
            'ISI': {
                'id': ['datamart_id'],
                'name': ['metadata', 'title'],
                'score': ['score'],
                'description': ['metadata', 'description'],
                'keywords': ['metadata', 'keywords'],
                'data': ['metadata'],
                'join_columns': ['join_columns'],
                'union_columns': ['union_columns']
            }
        });
        setDefault(preferences, 'getData', (result, attribute) => {
            let path = preferences.infoPaths[preferences.sourceMode][attribute];
            return path && path.reduce((out, term) => term in out && out[term], result)
        });

        // set default menu state
        setDefault(preferences, 'datamartMode', 'Search');
        setDefault(preferences, 'isSearching', {ISI: false, NYU: false});

        setDefault(preferences, 'error', {ISI: undefined, NYU: undefined});
        setDefault(preferences, 'success', {ISI: undefined, NYU: undefined});

        setDefault(preferences, 'sourceMode', 'NYU');
        setDefault(preferences, 'leftJoinVariables', new Set());
        setDefault(preferences, 'rightJoinVariables', new Set());

        setDefault(preferences, 'datamartIndexMode', 'Link');

        setDefault(preferences, 'indexLink', ''); // https://archive.ics.uci.edu/ml/machine-learning-databases/iris/bezdekIris.data
        setDefault(preferences, 'indexFileType', 'csv');

        setDefault(preferences, 'indexScrape', ''); // https://www.w3schools.com/html/html_tables.asp

        setDefault(preferences, 'joinPairs', []);
        setDefault(preferences, 'exactMatch', true);

        setDefault(preferences, 'implicitVariables', {implicit_variables: []});
    }

    view(vnode) {
        let {
            preferences,
            dataPath, // where to load data from, to augment with
            labelWidth, // width of titles on left side of cards
            endpoint, // Django app url
        } = vnode.attrs;

        let {
            query, // https://datadrivendiscovery.org/wiki/display/work/Datamart+Query+API
            results, // list of matched metadata
            indices, // data to be attached to the upload
            cached, // summary info and paths related to materialized datasets
            getData
        } = preferences;

        let loader = m('div', {
                style: {height: '120px', margin: 'auto calc(50% - 60px)'}
            },
            m('#loading.loader', {
                style: {position: 'relative', transform: 'translateY(-50%)'}
            }));

        if (preferences.isAugmenting) return m('div',
            m('h5', 'The system is performing an augmentation.'),
            loader
        );

        let bold = value => m('div', {style: {'font-weight': 'bold', display: 'inline'}}, value);

        // ---------------------------
        // for debugging
        // ---------------------------
        let xmakeCard = ({key, color, summary}) => m('div', summary);
        // ---------------------------

        let makeCard = ({key, color, summary}) => m('table', {
                style: {
                    'background': common.menuColor,
                    'border': common.borderColor,
                    margin: '1em',
                    'box-shadow': '0px 5px 5px rgba(0, 0, 0, .2)',
                    width: 'calc(100% - 2em)'
                }
            },
            m('tr',
                m('td', {
                    style: {
                        background: color,
                        height: '100%',
                        padding: '1em',
                        width: labelWidth || 0, // by default, 0 makes div width wrap content
                        'max-width': labelWidth || 0,
                        'word-break': 'break-word',
                        'border-right': common.borderColor
                    }
                }, bold(key)),
                m('td', {style: {width: 'calc(100% - 2em)'}}, summary))
        );

        let materializeData = async i => {
            let id = getData(results[preferences.sourceMode][i], 'id');

            preferences.selectedResult = results[preferences.sourceMode][i];

            if (!(id in cached)) {
                let sourceMode = preferences.sourceMode;
                let response = await m.request(endpoint + 'materialize-async', {
                    method: 'POST',
                    data: {
                        search_result: JSON.stringify(preferences.selectedResult),
                        source: preferences.sourceMode
                    }
                });
                if (response.success) {
                    /*
                      - data now returned async
                    console.log('materializeData response.data:', response.data);
                    cached[id] = response.data;
                    cached[id].data_preview = cached[id].data_preview
                        .split('\n').map(line => line.split(','));

                    // console.log('Materialized:', response.data);
                    */
                    preferences.success[sourceMode] = 'Preview initiated ...';
                    delete preferences.error[sourceMode];
                } else {
                    delete preferences.success[sourceMode];
                    preferences.error[sourceMode] = response.message;
                }
            }
            m.redraw();
        };

        let handleIndex = async index => {
            console.log('Datamart Index:', index);

            // preserve state after async is awaited
            let sourceMode = preferences.sourceMode;

            let response = await m.request(endpoint + 'get_metadata', {
                method: 'POST',
                data: {
                    custom: JSON.stringify(index),
                    source: sourceMode
                }
            });

            if (response.success) {
                delete preferences.error[sourceMode];
                preferences.indices.length = 0;
                preferences.indices.push(...response.data);
                preferences.success[sourceMode] = `Found ${response.data.length} potential dataset${response.data.length === 1 ? '' : 's'}. Please review the details.`
                console.warn("#debug after submission of new dataset, response.data");
                console.log(response.data);
            } else {
                preferences.error[sourceMode] = response.message;
                delete preferences.success[sourceMode]
            }
        };

        let buttonDownload = i => m(Button, {
            style: {'margin': '0em 0.25em'},
            onclick: async () => {
                let id = getData(results[preferences.sourceMode][i], 'id');

                await materializeData(i);

                // download the file
                let link = document.createElement('a');
                document.body.appendChild(link);
                link.href = cached[id].data_path;
                link.click();
            }
        }, 'Download');

        let buttonAugment = i => m(Button, {
            style: {'margin': '0em 0.25em'},
            onclick: async () => {
                preferences.selectedResult = results[preferences.sourceMode][i];

                if (preferences.sourceMode === 'ISI')
                    preferences.modalShown = 'augment';

                if (preferences.sourceMode === 'NYU') {
                    let response = await m.request(endpoint + 'augment', {
                        method: 'POST',
                        data: {
                            data_path: dataPath,
                            search_result: JSON.stringify(preferences.selectedResult),
                            source: preferences.sourceMode
                        }
                    });

                    if (!response.success)
                        this.error = response.data;
                }
            }
        }, 'Augment');

        let buttonMetadata = i => m(Button, {
            style: {'margin': '0em 0.25em'},
            onclick: () => {
                preferences.selectedResult = results[preferences.sourceMode][i];
                preferences.modalShown = 'metadata';
            }
        }, 'Metadata');

        let buttonPreview = i => m(Button, {
            id: 'buttonPreview' + i,
            class: 'ladda-label ladda-button',
            style: {'margin': '0em 0.25em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'},
            onclick: async () => {
                let id = getData(results[preferences.sourceMode][i], 'id');
                preferences.selectedResult = results[preferences.sourceMode][i];
                let ladda = Ladda.create(document.getElementById('buttonPreview' + i));
                ladda.start();
                await materializeData(i);
                ladda.stop();

                if (id in cached)
                    preferences.modalShown = 'preview';
                m.redraw();
            }
        }, 'Preview');

        return m('div', {style: {width: '100%',
                'overflow-y': 'scroll',
                height: '100%'
        }},
            m(ButtonRadio, {
                id: 'datamartButtonBar',
                onclick: state => preferences.datamartMode = state,
                activeSection: preferences.datamartMode,
                sections: [{value: 'Search'}, {value: 'Index'}]
            }),

            preferences.error[preferences.sourceMode] && m('div#errorMessage', {
                style: {
                    background: 'rgba(0,0,0,.05)',
                    'border-radius': '.5em',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                    margin: '10px 0',
                    padding: '1em'
                }
            }, [
                m('div', {
                    style: {display: 'inline-block'},
                    onclick: () => delete preferences.error[preferences.sourceMode]
                }, m(Icon, {name: 'x'})),
                m('div', {style: {'margin-left': '1em', display: 'inline-block'}},
                    warn('Error:'), preferences.error[preferences.sourceMode])
            ]),

            preferences.success[preferences.sourceMode] && m('div#successMessage', {
                style: {
                    background: 'rgba(0,0,0,.05)',
                    'border-radius': '.5em',
                    'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                    margin: '10px 0',
                    padding: '1em'
                }
            }, [
                m('div#successMessage', {
                    style: {display: 'inline-block'},
                    onclick: () => delete preferences.success[preferences.sourceMode]
                }, m(Icon, {name: 'x'})),
                m('div', {style: {'margin-left': '1em', display: 'inline-block'}},
                    preferences.success[preferences.sourceMode])
            ]),

            preferences.datamartMode === 'Search' && [
                m(`div[style=background:${common.menuColor}]`, m(JSONSchema, {
                    data: query,
                    schema: inputSchema
                })),

                m(ButtonRadio, {
                    id: 'dataSourceButtonBar',
                    onclick: state => {
                        preferences.sourceMode = state;
                        preferences.selectedResult = undefined;
                    },
                    activeSection: preferences.sourceMode,
                    sections: [{value: 'NYU'}, {value: 'ISI'}],
                    attrsAll: {style: {margin: '1em', width: 'auto'}},
                    attrsButtons: {style: {width: 'auto'}}
                }),
                m(Button, {
                    style: {float: 'right', margin: '1em'},
                    disabled: preferences.isSearching[preferences.sourceMode],
                    onclick: async () => {
                        console.log('Datamart Query', JSON.stringify(query));

                        // preserve state after async is awaited
                        let sourceMode = preferences.sourceMode;
                        results[sourceMode].length = 0;

                        // enable spinner
                        preferences.isSearching[sourceMode] = true;
                        m.redraw();

                        let response = await m.request(endpoint + 'search', {
                            method: 'POST',
                            data: {
                                data_path: dataPath,
                                query: JSON.stringify(query),
                                source: preferences.sourceMode,
                                limit: resultLimit
                            }
                        });

                        preferences.isSearching[sourceMode] = false;

                        if (response.success) {
                            console.log('results are back! ' + JSON.stringify(response));
                            // (moved sort to server side)
                            // clear array and add results
                            results[sourceMode].length = 0;
                            results[sourceMode].push(...response.data);

                            console.log('Num results: ' + results[sourceMode].length);

                            if (results[sourceMode].length === 0) {
                                // No datasets found
                                //
                                delete preferences.success[sourceMode]; // remove "success"
                                preferences.error[sourceMode] = 'No datasets found.';
                            } else {
                                // Datasets found!
                                //
                                delete preferences.error[sourceMode]; // remove error

                                let numDatasetMsg = '';
                                if (results[sourceMode].length > resultLimit){
                                  numDatasetMsg = 'Over ';
                                }
                                numDatasetMsg += `${results[sourceMode].length} datasets found.`;
                                preferences.success[sourceMode] = numDatasetMsg;
                                console.log('msg: ' + numDatasetMsg);
                            }
                        } else {
                            // show the error message
                            delete preferences.success[sourceMode]; // remove "success"
                            preferences.error[sourceMode] = response.message;
                        }
                        m.redraw();
                    }
                }, 'Submit'),

                preferences.isSearching[preferences.sourceMode] && loader,

                m('div#datamartResults', results[preferences.sourceMode]
                     .map((result, i) => makeCard({
                        key: m('', m('', getData(result, 'name') || ''),
                                    m('p[style=font-weight:normal]', `(#${i+1})`)),
                        color: preferences.selectedResult === result ? common.selVarColor : common.grayColor,
                        summary: m('div',
                            m('label[style=width:100%]', 'Score: ' + getData(result, 'score')),
                            buttonPreview(i),
                            // buttonDownload(i), # download isn't working yet
                            buttonAugment(i),
                            buttonMetadata(i),
                            m(Table, {
                                data: {
                                    description: getData(result, 'description'),
                                    keywords: getData(result, 'keywords') && m(ListTags, {
                                        tags: getData(result, 'keywords'),
                                        readonly: true
                                    })
                                }
                            }))
                    }))
                 )
             ],
            preferences.datamartMode === 'Index' && [
                m('div', {style: {margin: '1em'}}, 'Indexing is for adding your own datasets to datamart. You may provide a ', bold('link'), ' to a file, or ', bold('scrape'), ' datasets from a website.'), // You may upload a file or extract data from a link.
                m(ButtonRadio, {
                    id: 'datamartIndexMode',
                    onclick: state => preferences.datamartIndexMode = state,
                    activeSection: preferences.datamartIndexMode,
                    sections: [
                        // {value: 'File'},
                        {value: 'Link'},
                        {value: 'Scrape'}
                    ]
                }),
                preferences.datamartIndexMode === 'File' && [
                    m('label.btn.btn-default.btn-file', {style: {margin: '1em', display: 'inline-block'}}, [
                        m('input', {
                            hidden: true,
                            type: 'file',
                            style: {display: 'none'},
                            onchange: async e => {

                                // preserve state after async is awaited
                                let sourceMode = preferences.sourceMode;

                                let file = e.target.files[0];

                                let data = new FormData();
                                data.append("source_file", file);

                                // initial upload
                                let response = await m.request({
                                    method: "POST",
                                    url: endpoint + "upload",
                                    data: data
                                });

                                if (!response.success) {
                                    preferences.error[sourceMode] = response.message;
                                    return;
                                }
                            }
                        })
                    ], 'Browse')
                ],

                preferences.datamartIndexMode === 'Link' && [
                    m(TextField, {
                        style: {margin: '1em', width: 'calc(100% - 15em)', display: 'inline-block'},
                        id: 'datamartLinkTextField',
                        value: preferences.indexLink,
                        placeholder: 'Url to file',
                        oninput: value => preferences.indexLink = value,
                        onblur: value => preferences.indexLink = value
                    }),
                    m('div', {style: {margin: '1em', 'margin-left': '0px', display: 'inline-block'}}, m(Dropdown, {
                        id: 'fileTypeDropdown',
                        items: ['csv', 'excel'],
                        activeItem: preferences.indexFileType,
                        onclickChild: value => preferences.indexFileType = value
                    })),
                    m(Button, {
                        style: {
                            float: 'right',
                            margin: '1em',
                            'margin-left': '0px',
                            'max-width': '10em',
                            display: 'inline-block'
                        },
                        onclick: () => handleIndex({
                            materialization_arguments: {
                                url: preferences.indexLink,
                                file_type: preferences.indexFileType
                            }
                        })
                    }, 'Submit')
                ],

                preferences.datamartIndexMode === 'Scrape' && [
                    m(TextField, {
                        style: {margin: '1em', width: 'calc(100% - 10em)', display: 'inline-block'},
                        id: 'datamartScrapeTextField',
                        value: preferences.indexScrape,
                        placeholder: 'Url to webpage with tables',
                        oninput: value => preferences.indexScrape = value,
                        onblur: value => preferences.indexScrape = value
                    }),
                    m(Button, {
                        style: {float: 'right', margin: '1em', 'max-width': '10em', display: 'inline-block'},
                        onclick: () => handleIndex({
                            materialization_arguments: {
                                url: preferences.indexScrape,
                                file_type: 'html'
                            }
                        })
                    }, 'Submit')
                ],

                indices.map(index => m(`div[style=background:${common.menuColor}]`, m(JSONSchema, {
                    data: index,
                    schema: indexSchema
                }))),

                indices.length > 0 && m(Button, {
                    onclick: async () => {
                        // preserve state after async is awaited
                        let sourceMode = preferences.sourceMode;

                        let responses = [];
                        let promises = indices.map((index, i) => m.request(endpoint + 'index', {
                            method: 'POST',
                            data: {
                                index: JSON.stringify(index),
                                source: sourceMode
                            }
                        }).then(response => responses[i] = response));

                        await Promise.all(promises);

                        preferences.success[sourceMode] = 'Index ' + responses
                            .reduce((out, response, i) => response.success ? [...out, i] : out, []).join(', ') + ' successful.';

                        preferences.indices = indices.filter((index, i) => !responses[i].success);

                        if (preferences.indices.length) {
                            console.warn("#debug responses");
                            console.log(responses);
                            preferences.error[sourceMode] = 'Some datasets failed uploading to datamart. The failed datasets are listed below.';
                            delete preferences.success[sourceMode]
                        } else
                            preferences.success[sourceMode] = `Dataset${responses.length === 1 ? '' : 's'} successfully indexed.`

                        m.redraw()
                    }
                }, 'Submit')
            ]
        )
    }
}


// additional menus for displaying tables, augment columns and metadata
export class ModalDatamart {
    view(vnode) {
        let {
            preferences,
            endpoint,
            dataPath, // where to load data from, to augment with
        } = vnode.attrs;

        let {
            cached, // summary info and paths related to materialized datasets
            getData,
            selectedResult,
            implicitVariables
        } = preferences;

        if (!getData || !preferences.modalShown)
            return;

        return getData && preferences.modalShown && m(ModalVanilla, {
            id: 'datamartModal',
            setDisplay: () => preferences.modalShown = false
        }, [
            preferences.modalShown === 'preview' && [
                m('h4', (preferences.getData(selectedResult, 'name') || '') + ' Preview'),
                m('div', {style: {width: '100%', overflow: 'auto'}},
                    m(Table, {
                        headers: cached[preferences.getData(selectedResult, 'id')].data_preview[0],
                        data: cached[preferences.getData(selectedResult, 'id')].data_preview.slice(1)
                    }))
            ],

            preferences.modalShown === 'metadata' && [
              m('h4', (getData(selectedResult, 'name') || '') + ' Metadata'),
              m('label[style=width:100%]', 'Score: ' + getData(selectedResult, 'score') || 0),
              m(Table, {
                  data: {
                      'Join Columns': getData(selectedResult, 'join_columns') || '(no join columns)',
                      'Union Columns': getData(selectedResult, 'union_columns') || '(no join columns)'
                  },
                  tableTags: m('colgroup',
                      m('col', {span: 1}),
                      m('col', {span: 1, width: '30%'}))
              }),
              m('div[style=width:100%;overflow:auto]',
                m(Table, {
                    data: getData(selectedResult, 'data'),
                    // attrsCells: {'class': 'text-left'}, // {class: "text-left"},
                  }
                ),
              ),
            ],


            preferences.modalShown === 'augment' && [

                preferences.error[preferences.sourceMode] && m('div#errorMessage', {
                    style: {
                        background: 'rgba(0,0,0,.05)',
                        'border-radius': '.5em',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                        margin: '10px 0',
                        padding: '1em'
                    }
                }, [
                    m('div', {
                        style: {display: 'inline-block'},
                        onclick: () => delete preferences.error[preferences.sourceMode]
                    }, m(Icon, {name: 'x'})),
                    m('div', {style: {'margin-left': '1em', display: 'inline-block'}},
                        warn('Error:'), preferences.error[preferences.sourceMode])
                ]),

                preferences.joinPairs.map((pair, i) => m('div#pairContainer' + i, {
                    style: {
                        background: 'rgba(0,0,0,.05)',
                        'border-radius': '.5em',
                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                        margin: '2em 0 1em 0',
                        padding: '1em'
                    }
                }, [
                    m('div', {
                        style: {display: 'inline-block'},
                        onclick: () => {
                            if (preferences.isAugmenting) return;
                            preferences.joinPairs.splice(preferences.joinPairs.findIndex(elem => elem === pair), 1)
                        }
                    }, !preferences.isAugmenting && m(Icon, {name: 'x'})),
                    m('div', {style: {'margin-left': '1em', display: 'inline-block'}},
                        `Joining [${pair[0].join(', ')}] with [${pair[1].join(', ')}]`)
                ])),

                m('div',
                    m(Button, {
                        style: {margin: '1em'},
                        title: 'supply variables from both the left and right datasets',
                        disabled: !preferences.leftJoinVariables.size || !preferences.rightJoinVariables.size || preferences.isAugmenting === true,
                        onclick: () => {
                            if (!preferences.leftJoinVariables.size || !preferences.rightJoinVariables.size || preferences.isAugmenting)
                                return;

                            preferences.joinPairs.push([
                                [...preferences.leftJoinVariables],
                                [...preferences.rightJoinVariables]]);

                            preferences.leftJoinVariables = new Set();
                            preferences.rightJoinVariables = new Set();
                        }
                    }, 'Add Pairing'),

                    m('label[style=margin-right:1em]', 'Exact Match:'),
                    m(ButtonRadio, {
                        id: 'exactMatchButtonBar',
                        attrsAll: {style: {display: 'inline-block', width: 'auto'}},
                        onclick: state => {
                            if (preferences.isAugmenting) return;
                            preferences.exactMatch = state === 'true'
                        },
                        activeSection: String(preferences.exactMatch),
                        sections: [{value: 'true'}, {value: 'false'}]
                    }),

                    m(ButtonLadda, {
                        id: 'augmentButton',
                        style: {margin: '1em', float: 'right'},
                        activeLadda: preferences.isAugmenting,
                        disabled: !preferences.joinPairs.length || preferences.isAugmenting === true,
                        onclick: async () => {
                            preferences.isAugmenting = true;

                            let sourceMode = preferences.sourceMode;

                            let originalLeftColumns = app.workspace.raven_config.variablesInitial;
                            let originalRightColumns = preferences.selectedResult.metadata.variables.map(row => row.name);

                            let joinLeftColumns = [];
                            let joinRightColumns = [];

                            preferences.joinPairs.forEach(pair => {
                                joinLeftColumns.push(pair[0]
                                    .map(leftCol => originalLeftColumns.indexOf(leftCol)));
                                joinRightColumns.push(pair[1]
                                    .map(rightCol => originalRightColumns.indexOf(rightCol)));
                            });

                            // console.warn("#debug implicitVariables");
                            // console.log(implicitVariables);

                            let response = await m.request(endpoint + 'augment', {
                                method: 'POST',
                                data: {
                                    data_path: dataPath,
                                    search_result: JSON.stringify(preferences.selectedResult),
                                    source: preferences.sourceMode,
                                    left_columns: JSON.stringify(joinLeftColumns),
                                    right_columns: JSON.stringify(joinRightColumns),
                                    exact_match: preferences.exactMatch,
                                    // left_meta: JSON.stringify(implicitVariables)
                                }
                            });

                            if (response.success) {
                                delete preferences.error[sourceMode];
                                preferences.success[sourceMode] = response.message;
                                preferences.modalShown = false;
                            } else {
                                preferences.error[sourceMode] = response.data;
                                delete preferences.success[sourceMode]
                            }

                            console.warn("#debug response augment");
                            console.log(response);
                        }
                    }, 'Augment')),

                // m(`div[style=background:${common.menuColor}]`, m(JSONSchema, {
                //     data: implicitVariables,
                //     schema: joinSchema
                // })),

                m('h4[style=width:calc(50% - 1em);display:inline-block]', 'Left Join Columns'),
                m('h4[style=width:calc(50% - 1em);display:inline-block]', 'Right Join Columns'),

                m('div', {style: {width: 'calc(50% - 1em)', display: 'inline-block', 'vertical-align': 'top'}},
                    m(PanelList, {
                        id: 'leftColumns',
                        items: Object.keys(app.variableSummaries),
                        colors: {
                            [app.hexToRgba(preferences.isAugmenting ? common.grayColor : common.selVarColor)]:
                                [...preferences.leftJoinVariables]
                        },
                        callback: variable => {
                            if (preferences.isAugmenting) return;
                            preferences.leftJoinVariables.has(variable)
                                ? preferences.leftJoinVariables.delete(variable)
                                : preferences.leftJoinVariables.add(variable);
                            setTimeout(m.redraw, 1000);
                        },
                        attrsAll: {
                            style: {
                                background: 'rgba(0,0,0,.025)',
                                'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                'max-width': '30em',
                                padding: '1em',
                                margin: 'auto'
                            }
                        }
                    })),
                m('div', {style: {width: 'calc(50% - 1em)', display: 'inline-block', 'vertical-align': 'top'}},
                    m(PanelList, {
                        id: 'rightColumns',
                        items: selectedResult.metadata.variables.map(variable => variable.name),
                        colors: {
                            [app.hexToRgba(preferences.isAugmenting ? common.grayColor : common.selVarColor)]: [...preferences.rightJoinVariables]
                        },
                        callback: variable => {
                            if (preferences.isAugmenting) return;
                            preferences.rightJoinVariables.has(variable)
                                ? preferences.rightJoinVariables.delete(variable)
                                : preferences.rightJoinVariables.add(variable);
                            setTimeout(m.redraw, 1000);
                        },
                        attrsAll: {
                            style: {
                                background: 'rgba(0,0,0,.025)',
                                'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                'max-width': '30em',
                                padding: '1em',
                                margin: 'auto'
                            }
                        }
                    }))
            ]
        ])
    }
}
