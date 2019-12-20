import m from 'mithril';

import * as common from "../../common/common";
import ButtonRadio from "../../common/views/ButtonRadio";
import TextField from "../../common/views/TextField";
import Button from "../../common/views/Button";

import * as app from "../app";
import * as manipulate from "../manipulations/manipulate";
import Table from "../../common/views/Table";
import {preformatted} from "../index";

export class CanvasDataset {
    oninit(vnode) {
        m.request('user-workspaces/list-dataset-choices', {
            method: 'POST',
            body: {}
        }).then(response => {
            if (!response.success) return;
            console.log(response);
            datasetPreferences.presets = response.data;
            m.redraw()
        })
    }
    view(vnode) {
        if (manipulate.constraintMenu) return;

        let datasource = m('div',

            m(ButtonRadio, {
                id: 'ingestModeButtonBar',
                onclick: mode => datasetPreferences.ingestMode = mode,
                activeSection: datasetPreferences.ingestMode,
                sections: [
                    {value: 'Presets', title: 'pick from previously uploaded datasets'},
                    {value: 'Upload', title: 'upload a new dataset from your computer'}
                ]
            }),
            datasetPreferences.ingestMode === 'Upload' && m('div', {style: {'margin-top': '1em'}},
                m('div',
                    m('label[style=display:inline-block;width:100px]', 'Dataset Name'),
                    m('div[style=display:inline-block;max-width:300px]', m(TextField, {
                        id: 'datasetNameTextField',
                        value: datasetPreferences.upload.name,
                        oninput: value => datasetPreferences.upload.name = value
                    }))),
                m(Table, {
                    attrsAll: {
                        style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                    },
                    data: datasetPreferences.upload.files.map(file => ({
                        name: file.name,
                        modified: file.lastModifiedDate.toLocaleString(),
                        size: file.size,
                        type: file.type
                    }))
                }),
                m('label.btn.btn-secondary', {style: {display: 'inline-block', margin: '1em'}}, [
                    m('input', {
                        hidden: true,
                        type: 'file',
                        multiple: true,
                        onchange: e => datasetPreferences.upload.files.push(...Array.from(e.target.files))
                    })
                ], 'Browse'),
                m(Button, {
                    style: {margin: '1em'},
                    onclick: uploadDataset,
                    disabled: datasetPreferences.upload.files.length === 0 || datasetPreferences.upload.name.length === 0
                }, 'Upload'),
                m('div', {style: {display: 'inline-block'}}, uploadStatus)
            ),
            datasetPreferences.ingestMode === 'Presets' && [
                m(Table, {
                    attrsAll: {
                        style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                    },
                    // headers: ['ID', 'name', ''],
                    data: datasetPreferences.presets.map(preset => [
                        // preset.id,
                        preset.name,
                        m(Button, {
                            disabled: app.workspace.d3m_config.name === preset.name,
                            onclick: () => m.request(`user-workspaces/select-dataset-json-resp/${preset.id}`).then(response => {
                                console.log('response dataset selection');
                                console.log(response.message);
                                if (response.success) {
                                  location.reload();  // Restart!  Should load the new dataset
                                }else{
                                  console.log('Error loading new dataset!')
                                }
                            })
                        }, app.workspace.d3m_config.name === preset.name ? 'Loaded' : 'Load')
                    ])
                })
            ]
        );

        let datasetAbout = app.workspace.datasetDoc && [
            m(Button, {
                style: {margin: '1em'},
                onclick: () => window.open('/#!/dataset')
            }, 'Dataset Description'),
            m(Table, {
                attrsAll: {
                    style: {width: 'calc(100% + 2em)', 'margin-left': '-1em'}
                },
                data: Object.entries(app.workspace.datasetDoc.about)
                    .map(row => [row[0], preformatted(row[1])])
            })
        ];

        let manipulations = [
            m(manipulate.PipelineFlowchart, {
                compoundPipeline: app.workspace.raven_config.hardManipulations,
                pipeline: app.workspace.raven_config.hardManipulations,
                editable: true
            })
        ];

        return m('div', {
                style: {
                    'max-width': '800px',
                    'margin': 'auto'
                }
            },
            card('Datasource', datasource),
            card('About', datasetAbout),
            card('Manipulations', manipulations),
        )
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
    ingestMode: 'Presets',
    upload: {
        name: '',
        files: []
    },
    presets: []
};
