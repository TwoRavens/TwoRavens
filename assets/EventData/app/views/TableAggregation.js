import m from 'mithril';
import * as agg from '../agg';
import * as app from '../app';
import {heightFooter} from "../../../common/common";
import Table from '../../../common/views/Table';

export default class TableAggregation {
    view(vnode) {
        let {mode} = vnode.attrs;

        let tableData = agg.aggregationData;

        // reformat dates to strings
        for (let header of agg.aggregationHeadersUnit) {
            if (app.genericMetadata[app.selectedDataset]['subsets'][header]['type'] === 'date') {
                tableData = agg.aggregationData
                    .filter(entry => header in entry) // ignore entries with undefined dates
                    .map(entry => {
                        // because YYYY-MM-DD format rocks
                        return Object.assign({}, entry, {[header]: entry[header].toISOString().slice(0, 10)})
                    });
            }
        }

        return m("[id='aggregDataOutput']", {
                style: {
                    "display": mode === 'aggregate' ? 'inline' : 'none',
                    "position": "fixed",
                    "bottom": heightFooter,
                    "height": agg.tableHeight,
                    "width": "100%",
                    "border-top": "1px solid #ADADAD",
                    "overflow-y": "scroll",
                    "overflow-x": "auto"
                }
            },
            agg.unitMeasure && m(Table, {
                headers: [...agg.aggregationHeadersUnit, ...agg.aggregationHeadersEvent],
                data: tableData
            })
        );
    }
}
