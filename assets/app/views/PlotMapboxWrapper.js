import m from "mithril";
import TwoPanel from "../../common/views/TwoPanel";
import PlotMapboxEditor from "./PlotMapboxEditor";
import PlotMapboxQuery from "./PlotMapboxQuery";

export default class PlotMapboxWrapper {
    view({attrs}) {

        let {configuration, getData, abstractQuery, summaries, nominals, sampleSize, variablesInitial} = attrs;

        let plot;
        if (configuration) {
            // 5px margin keeps the drag bar visible
            plot = m('div[style=margin-left:5px;height:100%]', m(PlotMapboxQuery, {
                getData,
                configuration,
                abstractQuery,
                summaries,
                sampleSize,
                variablesInitial
            }))
        }

        return m(TwoPanel, {
            left: m(PlotMapboxEditor, {
                configuration,
                variables: Object.keys(summaries)
            }),
            right: plot
        })
    }
}