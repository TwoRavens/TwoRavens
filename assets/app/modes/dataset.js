/*
  UI for TwoRavens Dataset Mode including tabs for:
    Current | Presets (Available Datasets) | Upload
*/
import m from 'mithril';

import * as app from "../app";
import * as explore from "./explore";
import * as manipulate from "../manipulations/manipulate";
import * as preprocessSchema from '../../preprocess-schemas/1-2-0';
import * as utils from "../utils";

import * as common from "../../common/common";
import ButtonRadio from "../../common/views/ButtonRadio";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";
import Table from "../../common/views/Table";
import Paginated from "../../common/views/Paginated";
import MenuHeaders from "../../common/views/MenuHeaders";
import Subpanel from "../../common/views/Subpanel";

import ButtonLadda from "../views/ButtonLadda";


// ------------------------------------------
//  Define the Dataset Mode Tabbed Sections
//   - Current | Presets | Upload | Online
// ------------------------------------------
export let datasetModeTabbedSections =  [
      {value: 'Current', title: 'information about currently loaded dataset'},
];
// The Presets tab may be turned on/off by server settings
if (DATASET_SHOW_TAB_PRESETS)
  datasetModeTabbedSections.push(
    {value: 'Presets', title: 'pick from previously uploaded datasets'})

// The Upload tab may be turned on/off by server settings
if (DATASET_SHOW_TAB_UPLOAD)
  datasetModeTabbedSections.push(
      {value: 'Upload', title: 'upload a new dataset from your computer'})

// The Online tab may be turned on/off by server settings
if (DATASET_SHOW_TAB_ONLINE)
  datasetModeTabbedSections.push(
    {value: 'Online', title: 'retrieve dataset from an online resource'})

// ------------------------------------------


export class CanvasDataset {

    oncreate() {

        this.presetLoadInProgress = false;
        this.presetNameToLoad = null;  // name of preset that is loading
        this.setPresetLoadInProgress = (presetNameOrFalse) => {
            if (presetNameOrFalse === false) {
                this.presetLoadInProgress = false;
                this.presetNameToLoad = null;
            } else {
                this.presetLoadInProgress = true;
                this.presetNameToLoad = presetNameOrFalse;
            }
        }
    }

    oninit() {

        /*
          Retrieve the list of available datasets
          Data consists of id, name pairs
          e.g. [{"id": 163, "name": "185_baseball_problem"},
                {"id": 171, "name": "196_autoMpg_problem"} ... ]
        */
        if (!datasetPreferences.presets.length) m.request('user-workspaces/list-dataset-choices', {
            method: 'POST',
            body: {}
        }).then(response => {
            if (!response.success) return;
            datasetPreferences.presets = response.data;
            m.redraw()
        })
    }

