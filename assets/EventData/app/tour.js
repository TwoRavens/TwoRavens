import {showCanvas} from "./app";
import hopscotch from 'hopscotch';
import * as common from '../../common/app/common';
import m from 'mithril';

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
            target: "buttonDownload",
            placement: "left",
            arrowOffset: 140,
            height: 150
        },
        {
            title: "Reset",
            content: "This clears all selected variables and subsets, but does not clear the preferences in the various subset panels.",
            target: "#btnReset",
            placement: "left"
        }
    ]
};

export function tourStartActor() {
    showCanvas('Actor');
    hopscotch.endTour(false);
    hopscotch.startTour(actorTour);
}

let actorTour = {
    id: "subset-actor-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "The actor menu provides a flexible way to find relationships between two sets of actors.",
            target: "subsetsListActor",
            placement: "bottom",
            width: 200
        },
        {
            title: "Source vs. Target",
            content: "Both the source node and target node must be populated with actor tags, and a relationship must be drawn between the nodes. There is more information about this later.",
            target: "actorRadio",
            placement: "left",
            width: 200
        },
        {
            title: "Actor Selection",
            content: "Select the source actors that should be in the relationship in the left panel. This may seem daunting, but there are many tools available to make this task easier.",
            target: "#fullContainer",
            placement: "left",
            width: 200
        },
        {
            title: "Actor Selection: Filtering",
            content: "Use the right panel filters to view a specific portion of the actor list. When enabled, the actors in the left panel are reduced to the matching tags. Filtering can detect countries, organizations, attributes and roles.",
            target: "#fullContainer",
            placement: "right",
            width: 200
        },
        {
            title: "Actor Selection: Filtering",
            content: "When the actor list is filtered, use the 'Select All' and 'Clear All' to select all the contents of a filter quickly. Use the 'Clear All Filters' button to return to the full list of actors. Notice that selections made before the filter are not lost.",
            target: "#fullContainer",
            placement: "right",
            width: 200
        },
        {
            title: "Nodes",
            content: "All of the selected actors are now elements of the bolded node in the diagram to the right. The 'Show Selected' checkbox, back in the filters menu, is useful for viewing the contents of the bolded node. You can also switch between nodes by selecting them in the diagram.",
            target: "#actorLinkDiv",
            placement: "left",
        },
        {
            title: "Nodes: Properties",
            content: "Rename nodes to make them easier to identify, or delete them if no longer useful. New nodes may also be added via 'New Group.' Notice the node is added with respect to the 'Sources/Targets' radio button.",
            target: "#editGroupName",
            placement: "right",
        },
        {
            title: "Nodes: Relationships",
            content: "Add a relationship between two groups of actors by right clicking on the source node, then clicking on the target node. Now all records with a source actor in the source node and a target actor in the target node will be matched by the actor filter.",
            target: "#actorLinkDiv",
            placement: "left",
        },
        {
            title: "Nodes: Relationships",
            content: "When two nodes are connected, upgrade to a bi-directional relationship by connecting the target node to the source node. Two nodes can also be merged by dragging one above the other.",
            target: "#actorLinkDiv",
            placement: "left",
        },
        {
            title: "Stage",
            content: "Use 'Stage' to take a snapshot of the relationships actor lists in the diagram and place it in the right panel.",
            target: "#btnStage",
            placement: "left",
        }
    ]
};

export function tourStartDate() {
    showCanvas('Date');
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
            target: "#dateSVG",
            placement: "bottom",
            width: 200
        },
        {
            title: "Apply Broad Selection",
            content: "Use the zoom in the date plot to set a constrained date interval. The blue region is selected, and the grey region is excluded.",
            target: "#setDatefromSlider",
            placement: "left"
        },
        {
            title: "Fine Selection",
            content: "Tune the date interval to the exact day. The calendars can be helpful, but formatted text works as well.",
            target: "#dateFromLab",
            placement: "left"
        },
        {
            title: "Stage",
            content: "'Stage' places the selected date range in the query summary.",
            target: "#btnStage",
            placement: "left",
            arrowOffset: 50
        }
    ]
};

export function tourStartAction() {
    showCanvas('Action');
    hopscotch.endTour(false);
    hopscotch.startTour(actionTour);
}

