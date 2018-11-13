import hopscotch from 'hopscotch';
import '../../pkgs/hopscotch/hopscotch.style.css'
import * as common from '../../common/common';
import m from 'mithril';

import '../../../node_modules/ace-builds/src-min-noconflict/ace.js';

export function tourStartGeneral() {
    hopscotch.endTour(false);
    hopscotch.startTour(generalTour);
}

let generalTour = {
    id: "subset-general-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Data Filtering",
            content: "The left panel provides access to data filtering tools. Event data is stored in tabular form. 'Variables' filters columns, and 'Subsets' filters rows.",
            target: "leftpaneltitle",
            placement: "right"
        },
        {
            title: "Filtering",
            content: "Each record has identifiable sources, targets, dates, actions and locations. These identifiers are crucial for selecting useful data.",
            target: "leftPanelMenuButtonBar",
            placement: "right"
        },
        {
            title: "Stage",
            content: "After selecting your subset preferences in the canvas, use 'Stage' to store a snapshot of those preferences in the summary panel.",
            target: "btnStage",
            onNext: () => {
                common.setPanelOpen('right');
                m.redraw();
            },
            placement: "top",
            arrowOffset: 250
        },
        {
            title: "Combining Subsets",
            content: "Multiple filters can be chained together with logical operators and grouping. For instance, records from Guyana in 1985 require both a Date subset and Location subset.",
            target: "headerSubsets",
            placement: "left"
        },
        {
            title: "Grouping and Dragging",
            content: "Each snapshot of subset preferences can be considered a 'rule.' Rules can be grouped together under one logical operator with the 'Group' button. Rules can also be re-ordered by dragging, or moved into groups.",
            target: "subsetTree",
            placement: "left"
        },
        {
            title: "Subset",
            content: "Once the constraints have been staged, use 'Update' to apply the constraints in the summary panel to the full dataset. This will encapsulate the constraints as a query, and redraw all the plots and figures.",
            target: "btnUpdate",
            placement: "left"
        },
        {
            title: "Query Handling",
            content: "Previous subsets are grouped, so the data set is successively refined. These elements from previous subsets are highlighted blue. They may be deleted, but may no longer be edited.",
            target: "subsetTree",
            placement: "left"
        },
        {
            title: "Download",
            content: "Download the data at any time. The downloaded file reflects the current constraints in the query summary panel, not submitted subsets. The variables menu is used to select columns in this table. If no variables are selected, all are returned.",
            target: "btnDownload",
            placement: "left",
            arrowOffset: 140,
            height: 150
        },
        {
            title: "Reset",
            content: "This clears all selected variables and subsets, but does not clear the preferences in the various subset panels.",
            target: "btnReset",
            placement: "left"
        }
    ]
};

export function tourStartDyad() {
    hopscotch.endTour(false);
    hopscotch.startTour(dyadTour);
}

let dyadTour = {
    id: "subset-dyad-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "The actor menu provides a flexible way to find relationships between two sets of actors.",
            target: "leftPanelTitle",
            placement: "bottom",
            width: 200
        },
        {
            title: "Source vs. Target",
            content: "Both the source node and target node must be populated with selections from the left panel, and a relationship must be drawn between the nodes. There is more information about this later.",
            target: "dyadTab",
            placement: "left",
            width: 200
        },
        {
            title: "Dyad Selection",
            content: "Select the sources that should be in the relationship in the left panel. This may seem daunting, but there are many tools available to make this task easier.",
            target: "searchListMonads",
            placement: "left",
            width: 200
        },
        {
            title: "Dyad Selection: Filtering",
            content: "Use the right panel filters to view a specific portion of selection list. When enabled, the options in the left panel are reduced to the records that match the filter.",
            target: "searchListMonads",
            placement: "right",
            width: 200
        },
        {
            title: "Dyad Selection: Filtering",
            content: "When the selection list is filtered, use the 'Select All' and 'Clear All' buttons to select all the contents of a filter quickly. Use the 'Clear All Filters' button to return to the full list of actors. Notice the selections that are not matched by the filter do not change.",
            target: "dyadSelectAll",
            placement: "right",
            width: 200
        },
        {
            title: "Nodes",
            content: "All of the selections are now elements of the bolded node in the diagram on the right. The 'Show Selected' checkbox, back in the filters menu, is useful for viewing the contents of the bolded node. You can also switch between nodes by selecting them in the diagram.",
            target: "actorLinkDiv",
            placement: "left",
        },
        {
            title: "Nodes: Properties",
            content: "Rename nodes to make them easier to identify, or delete them if no longer useful. New nodes may also be added via 'New Group.' Notice the node is added with respect to the 'Sources/Targets' radio button.",
            target: "editGroupName",
            placement: "right",
        },
        {
            title: "Nodes: Relationships",
            content: "Add a relationship between two groups of actors by right clicking on the source node, then clicking on the target node. Now all records where a source value selected in the source node and a target value selected in the target node will be matched in the dyad.",
            target: "actorLinkDiv",
            placement: "left",
        },
        {
            title: "Nodes: Relationships",
            content: "When two nodes are connected, upgrade to a bi-directional relationship by connecting the target node to the source node. Two nodes can also be merged by dragging one above the other.",
            target: "actorLinkDiv",
            placement: "left",
        },
        {
            title: "Stage",
            content: "Use 'Stage' to take a snapshot of the dyad relationships shown in the diagram and stage it in the right panel.",
            target: 'btnStage',
            placement: "left",
        }
    ]
};

