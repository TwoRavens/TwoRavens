import m from 'mithril';
// Used to render manipulation pipeline steps into interactive trees
import '../../../node_modules/jqtree/tree.jquery.js';
import '../../../node_modules/jqtree/jqtree.css';
import '../../pkgs/jqtree/jqtree.style.css';

import * as queryMongo from "../manipulations/queryMongo";
import * as queryAbstract from '../manipulations/queryAbstract';
import * as manipulate from "../manipulations/manipulate";

import * as eventdata from "../eventdata/eventdata";
import {looseSteps, manipulations} from "../app";
import {hideFirst} from "../manipulations/queryAbstract";


export class TreeVariables {
    oncreate({dom}) {
        $(dom).tree({
            data: [...eventdata.selectedVariables, ...eventdata.selectedConstructedVariables].map(element => ({
                name: element,
                cancellable: false,
                show_op: false
            })),
            saveState: true,
            dragAndDrop: false,
            autoOpen: true,
            selectable: false
        });
    }

    onupdate({dom}) {
        $(dom).tree('loadData', [...eventdata.selectedVariables, ...eventdata.selectedConstructedVariables].map(element => ({
            name: element,
            cancellable: false,
            show_op: false
        })));
    }

    view() {
        return m('div#variableTree')
    }
}

export class TreeTransform {
    convertToJQTreeFormat(pipelineId, step, editable) {
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
            })
        ];
    }

    oncreate({attrs, dom}) {
        let transformTree = $(dom);
        let {pipelineId, step, editable} = attrs;

        transformTree.tree({
            data: this.convertToJQTreeFormat(pipelineId, step, editable),
            saveState: true,
            dragAndDrop: false,
            autoOpen: false,
            selectable: false,
            onCreateLi: function (node, $li) {
                if (!('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').prepend(buttonDeleteTransform(pipelineId, step.id, node.id));
                }
            }
        });

        transformTree.on(
            'tree.click',
            event => {
                if (event.node.hasChildren()) transformTree.tree('toggle', event.node);
            }
        );
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let {pipelineId, step, editable, redraw, setRedraw} = attrs;
        let transformTree = $(dom);
        if (redraw) {
            setRedraw(false);
            transformTree.tree('destroy');
            this.oncreate({attrs, dom});
            return;
        }
        let state = transformTree.tree('getState');
        transformTree.tree('loadData', this.convertToJQTreeFormat(pipelineId, step, editable));
        transformTree.tree('setState', state);
    }

    view() {
        return m('div#transformTree')
    }
}

function buttonDeleteTransform(pipelineId, step, id) {
    return `<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;margin-top:2px;height:18px' onclick='callbackDeleteTransform("${pipelineId}", "${step}", "${id}")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>`;
}

export class TreeQuery {
    selectAll(subsetTree, abstractQuery, state) {
        if (Array.isArray(abstractQuery)) abstractQuery.forEach(element => this.selectAll(subsetTree, element, state));
        if (typeof abstractQuery === 'object' && 'id' in abstractQuery) {
            const node = subsetTree.tree("getNodeById", abstractQuery.id);
            if (!node) return;
            state ? subsetTree.tree("addToSelection", node) : subsetTree.tree('removeFromSelection', node);
            if ('children' in abstractQuery) this.selectAll(subsetTree, abstractQuery.children, state);
        }
    }

