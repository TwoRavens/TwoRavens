/*
 *  Datamart UI component and API calls
 */
import m from 'mithril';

import JSONSchema from "../../common/views/JSONSchema";
import Button from "../../common/views/Button";
import * as common from "../../common/common";
import Table from "../../common/views/Table";
import ListTags from "../../common/views/ListTags";
import ButtonRadio from "../../common/views/ButtonRadio";
import * as app from "../app";
import {numberWithCommas} from '../utils';
import ModalVanilla from "../../common/views/ModalVanilla";
import PanelList from "../../common/views/PanelList";
import TextField from "../../common/views/TextField";
import Dropdown from "../../common/views/Dropdown";
import Icon from "../views/Icon";
import ButtonLadda from "../views/LaddaButton";
import {datamartQueryInputSchema} from "./query_input_schema_2019_06";
import {datamartDatasetIndexSchema} from "./dataset_schema_2019_01";
// maximum number of records to display at once
let resultLimit = 100;

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
                'size': ['metadata', 'size'],
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
                'size': ['metadata', 'size'],
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
        /*
        setDefault(preferences, 'getPreviewButtonState', (idx) => {
            return preferences.previewButtonState[idx];
        });
        setDefault(preferences, 'setPreviewButtonState', (idx, val) => {
            preferences.previewButtonState[idx] = val;
        });
        */

        // set default menu state
        setDefault(preferences, 'datamartMode', 'Search');
        setDefault(preferences, 'isSearching', {ISI: false, NYU: false});

        setDefault(preferences, 'error', {ISI: undefined, NYU: undefined});
        setDefault(preferences, 'success', {ISI: undefined, NYU: undefined});

        // Set ISI or NYU
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
            dataPath,   // where to load data from, to augment with
            labelWidth, // width of titles on left side of cards
            endpoint,   // Django app url
        } = vnode.attrs;

        let {
            query,    // https://datadrivendiscovery.org/wiki/display/work/Datamart+Query+API
            results,  // list of matched metadata
            indices,  // data to be attached to the upload
            cached,   // summary info and paths related to materialized datasets
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

        /**
         *  Materialize: download a dataset based on a specific search result
         */
        let materializeData = async i => {
            console.log(`materializeData ${i}`);
            // Get the search result and find the dataset id.
            //  May differ between Datamart.  See "infoPaths" above
            //
            let id = getData(results[preferences.sourceMode][i], 'id');

            preferences.selectedResult = results[preferences.sourceMode][i];

            if (!(id in cached)) {
                let sourceMode = preferences.sourceMode;

                // Use the materialize endpoint.
                //  Note: the materialized data is returned through websockets
                //    but an intial message relays if the request worked.
                //
                let response = await m.request(endpoint + 'materialize-async', {
                    method: 'POST',
                    data: {
                        search_result: JSON.stringify(preferences.selectedResult),
                        source: preferences.sourceMode
                      //  workspace_id: app.workspace.user_workspace_id
                        //problem_id:
                    }
                });
                if (response.success) {
                    preferences.success[sourceMode] = 'Preview initiated ...';
                    delete preferences.error[sourceMode];
                } else {
                    // show the response error message
                    delete preferences.success[sourceMode];
                    preferences.error[sourceMode] = response.message;
                }
            }

            // turn ladda off
            //preferences.setPreviewButtonState(i, false);
            console.log('turn ladda off');

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
                    preferences.modalShown = 'augment';
                    /*
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
                    */
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

        let buttonPreview = i => m(ButtonLadda, {
            id: 'buttonPreview' + i,
            //class: 'ladda-label ladda-button',
            //activeLadda: preferences.previewButtonState[i],
            //disabled: preferences.previewButtonState[i] === true,

            style: {'margin': '0em 0.25em', 'data-spinner-color': 'black', 'data-style': 'zoom-in'},
            onclick: async () => {
                console.log('turn ladda on');
              //  preferences.setPreviewButtonState(i, true);


                let id = getData(results[preferences.sourceMode][i], 'id');
                preferences.selectedResult = results[preferences.sourceMode][i];

                await materializeData(i);

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
                    schema: datamartQueryInputSchema
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
                                    'size (bytes)': numberWithCommas(getData(result, 'size')),
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
                    schema: datamartDatasetIndexSchema
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

                            // For ISI, this "preferences.selectedResult.metadata.columns" is
                            //    "preferences.selectedResult.metadata.variables"
                            //
                            let originalRightColumns = preferences.selectedResult.metadata.columns.map(row => row.name);

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
                            let augment_api_data = {
                                data_path: dataPath,
                                search_result: JSON.stringify(preferences.selectedResult),
                                source: preferences.sourceMode,
                                left_columns: JSON.stringify(joinLeftColumns),
                                right_columns: JSON.stringify(joinRightColumns),
                                exact_match: preferences.exactMatch,
                                // left_meta: JSON.stringify(implicitVariables)
                            }

                            console.log(augment_api_data);

                            let response = await m.request(endpoint + 'augment', {
                                method: 'POST',
                                data: augment_api_data
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

                        // For ISI, this "preferences.selectedResult.metadata.columns" is
                        //    "preferences.selectedResult.metadata.variables"
                        //
                        items: selectedResult.metadata.columns.map(variable => variable.name),
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
