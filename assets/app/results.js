import m from 'mithril';

import Panel from './views/Panel';
import Button, {when} from './views/PanelButton';
import Dropdown from '../Common/app/views/Dropdown';
import List from './views/PanelList';
import Search from './views/Search';

export function leftpanel(pipelines) {
    return m(
        Panel,
        {side: 'left',
         title: 'Data Selection',
         buttons: [
             m(Button,
               {id: 'pipelines',
                classes: 'active',
                title: 'Click pipeline name to add or remove the pipeline pebble from the modeling space.'},
               'Pipelines')]},
        m(`#tab1[style=display: ${when('left', 'tab1')}; padding: 0 8px; text-align: center]`,
          m(Dropdown, {style: 'margin-bottom: 0.5em; width: 100%', items: ['Problem 1']}),
          m(List, {items: pipelines, content: x => x, title: 'Info'})));
}