    oncreate({attrs, dom}) {
        // Create the query tree
        let subsetTree = $(dom);

        let {pipelineId, step, isQuery, editable} = attrs;
        this.isQuery = isQuery;
        let data = isQuery
            ? [{
                name: 'Query ' + step.id,
                id: step.id + '-root',
                children: step.abstractQuery,
                type: 'query'
            }]
            : step.abstractQuery;

        subsetTree.tree({
            data,
            saveState: true,
            dragAndDrop: true,
            autoOpen: true,
            selectable: false,

            // Executed for every node and leaf in the tree
            onCreateLi: function (node, $li) {

                if ('negate' in node) {
                    $li.find('.jqtree-element').prepend(buttonNegate(pipelineId, step.id, node.id, node.negate));
                }
                if ((!('show_op' in node) || ('show_op' in node && node.show_op)) && 'operation' in node) {
                    let canChange = node.type !== 'query' && !node.editable;
                    $li.find('.jqtree-element').prepend(buttonOperator(pipelineId, step.id, node.id, node.operation, canChange));
                }
                if (editable && !('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').append(buttonDelete(pipelineId, step.id, node.id));
                }
                // Set a left margin on the first element of a leaf
                if (node.children.length === 0) {
                    $li.find('.jqtree-element:first').css('margin-left', '14px');
                }
            },
            onCanMove: function (node) {
                if (!editable) return false;

                // Cannot move nodes in uneditable queries
                if ('editable' in node && !node.editable) return false;

                // Actor nodes and links may be moved
                if (['link', 'node'].indexOf(node.subset) !== -1) return true;

                // Subset and Group may be moved
                return (['rule', 'group'].indexOf(node.type) !== -1);
            },
            onCanMoveTo: function (moved_node, target_node, position) {
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
            }
        });

        this.selectAll(subsetTree, data, isQuery);

        subsetTree.on(
            'tree.move',
            function (event) {
                event.preventDefault();
                event.move_info.do_move();

                // Save changes when an element is moved
                step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
                queryAbstract.hideFirst(step.abstractQuery);
                manipulate.setQueryUpdated(true);
                m.redraw();
            }
        );

        subsetTree.on(
            'tree.click',
            function (event) {
                let node = event.node;
                if (node.name === 'Custom Subset') {
                    eventdata.canvasPreferences['Custom'] = eventdata.canvasPreferences['Custom'] || {};
                    eventdata.canvasPreferences['Custom']['text'] = JSON.stringify(node.custom, null, '\t');
                    eventdata.canvasRedraw['Custom'] = true;
                    eventdata.setSelectedCanvas("Custom");
                    m.redraw()
                }

                if (event.node.hasChildren()) {
                    subsetTree.tree('toggle', event.node);
                }
            }
        );

        subsetTree.bind(
            'tree.dblclick',
            function (event) {
                if (IS_EVENTDATA_DOMAIN) {
                    let tempQuery = queryMongo.buildSubset([event.node]);
                    if ($.isEmptyObject(tempQuery)) {
                        alert("\"" + event.node.name + "\" is too specific to parse into a query.");
                    } else {
                        eventdata.canvasPreferences['Custom'] = eventdata.canvasPreferences['Custom'] || {};
                        eventdata.canvasPreferences['Custom']['text'] = JSON.stringify(tempQuery, null, '\t');
                        eventdata.canvasRedraw['Custom'] = true;
                        eventdata.setSelectedCanvas("Custom");
                        m.redraw()
                    }
                }
            }
        );
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let {step, isQuery, redraw, setRedraw} = attrs;

        let subsetTree = $(dom);
        if (redraw) {
            setRedraw(false);
            subsetTree.tree('destroy');
            this.oncreate({attrs, dom});
            return;
        }
        let state = subsetTree.tree('getState');
        let data = isQuery
            ? [{
                name: 'Query ' + step.id,
                id: step.id + '-root',
                children: step.abstractQuery,
                type: 'query'
            }]
            : step.abstractQuery;

        subsetTree.tree('loadData', data);
        if (isQuery !== this.isQuery) {
            this.isQuery = isQuery;
            this.selectAll(subsetTree, data, this.isQuery);

            data[0].children.forEach(child => disableEditRecursive(child));
            m.redraw();
        }
        else subsetTree.tree('setState', state);
    }

