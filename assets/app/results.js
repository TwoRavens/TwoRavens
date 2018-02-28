import m from 'mithril';

import Panel from './views/Panel';
import Button, {when} from './views/PanelButton';
import List from './views/PanelList';
import Search from './views/Search';

export function leftpanel(pipelines=[]) {
    return m(
        Panel,
        {side: 'left',
         title: 'Data Selection',
         buttons: [
             m(Button,
               {id: 'btnVariables',
                id2: 'tab1',
                title: 'Click variable name to add or remove the variable pebble from the modeling space.'},
               'Variables')]},
        m(`#tab1[style=display: ${when('left', 'tab1')}; padding: 0 8px; text-align: center]`,
          m(Search, {placeholder: 'Search variables and labels'}),
          m(List, {items: pipelines, title: 'Summary Statistics'})));
}
