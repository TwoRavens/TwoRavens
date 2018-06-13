import m from 'mithril';
import {grayColor} from "../../../common/common";
import {currentTab, showSelected, waitForQuery} from "../subsets/Actor";
import TextField from '../../../common/views/TextField';


export default class MonadSelection {
    view(vnode) {
        let {mode, subsetName, data, preferences, metadata, formatting} = vnode.attrs;

        let aggregationOffset = (mode === 'subset') ? 0 : 25;
        return ([
                m(`.actorLeft#allActors`, {style: {height: `calc(100% - ${aggregationOffset}px)`}},
                    [
                        m(TextField, {
                            placeholder: `Search ${currentTab} actors`,
                            oninput: (value) => preferences['search'] = value
                        }),
                        data[preferences['current_tab']]['source'].slice(100), // TODO map check construction
                        m(`.actorFullList#searchListActors`, {
                            style: Object.assign({"text-align": "left"},
                                waitForQuery && {'pointer-events': 'none', 'background': grayColor})
                        })
                    ]
                ),
                m(`.actorRight[id='actorRight']`, {style: {height: `calc(100% - ${aggregationOffset}px)`}},
                    [
                        m(`button.btn.btn-default.clearActorBtn[data-toggle='tooltip'][id='clearAllActors'][title='Clears search text and filters'][type='button']`,
                            "Clear All Filters"
                        ),
                        m(`.actorFilterList#actorFilter`, {style: {"text-align": "left"}},
                            [
                                m(`label.actorShowSelectedLbl.actorChkLbl[data-toggle='tooltip']`, {
                                        'data-original-title': `Show selected ${currentTab}s`
                                    },
                                    [
                                        m("input.actorChk.actorShowSelected#actorShowSelected[name='actorShowSelected'][type='checkbox'][value='show']",
                                            {
                                                checked: showSelectedCheck,
                                                onchange: m.withAttr('checked', showSelected)
                                            }), "Show Selected"
                                    ]
                                ),
                                m(".separator"),
                                m("button.filterExpand#entityActorExpand[value='expand']",
                                    ((dataset['subsets'] || {})[selectedCanvas] || {})['format'] === 'icews' && {style: {display: 'none'}}),
                                m("label.actorHead4#entityActor[for='entityActorExpand']",
                                    ((dataset['subsets'] || {})[selectedCanvas] || {})['format'] === 'icews' && {style: {display: 'none'}},
                                    m("b", "Entity")
                                ),
                                m(".filterContainer#wrapEntityActor",
                                    [
                                        m("button.filterExpand[id='orgActorExpand'][value='expand']"),
                                        m("label.actorChkLbl",
                                            [
                                                m("input.actorChk.allCheck#actorOrgAllCheck[name='actorOrgAllCheck'][type='checkbox'][value='organizations']"),
                                                "Organization"
                                            ]
                                        ),
                                        m(".filterContainer[id='orgActorList']", {style: {"padding-left": "30px"}}),
                                        m(".separator"),
                                        m("button.filterExpand#countryActorExpand[value='expand']"),
                                        m("label.actorChkLbl",
                                            [
                                                m("input.actorChk.allCheck#actorCountryAllCheck[name='actorCountryAllCheck'][type='checkbox'][value='countries']"),
                                                "Country"
                                            ]
                                        ),
                                        m(".filterContainer[id='countryActorList']", {style: {"padding-left": "30px"}})
                                    ]
                                ),
                                m(".separator"),
                                m("button.filterExpand[id='roleActorExpand'][value='expand']"),
                                m("label.actorHead4#roleActors[for='roleActorExpand']",
                                    m("b", "Role")
                                ),
                                m(".filterContainer[id='roleActorList']"),
                                m(".separator"),
                                m("button.filterExpand#attributeActorExpand[value='expand']"),
                                m("label.actorHead4#attributeActors[for='attributeActorExpand']",
                                    m("b", "Attribute")
                                ),
                                m(".filterContainer#attributeActorList")
                            ]
                        )
                    ]
                )
            ]
        );
    }
}