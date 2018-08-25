import * as app from "./app";
import m from "mithril";

import * as common from '../../common-eventdata/common';

// Edit tree (typically called from JQtree)

window.callbackDeleteTransform = function(id) {
    let [stepId, transformationName] = id.split('-');
    let step = [...app.abstractManipulations, app.pendingSubset].find(step => step.id === Number(stepId));
    step.transforms.splice(step.transforms.findIndex(transformation => transformation.name === transformationName), 1);

    m.redraw();
};

window.callbackDeleteAggregation = function(id) {
    let [stepId, nodeId, measureId] = id.split('-');

    let step = [...app.abstractManipulations, app.eventdataAggregateStep]
        .find(step => step.id === stepId);

    let ruleTree = {
        'unit': step.measuresUnit,
        'accumulator': step.measuresAccum
    }[measureId];
    ruleTree.splice(ruleTree.findIndex(measure => measure.id === id));

    let aggregationTree = $("#aggregateTree" + stepId + measureId);
    let node = aggregationTree.tree('getNodeById', id);

    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDeleteAggregation(node.parent.id);
    } else {
        aggregationTree.tree('removeNode', node);
    }

    m.redraw();
};

window.callbackOperator = function (id, operand) {
    let stepId = id.split('-')[0];
    let subsetTree = $('#subsetTree' + stepId);
    let node = subsetTree.tree('getNodeById', id);
    if (('editable' in node && !node.editable) || node['type'] === 'query') return;

    node.operation = operand;
    let step = [...app.abstractManipulations, app.pendingSubset].find(step => step.id === Number(stepId));
    step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
    m.redraw();
};

// attached to window due to html injection in jqtree
window.callbackDelete = async function (id) {
    let stepId = id.split('-')[0];
    let subsetTree = $('#subsetTree' + stepId);
    let node = subsetTree.tree('getNodeById', id);
    if (node.type === 'query' && !confirm("You are deleting a query. This will return your subsetting to an earlier state."))
        return;

    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDelete(node.parent.id);
    } else {
        subsetTree.tree('removeNode', node);

        let step = [...app.abstractManipulations, app.pendingSubset].find(step => step.id === Number(stepId));
        step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));

        hideFirst(step.abstractQuery);
        m.redraw();

        if (node.type === 'query') {
            app.abstractManipulations.splice(app.abstractManipulations.indexOf(step), 1);
            let newMenu = {
                type: 'menu',
                name: app.selectedSubsetName,
                metadata: app.genericMetadata[app.selectedDataset]['subsets'][app.selectedSubsetName],
                preferences: app.subsetPreferences[app.selectedSubsetName]
            };
            await app.loadMenuEventData(app.abstractManipulations, newMenu, {recount: true});

            // clear all subset data. Note this is intentionally mutating the object, not rebinding it
            Object.keys(app.subsetData)
                .filter(subset => subset !== app.selectedSubsetName)
                .forEach(subset => delete app.subsetData[subset]);
        }
    }
};


window.callbackNegate = function (id, bool) {
    let stepId = id.split('-')[0];
    let subsetTree = $('#subsetTree' + stepId);
    let node = subsetTree.tree('getNodeById', id);

    // don't permit change in negation on non-editable node
    if ('editable' in node && !node.editable) return;

    node.negate = bool;

    let step = [...app.abstractManipulations, app.pendingSubset].find(step => step.id === Number(stepId));
    step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
    m.redraw();
};


// constraint trees used for subset and aggregate

// abstractQuery mutators
// the abstract query is in a format that jqtree renders

// This is the format of each node in the abstract query
// {
//     id: String(step.nodeId++),    // Node number with post-increment
//     type: 'rule' || 'query' || 'group
//     subset: 'date' || 'dyad' || 'categorical' || 'categorical_grouped' || 'coordinates' || 'custom' (if this.type === 'rule')
//     name: '[title]',         // 'Subsets', 'Group #', '[Selection] Subset' or tag name
//     show_op: true,           // If true, show operation menu element
//     operation: 'and',        // Stores preference of operation menu element
//     children: [],            // If children exist
//     negate: false,           // If exists, have a negation button
//     editable: true,          // If false, operation cannot be edited
//     cancellable: false       // If exists and false, disable the delete button
// }


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

