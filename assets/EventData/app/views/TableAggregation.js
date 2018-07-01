import m from 'mithril';
import * as app from '../app';
import {heightFooter} from "../../../common/common";
import Table from '../../../common/views/Table';

export default class TableAggregation {
    view(vnode) {
        let {mode} = vnode.attrs;

        let tableData = app.aggregationData;

        // reformat dates to strings
        for (let header of app.aggregationHeadersUnit) {
            if (app.genericMetadata[app.selectedDataset]['subsets'][header]['type'] === 'date') {
                tableData = app.aggregationData
                    .filter(entry => header in entry) // ignore entries with undefined dates
                    .map(entry => {
                        // because YYYY-MM-DD format rocks
                        return Object.assign({}, entry, {[header]: entry[header].toISOString().slice(0, 10)})
                    });
            }
        }

        return mode === 'aggregate' && m("[id='aggregDataOutput']", {
                style: {
                    "position": "fixed",
                    "bottom": heightFooter,
                    "height": app.tableHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto"
                }
            },
            app.unitMeasure && m(Table, {
                headers: [...app.aggregationHeadersUnit, ...app.aggregationHeadersEvent],
                data: tableData
            })
        );
    }
}
