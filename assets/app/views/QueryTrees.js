import m from 'mithril';
// render manipulation pipeline steps into interactive trees

import $ from 'jquery';

import * as queryMongo from "../manipulations/queryMongo";
import * as manipulate from "../manipulations/manipulate";

import * as eventdata from "../eventdata/eventdata";
import {alertError} from "../app";
import TreeRender from "./TreeRender";

// I'm being lazy here, the state between trees is shared globally.
// If two trees share the same id on a node, then opening/closing will act on both
let treeState = {};


export class TreeVariables {
    view() {
        return m(TreeRender, {
            data: [...eventdata.selectedVariables, ...eventdata.selectedConstructedVariables].map(element => ({
                name: element,
                cancellable: false,
                show_op: false
            })),
            state: treeState,
            callbacks: {
                cancel: datum => eventdata.selectedVariables.splice(eventdata.selectedVariables.indexOf(datum.name), 1)
            }
        })
    }
}

export class TreeAugment {
    buildTreeData(step) {
        return "summary" in step ? [
            {
                id: 'augment dataset name',
                name: 'Join dataset name: ' + step.summary.name,
                cancellable: false,
                show_op: false
            },
            // {
            //     id: 'exact match',
            //     name: 'Exact match: ' + step.exact_match,
            //     cancellable: false,
            //     show_op: false
            // },
            {
                id: 'source',
                name: 'Data source: ' + step.source,
                cancellable: false,
                show_op: false
            },
            step.source === 'NYU' && {
                id: 'join pairs',
                name: 'Join pairs',
                cancellable: false,
                show_op: false,
                children: step.summary.joinPairs.map(pair => ({
                    id: 'join pair ' + JSON.stringify(pair),
                    name: JSON.stringify(pair),
                    cancellable: false,
                    show_op: false
                }))
            }
        ] : []
    }

    view({attrs}) {
        let {step, editable} = attrs;

        return m(TreeRender, {
            data: this.buildTreeData(step, editable),
            state: treeState
        });
    }
}

export class TreeTransform {
    buildTreeData(step, editable) {
        return [
            ...step.transforms.map(transform => ({
                id: transform.name,
                name: transform.name + ' = ' + transform.equation,
                cancellable: editable,
                show_op: false
            })),
            ...step.expansions.map((expansion, i) => {
                let {variables, numberTerms} = expansion;
                return {
                    id: 'Expansion ' + i,
                    name: `Expansion ${i}: ${numberTerms} terms`,
                    cancellable: editable,
                    show_op: false,
                    children: Object.keys(variables).map(variable => ({
                        id: name + variable,
                        name: `${variable}: ${variables[variable].type}`,
                        cancellable: false,
                        show_op: false
                    }))
                }
            }),
            ...step.binnings.map((binning, i) => {
                let {name, variableIndicator, binningType, partitions} = binning;
                return {
                    id: 'Binning ' + i,
                    name: `Binning ${i}: ${name}`,
                    cancellable: editable,
                    show_op: false,
                    children: [
                        {
                            id: 'Binning ' + i + ' indicator',
                            name: 'Indicator: ' + variableIndicator,
                            cancellable: false, show_op: false
                        },
                        {
                            id: 'Binning ' + i + ' type',
                            name: 'Binning type: ' + binningType,
                            cancellable: false, show_op: false
                        },
                        {
                            id: 'Binning ' + i + ' partitions',
                            name: 'Partitions: ' + partitions.length,
                            cancellable: false, show_op: false,
                            children: partitions.map((partition, j) => ({
                                id: 'Binnning ' + i + ' partition ' + j,
                                name: partition,
                                cancellable: false, show_op: false
                            }))
                        }

                    ]
                }
            }),
            ...step.manual.map((manual, i) => {
                let {name, variableIndicator, variableDefault, indicators, values} = manual;
                return {
                    id: 'Manual ' + i,
                    name: `Manual ${i}: ${name}`,
                    cancellable: editable,
                    show_op: false,
                    children: [
                        {
                            id: 'Manual ' + i + ' indicator',
                            name: 'Indicator: ' + variableIndicator,
                            cancellable: false, show_op: false
                        },
                        {
                            id: 'Default value',
                            name: 'Default: ' + variableDefault,
                            cancellable: false, show_op: false
                        },
                        {
                            id: 'Manual ' + i + ' lookups',
                            name: 'Labels: ' + indicators.length,
                            cancellable: false, show_op: false,
                            children: indicators.map((key, j) => ({
                                id: 'Manual ' + i + ' lookups ' + j,
                                name: `${key} → ${values[j]}`,
                                cancellable: false, show_op: false
                            }))
                        }
                    ]
                }
            })
        ];
    }

