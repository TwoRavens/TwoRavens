import m from 'mithril';
// render manipulation pipeline steps into interactive trees

import $ from 'jquery';

import * as queryMongo from "../manipulations/queryMongo";
import * as manipulate from "../manipulations/manipulate";

import * as eventdata from "../eventdata/eventdata";
import {alertError, alertLog, manipulations} from "../app";
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

export class TreeTransform {
    buildTreeData(pipelineId, step, editable) {
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
        let {pipelineId, step, editable} = attrs;

        return m(TreeRender, {
            data: this.buildTreeData(pipelineId, step, editable),
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

        let {pipelineId, step, isQuery, editable} = attrs;
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
                dragover: (datum, _, e) => {
                    let canMove = (moved_node, target_node) => {
                        // TODO: compute based on e
                        let position = 'inside';

                        // Cannot move to uneditable queries
                        if ('editable' in target_node && !target_node.editable) return false;

                        if (moved_node.subset === 'link') return position === 'after' && target_node.subset === 'link';
                        if (moved_node.subset === 'node') return position === 'after' && target_node.subset === 'node';

                        // Categories may be reordered or swapped between similar subsets
                        if (['categorical', 'categorical_grouped'].indexOf(moved_node.type) !== -1) {
                            return position === 'after' && target_node.parent.name === moved_node.parent.name;
                        }
                        // Rules may be moved next to another rule or grouping
                        if (position === 'after' && (target_node.type === 'rule' || target_node.type === 'group')) {
                            return true;
                        }
                        // Rules may be moved inside a group or root
                        if ((position === 'inside') && (target_node.name.indexOf('Subsets') !== -1 || target_node.type === 'group')) {
                            return true;
                        }
                        return false;
                    };
                    if (canMove(this.dragSource, datum))
                        e.preventDefault()
                },
                dragstart: datum => this.dragSource = datum,
                dragend: () => this.dragSource = undefined,
                drop: (datum, data, e) => {
                    let position = 'inside';

                    this.dragSource.data.splice(this.dragSource.data.indexOf(this.dragSource.datum), 1);
                    if (position === 'inside') datum.children.unshift(this.dragSource.datum);
                    if (position === 'after') data.splice(data.indexOf(datum), 0, this.dragSource.datum);
                    if (position === 'before') data.splice(data.indexOf(datum) + 1, 0, this.dragSource.datum);

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
                        manipulations[pipelineId].splice(manipulations[pipelineId].indexOf(step), 1);
                        let newMenu = {
                            type: 'menu',
                            name: eventdata.selectedSubsetName,
                            metadata: eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName],
                            preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName]
                        };
                        eventdata.loadMenuEventData(manipulations[pipelineId], newMenu, {recount: true}).then(() => {
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
                    parentData.splice(parentData.findIndex(datum), 1);

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
    buildTreeData(pipelineId, step, editable) {
        return step.imputations.map((imputation, i) => ({
            id: imputation.id,
            name: `${i + 1}: ${imputation.imputationMode} ${imputation.nullValue}`,
            cancellable: editable,
            show_op: false,
            children: [
                {
                    id: imputation.id + 'NullValueType',
                    name: 'Null Value Type: ' + imputation.nullValueType,
                    show_op: false, cancellable: false
                }
            ].concat(imputation.imputationMode === 'Delete' ? [
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
            ].concat(imputation.replacementMode === 'Custom' ? [
                {
                    id: imputation.id + 'ReplacementType',
                    name: 'Replacement Type: ' + imputation.customValueType,
                    show_op: false, cancellable: false
                }
            ] : []))
        }))
    }

    view({attrs}) {
        let {pipelineId, step, editable} = attrs;

        return m(TreeRender, {
            data: this.buildTreeData(pipelineId, step, editable),
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