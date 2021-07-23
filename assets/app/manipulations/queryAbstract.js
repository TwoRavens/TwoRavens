import m from "mithril";

import {alertError, alertLog} from "../app";

// constraint trees used for subset and aggregate

// abstractQuery mutators
// the abstract query is in a format that jqtree renders

// This is the format of each node in the abstract query
// {
//     id: String(step.nodeId++),    // Node number with post-increment
//     type: 'rule' || 'query' || 'group
//     subset: 'date' || 'dyad' || 'discrete' || 'discrete_grouped' || 'coordinates' || 'custom' (if this.type === 'rule')
//     name: '[title]',         // 'Subsets', 'Group #', '[Selection] Subset' or tag name
//     show_op: false,           // If false, operation button ('and', 'or') will not be rendered
//     operation: 'and',        // Stores preference of operation menu element
//     children: [],            // If children exist
//     negate: false,           // If exists, have a negation button
//     editable: true,          // If false, operation cannot be edited
//     cancellable: false       // If exists and false, disable the delete button
// }

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
        if (child.type === 'rule') {
            movedChildren.push(child);
            removeIds.push(child_id);
        }
    }

    // Delete elements from root directory that are moved
    for (let i = removeIds.length - 1; i >= 0; i--) {
        step.abstractQuery.splice(removeIds[i], 1);
    }

    step.abstractQuery.push({
        id: String(step.nodeId++),
        name: 'Group ' + String(step.groupId++),
        operation: 'and',
        type: 'group',
        children: movedChildren,
        show_op: step.abstractQuery.length > 0
    });

    m.redraw();
}

/**
 * @param step: pipeline stepID
 * @param preferences: menu state
 * @param metadata: menu type, column names, etc.
 * @param name: name displayed on constraint in menu
 */
export function addConstraint(step, preferences, metadata, name) {

    // extract information from menu state and format as a branch. The branch will be added to the abstract query
    let abstractBranch = makeAbstractBranch(step, preferences, metadata, name);

    // Don't add an empty constraint
    if (Object.keys(abstractBranch).length === 0) {
        alertError("No options have been selected. Please make a selection.");
        return false;
    }

    // Don't add an invalid constraint
    if ('error' in abstractBranch) {
        alertError(abstractBranch.error);
        return false;
    }

    if (step.type === 'transform') {
        if (preferences.type === 'Equation') step.transforms.push(abstractBranch);
        if (preferences.type === 'Expansion') step.expansions.push(abstractBranch);
        if (preferences.type === 'Binning') step.binnings.push(abstractBranch);
        if (preferences.type === 'Manual') step.manual.push(abstractBranch);
        m.redraw();
    }

    if (step.type === 'subset') {
        step.abstractQuery.push(abstractBranch);

        m.redraw();
    }

    if (step.type === 'aggregate' && metadata.measureType === 'unit') {
        let columnsTemp = []; // only used for informative alerts
        let duplicate = step.measuresUnit.findIndex(unit => {
            if (unit.subset !== abstractBranch.subset) return false;

            if (unit.subset === 'date' && unit.column === abstractBranch.column) {
                columnsTemp = [unit.column];
                return true;
            }
            if (unit.subset === 'dyad' && unit.columns.join() === abstractBranch.columns.join()) {
                columnsTemp = unit.columns;
                return true;
            }
            return false;
        });

        if (duplicate !== -1) {
            if (confirm(`Replace duplicated event measure? (${abstractBranch.subset}: ${columnsTemp.join(', ')})`))
                step.measuresUnit[duplicate] = abstractBranch;
            else return false;
        }
        else step.measuresUnit.push(abstractBranch);
    }

    if (step.type === 'aggregate' && metadata.measureType === 'accumulator') {
        let duplicate = step.measuresAccum.findIndex(accumulator =>
            accumulator.column === abstractBranch.column &&
            accumulator.formatTarget === abstractBranch.formatTarget);

        if (duplicate !== -1) {
            alertLog('Combined new selections with an existing event measure.');
            let colNames = new Set(step.measuresAccum[duplicate].children.map(child => child.name));

            step.measuresAccum[duplicate].children = [
                ...step.measuresAccum[duplicate].children,
                ...abstractBranch.children.filter(pendingCol => !colNames.has(pendingCol.name))
            ]
        }
        else step.measuresAccum.push(abstractBranch);
    }

    if (step.type === 'imputation')
        step.imputations.push(abstractBranch);

    return true;
}