    view({attrs}) {
        let {pipelineId, step} = attrs;
        return m('div#subsetTree' + pipelineId + step.id)
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

function buttonNegate(pipelineId, stepId, nodeId, state) {
    // This state is negated simply because the buttons are visually inverted. An active button appears inactive
    // This is due to css tomfoolery
    if (!state) {
        return `<button id="boolToggle" class="btn btn-default btn-xs" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate('${pipelineId}', '${stepId}', '${nodeId}', true)">not</button>`
    } else {
        return `<button id="boolToggle" class="btn btn-default btn-xs active" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate('${pipelineId}', '${stepId}', '${nodeId}', false)">not</button>`
    }
}

function buttonOperator(pipelineId, stepId, nodeId, state, canChange) {
    if (canChange) {
        if (state === 'and') {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator('${pipelineId}', '${stepId}', '${nodeId}', 'or')">and</button> `
        } else {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator('${pipelineId}', '${stepId}', '${nodeId}', 'and')">or</button> `
        }
    } else {
        if (state === 'and') {
            return `<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">and</button>`
        } else {
            return `<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">or</button>`
        }
    }
}

function buttonDelete(pipelineId, stepId, nodeId) {
    return `<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;float:right;margin-top:2px;height:18px' onclick='callbackDelete("${pipelineId}", "${stepId}", "${nodeId}")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>`;
}

// this is reused for both unit and event measures (accumulations)
export class TreeAggregate {

    oncreate({attrs, dom}) {
        let {pipelineId, stepId} = attrs;
        let aggregateTree = $(dom);

        aggregateTree.tree({
            data: attrs.data,
            saveState: true,
            dragAndDrop: false,
            autoOpen: false,
            selectable: false,
            onCreateLi: function (node, $li) {
                if (attrs.editable && !('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').prepend(buttonDeleteAggregation(pipelineId, stepId, node.id));
                }
            }
        });

        aggregateTree.on(
            'tree.click',
            function (event) {
                if (event.node.hasChildren()) {
                    aggregateTree.tree('toggle', event.node);
                }
            }
        );
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let {data, redraw, setRedraw} = attrs;
        let aggregateTree = $(dom);
        if (redraw) {
            setRedraw(false);
            aggregateTree.tree('destroy');
            this.oncreate({attrs, dom});
            return;
        }

        let state = aggregateTree.tree('getState');
        aggregateTree.tree('loadData', data);
        aggregateTree.tree('setState', state);
    }

    view(vnode) {
        let {pipelineId, stepId, measure} = vnode.attrs;
        return m('div#aggregateTree' + pipelineId + stepId + measure)
    }
}

function buttonDeleteAggregation(pipelineId, stepId, nodeId) {
    return `<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;margin-top:2px;float:right;height:18px' onclick='callbackDeleteAggregation("${pipelineId}", "${stepId}", "${nodeId}")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>`;
}

// Edit tree (typically called from JQtree)

window.callbackDeleteTransform = function (pipelineId, stepId, transformationName) {
    let step = [...manipulations[pipelineId], ...Object.values(looseSteps)]
        .find(candidate => candidate.id === (Number(stepId) || stepId));
    step.transforms.splice(step.transforms.findIndex(transformation => transformation.name === transformationName), 1);
    step.expansions.splice(step.expansions.findIndex(expansion => expansion.name === transformationName));

    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
    m.redraw();
};

window.callbackDeleteAggregation = function (pipelineId, stepId, nodeId) {
    let measureId = nodeId.split('-')[1];

    let step = [...manipulations[pipelineId], ...Object.values(looseSteps)]
        .find(step => step.id === stepId);

    let ruleTree = {
        'unit': step.measuresUnit,
        'accumulator': step.measuresAccum
    }[measureId];
    ruleTree.splice(ruleTree.findIndex(measure => measure.id === nodeId));

    let aggregationTree = $(`[id='aggregateTree${pipelineId}${stepId}${measureId}']`);
    let node = aggregationTree.tree('getNodeById', nodeId);

    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDeleteAggregation(node.parent.id);
    } else {
        aggregationTree.tree('removeNode', node);

        if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
        m.redraw();
    }
};

window.callbackOperator = function (pipelineId, stepId, nodeId, operand) {

    let subsetTree = $(`[id='subsetTree${pipelineId}${stepId}']`);
    let node = subsetTree.tree('getNodeById', nodeId);

    if (('editable' in node && !node.editable) || node['type'] === 'query') {
        m.redraw(); // This visually resets the button to where it was
        return;
    }

    node.operation = operand;
    let step = [...manipulations[pipelineId], ...Object.values(looseSteps)].find(step => step.id === (Number(stepId) || stepId));
    step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));

    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
    m.redraw();
};

// attached to window due to html injection in jqtree
window.callbackDelete = async function (pipelineId, stepId, nodeId) {
    let subsetTree = $(`[id='subsetTree${pipelineId}${stepId}']`);

    let node = subsetTree.tree('getNodeById', String(nodeId));

    if (node.type === 'query' && !confirm("You are deleting a query. This will return your subsetting to an earlier state."))
        return;

    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDelete(node.parent.id);
    } else {
        subsetTree.tree('removeNode', node);

        let step = [...manipulations[pipelineId], ...Object.values(looseSteps)].find(step => step.id === (Number(stepId) || stepId));
        step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));

        hideFirst(step.abstractQuery);
        if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);

        m.redraw();

        if (IS_EVENTDATA_DOMAIN && node.type === 'query') {
            manipulations[pipelineId].splice(manipulations[pipelineId].indexOf(step), 1);
            let newMenu = {
                type: 'menu',
                name: eventdata.selectedSubsetName,
                metadata: eventdata.genericMetadata[eventdata.selectedDataset]['subsets'][eventdata.selectedSubsetName],
                preferences: eventdata.subsetPreferences[eventdata.selectedSubsetName]
            };
            await eventdata.loadMenuEventData(manipulations[pipelineId], newMenu, {recount: true});

            // clear all subset data. Note this is intentionally mutating the object, not rebinding it
            Object.keys(eventdata.subsetData)
                .filter(subset => subset !== eventdata.selectedSubsetName)
                .forEach(subset => delete eventdata.subsetData[subset]);
        }
    }
};


window.callbackNegate = function (pipelineId, stepId, nodeId, bool) {

    console.log(`subsetTree${pipelineId}${stepId}`);

    let subsetTree = $(`[id='subsetTree${pipelineId}${stepId}']`);
    let node = subsetTree.tree('getNodeById', nodeId);

    // don't permit change in negation on non-editable node
    if ('editable' in node && !node.editable) {
        m.redraw(); // This visually resets the button to where it was
        return;
    }

    node.negate = bool;

    let step = [...manipulations[pipelineId], ...Object.values(looseSteps)].find(step => step.id === (Number(stepId) || stepId));
    step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));

    if (!IS_EVENTDATA_DOMAIN) manipulate.setQueryUpdated(true);
    m.redraw();
};