// don't show operator button on first element of any group
export function hideFirst(data) {
    for (let child_id in data) {
        // noinspection JSUnfilteredForInLoop
        let child = data[child_id];
        if ('children' in child) {
            child.children = hideFirst(child.children);
        }
        child['show_op'] = child_id !== "0";
    }
    return data;
}

export function addGroup(step) {

    // When the query argument is set, groups will be included under a 'query group'
    let movedChildren = [];
    let removeIds = [];

    // If everything is deleted, then restart the ids
    if (step.abstractQuery.length === 0) {
        step.groupId = 1;
        step.queryId = 1;
    }

    // Make list of children to be moved
    for (let child_id in step.abstractQuery) {
        let child = step.abstractQuery[child_id];

        // Don't put groups inside groups! Only a drag can do that.
        if (!query && child.type === 'rule') {
            movedChildren.push(child);
            removeIds.push(child_id);
        }
    }
    if (movedChildren.length > 0) {
        movedChildren[0]['show_op'] = false;
    }

    // Delete elements from root directory that are moved
    for (let i = removeIds.length - 1; i >= 0; i--) {
        step.abstractQuery.splice(removeIds[i], 1);
    }

    if (query) {
        for (let child_id in movedChildren) {
            movedChildren[child_id] = disableEditRecursive(movedChildren[child_id]);
        }
        step.abstractQuery.push({
            id: String(step.id) + '-' + String(step.nodeId++),
            name: 'Query ' + String(step.queryId++),
            operation: 'and',
            editable: true,
            cancellable: true,
            type: 'query',
            children: movedChildren,
            show_op: step.abstractQuery.length > 0
        });
    } else {
        step.abstractQuery.push({
            id: String(step.id) + '-' + String(step.nodeId++),
            name: 'Group ' + String(step.groupId++),
            operation: 'and',
            type: 'group',
            children: movedChildren,
            show_op: step.abstractQuery.length > 0
        });
    }

    hideFirst(step.abstractQuery);
    m.redraw();

    if (!query) {
        let qtree = $('#subsetTree' + String(step.id));
        qtree.tree('openNode', qtree.tree('getNodeById', step.nodeId - 1), true);
    }
}

/**
 * @param step: pipeline stepID
 * @param name: name displayed on constraint in menu
 * @param preferences: menu state
 * @param metadata: menu type, column names, etc.
 */
export function addConstraint(step, name, preferences, metadata) {
    let abstractBranch = makeAbstractBranch(step, name, preferences, metadata);
    // Don't add an empty constraint
    if (Object.keys(abstractBranch).length === 0) {
        alert("No options have been selected. Please make a selection.");
        return;
    }

    common.setPanelOpen('right');

    if (step.type === 'subset') {

        // Don't show the boolean operator on the first element
        if (step.abstractQuery.length === 0) {
            abstractBranch['show_op'] = false;
        }

        step.abstractQuery.push(abstractBranch);

        m.redraw();
        let subsetTree = $('#subsetTree' + app.eventdataSubsetCount); // the pending tree
        subsetTree.tree('closeNode', subsetTree.tree('getNodeById', abstractBranch['id']), false);
    }

    if (step.type === 'aggregate' && metadata.measureType === 'unit')
        step.measuresUnit.push(abstractBranch);

    if (step.type === 'aggregate' && metadata.measureType === 'accumulator')
        step.measuresAccum.push(abstractBranch);
}