    view() {
        if (manipulate.constraintMenu) return;

        // workspace required for this view
        if (!app.workspace) return;

        let parseOpenMLId = text => {
            let parsed = parseInt((text || "")
                .replace("https://www.openml.org/d/", ""))
            if (parsed < 0) return
            return isNaN(parsed) ? undefined : parsed
        }

        // The Overall Dataset Component
        //
        let datasource = m('div',

            // ------------------------------------------------
            // Radio Button to Toggle Between the sections:
            //
            //    Current | Presets | Upload
            // ------------------------------------------------
            m(ButtonRadio, {
                id: 'ingestModeButtonBar',
                onclick: mode => datasetPreferences.datasourceMode = mode,
                activeSection: datasetPreferences.datasourceMode,
                sections: datasetModeTabbedSections,
                /*[
                    {value: 'Current', title: 'information about currently loaded dataset'},
                    {value: 'Presets', title: 'pick from previously uploaded datasets'},
                    {value: 'Upload', title: 'upload a new dataset from your computer'},
                    {value: 'Online', title: 'retrieve dataset from an online resource'},
                ],*/
                attrsAll: {style: {'margin-bottom': '1em'}}
            }),

            // ------------------------------------------------
            // start: "Current" Section
            //    - display the datasetDoc.about section
            // ------------------------------------------------
            datasetPreferences.datasourceMode === 'Current' && app.workspace.datasetDoc && [
                /*
                // temp remove Generate Dataset Report button
                m(Button, {
                    style: {margin: '1em'},
                    onclick: () => window.open('/#!/dataset')
                }, 'Generate Dataset Report'),
                */
                m(Table, {
                    style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'},
                    data: Object.entries(app.workspace.datasetDoc.about)
                        .map(row => [row[0], utils.preformatted(row[1])])
                })
            ],
            // ------------------------------------------------
            // end: "Current" Section
            // ------------------------------------------------
            // ------------------------------------------------
            // start: "Upload" custom data
            // ------------------------------------------------
            !DATASET_SHOW_TAB_UPLOAD && datasetPreferences.datasourceMode === "Upload" && [
                m('div',
                  m('p', '(Note: Uploading custom datasets is not available in this demo.)')),
              ],
            DATASET_SHOW_TAB_UPLOAD && datasetPreferences.datasourceMode === 'Upload' && m('div', {style: {'margin-top': '1em'}},
            m('div',
                m('label[style=display:inline-block;width:120px]', 'Dataset Name'),
                m('div[style=display:inline-block;max-width:300px]', m(TextField, {
                    id: 'datasetNameTextField',
                    value: datasetPreferences.upload.name,
                    oninput: value => datasetPreferences.upload.name = value
                })),
                m('div[style=display:inline-block;margin-left:1em]', '(Maximum upload size: ' + NGINX_MAX_UPLOAD_SIZE + ')')
            ),
            m(Table, {
                style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'},
                data: datasetPreferences.upload.files.map(file => ({
                    name: file.name,
                    modified: file?.lastModifiedDate?.toLocaleString?.(),
                    size: file.size,
                    type: file.type
                }))
            }),
            // ------------------------------------------------
            // Browse button
            // ------------------------------------------------
            m('label.btn.btn-secondary', {style: {display: 'inline-block', margin: '1em'}}, [
                m('input', {
                    hidden: true,
                    type: 'file',
                    multiple: true,
                    onchange: e => datasetPreferences.upload.files.push(...Array.from(e.target.files))
                })
            ], 'Browse'),
            // ------------------------------------------------
            // Upload button
            // ------------------------------------------------
            m(Button, {
                style: {margin: '1em'},
                onclick: uploadDataset,
                disabled: datasetPreferences.upload.files.length === 0 || datasetPreferences.upload.name.length === 0
            }, 'Upload'),
            m('div', {style: {display: 'inline-block'}}, uploadStatus)),
            // ------------------------------------------------
            // end: "Upload" custom data
            // ------------------------------------------------
            // ------------------------------------------------
            // start: "Presets" section
            // ------------------------------------------------
            datasetPreferences.datasourceMode === 'Presets' && [
                // ------------------------------------------------
                // Search field to narrow list of choices
                // ------------------------------------------------
                m(TextField, {
                    placeholder: 'search',
                    id: 'datasetSearchTextfield',
                    value: datasetPreferences.datasetSearch,
                    oninput: value => datasetPreferences.datasetSearch = value,
                    onblur: value => datasetPreferences.datasetSearch = value,
                    style: {'margin': '1em 0'}
                }),
                // ------------------------------------------------
                // Paginated list of datasets
                //   - list datasets retrieved in the init() section
                // ------------------------------------------------
                m(Paginated, {
                    data: datasetPreferences.presets
                        .filter(preset => datasetPreferences.datasetSearch.length === 0 || preset.name.toLowerCase().includes(datasetPreferences.datasetSearch.toLowerCase())),
                    makePage: data => m(Table, {
                        style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'},
                        // headers: ['ID', 'name', ''],
                        data: data.map(preset => [
                            // preset.id,
                            preset.name,
                            m(ButtonLadda, {
                                    id: 'buttonLoadDataset' + utils.purifyId(preset.name),
                                    activeLadda: this.presetNameToLoad === preset.name,
                                    // disable the current dataset
                                    disabled: app.workspace.d3m_config.name === preset.name || this.presetLoadInProgress,
                                    // switch datasets
                                    onclick: () => {
                                        this.setPresetLoadInProgress(preset.name);
                                        m.request(`user-workspaces/select-dataset-json-resp/${preset.id}`).then(response => {
                                            if (response.success) {
                                                location.reload();  // Restart!  Should load the new dataset
                                            } else {
                                                console.log('Error loading new dataset!');
                                                this.setPresetLoadInProgress(false);
                                            }
                                        })
                                    }
                                },
                                // Set button text
                                app.workspace.d3m_config.name === preset.name ? 'Loaded' : 'Load')
                        ])
                    }),
                    limit: 10,
                    page: datasetPreferences.presetPage,
                    setPage: index => datasetPreferences.presetPage = index
                })
            ],
            // ------------------------------------------------
            // end: "Presets" section
            // ------------------------------------------------
            // ------------------------------------------------
            // start: "Online" section
            // ------------------------------------------------
            !DATASET_SHOW_TAB_ONLINE && datasetPreferences.datasourceMode === "Online" && [
                m('div',
                  m('p', '(Note: Uploading datasets by url, including OpenML datasets, is not available in this demo.)')),
              ],
            DATASET_SHOW_TAB_ONLINE && datasetPreferences.datasourceMode === "Online" && [
                m('div',
                    m('label[style=display:inline-block;width:120px]', 'Dataset Name'),
                    m('div[style=display:inline-block;max-width:300px]', m(TextField, {
                        id: 'datasetNameTextField',
                        value: datasetPreferences.upload.name,
                        oninput: value => datasetPreferences.upload.name = value
                    }))),
                m(Table, {
                    attrsCells: {style: {"vertical-align": 'middle'}},
                    data: [
                        [
                            utils.bold("URL"),
                            m(TextField, {
                                placeholder: 'https://...',
                                id: 'datasetUrlTextfield',
                                value: datasetPreferences.datasetUrl,
                                oninput: value => datasetPreferences.datasetUrl = value,
                                onblur: value => datasetPreferences.datasetUrl = value,
                                style: {'margin': '1em 0'}
                            }),
                            m(ButtonLadda, {
                                onclick: async () => {
                                    let response = await m.request("/user-workspaces/upload-dataset-url", {
                                        method: "POST", body: {file: datasetPreferences.datasetUrl}
                                    });

                                    if (response.success) {
                                        location.reload();  // Restart!  Should load the new dataset
                                        return;
                                    }
                                    console.log('Upload dataset response: ' + response.message);
                                    app.alertWarn(response.message);
                                    m.redraw();
                                },
                                disabled: (() => {
                                    try {
                                        new URL(datasetPreferences.datasetUrl);
                                        return false;
                                    } catch (_) {
                                        return true;
                                    }
                                })()
                            }, "Upload URL")
                        ],
                        [
                            utils.bold("OpenML ID"),
                            m(TextField, {
                                placeholder: 'https://www.openml.org/d/[ID]',
                                id: 'datasetOpenmlTextfield',
                                value: datasetPreferences.openmlId,
                                oninput: value => datasetPreferences.openmlId = value,
                                onblur: value => datasetPreferences.openmlId = value,
                                style: {'margin': '1em 0'},
                                class: datasetPreferences.openmlId && parseOpenMLId(datasetPreferences.openmlId) === undefined ? 'is-invalid' : '',
                            }),
                            m(ButtonLadda, {
                                onclick: async () => {
                                    let openMLId = parseOpenMLId(datasetPreferences.openmlId);
                                    if (openMLId === undefined) {
                                        app.alertLog("OpenML dataset must be a non-negative integer.")
                                        return;
                                    }
                                    let response = await m.request("/user-workspaces/upload-openml-id", {
                                        method: "POST",
                                        body: {openml_id: openMLId}
                                    });

                                    if (response.success) {
                                        location.reload();  // Restart!  Should load the new dataset
                                        return;
                                    }
                                    console.log('Upload dataset response: ' + response.message);
                                    app.alertWarn(response.message);
                                    m.redraw();
                                },
                                disabled: parseOpenMLId(datasetPreferences.openmlId) === undefined
                            }, "Upload OpenML ID")
                        ],
                    ]
                })

            ]
            // ------------------------------------------------
            // end: "Online" section
            // ------------------------------------------------
        );

        let manipulationsMenu = m(MenuHeaders, {
            id: 'manipulationsMenu',
            attrsAll: {style: {height: '100%', overflow: 'auto'}},
            sections: [
                (workspace.raven_config.priorManipulations || []).length !== 0 && {
                    value: 'Prior Pipeline',
                    contents: m(manipulate.PipelineFlowchart, {
                        compoundPipeline: workspace.raven_config.priorManipulations,
                        pipeline: workspace.raven_config.priorManipulations,
                        editable: false
                    })
                },
                {
                    value: 'Dataset Pipeline',
                    contents: m(manipulate.PipelineFlowchart, {
                        compoundPipeline: app.workspace.raven_config.hardManipulations,
                        pipeline: app.workspace.raven_config.hardManipulations,
                        editable: true,
                        hard: true
                    })
                }
            ]
        });

        let variableKeys = ['variableName', 'plotValues', 'pdfPlotType', 'pdfPlotX', 'pdfPlotY', 'cdfPlotType', 'cdfPlotX', 'cdfPlotY', 'name'];
        let setDatasetSum = (_variable, attr, value) => {
            if (app.datasetSummary[attr] === value) return;
            app.setDatasetSummaryAttr(attr, value)
        };
        let setVarSum = (variable, attr, value) => {
            if (app.variableSummaries?.[variable]?.[attr] === value) return;
            app.setVariableSummaryAttr(variable, attr, value);
        };

        let reportContent;
        if (datasetPreferences.reportShown) {
            let props = preprocessSchema.properties.variables.patternProperties['.'];
            let editables = props.editable;
            let widget = (set, variable, k, v) => {
                let prop = props.properties[k];
                if (prop.type === 'boolean') {
                    return m('select.form-control', {
                        onchange: e => set(variable, k, e.currentTarget.value === 'true'),
                        value: v
                    }, ['true', 'false'].map(x => m('option', x)));
                } else if (prop.enum) {
                    return m('select.form-control', {
                        onchange: e => set(variable, k, e.currentTarget.value),
                        value: v
                    }, prop.enum.map(x => m('option', x)));
                }
                return m('input', {oninput: e => set(variable, k, e.currentTarget.value), value: v});
            };

            reportContent = m('div', {
                    style: {
                        'max-width': '800px',
                        'margin': 'auto'
                    }
                },
                m('h3', 'Overview',
                    m('button.btn.btn-primary.btn-sm' + (datasetPreferences.reportEdit ? '.active' : ''), {
                        style: 'margin: 0 1em',
                        onclick: _ => datasetPreferences.reportEdit = !datasetPreferences.reportEdit
                    }, 'Edit')),
                m(Table, {
                    data: Object.keys(app.datasetSummary).map(key => [
                        key,
                        datasetPreferences.reportEdit && preprocessSchema.properties.dataset.editable.includes(key)
                            ? widget(setDatasetSum, null, key, app.datasetSummary[key])
                            : app.datasetSummary[key]
                    ])
                }),
                m('h3', 'Variables'),
                m(TextField, {
                    placeholder: "search",
                    value: datasetPreferences.reportSearch,
                    oninput: value => {
                        datasetPreferences.reportSearch = value.toLowerCase()
                        datasetPreferences.reportPage = 0
                    },
                    onblur: value => {
                        datasetPreferences.reportSearch = value.toLowerCase()
                        datasetPreferences.reportPage = 0
                    }
                }),
                m(Paginated, {
                    data: Object.entries(app.variableSummaries)
                        .filter(variable => !datasetPreferences.reportSearch
                            || variable[0].toLowerCase().includes(datasetPreferences.reportSearch ?? "")),
                    makePage: entries => entries.map(([variable, vals]) => m('div', {style: `margin-bottom: 1em; padding: 1em; border: ${common.colors.border}`},
                        m('h4', variable),
                        m('.row',
                            m('.col[style=min-width:auto !important]',
                                m(Table, {
                                    style: {
                                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                    },
                                    class: 'table-sm',
                                    data: Object.keys(vals)
                                        .filter(key => editables.includes(key))
                                        .map(key => [key, datasetPreferences.reportEdit
                                            ? widget(setVarSum, variable, key, vals[key])
                                            : String(vals[key])])
                                })
                            ),
                            m('.col[style=min-width:auto !important]',
                                m(Table, {
                                    style: {
                                        'border-radius': '.5em',
                                        'box-shadow': '0px 5px 10px rgba(0, 0, 0, .1)',
                                    },
                                    class: 'table-sm',
                                    data: Object.entries(vals)
                                        .slice(1, 17).filter(pair => !editables.includes(pair[0]))
                                })
                            ),
                            m('.col[style=min-width:auto !important]',
                                m('div', {
                                    oninit() {
                                        this.node = vals;
                                    },
                                    oncreate(vnode) {
                                        let plot = (this.node || {}).pdfPlotType === 'continuous' ? explore.densityNode : explore.barsNode;
                                        this.node && plot(this.node, vnode.dom, 110, true);
                                    },
                                    onupdate(vnode) {
                                        let node = vals;
                                        if (node && node !== this.node) {
                                            let plot = node.pdfPlotType === 'continuous' ? explore.densityNode : explore.barsNode;
                                            plot(node, vnode.dom, 110, true);
                                            this.node = node;
                                        }
                                    },
                                }),
                            )
                        ),
                        m('button.btn.btn-primary.btn-sm', {
                            onclick: _ => datasetPreferences.reportMore[variable] = !datasetPreferences.reportMore[variable]
                        }, datasetPreferences.reportMore[variable] ? 'less' : 'more'),

                        datasetPreferences.reportMore[variable] && m(Table, {
                            data: Object.entries(vals).slice(17).filter(row => !variableKeys.includes[row[0]])
                        })
                    )),
                    limit: 10,
                    page: datasetPreferences.reportPage,
                    setPage: index => datasetPreferences.reportPage = index
                }))

        }

        return m('div', {
                style: {
                    'max-width': '800px',
                    'margin': 'auto'
                }
            },
            m(Subpanel, {
                id: 'datasetReportSubpanel',
                header: "Dataset Report and Annotations",
                shown: datasetPreferences.reportShown ?? false,
                setShown: state => datasetPreferences.reportShown = state,
                style: {
                    'border-radius': '5px',
                    'box-shadow': '1px 1px 4px rgba(0, 0, 0, 0.4)',
                    margin: '1em',
                    padding: '1em',
                    'background-color': common.colors.menu,
                }
            }, reportContent),
            card('Data Source', datasource),
            card('Manipulations', manipulationsMenu),
        );
    }
}