export function tourStartDate() {
    hopscotch.endTour(false);
    hopscotch.startTour(dateTour);
}

let dateTour = {
    id: "subset-date-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Broad Selection",
            content: "Use the brushes at the bottom of the plot to zoom into the date region of interest.",
            target: "#dateSVGdiv",
            placement: "bottom",
            width: 200
        },
        {
            title: "Apply Broad Selection",
            content: "Use the zoom in the date plot to set a constrained date interval. The blue region is selected, and the grey region is excluded.",
            target: "setDatefromSlider",
            placement: "left"
        },
        {
            title: "Fine Selection",
            content: "Tune the date interval to the exact day. The calendars can be helpful, but formatted text works as well.",
            target: "dateFromLab",
            placement: "left"
        },
        {
            title: "Stage",
            content: "'Stage' places the selected date range in the query summary.",
            target: "btnStage",
            placement: "left",
            arrowOffset: 50
        }
    ]
};

export function tourStartDiscrete() {
    hopscotch.endTour(false);
    hopscotch.startTour(discreteTour);
}

let discreteTour = {
    id: "subset-discrete-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [,
        {
            title: "Overview",
            content: "The bar plot shows the frequencies of each category in a column of a dataset. Hover over a bar to see the exact count of elements in the category and additional formatting information.",
            target: "SVGbin",
            placement: "left",
            width: 200
        },
        {
            title: "Multiple Plots",
            content: "Some datatypes may have multiple representations in different formats. For instance, action CAMEO codes may have penta class, root code and PLOVER representations, each with their own plot.",
            target: "SVGbin",
            placement: "left",
            width: 200
        },
        {
            title: "Overview",
            content: "Click on a bar to select that category. Making a selection will update all representations. A striped bar denotes selection of a portion of said category.",
            target: "SVGbin",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected categories in the query summary. The faded 'not' in the query summary permits a negation: all records NOT in the selected categories will be matched.",
            target: "btnStage",
            placement: "left",
            arrowOffset: 100
        }
    ]
};

export function tourStartDiscreteGrouped() {
    hopscotch.endTour(false);
    hopscotch.startTour(discreteGroupedTour);
}

let discreteGroupedTour = {
    id: "subset-discrete-grouped-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "The initial graph shows the frequencies of a more granular category, aggregated into groups. For example, country frequencies may be aggregated into regions. Click a bar to draw a second graph with the categories contained in that group.",
            target: "graphContainer",
            placement: "bottom",
            width: 200
        },
        {
            title: "Selecting Plot Elements",
            content: "The grouped frequencies plot has the option to plot all groups, whereas individual group plots have options to select all or deselect all. The shrinker is helpful for navigating the page quickly.",
            target: "graphContainer",
            placement: "left",
            width: 200
        },
        {
            title: "Selected Categories",
            content: "Click on a selection to delete it, or use the reset button to start over.",
            target: "selectedCategoriesHeader",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected countries list in the query summary. Click the faded 'not' in the query summmary to negate the selection: all records NOT in the selection list will be matched.",
            target: "btnStage",
            placement: "left",
            arrowOffset: 100
        }
    ]
};


export function tourStartCoordinates() {
    hopscotch.endTour(false);
    hopscotch.startTour(coordinatesTour);
}

let coordinatesTour = {
    id: "subset-coordinates-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "Limit records via latitude and longitude demarcations. Edit the text to move the box on the world map, or move the box on the world map to edit the text in the boxes.",
            target: "#latUpperLabel",
            placement: "bottom",
            width: 200
        },
        {
            title: "Switched Bounds",
            content: "If a boundary is given that is beyond the other boundary, the labels will switch. The labels will switch back if the box on the world map is clicked, or if the text boxes are corrected manually.",
            target: "#latUpperLabel",
            placement: "bottom",
            width: 200
        },
        {
            title: "Map Editing",
            content: "Both edges and corners of the box can be dragged, as well as the entire box!",
            target: "#worldMapImage",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected bounds in the query summary. The faded 'not' in the query summary allows for negation of the overall box. One may also negate latitude and longitude to select regions outside the demarcated row/column.",
            target: "#btnStage",
            placement: "left",
            arrowOffset: 140,
            width: 200
        }
    ]
};


export function tourStartCustom() {
    hopscotch.endTour(false);
    hopscotch.startTour(customTour);
}

