var generalTour = {
    id: "subset-general-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Data Filtering",
            content: "The left panel provides access to data filtering tools. Event data is stored in tabular form. 'Variables' filters columns, and 'Subsets' filters rows.",
            target: document.querySelector("#leftpaneltitle"),
            placement: "right"
        },
        {
            title: "Filtering",
            content: "Each record has identifiable sources, targets, dates, actions and locations. These identifiers are crucial for selecting useful data.",
            target: document.querySelector("#leftpanelButtons"),
            placement: "right"
        },
        {
            title: "Stage",
            content: "After selecting your subset preferences in the canvas, use 'Stage' to store a snapshot of those preferences in the summary panel.",
            target: document.querySelector("#stageButton"),
            onNext: openRightPanel,
            placement: "top",
            arrowOffset: 250
        },
        {
            title: "Combining Subsets",
            content: "Multiple filters can be chained together with logical operators and grouping. For instance, records from Guyana in 1985 require both a Date subset and Location subset.",
            target: document.querySelector("#querySubsets"),
            placement: "left"
        },
        {
            title: "Grouping and Dragging",
            content: "Each snapshot of subset preferences can be considered a 'rule.' Rules can be grouped together under one logical operator with the 'Group' button. Rules can also be re-ordered by dragging, or moved into groups.",
            target: document.querySelector("#querySubsets"),
            placement: "left"
        },
        {
            title: "Subset",
            content: "Once the constraints have been staged, use 'Subset' to apply the constraints in the summary panel to the full dataset. This will encapsulate the constraints as a query, and redraw all the plots and figures.",
            target: document.querySelector("#btnSubmit"),
            placement: "left"
        },
        {
            title: "Query Handling",
            content: "Previous subsets are grouped, so the data set is successively refined. These elements are highlighted blue. They can be deleted, but can no longer be edited.",
            target: document.querySelector("#querySubsets"),
            placement: "left"
        },
        {
            title: "Download",
            content: "Download the data at any time. The downloaded file reflects the current constraints in the query summary panel, not submitted subsets. The variables menu is used to select columns in this table. If no variables are selected, all are returned.",
            target: document.querySelector("#buttonDownload"),
            placement: "left",
            arrowOffset: 140,
            height: 150
        },
        {
            title: "Reset",
            content: "This clears all selected variables and subsets, but does not clear the preferences in the various subset panels.",
            target: document.querySelector("#btnReset"),
            placement: "left"
        }
    ]
};

tourStartActor = function() {
    showSubset('Actor');
    hopscotch.startTour(actorTour);
};

