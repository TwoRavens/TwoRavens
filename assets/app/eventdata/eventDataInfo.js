import * as eventdata from './eventdata';



/*
 * Show EventData Info
 */
export let getModalEventDataInfo = () => {

  return eventdata.isEvtDataInfoWindowOpen && m(ModalVanilla, {
      id: "modalEventDataInfo",
      setDisplay: () => {
        eventdata.setEvtDataInfoWindowOpen(false);
      },
    },
    // Row 1 - info
    m('div', {'class': 'row'},
      m('div', {'class': 'col-sm'},
        [
          m('h3', {}, 'Basic Information'),
          m('hr'),
          m('p', [
              m('b', 'Workspace Id: '),
              m('span', 'some span info')
            ]),
            m('p', [
                m('b', 'Workspace Name: '),
                m('span', 'some workspace name')
              ]),
          m('hr'),
          m('div', [
              m('p', [
                m('b', 'eventdata.aggregationStaged: '),
                m('span', `${eventdata.aggregationStaged}`)
              ]),
              m('p', [
                m('b', 'eventdata.isEvtDataInfoWindowOpen: '),
                m('span', `${eventdata.isEvtDataInfoWindowOpen}`)
              ]),
              m('p', [
                m('b', 'eventdata.totalSubsetRecords: '),
                m('span', `${eventdata.totalSubsetRecords}`)
              ]),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.alignmentLog: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.alignmentLog, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.preferencesLog: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.preferencesLog, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.variablesLog: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.variablesLog, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.subsetPreferences: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.subsetPreferences, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.Manipulations: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.manipulations, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'looseSteps: '),
              m('div',
                m('pre', `${JSON.stringify(looseSteps, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.subsetData: '),
              m('div',
                m('pre', `${JSON.stringify(eventdata.subsetData, null, 4)}`)
              ),
            ]),
          m('hr'),
          m('div', [
              m('b', 'eventdata.genericMetadata'),
              m('p', {}, 'All available eventdata datasets and type formats'),
              m('div',
                m('pre', `${JSON.stringify(eventdata.genericMetadata, null, 4)}`)
              ),
            ]),
        ]
      ),
    ),
    // Row 2 - info
    m('div', {'class': 'row'},
      m('div', {'class': 'col-sm text-left'},
        // Close
        m(ButtonPlain, {
          id: 'btnCloseModalEventDataInfo',
          class: 'btn-sm btn-primary',
          onclick: _ => {
            eventdata.setEvtDataInfoWindowOpen(false);}
          },
          'Close'),
        )
      )
  ) // end: ModalVanilla
} // end: modalBasicInfo
