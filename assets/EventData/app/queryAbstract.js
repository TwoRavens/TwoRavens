import * as app from "./app";
import m from "mithril";

// Edit tree (typically called from JQtree)

window.callbackDeleteTransform = function(id) {
    let [stepId, transformationName] = id.split('-');
    let step = app.getTransformStep(stepId);
    step.transforms.splice(step.transforms.findIndex(transformation => transformation.name === transformationName), 1);

    m.redraw();
};

window.callbackOperator = function (id, operand) {
    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);
    if (('editable' in node && !node.editable) || node['type'] === 'query') return;

    node.operation = operand;

    let stepID = id.split('-')[0];
    app.getTransformStep(stepID).abstractQuery = JSON.parse(subsetTree.tree('toJson'));

    m.redraw();
};



// attached to window due to html injection in jqtree
window.callbackDelete = function (id) {

    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);
    if (node.type === 'query' && !confirm("You are deleting a query. This will return your subsetting to an earlier state."))
        return;

    // If deleting the last leaf in a branch, delete the branch
    if (typeof node.parent.id !== 'undefined' && node.parent.children.length === 1) {
        callbackDelete(node.parent.id);
    } else {
        subsetTree.tree('removeNode', node);

        let step = app.getTransformStep(id.split('-')[0]);
        step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));

        hideFirst(step.abstractQuery);
        m.redraw();

        if (node.type === 'query') {
            app.loadMenu(app.selectedSubsetName, {recount: true});

            // clear all subset data. Note this is intentionally mutating the object, not rebinding it
            Object.keys(app.subsetData)
                .filter(subset => subset !== app.selectedSubsetName)
                .forEach(subset => delete app.subsetData[subset]);

            if (step.abstractQuery.length === 0) {
                step.nodeId = 1;
                step.groupId = 1;
                step.queryId = 1;
            }
        }
    }
};


window.callbackNegate = function (id, bool) {
    let subsetTree = $('#subsetTree');
    let node = subsetTree.tree('getNodeById', id);

    // don't permit change in negation on non-editable node
    if ('editable' in node && !node.editable) return;

    node.negate = bool;

    let stepID = id.split('-')[0];
    app.getTransformStep(stepID).abstractQuery = JSON.parse(subsetTree.tree('toJson'));
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

export function addGroup(stepId, query = false) {
    let step = transformPipeline.find(step => step.id === stepId);

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

            // A query grouping can, however put groups inside of groups.
        } else if (query && child.type !== 'query') {
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
            id: step.id + '-' + String(step.nodeId++),
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
            id: step.id + '-' + String(step.nodeId++),
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
        let qtree = $('#subsetTree');
        qtree.tree('openNode', qtree.tree('getNodeById', step.nodeId - 1), true);
    }
}

/**
 * @param step: pipeline stepID
 * @param preferences: menu state
 * @param metadata: menu type, column names, etc.
 */
export function addConstraint(step, preferences, metadata) {
    let abstractBranch = makeAbstractBranch(step, preferences, metadata);

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
        let subsetTree = $('#subsetTree');
        subsetTree.tree('closeNode', subsetTree.tree('getNodeById', abstractBranch['id']), false);
    }

    if (step.type === 'aggregate' && metadata.measureType === 'unit')
        step.measuresUnit.push(abstractBranch);

    if (step.type === 'aggregate' && metadata.measureType === 'accumulator')
        step.measuresAccum.push(abstractBranch);
}

// Convert the subset panel state to an abstract query branch
function makeAbstractBranch(step, preferences, metadata) {

    if (selectedCanvas === 'Custom') {
        return {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Custom Subset',
            type: 'rule',
            subset: 'custom',
            custom: JSON.parse(preferences['text'])
        }
    }

    if (metadata['type'] === 'dyad') {
        // Make parent node
        let subset = {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
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
                id: step.id + '-' + String(step.nodeId++),
                name: 'Link ' + String(linkId),
                show_op: linkId !== '0',
                operation: 'or',
                subset: 'link',
                children: [{
                    id: step.id + '-' + String(step.nodeId++),
                    name: Object.keys(metadata['tabs'])[0] + ': ' + filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: step.id + '-' + String(step.nodeId++),
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
                id: step.id + '-' + String(step.nodeId++),
                name: 'Date (' + preferences['measure'] + ')', // what jqtree shows
                measureName: metadata['name'], // the name of the subset menu. In Eventdata comes from dataset configs, in TwoRavens it is autogenerated
                subset: 'date',
                cancellable: true,
                unit: preferences['unit'],
                column: metadata['columns'][0]
            }
        }

        // For mapping numerical months to strings in the child node name
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
            "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            type: 'rule',
            subset: metadata['type'],
            structure: metadata['structure'],
            children: [
                {
                    id: step.id + '-' + String(step.nodeId++),
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: new Date(preferences['userLower'].getTime()),
                    cancellable: false,
                    show_op: false,
                    column: metadata['columns'][0]
                },
                {
                    id: step.id + '-' + String(step.nodeId++),
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
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
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
                id: step.id + '-' + String(step.nodeId++),
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
            id: step.id + '-' + String(step.nodeId++),
            name: selectedSubsetName + ' Subset',
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            // negate: 'false',
            children: []
        };

        let latitude = {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Latitude',
            column: metadata['columns'][0],
            // negate: 'false',
            children: []
        };

        latitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valUpper > valLower ? valUpper : valLower
        });

        latitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valUpper < valLower ? valUpper : valLower
        });

        let longitude = {
            id: step.id + '-' + String(step.nodeId++),
            name: 'Longitude',
            operation: 'and',
            column: metadata['columns'][1],
            children: []
        };

        longitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valLeft > valRight ? valLeft : valRight
        });

        longitude.children.push({
            id: step.id + '-' + String(step.nodeId++),
            name: valLeft < valRight ? valLeft : valRight
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset
    }
}
