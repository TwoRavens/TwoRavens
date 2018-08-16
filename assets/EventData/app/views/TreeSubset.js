import m from 'mithril';
// Used for right panel query tree
import '../../../../node_modules/jqtree/tree.jquery.js';
import '../../../../node_modules/jqtree/jqtree.css';
import '../../pkgs/jqtree/jqtree.style.css';

import * as query from "../queryMongo";
import * as app from "../app";


export class TreeVariables {
    oncreate({dom}) {
        $(dom).tree({
            data: [...app.selectedVariables].map(element => ({
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
        $(dom).tree('loadData', [...app.selectedVariables].map(element => ({
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
    convertToJQTreeFormat(step) {
        return step.transforms.map(transform => ({
            id: step.id + '-' + transform.name,
            name: transform.name + ' = ' + transform.equation,
            cancellable: true,
            show_op: false
        }));
    }

    oncreate({attrs, dom}) {
        let transformTree = $(dom);
        let {step} = attrs;

        transformTree.tree({
            data: this.convertToJQTreeFormat(step),
            saveState: true,
            dragAndDrop: false,
            autoOpen: false,
            selectable: false,
            onCreateLi: function(node, $li) {
                if (!('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').prepend(buttonDeleteTransform(node.id));
                }
            }
        })
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let {step} = attrs;
        let subsetTree = $(dom);
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', this.convertToJQTreeFormat(step));
        subsetTree.tree('setState', state);
    }

    view() {
        return m('div#transformTree')
    }
}

function buttonDeleteTransform(id) {
    return `<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;margin-top:2px;height:18px' onclick='callbackDeleteTransform("${id}")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>`;
}


export class TreeQuery {

    oncreate({attrs, dom}) {
        // Create the query tree
        let subsetTree = $(dom);

        let {step} = attrs;

        subsetTree.tree({
            data: step.abstractQuery,
            saveState: true,
            dragAndDrop: true,
            autoOpen: true,
            selectable: false,

            // Executed for every node and leaf in the tree
            onCreateLi: function (node, $li) {

                if ('negate' in node) {
                    $li.find('.jqtree-element').prepend(buttonNegate(node.id, node.negate));
                }
                if ((!('show_op' in node) || ('show_op' in node && node.show_op)) && 'operation' in node) {
                    let canChange = node.type !== 'query' && !node.editable;
                    $li.find('.jqtree-element').prepend(buttonOperator(node.id, node.operation, canChange));
                }
                if (!('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').append(buttonDelete(node.id));
                }
                // Set a left margin on the first element of a leaf
                if (node.children.length === 0) {
                    $li.find('.jqtree-element:first').css('margin-left', '14px');
                }
            },
            onCanMove: function (node) {
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

        subsetTree.on(
            'tree.move',
            function (event) {
                event.preventDefault();
                event.move_info.do_move();

                // Save changes when an element is moved
                step.abstractQuery = JSON.parse(subsetTree.tree('toJson'));
                app.hideFirst(step.abstractQuery);
                m.redraw();
            }
        );

        subsetTree.on(
            'tree.click',
            function (event) {
                let node = event.node;
                if (node.name === 'Custom Subset') {
                    app.canvasPreferences['Custom'] = app.canvasPreferences['Custom'] || {};
                    app.canvasPreferences['Custom']['text'] = JSON.stringify(node.custom, null, '\t');
                    app.canvasRedraw['Custom'] = true;
                    app.setSelectedCanvas("Custom");
                    m.redraw()
                }

                if (event.node.hasChildren()) {
                    $('#subsetTree').tree('toggle', event.node);
                }
            }
        );

        subsetTree.bind(
            'tree.dblclick',
            function (event) {
                let tempQuery = query.buildSubset([event.node]);
                if ($.isEmptyObject(tempQuery)) {
                    alert("\"" + event.node.name + "\" is too specific to parse into a query.");
                } else {
                    app.canvasPreferences['Custom'] = app.canvasPreferences['Custom'] || {};
                    app.canvasPreferences['Custom']['text'] = JSON.stringify(tempQuery, null, '\t');
                    app.canvasRedraw['Custom'] = true;
                    app.setSelectedCanvas("Custom");
                    m.redraw()
                }
            }
        );
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let {step} = attrs;
        let subsetTree = $(dom);
        let state = subsetTree.tree('getState');
        subsetTree.tree('loadData', step.abstractQuery);
        subsetTree.tree('setState', state);
    }

    view() {
        return m('div#subsetTree')
    }
}

function buttonNegate(id, state) {
    // This state is negated simply because the buttons are visually inverted. An active button appears inactive
    // This is due to css tomfoolery
    if (!state) {
        return '<button id="boolToggle" class="btn btn-default btn-xs" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate(' + id + ', true)">not</button> '
    } else {
        return '<button id="boolToggle" class="btn btn-default btn-xs active" type="button" data-toggle="button" aria-pressed="true" onclick="callbackNegate(' + id + ', false)">not</button> '
    }
}

function buttonOperator(id, state, canChange) {
    if (canChange) {
        if (state === 'and') {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(${id}, 'or')">and</button> `
        } else {
            // language=HTML
            return `<button class="btn btn-default btn-xs active" style="width:33px" type="button" data-toggle="button" aria-pressed="true" onclick="callbackOperator(${id}, 'and')">or</button> `
        }
    } else {
        if (state === 'and') {
            return '<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">and</button> '
        } else {
            return '<button class="btn btn-default btn-xs active" style="width:33px;background:none" type="button" data-toggle="button" aria-pressed="true">or</button> '
        }
    }
}

function buttonDelete(id) {
    return "<button type='button' class='btn btn-default btn-xs' style='background:none;border:none;box-shadow:none;float:right;margin-top:2px;height:18px' onclick='callbackDelete(" + String(id) + ")'><span class='glyphicon glyphicon-remove' style='color:#ADADAD'></span></button></div>";
}

// this is reused for both unit and event measures (accumulations)
export class TreeAggregate {

    oncreate({attrs, dom}) {
        let aggregateTree = $(dom);

        aggregateTree.tree({
            data: attrs.data,
            saveState: true,
            dragAndDrop: false,
            autoOpen: false,
            selectable: false,
            onCreateLi: function(node, $li) {
                if (!('cancellable' in node) || (node['cancellable'] === true)) {
                    $li.find('.jqtree-element').prepend(buttonDeleteTransform(node.id));
                }
            }
        })
    }

    // when mithril updates this component, it redraws the tree with whatever the abstract query is
    onupdate({attrs, dom}) {
        let aggregateTree = $(dom);
        let state = aggregateTree.tree('getState');
        aggregateTree.tree('loadData', attrs.data);
        aggregateTree.tree('setState', state);
    }

    view() {
        return m('div#aggregateTree')
    }
}
