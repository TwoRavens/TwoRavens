

export let getModalGenericMetadata = () => {

    rightpanel(mode) {

        if (mode === 'home') {
            common.setPanelOcclusion('left', window.innerWidth < 1200 ? `calc(${common.panelMargin}*2)` : '250px');
            common.setPanelOcclusion('right', window.innerWidth < 1200 ? `calc(${common.panelMargin}*2)` : '250px');
            return;
        }

        return m(Panel, {
                id: 'rightPanelMenu',
                side: 'right',
                label: 'Query Summary',
                hover: window.innerWidth < 1200,
                width: '250px',
                attrsAll: {
                    style: {
                        // subtract header, the two margins, scrollbar, table, and footer
                        height: `calc(100% - ${common.heightHeader} - 2*${common.panelMargin} - ${common.canvasScroll['horizontal'] ? common.scrollbarWidth : '0px'} - ${eventdata.selectedMode === 'aggregate' ? eventdata.tableHeight : '0px'} - ${common.heightFooter})`
                    }
                }
            },
            m(MenuHeaders, {
                id: 'querySummaryMenu',
                attrsAll: {style: {height: 'calc(100% - 85px)', overflow: 'auto'}},
                sections: [
                    {
                        value: 'Subsets',
                        contents: (eventdata.manipulations.length + (eventdata.selectedMode === 'subset' ? looseSteps['pendingSubset'].abstractQuery.length : 0)) ? [
                            ...eventdata.manipulations.map(step => m(TreeSubset, {isQuery: true, step, editable: false})),
                            m(TreeSubset, {step: looseSteps['pendingSubset'], editable: true})
                        ] : [
                            m('div[style=font-style:italic]', 'Match all records'),
                            looseSteps['pendingSubset'].abstractQuery.length !== 0 && m('div[style=font-style:italic]', 'Some pending constraints are hidden. Update from subset menu to apply them.')
                        ]
                    },
                    eventdata.selectedMode === 'subset' && {
                        value: 'Variables',
                        contents: (eventdata.selectedVariables.size + eventdata.selectedConstructedVariables.size) // if there are any matches in either normal or constructed variables
                            ? m(TreeVariables)
                            : m('div[style=font-style:italic]', 'Return all Variables')
                    },
                    eventdata.selectedMode === 'aggregate' && {
                        value: 'Unit Measures',
                        contents: looseSteps['eventdataAggregate'].measuresUnit.length
                            ? m(TreeAggregate, {
                                data: looseSteps['eventdataAggregate'].measuresUnit,
                                editable: true
                            })
                            : m('div[style=font-style:italic]', 'No unit measures')
                    },
                    eventdata.selectedMode === 'aggregate' && {
                        value: 'Event Measures',
                        contents: looseSteps['eventdataAggregate'].measuresAccum.length
                            ? m(TreeAggregate, {
                                data: looseSteps['eventdataAggregate'].measuresAccum,
                                editable: true
                            })
                            : m('div[style=font-style:italic]', 'An event measure is required')
                    }
                ]
            }),
            m("#rightpanelButtonBar", {
                    style: {
                        width: "calc(100% - 25px)",
                        "position": "absolute",
                        "bottom": '5px'
                    }
                },
                eventdata.selectedMode === 'subset' && m(Button, {
                    id: 'btnAddGroup',
                    style: {float: 'left'},
                    onclick: () => queryAbstract.addGroup(looseSteps['pendingSubset'])
                }, 'Group'),

                // -------------------------
                // End: Update Button
                // -------------------------
                m(Button, {
                    id: 'btnUpdate',
                    class: 'ladda-button',
                    'data-style': 'zoom-in',
                    'data-spinner-color': '#818181',
                    style: {float: 'right'},
                    disabled: eventdata.selectedMode === 'subset'
                        ? looseSteps['pendingSubset'].abstractQuery.length === 0
                        : !eventdata.aggregationStaged || looseSteps['eventdataAggregate'].measuresAccum.length === 0,
                    onclick: async () => {
                        eventdata.setLaddaSpinner('btnUpdate', true);
                        await {'subset': eventdata.submitSubset,
                               'aggregate': eventdata.submitAggregation}[eventdata.selectedMode]();

                        eventdata.setLaddaSpinner('btnUpdate', false);

                        // weird hack, unsetting ladda unsets the disabled attribute. But it should still be disabled
                        if (eventdata.selectedMode === 'subset'){
                          document.getElementById('btnUpdate').disabled =  looseSteps['pendingSubset'].abstractQuery.length === 0;
                        }
                    }
                }, 'Update')
                // -------------------------
                // End: Update Button
                // -------------------------
            ))

    }
