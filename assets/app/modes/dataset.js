/*
  UI for TwoRavens Dataset Mode including tabs for:
    Current | Presets (Available Datasets) | Upload
*/
import m from 'mithril';

import * as common from "../../common/common";
import ButtonRadio from "../../common/views/ButtonRadio";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";

import * as app from "../app";
import * as explore from "./explore";
import * as manipulate from "../manipulations/manipulate";
import Table from "../../common/views/Table";
import {preformatted} from "../index";
import Paginated from "../../common/views/Paginated";
import MenuHeaders from "../../common/views/MenuHeaders";
import Icon from "../../common/views/Icon";

import * as schema from '../../preprocess-schemas/1-2-0';

let report = false;
let edit = false;
let more = {};

export class CanvasDataset {

  oncreate() {

      this.presetLoadInProgress = false;
      this.presetNameToLoad = null;  // name of preset that is loading
      this.setPresetLoadInProgress = (presetNameOrFalse) => {
          if (presetNameOrFalse === false){
            this.presetLoadInProgress = false;
            this.presetNameToLoad = null;
          } else{
            this.presetLoadInProgress = true;
            this.presetNameToLoad = presetNameOrFalse;
          }
      }

      this.getPresetName = (pName) => {

          this.presetNameToLoad === preset.name ? '** Loading **' : (app.workspace.d3m_config.name === preset.name ? 'Loaded' : 'Load' )

          console.log('getPresetName');
          if (pname === this.presetNameToLoad){
            return '** Loading **';
          } else if (app.workspace.d3m_config.name === pName){
            return 'Loaded';
          } else {
            return 'Load';
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
    view(vnode) {
        if (manipulate.constraintMenu) return;

        // workspace required for this view
        if (!app.workspace) return;

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
                sections: [
                    {value: 'Current', title: 'information about currently loaded dataset'},
                    {value: 'Presets', title: 'pick from previously uploaded datasets'},
                    {value: 'Upload', title: 'upload a new dataset from your computer'}
                ]
            }),

            // ------------------------------------------------
            // start: "Current" Section
            //    - display the datasetDoc.about section
            // ------------------------------------------------
            datasetPreferences.datasourceMode === 'Current' && app.workspace.datasetDoc && [
                m(Button, {
                    style: {margin: '1em'},
                    onclick: () => window.open('/#!/dataset')
                }, 'Generate Dataset Report'),
                m(Table, {
                    attrsAll: {
                        style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                    },
                    data: Object.entries(app.workspace.datasetDoc.about)
                        .map(row => [row[0], preformatted(row[1])])
                })
            ],
            // ------------------------------------------------
            // end: "Current" Section
            // ------------------------------------------------
            // ------------------------------------------------
            // start: "Upload" custom data
            // ------------------------------------------------
            datasetPreferences.datasourceMode === 'Upload' && m('div', {style: {'margin-top': '1em'}},
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
                    attrsAll: {
                        style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                    },
                    data: datasetPreferences.upload.files.map(file => ({
                        name: file.name,
                        modified: file.lastModifiedDate && file.lastModifiedDate.toLocaleString(),
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
                m('div', {style: {display: 'inline-block'}}, uploadStatus)
            ),
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
                        attrsAll: {
                            style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                        },
                        // headers: ['ID', 'name', ''],
                        data: data.map(preset => [
                            // preset.id,
                            preset.name,
                            m(Button, {
                                // disable the current dataset
                                disabled: app.workspace.d3m_config.name === preset.name || this.presetLoadInProgress,
                                // switch datasets
                                onclick: () => {
                                  this.setPresetLoadInProgress(preset.name);
                                  m.request(`user-workspaces/select-dataset-json-resp/${preset.id}`).then(response => {
                                    if (response.success){
                                        location.reload();  // Restart!  Should load the new dataset
                                    }else{
                                        console.log('Error loading new dataset!');
                                        this.setPresetLoadInProgress(false);
                                    }
                                })}
                            },
                            // Set button text
                            this.presetNameToLoad === preset.name ? '** Loading **' : (app.workspace.d3m_config.name === preset.name ? 'Loaded' : 'Load' ))
                        ])
                    }),
                    limit: 10,
                    page: datasetPreferences.presetPage,
                    setPage: index => datasetPreferences.presetPage = index
                })
            ]
            // ------------------------------------------------
            // end: "Presets" section
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
                        editable: true
                    })
                }
            ]
        });

	let variableKeys = ['variableName', 'plotValues', 'pdfPlotType', 'pdfPlotX', 'pdfPlotY', 'cdfPlotType', 'cdfPlotX', 'cdfPlotY', 'name'];
	let setDatasetSum = (_variable, attr, value) => {
	    if (app.datasetSummary[attr] === value) return;

	    app.datasetSummary[attr] = value;
	    app.setDatasetSummary(app.datasetSummary, true);
	};
	let setVarSum = (variable, attr, value) => {
	    if (app.variableSummaries[variable][attr] === value) return;

	    app.setVariableSummary(variable, attr, value);
	};

	if (report) {
	    let props = schema.properties.variables.patternProperties['.'];
	    let editables = props.editable;
	    let widget = (set, variable, k, v) => {
		let prop = props.properties[k];
		if (prop.type === 'boolean') {
		    return m('select.form-control', {onchange: e => set(variable, k, e.currentTarget.value === 'true'), value: v}, ['true', 'false'].map(x => m('option', x)));
		} else if (prop.enum) {
		    return m('select.form-control', {onchange: e => set(variable, k, e.currentTarget.value), value: v}, prop.enum.map(x => m('option', x)));
		}
		return m('input', {oninput: e => set(variable, k, e.currentTarget.value), value: v});
	    };
	    return m('div', {
		    style: {
			'max-width': '800px',
			'margin': 'auto'
		    }
		},
		m('button.btn.btn-secondary.btn-sm' + (report ? '.active' : ''), {style: 'margin: 1em', onclick: _ => report = !report}, 'report'),
		m('h3', 'Overview',
		    m('button.btn.btn-primary.btn-sm' + (edit ? '.active' : ''), {style: 'margin: 0 1em', onclick: _ => edit = !edit}, 'edit'),
		    m('button.btn.btn-success.btn-sm', {disabled: !(app.datasetSummaryEdited || app.variableSummariesEdited), onclick: _ => app.saveUserWorkspace(true, true)}, 'save')),
		m('table.table.table-sm.table-striped',
		    m('tbody',
			Object.entries(app.datasetSummary)
			    .map(row => m('tr',
				m('td', {style: {width: '1em'}}, row[0]),
				m('td', edit &&
				    schema.properties.dataset.editable.includes(row[0]) ? widget(setDatasetSum, null, row[0], row[1]) : row[1])))
		    )
		),
		m('h3', 'Variables'),
		Object.entries(app.variableSummaries).map(([variable, vals]) => m('div.border', {style: 'margin-bottom: 1em; padding: 1em'},
		    m('h4', variable),
		    m('.row',
		    m('.col',
			m('table.table.table-sm.table-striped',
			    m('tbody',
				Object.entries(vals).filter(x => editables.includes(x[0]))
				    .map(row => m('tr',
					m('td', {style: {width: '1em'}}, row[0]),
					m('td', edit ? widget(setVarSum, variable, row[0], row[1]) : row[1])))
			    )
			)
		    ),
		    m('.col',
			m('table.table.table-sm.table-striped',
			    m('tbody',
				Object.entries(vals).slice(1, 17).filter(x => !editables.includes(x[0]))
				    .map(row => m('tr',
					m('td', {style: {width: '1em'}}, row[0]),
					m('td', row[1])))
			    )
			)
		    ),
		    m('.col',
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
		    m('button.btn.btn-primary.btn-sm', {onclick: _ => more[variable] = !more[variable]}, more[variable] ? 'less' : 'more'),
		    more[variable] && m('table.table.table-sm.table-striped', {style: 'margin-top: 1em'},
			m('tbody',
			    Object.entries(vals).slice(17)
				.filter(row => !variableKeys.includes(row[0]))
				.map(row => m('tr',
				    m('td', {style: {width: '1em'}}, row[0]),
				    m('td', row[1])))
			)
		    ),
	    )));
	}

	return m('div', {
	    style: {
                    'max-width': '800px',
                    'margin': 'auto'
                }
            },
	    m('button.btn.btn-secondary.btn-sm' + (report ? '.active' : ''), {style: 'margin: 1em', onclick: _ => report = !report}, 'report'),
            card('Datasource', datasource),
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
                'background-color': common.menuColor,
            }
        },
        m('h4', name),
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
        data: body,
    });


    if (response.success) {
      location.reload();  // Restart!  Should load the new dataset
      return;
    }else{
      // clear files list
      datasetPreferences.upload.files = [];
    }

    console.log('Upload dataset response: ' + response.message);
    uploadStatus = response.message;
    m.redraw();
}

// menu text
export let uploadStatus;

let datasetPreferences = {
    datasourceMode: 'Current',
    datasetSearch: '',  // 'Ethiopia',
    upload: {
        name: '',
        files: []
    },
    presets: []
};