// Convert the subset panel state to an abstract query branch
function makeAbstractBranch(step, preferences, metadata, name) {

    if (step.type === 'transform' && preferences.type === 'Equation') {
        let menuPreferences = preferences.menus.Equation;
        if (!menuPreferences.isValid) return {error: 'The specified transformation is not valid.'};
        if (step.transforms.some(transform => transform.name === menuPreferences.transformName))
            return {error: 'The specified transform name has already been used.'};

        // reads the CanvasTransform menu state, this branch gets added to the transform step
        return {
            name: menuPreferences.transformName,
            equation: menuPreferences.transformEquation
        }
    }
    if (step.type === 'transform' && preferences.type === 'Expansion') {
        let menuPreferences = preferences.menus.Expansion;
        if (menuPreferences.degreeInteractionError) return {error: 'The interaction degree is not valid.'};
        if (menuPreferences.numberTerms === 0) return {error: 'The expansion supplies no additional terms.'};

        return {
            degreeInteraction: menuPreferences.degreeInteraction,
            name: Object.keys(menuPreferences.variables).join(','),
            variables: menuPreferences.variables,
            numberTerms: menuPreferences.numberTerms
        }
    }
    if (step.type === 'transform' && preferences.type === 'Binning') {
        let menuPreferences = preferences.menus.Binning;
        if (menuPreferences.variableNameError) return {error: 'The variable name is not valid.'};
        if (!menuPreferences.variableIndicator) return {error: 'No indicator variable is selected.'};
        if (menuPreferences.partitions.length === 0) return {error: 'No partitions are selected.'};

        return {
            name: menuPreferences.variableName,
            variableIndicator: menuPreferences.variableIndicator,
            binningType: menuPreferences.binningType,
            partitions: menuPreferences.partitions
        }
    }
    if (step.type === 'transform' && preferences.type === 'Manual') {
        let menuPreferences = preferences.menus.Manual;
        if (menuPreferences.variableNameError) return {error: 'The variable name is not valid.'};
        if (!menuPreferences.variableIndicator) return {error: 'No indicator variable is selected.'};

        // would have used an object, but object keys are only strings, so the indicator type is implicitly cast
        let indicators = [];
        let values = [];
        menuPreferences.indicatorKeys.forEach((indicator, i) => {
            if (menuPreferences.userValues[i] === undefined) return;
            indicators.push(indicator);
            values.push({
                'Boolean': !!menuPreferences.userValues[i],
                'Numeric': parseFloat(menuPreferences.userValues[i]),
                'Categorical': menuPreferences.userValues[i]
            }[menuPreferences.variableType])
        });

        menuPreferences.variableDefault = {
            'Boolean': !!menuPreferences.variableDefault,
            'Numeric': parseFloat(menuPreferences.variableDefault),
            'Categorical': menuPreferences.variableDefault
        }[menuPreferences.variableType];

        return {
            name: menuPreferences.variableName, // name of labels variable
            variableType: menuPreferences.variableType, // type of labels variable
            variableDescription: menuPreferences.variableDescription,
            variableDefault: menuPreferences.variableDefault, // default value of labels variable
            variableIndicator: menuPreferences.variableIndicator, // name of column of variable being labeled
            indicators, values
        }
    }

    if (step.type === 'imputation') {
        let branch = {
            id: String(step.imputationId++),
            imputationMode: preferences.imputationMode,
            nullValues: preferences.nullValues,
            variableTypes: preferences.variableTypes
        };

        if (preferences.imputationMode === 'Delete') return Object.assign(branch, {
            variables: preferences.selectedVariables
        });

        if (preferences.imputationMode === 'Replace') {
            Object.assign(branch, {
                replacementValues: preferences.getReplacementValues(preferences),
                statisticMode: preferences.statisticMode,
                replacementMode: preferences.replacementMode
            });

            if (preferences.replacementMode === 'Custom')
                branch.customValueType = preferences.customValueType;

            return branch;
        }
    }

    // if an aggregation branch, then this adds the measure to the node id, so that when a node is deleted, it knows which tree to remove from
    let measureId = step.type === 'aggregate' ? '-' + metadata.measureType : '';

    if (name === 'Custom Subset') {
        return {
            id: String(step.nodeId++),
            name: 'Custom Subset',
            type: 'rule',
            subset: 'custom',
            custom: JSON.parse(preferences['text'])
        }
    }

    if (metadata['type'] === 'dyad') {
        // Make parent node
        let subset = {
            id: String(step.nodeId++) + measureId,
            name: name,
            operation: 'and',
            type: 'rule',
            columns: Object.keys(metadata.tabs).map(tab => metadata.tabs[tab].full),
            subset: 'dyad',
            children: []
        };

        // ignore edges from shared dyad menus in other datasets
        let filteredEdges = preferences['edges']
            .filter(edge => edge.source.tab in metadata['tabs'] && edge.target.tab in metadata['tabs']);

        for (let linkId in filteredEdges) {

            // Add each link to the parent node as another rule
            let link = {
                id: String(step.nodeId++) + measureId,
                name: 'Link ' + String(linkId),
                operation: 'or',
                subset: 'link',
                children: [{
                    id: String(step.nodeId++) + measureId,
                    name: Object.keys(metadata['tabs'])[0] + ': ' + filteredEdges[linkId].source.name,
                    aggregationName: filteredEdges[linkId].source.name,
                    show_op: false,
                    cancellable: true,
                    actors: [...filteredEdges[linkId].source.selected],
                    subset: 'node',
                    column: metadata['tabs'][Object.keys(metadata['tabs'])[0]]['full']
                }, {
                    id: String(step.nodeId++) + measureId,
                    name: Object.keys(metadata['tabs'])[1] + ': ' + filteredEdges[linkId].target.name,
                    aggregationName: filteredEdges[linkId].target.name,
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

    if (metadata['type'] === 'continuous') {

        if (step['type'] === 'aggregate') {
            return {
                id: String(step.nodeId++) + measureId,
                name: 'Continuous (' + preferences['measure'] + ' bins) ' + metadata['columns'][0], // what jqtree shows
                subset: 'continuous',
                cancellable: true,
                measure: preferences['measure'],
                column: metadata['columns'][0],
                min: preferences['minLabel'],
                max: preferences['maxLabel']
            }
        }

        // If the dates have not been modified, force bring the date from the slider
        if (preferences['userLower'] - preferences['minLabel'] === 0 && preferences['userUpper'] - preferences['maxLabel'] === 0) {
            if (preferences['userLower'] - preferences['handleLower'] === 0 &&
                preferences['userUpper'] - preferences['handleUpper'] === 0) {
                return {};
            }

            preferences['userLower'] = preferences['handleLower'];
            preferences['userUpper'] = preferences['handleUpper'];
        }

        return {
            id: String(step.nodeId++) + measureId,
            name: name,
            type: 'rule',
            subset: metadata['type'],
            column: metadata['columns'][0],
            children: [
                {
                    id: String(step.nodeId++) + measureId,
                    name: 'From: ' + preferences['userLower'],
                    fromLabel: preferences['userLower'],
                    cancellable: false,
                    show_op: false
                },
                {
                    id: String(step.nodeId++) + measureId,
                    name: 'To:   ' + preferences['userUpper'],
                    toLabel: preferences['userUpper'],
                    cancellable: false,
                    show_op: false
                }
            ],
            operation: 'and'
        };
    }

    if (metadata['type'] === 'date') {

        if (step['type'] === 'aggregate') {
            return {
                id: String(step.nodeId++) + measureId,
                name: 'Date (' + preferences['measure'] + ') ' + metadata['columns'][0], // what jqtree shows
                subset: 'date',
                cancellable: true,
                measure: preferences['measure'],
                column: metadata['columns'][0]
            }
        }

        // If the dates have not been modified, force bring the date from the slider
        if (preferences['userLower'] - preferences['minDate'] === 0 && preferences['userUpper'] - preferences['maxDate'] === 0) {
            if (preferences['userLower'] - preferences['handleLower'] === 0 &&
                preferences['userUpper'] - preferences['handleUpper'] === 0) {
                return {};
            }

            preferences['userLower'] = preferences['handleLower'];
            preferences['userUpper'] = preferences['handleUpper'];
        }

        // For mapping numerical months to strings in the child node name
        let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June",
            "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
            id: String(step.nodeId++) + measureId,
            name: name,
            type: 'rule',
            subset: metadata['type'],
            structure: metadata['structure'],
            children: [
                {
                    id: String(step.nodeId++) + measureId,
                    name: 'From: ' + monthNames[preferences['userLower'].getMonth()] + ' ' + preferences['userLower'].getDate() + ' ' + String(preferences['userLower'].getFullYear()),
                    fromDate: preferences['userLower'].getTime(),
                    cancellable: false,
                    show_op: false,
                    column: metadata['columns'][0]
                },
                {
                    id: String(step.nodeId++) + measureId,
                    name: 'To:   ' + monthNames[preferences['userUpper'].getMonth()] + ' ' + preferences['userUpper'].getDate() + ' ' + String(preferences['userUpper'].getFullYear()),
                    toDate: preferences['userUpper'].getTime(),
                    cancellable: false,
                    show_op: false,
                    // If the date is an interval, the last element will be different from the first
                    column: metadata['columns'][metadata['columns'].length - 1]
                }
            ],
            operation: 'and'
        };
    }

    if (['discrete', 'discrete_grouped'].includes(metadata['type'])) {
        // if aggregating, add the target format in the name
        let aggFormat = (step.type === 'aggregate' && 'aggregation' in preferences)
            ? ` (${preferences['aggregation']})` : '';

        // Make parent node
        let subset = {
            id: String(step.nodeId++) + measureId,
            name: name + aggFormat,
            operation: 'and',
            negate: 'false',
            column: metadata['columns'][0],
            formatSource: preferences['format'],
            formatTarget: preferences['aggregation'],
            alignment: preferences['alignment'],
            type: 'rule',
            subset: metadata['type'],
            children: []
        };

        // Add each selection to the parent node as another rule
        [...preferences['selections']]
            .sort((a, b) => typeof a === 'string' ? a.localeCompare(b) : a - b)
            .forEach(selection => subset['children'].push({
                id: String(step.nodeId++) + measureId,
                name: String(selection),
                value: selection,
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
            id: String(step.nodeId++) + measureId,
            name: name,
            operation: 'and',
            type: 'rule',
            subset: metadata['type'],
            // negate: 'false',
            children: []
        };

        let latitude = {
            id: String(step.nodeId++) + measureId,
            name: 'Latitude',
            column: metadata['columns'][0],
            // negate: 'false',
            show_op: false,
            children: []
        };

        latitude.children.push({
            id: String(step.nodeId++) + measureId,
            name: valUpper > valLower ? valUpper : valLower,
            show_op: false,
            cancellable: false
        });

        latitude.children.push({
            id: String(step.nodeId++) + measureId,
            name: valUpper < valLower ? valUpper : valLower,
            show_op: false,
            cancellable: false
        });

        let longitude = {
            id: String(step.nodeId++) + measureId,
            name: 'Longitude',
            operation: 'and',
            show_op: false,
            column: metadata['columns'][1],
            children: []
        };

        longitude.children.push({
            id: String(step.nodeId++) + measureId,
            name: valLeft > valRight ? valLeft : valRight,
            show_op: false,
            cancellable: false
        });

        longitude.children.push({
            id: String(step.nodeId++) + measureId,
            name: valLeft < valRight ? valLeft : valRight,
            show_op: false,
            cancellable: false
        });

        subset.children.push(latitude);
        subset.children.push(longitude);

        return subset
    }
}