let card = (name, content) => {
    return m('div',
        {
            style: {
                'border-radius': '5px',
                'box-shadow': '1px 1px 4px rgba(0, 0, 0, 0.4)',
                margin: '1em',
                padding: '1em',
                'background-color': common.colors.menu,
            }
        },
        m('h4[style=margin:.75em]', name),
        content
    )
};


async function uploadDataset() {

    if (datasetPreferences.upload.name.length === 0) return;
    if (datasetPreferences.upload.files.length === 0) return;
    let body = new FormData();
    body.append('metadata', JSON.stringify(Object.assign({}, datasetPreferences.upload, {files: undefined})));
    datasetPreferences.upload.files.forEach(file => body.append('files', file));

    // initial upload
    let response = await m.request({
        method: "POST",
        url: "user-workspaces/upload-dataset",
        body,
    });


    if (response.success) {
        location.reload();  // Restart!  Should load the new dataset
        return;
    } else {
        // clear files list
        // MS: commented this out... if it fails, shouldn't we keep the state so the user can fix it?
        // datasetPreferences.upload.files = [];
    }

    console.log('Upload dataset response: ' + response.message);
    uploadStatus = response.message;
    m.redraw();
}

// menu text
export let uploadStatus;

export let datasetPreferences = {
    datasourceMode: 'Current',
    datasetSearch: '',  // 'Ethiopia',
    upload: {
        name: '',
        files: []
    },
    presets: [],
    reportMore: {}
};
window.datasetPreferences = datasetPreferences;
