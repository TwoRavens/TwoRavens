import m from 'mithril';
import TextField from '../../common/views/TextField';
import Table from '../../common/views/Table';


export default class PreprocessInfo {

  oncreate() {
      let dataLog = [];
  }

  view(vnode) {
      return [
        m('h3', 'Preprocess Log'),
        m('ul',
          m('li', 'Initial preprocess'),
          m('li', 'Transformation')
        ),
        m(Table, {
            id: 'preprocessInfoTable',
            headers: ["#", "date/time", "description"],
            data: [["3", "10:20am", "transform step"],
                   ["4", "10:10am", "initial preprocess"],],
            attrsCells: {"class": "text-left"},
        }),
        m(TextField, {
            id: 'dataHistory',
            placeholder: 'DataHistory',
            oninput: this.dataLog
        }),
      ]

  }
}