let actionTour = {
    id: "subset-action-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [,
        {
            title: "Overview",
            content: "Action codes are used to categorize the action summarized in a given news record.",
            target: "#actionMainGraph",
            placement: "left",
            width: 200
        },
        {
            title: "Penta Classes",
            content: "There are five primary classification classes, with a total of 20 subclasses. The names of these classes are visible on hover. Selection of a penta-class will select all its inherited CAMEO codes.",
            target: "#actionMainGraph",
            placement: "right",
            width: 200
        },
        {
            title: "CAMEO Codes",
            content: "CAMEO is a coding scheme for classifying articles. 20 bins of CAMEO codes are available in the dataset.",
            target: "#actionSubGraph",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected codes in the query summary. The faded 'not' in the query summary permits a negation: all records NOT in the selected codes will be matched.",
            target: "#btnStage",
            placement: "left",
            arrowOffset: 100
        }
    ]
};

export function tourStartLocation() {
    showCanvas('Location');
    hopscotch.endTour(false);
    hopscotch.startTour(locationTour);
}

let locationTour = {
    id: "subset-location-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "Select a world region to draw a second graph with the countries in said region at the bottom of the page. Region plots have selectable bars for adding countries to the 'Selected Countries' box.",
            target: "#regionLabel",
            placement: "bottom",
            width: 200
        },
        {
            title: "Selecting Plot Elements",
            content: "The world region plot has the option to plot all regions, whereas individual region plots have options to select all or deselect all. The shrinker is helpful for navigating the page quickly.",
            target: "#regionLabel",
            placement: "left",
            width: 200
        },
        {
            title: "Plotting Tools",
            content: "The world region plot has the option to plot all regions, whereas individual region plots have options to select all or deselect all. The shrinker is helpful for navigating the page quickly.",
            target: "#Collapse_All",
            placement: "left",
            width: 200
        },
        {
            title: "Selected Countries",
            content: "Click on a country to delete it, or use the reset button to start over.",
            target: "#countryTableHeader",
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected countries list in the query summary. The faded 'not' in the query summmary permits a negation: all records NOT in the selected countries list will be matched.",
            target: "#btnStage",
            placement: "left",
            arrowOffset: 100
        }
    ]
};


export function tourStartCoordinates() {
    showCanvas('Coordinates');
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
    showCanvas('Custom');
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
            title: "Column Names",
            content: "Column names are generalized to be compatible across datasets using the <> notation. These generalized columns, or the column names specific to the dataset, are compatible with a separate Event Data R-package developed at the University of Texas at Dallas.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "R Package",
            content: "Any query here may be reused in the <a style='color: #0645AD;' href='https://github.com/KateHyoung/UTDEventData/' target='_blank'>Event Data R-Package</a>.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "API Endpoint",
            content: "Alternatively, Mongo queries may be submitted directly to the <a style='color: #0645AD;' href='https://github.com/Sayeedsalam/spec-event-data-server/' target='_blank'>API linked here</a>. Note that generalized column names are not supported, but there are endpoints for retrieving dataset-specific column names.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        },
        {
            title: "Data Source",
            content: "Data is hosted at <a style='color: #0645AD;' href='http://eventdata.utdallas.edu/data.html' target='_blank'>the Real Time Event Data service</a>.",
            target: "#subsetCustomEditor",
            placement: "left",
            width: 200
        }
        // {
        //     title: "Validate",
        //     content: "Check if the query is valid JSON, and check that the query can be interpreted by MongoDB.",
        //     target: "#subsetCustomValidate",
        //     placement: "left",
        //     width: 200
        // },
        // {
        //     title: "Stage",
        //     content: "'Stage' places the selected bounds in the query summary. If the custom query is not valid, a warning will be provided. Keep in mind that matching on a non-existent column is completely valid.",
        //     target: "#btnStage",
        //     placement: "left",
        //     arrowOffset: 140,
        //     width: 200
        // }
    ]
};


export function tourStartAggregation() {
    hopscotch.endTour(false);
    hopscotch.startTour(aggregationTour);
}

let aggregationTour = {
    id: "subset-general-tour",
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
            content: "Once the data is grouped, the number of events with the specified event measure are counted. For example, there may be 200 events with CAMEO code '12' during the month of October, 1992.",
            target: "headerEvent_Measure",
            placement: "right"
        },
        {
            title: "Data Results",
            content: "The Date, Source, and Target columns indicate how data will be grouped. Depending on the chosen Event Measure, frequencies will be displayed in columns by CAMEO root codes or penta classes.",
            target: "aggregTable",
            placement: "top"
        },
        {
            title: "Aggregate",
            content: "The TBD values in the Data Results are updated with the actual frequencies when the Update button is clicked.",
            target: "btnUpdate",
            placement: "left"
        },
        {
            title: "Download",
            content: "Download the aggregated data here!",
            target: "buttonDownload",
            placement: "left"
        },
        {
            title: "Subset",
            content: "To make modifications to the subsetted data, or download the subsetted data before aggregation, return to the subset menu.",
            target: "btnSubsetSubmit",
            placement: "left"
        }
    ]
};