    view({attrs}) {
        let {step, editable} = attrs;

        return m(TreeRender, {
            data: this.buildTreeData(step, editable),
            state: treeState,
            callbacks: {
                cancel: datum => {
                    step.transforms.splice(step.transforms.findIndex(transformation => transformation.name === datum.id), 1);
                    step.expansions.splice(step.expansions.findIndex(expansion => expansion.name === datum.id), 1);
                    step.manual.splice(step.manual.findIndex(manual => manual.name === datum.id), 1);

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                }
            }
        });
    }
}

let datumSource = undefined;
let dataSource = undefined;

export class TreeSubset {
    selectAll(subsetTree, abstractQuery, state) {
        if (Array.isArray(abstractQuery)) abstractQuery.forEach(element => this.selectAll(subsetTree, element, state));
        if (typeof abstractQuery === 'object' && 'id' in abstractQuery) {
            const node = subsetTree.tree("getNodeById", abstractQuery.id);
            if (!node) return;
            state ? subsetTree.tree("addToSelection", node) : subsetTree.tree('removeFromSelection', node);
            if ('children' in abstractQuery) this.selectAll(subsetTree, abstractQuery.children, state);
        }
    }

    view({attrs}) {

        let {step, isQuery, editable} = attrs;
        let data = isQuery ? [{
            name: 'Query ' + step.id,
            id: step.id + '-root',
            children: step.abstractQuery,
            type: 'query'
        }] : step.abstractQuery;


        return m(TreeRender, {
            data,
            state: treeState,
            callbacks: {
                click: datum => {
                    if (datum.name === 'Custom Subset') {
                        eventdata.canvasPreferences['Custom'] = eventdata.canvasPreferences['Custom'] || {};
                        eventdata.canvasPreferences['Custom']['text'] = JSON.stringify(datum.custom, null, '\t');
                        eventdata.canvasRedraw['Custom'] = true;
                        eventdata.setSelectedCanvas("Custom");
                    }
                },
                dblclick: datum => {
                    if (IS_EVENTDATA_DOMAIN) {
                        let tempQuery = queryMongo.buildSubset([datum]);
                        if ($.isEmptyObject(tempQuery)) {
                            alertError("\"" + datum.name + "\" is too specific to parse into a query.");
                        } else {
                            eventdata.canvasPreferences['Custom'] = eventdata.canvasPreferences['Custom'] || {};
                            eventdata.canvasPreferences['Custom']['text'] = JSON.stringify(tempQuery, null, '\t');
                            eventdata.canvasRedraw['Custom'] = true;
                            eventdata.setSelectedCanvas("Custom");
                        }
                    }
                },
                draggable: datum => {
                    if (!editable) return false;

                    // Cannot move nodes in uneditable queries
                    if ('editable' in datum && !datum.editable) return false;

                    // Actor nodes and links may be moved
                    if (['link', 'node'].includes(datum.subset)) return true;

                    // Subset and Group may be moved
                    return (['rule', 'group'].includes(datum.type));
                },
                dragover(datum, _, e) {
                    let position = 'inside';

                    if (e.offsetY <= 5) position = 'before';
                    if (e.offsetY >= e.target.clientHeight - 5) position = 'after';

                    let canMove = (moved_node, target_node) => {
                        if (moved_node === target_node) return false;

                        // Cannot move to uneditable queries
                        if ('editable' in target_node && !target_node.editable) return false;

                        if (moved_node.subset === 'link') return ['before', 'after'].includes(position) && target_node.subset === 'link';
                        if (moved_node.subset === 'node') return ['before', 'after'].includes(position) && target_node.subset === 'node';

                        // Categories may be reordered or swapped between similar subsets
                        if (['categorical', 'categorical_grouped'].indexOf(moved_node.type) !== -1) {
                            return ['before', 'after'].includes(position) && target_node.parent.name === moved_node.parent.name;
                        }
                        // Rules may be moved next to another rule or grouping
                        if (['before', 'after'].includes(position) && (target_node.type === 'rule' || target_node.type === 'group')) {
                            return true;
                        }
                        // Rules may be moved inside a group or root
                        if ((position === 'inside') && (target_node.name.indexOf('Subsets') !== -1 || target_node.type === 'group')) {
                            return true;
                        }
                        return false;
                    };

                    e.target.style.border = '3px solid transparent';

                    if (canMove(datumSource, datum)) {
                        e.preventDefault();
                        let border = '3px solid black';

                        if (position === 'before') {
                            e.target.style.borderBottom = '';
                            e.target.style.border = '3px solid transparent';
                            e.target.style.borderTop = border;
                        }
                        if (position === 'inside') {
                            e.target.style.borderTop = '';
                            e.target.style.borderBottom = '';
                            e.target.style.border = border;
                        }
                        if (position === 'after') {
                            e.target.style.borderTop = '';
                            e.target.style.border = '3px solid transparent';
                            e.target.style.borderBottom = border;
                        }

                    }

                },
                dragleave(datum, data, e) {
                    e.target.style.border = '3px solid transparent';
                },
                dragstart(datum, data) {
                    datumSource = datum; // child
                    dataSource = data; // parent
                },
                dragend() {
                    datumSource = undefined;
                    dataSource = undefined;
                },
                drop(datumTarget, dataTarget, e) {
                    e.target.style.border = '3px solid transparent';

                    let position = 'inside';
                    if (e.offsetY <= 5) position = 'before';
                    if (e.offsetY >= e.target.clientHeight - 5) position = 'after';

                    dataSource.splice(dataSource.indexOf(datumSource), 1);
                    if (position === 'inside') datumTarget.children.unshift(datumSource);
                    if (position === 'before') dataTarget.splice(dataTarget.indexOf(datumTarget), 0, datumSource);
                    if (position === 'after') dataTarget.splice(dataTarget.indexOf(datumTarget) + 1, 0, datumSource);

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                },
                logical: datum => {
                    if (isQuery) return;
                    if (datum.editable !== false)
                        datum.operation = datum.operation === 'and' ? 'or' : 'and';

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                },
                negate: datum => {
                    if (isQuery) return;
                    if (datum.editable !== false) datum.negate = !datum.negate;

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                },
                cancel: (datum, data) => {
                    if (datum.type === 'query' && !confirm("You are deleting a query. This will return your subsetting to an earlier state."))
                        return;

                    data.splice(data.indexOf(datum), 1);

                    let purgeTree = tree => {
                        tree.forEach((child, i) => {
                            if (!child.children) return;
                            purgeTree(child.children);
                            if (child.children.length === 0)
                                tree.splice(i, 1);
                        })
                    };
                    purgeTree(step.abstractQuery);

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);

                    if (IS_EVENTDATA_DOMAIN && datum.type === 'query') {
                        eventdata.manipulations.splice(eventdata.manipulations.indexOf(step), 1);
                        let newMenu = {
                            type: 'menu',
                            name: eventdata.selectedSubsetName,
                            metadata: eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName],
                            preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName]
                        };
                        eventdata.loadMenuEventData(eventdata.manipulations, newMenu, {recount: true}).then(() => {
                            // clear all subset data. Note this is intentionally mutating the object, not rebinding it
                            Object.keys(eventdata.subsetData)
                                .filter(subset => subset !== eventdata.selectedSubsetName)
                                .forEach(subset => delete eventdata.subsetData[subset]);
                        }).then(m.redraw);
                    }
                }
            }
        });
    }
}