var actorTour = {
    id: "subset-actor-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "The actor menu provides a flexible way to find relationships between two sets of actors.",
            target: document.querySelector("#actorSelectionTitle"),
            placement: "left",
            width: 200
        },
        {
            title: "Source vs. Target",
            content: "Both the source node and target node must be populated with actor tags, and a relationship must be drawn between the nodes. There is more information about this later.",
            target: document.querySelector("#actorRadio"),
            placement: "left",
            width: 200
        },
        {
            title: "Actor Selection",
            content: "Select the source actors that should be in the relationship in the left panel. This may seem daunting, but there are many tools available to make this task easier.",
            target: document.querySelector("#fullContainer"),
            placement: "left",
            width: 200
        },
        {
            title: "Actor Selection: Filtering",
            content: "Use the right panel filters to view a specific portion of the actor list. When enabled, the actors in the left panel are reduced to the matching tags. Filtering can detect countries, organizations, attributes and roles.",
            target: document.querySelector("#fullContainer"),
            placement: "right",
            width: 200
        },
        {
            title: "Actor Selection: Filtering",
            content: "When the actor list is filtered, use the 'Select All' and 'Clear All' to select all the contents of a filter quickly. Use the 'Clear All Filters' button to return to the full list of actors. Notice that selections made before the filter are not lost.",
            target: document.querySelector("#fullContainer"),
            placement: "right",
            width: 200
        },
        {
            title: "Nodes",
            content: "All of the selected actors are now elements of the bolded node in the diagram to the right. The 'Show Selected' checkbox, back in the filters menu, is useful for viewing the contents of the bolded node. You can also switch between nodes by selecting them in the diagram.",
            target: document.querySelector("#actorLinkDiv"),
            placement: "left",
        },
        {
            title: "Nodes: Properties",
            content: "Rename nodes to make them easier to identify, or delete them if no longer useful. New nodes may also be added via 'New Group.' Notice the node is added with respect to the 'Sources/Targets' radio button.",
            target: document.querySelector("#editGroupName"),
            placement: "right",
        },
        {
            title: "Nodes: Relationships",
            content: "Add a relationship between two groups of actors by right clicking on the source node, then clicking on the target node. Now all records with a source actor in the source node and a target actor in the target node will be matched by the actor filter.",
            target: document.querySelector("#actorLinkDiv"),
            placement: "left",
        },
        {
            title: "Nodes: Relationships",
            content: "When two nodes are connected, upgrade to a bi-directional relationship by connecting the target node to the source node. Two nodes can also be merged by dragging one above the other.",
            target: document.querySelector("#actorLinkDiv"),
            placement: "left",
        },
        {
            title: "Stage",
            content: "Use 'Stage' to take a snapshot of the relationships actor lists in the diagram and place it in the right panel.",
            target: document.querySelector("#stageButton"),
            placement: "left",
        }
    ]
};

tourStartDate = function() {
    showSubset('Date');
    hopscotch.startTour(dateTour);
};

var dateTour = {
    id: "subset-date-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Broad Selection",
            content: "Use the brushes at the bottom of the plot to zoom into the date region of interest.",
            target: document.querySelector("#dateSVG"),
            placement: "left",
            width: 200
        },
        {
            title: "Apply Broad Selection",
            content: "Use the zoom in the date plot to set a constrained date interval. The blue region is selected, and the grey region is excluded.",
            target: document.querySelector("#setDatefromSlider"),
            placement: "left"
        },
        {
            title: "Fine Selection",
            content: "Tune the date interval to the exact day. The calendars can be helpful, but formatted text works as well.",
            target: document.querySelector("#dateFromLab"),
            placement: "left"
        },
        {
            title: "Stage",
            content: "'Stage' places the selected date range in the query summary.",
            target: document.querySelector("#stageButton"),
            placement: "left",
            arrowOffset: 50
        }
    ]
};

tourStartAction = function() {
    showSubset('Action');
    hopscotch.startTour(actionTour);
};

var actionTour = {
    id: "subset-action-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [,
        {
            title: "Overview",
            content: "Action codes are used to categorize the action summarized in a given news record.",
            target: document.querySelector("#actionMainGraph"),
            placement: "left",
            width: 200
        },
        {
            title: "Penta Classes",
            content: "There are five primary classification classes, with a total of 20 subclasses. The names of these classes are visible on hover. Selection of a penta-class will select all its inherited CAMEO codes.",
            target: document.querySelector("#actionMainGraph"),
            placement: "right",
            width: 200
        },
        {
            title: "CAMEO Codes",
            content: "CAMEO is a coding scheme for classifying articles. 20 bins of CAMEO codes are available in the dataset.",
            target: document.querySelector("#actionSubGraph"),
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected codes in the query summary. The faded 'not' in the query summary permits a negation: all records NOT in the selected codes will be matched.",
            target: document.querySelector("#stageButton"),
            placement: "left",
            arrowOffset: 100
        }
    ]
};

tourStartLocation = function() {
    showSubset('Location');
    hopscotch.startTour(locationTour);
};

