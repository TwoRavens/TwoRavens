import * as eventdata from './eventdata';
import Button from "../../common/views/Button";
import ButtonPlain from '../../common/views/ButtonPlain';
import ModalVanilla from "../../common/views/ModalVanilla";
import {looseSteps} from "../app";


/*
*  Variables related to API info window
*/
export let isEvtDataInfoWindowOpen = false;
// Open/close modal window
export let setEvtDataInfoWindowOpen = (boolVal) => isEvtDataInfoWindowOpen = boolVal;


/*
*  Variables related to API info window
*/
export let isGenericMetadataInfoWindowOpen = false;
// Open/close modal window
export let setGenericMetadataInfoWindowOpen = (boolVal) => isGenericMetadataInfoWindowOpen = boolVal;


/*
 * Show GenericMetadata Modal Window
 */
export let getModalGenericMetadata = () => {

  return isGenericMetadataInfoWindowOpen && m(ModalVanilla, {
      id: "modalEventDataInfo",
      setDisplay: () => {
        setGenericMetadataInfoWindowOpen(false);
      },
    },
    // Row 1 - info
    m('div', {'class': 'container-fluid'},
      m('div', {'class': 'row'},
        m('div', [
            m('b', 'eventdata.genericMetadata'),
            m('p', {}, 'All available eventdata datasets and type formats'),
            m('div',
              m('pre', `${JSON.stringify(eventdata.genericMetadata, null, 4)}`)
            ),
          ]),
      )
    ),
    // Row 2 - info
    m('div', {'class': 'row'},
      m('div', {'class': 'col-sm text-left'},
        // Close
        m(ButtonPlain, {
          id: 'btnCloseModalEventDataInfo',
          class: 'btn-sm btn-primary',
          onclick: _ => {
            setGenericMetadataInfoWindowOpen(false);}
          },
          'Close'),
        )
      )
  ) // end: ModalVanilla
} // end: getModalGenericMetadata


/*
 * Show EventData Info
 */
export let getModalEventDataInfo = () => {

  return isEvtDataInfoWindowOpen && m(ModalVanilla, {
      id: "modalEventDataInfo",
      setDisplay: () => {
        setEvtDataInfoWindowOpen(false);
      },
    },
    // Row 1 - info
    m('div', {'class': 'container-fluid'},
      m('div', {'class': 'row'},
        modalCol1(),
        modalCol2(),
      )
    ),
    // Row 2 - info
    m('div', {'class': 'row'},
      m('div', {'class': 'col-sm text-left'},
        // Close
        m(ButtonPlain, {
          id: 'btnCloseModalEventDataInfo',
          class: 'btn-sm btn-primary',
          onclick: _ => {
            setEvtDataInfoWindowOpen(false);}
          },
          'Close'),
        )
      )
  ) // end: ModalVanilla
} // end: modalBasicInfo


let modalCol1 = () => {

    return m('div', {'class': 'col-sm'},
      [
        m('h3', {}, 'Basic Information'),
        m('hr'),
        m('div', [
            m('p', [
              m('b', 'eventdata.aggregationStaged: '),
              m('span', `${eventdata.aggregationStaged}`)
            ]),
            m('p', [
              m('b', 'isEvtDataInfoWindowOpen: '),
              m('span', `${isEvtDataInfoWindowOpen}`)
            ]),
            m('p', [
              m('b', 'eventdata.totalSubsetRecords: '),
              m('span', `${eventdata.totalSubsetRecords}`)
            ]),
          ]),
        m('hr'),
        m('div', [
            m('b', 'eventdata.manipulations: '),
            m('div',
              m('pre', `${JSON.stringify(eventdata.manipulations, null, 4)}`)
            ),
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

      ]
    )
}

let modalCol2 = () => {

    return m('div', {'class': 'col-sm'},
      [
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

      ]
    )
}