function disableEditRecursive(node) {
    node.editable = false;
    node.cancellable = false;
    if ('children' in node) {
        for (let child of node.children) {
            child = disableEditRecursive(child);
        }
    }
    return node
}

// this is reused for both unit and event measures (accumulations)
export class TreeAggregate {
    view(vnode) {
        let {editable, data} = vnode.attrs;

        return m(TreeRender, {
            data,
            state: treeState,
            callbacks: {
                cancel: (datum, parentData) => {
                    if (!editable) return;

                    parentData.splice(parentData.findIndex(entry => entry.id === datum.id), 1);

                    let purgeTree = tree => {
                        tree.forEach((child, i) => {
                            if (!child.children) return;
                            purgeTree(child.children);
                            if (child.children.length === 0)
                                tree.splice(i, 1);
                        })
                    };
                    purgeTree(data);

                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                }
            }
        })
    }
}

export class TreeImputation {
    buildTreeData(step, editable) {
        return step.imputations.map((imputation, i) => ({
            id: imputation.id,
            name: `${i + 1}: ${imputation.imputationMode} ${imputation.nullValues}`,
            cancellable: editable,
            show_op: false,
            children: imputation.imputationMode === 'Delete' ? [
                {
                    id: imputation.id + 'Variables',
                    name: imputation.variables.size + ' Variables',
                    children: [...imputation.variables].map(column => ({
                        id: imputation.id + column,
                        name: column,
                        show_op: false, cancellable: false
                    })),
                    show_op: false, cancellable: false
                }
            ] : [
                {
                    id: imputation.id + 'Variables',
                    name: Object.keys(imputation.replacementValues).length + ' Variables',
                    children: Object.keys(imputation.replacementValues).map(column => ({
                        id: imputation.id + column,
                        name: `${column}: ${imputation.replacementValues[column]}`,
                        show_op: false, cancellable: false
                    })),
                    show_op: false, cancellable: false
                },
                {
                    id: imputation.id + 'ReplacementMode',
                    name: 'Replacement Mode: ' + imputation.replacementMode,
                    show_op: false, cancellable: false
                }
            ]
        }))
    }

    view({attrs}) {
        let {step, editable} = attrs;

        return m(TreeRender, {
            data: this.buildTreeData(step, editable),
            state: treeState,
            callbacks: {
                cancel: datum => {
                    if (!editable) return;
                    step.imputations
                        .splice(step.imputations.findIndex(imputation => imputation.name === datum.name), 1);
                    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
                }
            }
        });
    }
}