var locationTour = {
    id: "subset-location-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "Select a world region to draw a second graph with the countries in said region at the bottom of the page. Region plots have selectable bars for adding countries to the 'Selected Countries' box.",
            target: document.querySelector("#regionLabel"),
            placement: "left",
            width: 200
        },
        {
            title: "Selecting Plot Elements",
            content: "The world region plot has the option to plot all regions, whereas individual region plots have options to select all or deselect all. The shrinker is helpful for navigating the page quickly.",
            target: document.querySelector("#regionLabel"),
            placement: "left",
            width: 200
        },
        {
            title: "Plotting Tools",
            content: "The world region plot has the option to plot all regions, whereas individual region plots have options to select all or deselect all. The shrinker is helpful for navigating the page quickly.",
            target: document.querySelector("#Collapse_All"),
            placement: "left",
            width: 200
        },
        {
            title: "Selected Countries",
            content: "Click on a country to delete it, or use the reset button to start over.",
            target: document.querySelector("#countryTableHeader"),
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected countries list in the query summary. The faded 'not' in the query summmary permits a negation: all records NOT in the selected countries list will be matched.",
            target: document.querySelector("#stageButton"),
            placement: "left",
            arrowOffset: 100
        }
    ]
};


tourStartCoordinates = function() {
    showSubset('Coordinates');
    hopscotch.startTour(coordinatesTour);
};

var coordinatesTour = {
    id: "subset-coordinates-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "Limit records via latitude and longitude demarcations. Edit the text to move the box on the world map, or move the box on the world map to edit the text in the boxes.",
            target: document.querySelector("#latUpperLabel"),
            placement: "left",
            width: 200
        },
        {
            title: "Switched Bounds",
            content: "If a boundary is given that is beyond the other boundary, the labels will switch. The labels will switch back if the box on the world map is clicked, or if the text boxes are corrected manually.",
            target: document.querySelector("#latUpperLabel"),
            placement: "left",
            width: 200
        },
        {
            title: "Map Editing",
            content: "Both edges and corners of the box can be dragged, as well as the entire box!",
            target: document.querySelector("#worldMapImage"),
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected bounds in the query summary. The faded 'not' in the query summary allows for negation of the overall box. One may also negate latitude and longitude to select regions outside the demarcated row/column.",
            target: document.querySelector("#stageButton"),
            placement: "left",
            arrowOffset: 140,
            width: 200
        }
    ]
};


tourStartCustom = function() {
    showSubset('Custom');
    hopscotch.startTour(customTour);
};

var customTour = {
    id: "subset-custom-tour",
    showPrevButton: true,
    nextOnTargetClick: true,
    steps: [
        {
            title: "Overview",
            content: "Manually create or edit a query. Important! Notice that right clicking rules, groups, and queries in the right panel will fill the editor with the query for that element in the tree.",
            target: document.querySelector("#subsetCustomLabel"),
            placement: "left",
            width: 200
        },
        {
            title: "Format",
            content: "The query must be formatted as JSON. Additionally, queries must be constructed with <a href='https://docs.mongodb.com/manual/reference/operator/query/' target='_blank'>MongoDB query operators</a>.",
            target: document.querySelector("#subsetCustomEditor"),
            placement: "left",
            width: 200
        },
        {
            title: "Column Names",
            content: "Feel free to use the generalized column names, denoted <>, or the column names specific to the dataset. For example, queries can be written directly with the Phoenix dataset labels.",
            target: document.querySelector("#subsetCustomEditor"),
            placement: "left",
            width: 200
        },
        {
            title: "Validate",
            content: "Check if the query is valid JSON, and check that the query can be interpreted by MongoDB.",
            target: document.querySelector("#subsetCustomValidate"),
            placement: "left",
            width: 200
        },
        {
            title: "Stage",
            content: "'Stage' places the selected bounds in the query summary. If the custom query is not valid, a warning will be provided. Keep in mind that matching on a non-existent column is completely valid.",
            target: document.querySelector("#stageButton"),
            placement: "left",
            arrowOffset: 140,
            width: 200
        }
    ]
};