let customTour = {
    id: "subset-custom-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "View the Mongo query used to retrieve the data. Important! Notice that double clicking rules, groups, and queries from the right panel will fill the editor with the query for that element in the tree.",
            target: "#subsetCustomLabel",
            placement: "bottom",
            width: 200
        },
        {
            title: "Format",
            content: "The query is formatted as JSON. These queries may be extended using the <a style='color: #0645AD;' href='https://docs.mongodb.com/manual/reference/operator/query/' target='_blank'>MongoDB query operators</a>.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "Validate",
            content: "Check if the query is valid JSON, and check that the query can be interpreted by MongoDB.",
            target: "#subsetCustomValidate",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected bounds in the query summary. If the custom query is not valid, a warning will be provided. Keep in mind that matching on a non-existent column is completely valid and will match zero records.",
            target: "#btnStage",
            placement: "left",
            arrowOffset: 140,
            width: 200
        }
    ]
};



export function tourStartCustomExamples() {
    editor = ace.edit("subsetCustomEditor");
    hopscotch.endTour(false);
    hopscotch.startTour(customExampleTour);
}

let example_date = `{
  "<date>": {
    "$gte": "08-14-1994"
  }
}`;

let example_group = `{
  "$or": [
    {
      "<date>": {
        "$gte": "08-14-1994"
      }
    },
    {
      "<CAMEO>": "0314"
    }
  ]
}`;

let example_actor = `{
  "$or": [
    {
      "<source>": {
        "$regex": ".*MUS.*"
      }
    },
    {
      "<target>": {
        "$regex": ".*MUS.*"
      }
    }
  ],
  "<CAMEO>": {"$in": ["022", "0314"]}
}`;

let editor;
let customExampleTour = {
    id: "subset-custom-tour-example",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "This is a walkthrough with examples on how to get started building your own queries. Note that contents in <brackets> denote column names. These must match the column names of the current dataset.",
            onNext: () => {
                editor.setValue(example_date);
                editor.clearSelection();
            },
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "Date Example",
            content: "Restrict to any date greater than August 14, 1994.",
            onNext: () => {
                editor.setValue(example_group);
                editor.clearSelection();
            },
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "Group Example",
            content: "Use $and and $or to construct more complex groupings of restrictions on the data.",
            onNext: () => {
                editor.setValue(example_actor);
                editor.clearSelection();
            },
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "Actor Example",
            content: "Restrict to any event with an actor that contains the substring \"MUS\" and the CAMEO code is 022 or 0314. Note that this example is only relevant for a phoenix dataset.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        }
    ]
};

export function tourStartAggregation() {
    hopscotch.endTour(false);
    hopscotch.startTour(aggregationTour);
}

let aggregationTour = {
    id: "aggregation-general-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Data Aggregation",
            content: "Aggregation groups the raw data points provided by subset into frequency bins based on an event measure.",
            target: "leftpaneltitle",
            placement: "right"
        },
        {
            title: "Unit of Measure",
            content: "The grouping is defined in unit of measure. A group may be a combination of actor requirements and date intervals.",
            target: "headerUnit_of_Measure",
            placement: "right"
        },
        {
            title: "Event Measure",
            content: "Once the data is grouped, the number of events with the specified event measure are counted. For example, there may be 200 events with CAMEO code '120' during the month of October, 1992.",
            target: "headerEvent_Measure",
            placement: "right"
        },
        {
            title: "Aggregate",
            content: "Display the frequencies in the results table by clicking update.",
            target: "btnUpdate",
            placement: "left"
        },
        {
            title: "Data Results",
            content: "The Date, Source, and Target columns indicate how data will be grouped. Depending on the chosen Event Measure, frequencies will be displayed in columns.",
            target: "aggregDataOutput",
            placement: "top"
        },
        {
            title: "Download",
            content: "Download the aggregated data here!",
            target: "btnDownload",
            placement: "left"
        },
        {
            title: "Subset",
            content: "To make modifications to the subsetted data, or download the subsetted data before aggregation, return to the subset menu.",
            target: "btnSubsetMode",
            placement: "left"
        }
    ]
};

export function tourStartEventMeasure() {
    hopscotch.endTour(false);
    hopscotch.startTour(unitMeasureTour);
}

let unitMeasureTour = {
    id: "unit-measure-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Event Measure",
            content: "Aggregation requires at least one event measure! Make some selections, then stage, and try again.",
            target: "headerEvent_Measures",
            placement: "right"
        }
    ]
};

export function tourStartSaveQueryEmpty() {
    hopscotch.endTour(false);
    hopscotch.startTour(saveQueryTourEmpty)
}

let saveQueryTourEmpty = {
    id: "save-query-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Stage Subset",
            content: "Before downloading or saving, first stage a subset of the data.",
            target: "btnStage",
            placement: "top"
        },
        {
            title: "Update Subset",
            content: "Then click update to construct a query with any staged subsets. Staged subsets that are not part of a query are not saved or included in the download.",
            target: "btnUpdate",
            placement: "left"
        }
    ]
};