// Convert the subset panel state to an abstract query branch
function makeAbstractBranch(step, name, preferences, metadata) {

    // if an aggregation branch, then this adds the measure to the node id, so that when a node is deleted, it knows which tree to remove from
    let measureId = step.type === 'aggregate' ? '-' + metadata.measureType : '';

    if (name === 'Custom') {
        return {
            id: String(step.id) + '-' + String(step.nodeId++),
            name: 'Custom Subset',
            type: 'rule',
            subset: 'custom',
            custom: JSON.parse(preferences['text'])
        }
    }

    if (metadata['type'] === 'dyad') {
        // Make parent node
        let subset = {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: name,
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            children: []
        };

        // ignore edges from shared dyad menus in other datasets
        let filteredEdges = preferences['edges']
            .filter(edge => edge.source.tab in metadata['tabs'] && edge.target.tab in metadata['tabs']);

        for (let linkId in filteredEdges) {

            // Add each link to the parent node as another rule
            let link = {
                id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                subset: 'link',
                children: [{
                    id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                    name: Object.keys(metadata['tabs'])[0] + ': ' + filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                    name: Object.keys(metadata['tabs'])[1] + ': ' + filteredEdges[linkId].target.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].target.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[1]]['full']
                }]
            };

            subset['children'].push(link);
        }

        // Don't add a rule and ignore the stage if no links are made
        if (subset['children'].length === 0) return {};
        return subset
    }

    if (metadata['type'] === 'date') {

        if (step['type'] === 'aggregate') {
            return {
                id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                name: 'Date (' + preferences['measure'] + ')', // what jqtree shows
                subset: 'date',
                cancellable: true,
                measure: preferences['measure'],
                column: metadata['columns'][0]
            }
        }

        // For mapping numerical months to strings in the child node name
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
            "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: name,
            type: 'rule',
            subset: metadata['type'],
            structure: metadata['structure'],
            children: [
                {
                    id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: new Date(preferences['userLower'].getTime()),
                    cancellable: false,
                    show_op: false,
                    column: metadata['columns'][0]
                },
                {
                    id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                    name: 'To:   ' + monthNames[preferences['userUpper'].getMonth()] + ' ' + preferences['userUpper'].getDate() + ' ' + String(preferences['userUpper'].getFullYear()),
                    toDate: new Date(preferences['userUpper'].getTime()),
                    cancellable: false,
                    show_op: false,
                    // If the date is an interval, the last element will be different from the first
                    column: metadata['columns'][metadata['columns'].length - 1]
                }
            ],
            operation: 'and'
        };
    }

    if (['categorical', 'categorical_grouped'].indexOf(metadata['type']) !== -1) {
        // Make parent node
        let subset = {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: name,
            operation: 'and',
            negate: 'false',
            column: metadata['columns'][0],
            formatSource: metadata['format'],
            formatTarget: preferences['aggregate'],
            alignment: metadata['alignment'],
            type: 'rule',
            subset: metadata['type'],
            children: []
        };

        // Add each selection to the parent node as another rule
        [...preferences['selections']]
            .sort((a, b) => typeof a === 'number' ? a - b : a.localeCompare(b))
            .forEach(selection => subset['children'].push({
                id: String(step.id) + '-' + String(step.nodeId++) + measureId,
                name: String(selection),
                show_op: false
            }));

        // Don't add a rule and ignore the stage if no selections are made
        if (subset['children'].length === 0) return {};
        return subset
    }

    if (metadata['type'] === 'coordinates') {
        let valLeft = parseFloat(document.getElementById('lonLeft').value);
        let valRight = parseFloat(document.getElementById('lonRight').value);

        let valUpper = parseFloat(document.getElementById('latUpper').value);
        let valLower = parseFloat(document.getElementById('latLower').value);

        // Make parent node
        let subset = {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: name,
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            // negate: 'false',
            children: []
        };

        let latitude = {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: 'Latitude',
            column: metadata['columns'][0],
            // negate: 'false',
            children: []
        };

        latitude.children.push({
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: valUpper > valLower ? valUpper : valLower
        });

        latitude.children.push({
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: valUpper < valLower ? valUpper : valLower
        });

        let longitude = {
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: 'Longitude',
            operation: 'and',
            column: metadata['columns'][1],
            children: []
        };

        longitude.children.push({
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: valLeft > valRight ? valLeft : valRight
        });

        longitude.children.push({
            id: String(step.id) + '-' + String(step.nodeId++) + measureId,
            name: valLeft < valRight ? valLeft : valRight
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset
    }
}

//  ~~~~ begin abstract query realignment ~~~~

export function genericRealignment(alignment, inFormat, outFormat, data) {
    // TODO this is lossy one way. Not using it yet.
    let transform = alignment.reduce((out, equivalency) => {
        out[equivalency[inFormat]] = equivalency[outFormat];
        return out;
    }, {});
    return [...new Set(data.map(point => transform[point]))];
}

// Take an abstract query for one dataset, and turn it into a query for another - with descriptive logs
export function realignQuery(step, source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

    let toVariableString = (variables) => String(variables.map(variable => variable.replace('_constructed', '')));

    let realignBranch = (query) => {
        return query.map(branch => {
            if (branch.type !== 'rule') {
                branch.children = realignBranch(branch.children);
                if (branch.children.length === 0) {
                    log.push('Removed ' + branch.name + ', because it has no children.');
                    return;
                }
                return branch
            }

            let subsetName = branch.name.replace(' Subset', '');
            if (!(subsetName in targetSubsets)) {
                log.push('Removed ' + branch.name + ', because it does not have an alignment in ' + target + '.');
                return;
            }

            if (branch.subset === 'dyad') {
                let sourceTabs = Object.keys(sourceSubsets[subsetName]['tabs']);
                let targetTabs = Object.keys(targetSubsets[subsetName]['tabs']);

                // This is a bit of a shortcut
                if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return;
                }

                let sourceFull = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['full']);
                let targetFull = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['full']);

                let sourceFormats = sourceFull.map(column => app.genericMetadata[source]['formats'][column]);
                let targetFormats = targetFull.map(column => app.genericMetadata[target]['formats'][column]);

                // if full column formats are already matching, then return
                if ([sourceFormats, targetFormats].every(formats => formats.every(format => format)) // exists
                    && [0, 1].every(i => sourceFormats[i] === targetFormats[i])) {                   // and equal
                    return branch;
                }

                log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats));
                return;

                // actor alignments script is on hold
                // // else if realignment can be achieved via filters
                // let sourceFilters = sourceTabs.map(tab => sourceSubsets[subsetName]['tabs'][tab]['filters']);
                // let targetFilters = targetTabs.map(tab => targetSubsets[subsetName]['tabs'][tab]['filters']);
                //
                // let sourceAlignment = app.genericMetadata[source]['alignments'][sourceFull];
                // let targetAlignment = app.genericMetadata[target]['alignments'][targetFull];
                //
                // let relabelDyad = () => branch.children.forEach((monad, i) => monad['column'] = targetFull[i]);
                // if (sourceFormats.every((format, i) => format === targetFormats[i])) {
                //     relabelDyad();
                //     log.push('Relabeled dyad columns in ' + branch.name + '.');
                //     return branch;
                // }
                // else if ((!sourceAlignment || !targetAlignment || sourceAlignment !== targetAlignment)
                //     && targetFormats.some((format, i) => format !== sourceFormats[i])) {
                //     log.push('Removed ' + branch.name + ', because ' + String(sourceFormats) + ' are not comparable with ' + String(targetFormats))
                //     return;
                // }
                //
                // if (sourceAlignment && targetAlignment && sourceAlignment === targetAlignment) {
                //     log.push('Realigned dyad columns in ' + branch.name + '.');
                // }
                // return branch;
            }

            if (branch.subset === 'categorical' || branch.subset === 'categorical_grouped') {
                let sourceColumn = sourceSubsets[subsetName]['columns'][0];
                let targetColumn = targetSubsets[subsetName]['columns'][0];

                let sourceFormat = app.genericMetadata[source]['formats'][sourceColumn];
                let targetFormat = app.genericMetadata[target]['formats'][targetColumn];

                if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                    log.push('Removed ' + branch.name + ', because the column formats are not comparable.');
                    return
                }

                if (branch.column !== targetColumn)
                    log.push('Relabeled column in ' + branch.name + '.');
                branch.column = targetColumn;
                return branch;
            }

            if (branch.subset === 'date') {
                let sourceColumns = sourceSubsets[subsetName]['columns'];
                let targetColumns = targetSubsets[subsetName]['columns'];
                if (branch.children.some((handle, i) => handle['column'] !== targetColumns[i % targetColumns.length]))
                    log.push('Relabeled column intervals in ' + branch.name
                        + ' from ' + toVariableString(sourceColumns) + ' to ' + toVariableString(targetColumns) + '.');

                // the modular indexing is for handling conversions between point and interval date structures
                branch.children.forEach((handle, i) => handle['column'] = targetColumns[i % targetColumns.length]);
                return branch;
            }


            if (branch.subset === 'coordinates') {
                let targetColumns = targetSubsets[subsetName]['columns'];
                if (branch.children.some((orient, i) => orient['column'] !== targetColumns[i]))
                    log.push('Relabeled columns in ' + branch.name + ' from ' + String(branch.children.map(child => child['column'])) + ' to ' + String(targetColumns));
                branch.children.forEach((orient, i) => orient['column'] = targetColumns[i]);
                return branch;
            }

            if (branch.subset === 'custom') {
                log.push('Removed ' + branch.name + ', because custom queries do not have ontological alignments.');
                return;
            }

        }).filter(branch => branch !== undefined) // prune subsets and groups that didn't transfer
    };

    step.abstractQuery = realignBranch(step.abstractQuery);
    return log;
}

export function realignPreferences(source, target) {
    let log = [];
    let sourceSubsets = app.genericMetadata[source]['subsets'];
    let targetSubsets = app.genericMetadata[target]['subsets'];

    Object.keys(app.subsetPreferences).forEach(subset => {
        if (Object.keys(app.subsetPreferences[subset]).length === 0) return;
        if (!(subset in targetSubsets)) {
            log.push(subset + ' is not available for ' + target + ', but subset preferences have been cached.');
            return;
        }

        let subsetType = targetSubsets[subset]['type'];

        if (subsetType === 'dyad') {
            let sourceTabs = Object.keys(sourceSubsets[subset]['tabs']);
            let targetTabs = Object.keys(targetSubsets[subset]['tabs']);
            // This is a bit of a shortcut
            if (sourceTabs.some((_, i) => sourceTabs[i] !== targetTabs[i])) {
                log.push(subset + ' has a different alignment, so the groups and links from ' + source + ' have been cached and are not visible from ' + target + '.')
            }
        }

        if (subsetType === 'categorical' || subsetType === 'categorical_grouped') {
            let sourceColumn = sourceSubsets[subset]['columns'][0];
            let targetColumn = targetSubsets[subset]['columns'][0];

            let sourceFormat = app.genericMetadata[source]['formats'][sourceColumn];
            let targetFormat = app.genericMetadata[target]['formats'][targetColumn];

            if (!sourceFormat || !targetFormat || sourceFormat !== targetFormat) {
                log.push('Cleared menu preferences in ' + subset + ', because the column formats are not comparable.');
                app.subsetPreferences[subset] = {}
            }
        }
    });
    return log;
}

export function realignVariables(source, target) {
    let log = [];
    let newSelectedVariables = new Set();
    app.selectedVariables.forEach(variable => {
        if (!(variable in app.genericMetadata[source]['formats'])) {
            log.push('De-selected ' + variable + ', because it has no recorded equivalent in ' + target + '.');
            return;
        }
        Object.keys(app.genericMetadata[target]['formats']).forEach(targetVar => {
            let targetFormat = app.genericMetadata[target]['formats'][targetVar];
            if (targetFormat === app.genericMetadata[source]['formats'][variable])
                newSelectedVariables.add(targetVar);
        })
    });
    let equivalents = [...newSelectedVariables].filter(x => !app.selectedVariables.has(x));
    if (equivalents.length !== 0) log.push('Selected equivalent variables: ' + String(equivalents));

    app.setSelectedVariables(newSelectedVariables);
    app.setSelectedConstructedVariables(new Set());
    return log;
}