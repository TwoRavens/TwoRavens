## Useful Paths  
Front-end code: `assets/app/eventdata/`  
Front-end style: `assets/css/eventdata.css`  
Query construction: `assets/app/manipulations/`    
Back-end: `tworavens_apps/eventdata_queries/`  

Data api endpoint: `eventdata/api/get-eventdata`  
Meta api endpoint: `eventdata/api/get-metadata`  

Data is stored in MongoDB in the event_data database, with one collection per dataset.  
Metadata is stored in the backend in three folders, a section is below.  

### Front-End
`assets/app/eventdata/eventdata.js`: Application state and methods to mutate state.
`assets/app/eventdata/Body_EventData.js`: Describes the Mithril virtual dom, which Mithril compiles to HTML.  

Mithril redraws the entire page after callbacks on UI elements or after `m.redraw()` is called. 
Since the page is completely determined by application state in `eventdata.js`, any changes to application state will be reflected on the page after the redraw. The declarative programming style used throughout the codebase to describe the HTML is typically much easier to write than editing every part of the HTML that is affected by a state change.   

The UI backbone in `Body_EventData.js` is composed of many individual components:  
`assets/common/views/`: Basic UI elements like buttons, panels, text fields  
`assets/app/canvases/`: Full menus shown in the center panel  
`assets/app/eventdata/canvases/`: Full menus specific to eventdata shown in the center panel 

#### Canvases
Each canvas take the attributes:  
`data`: collected from the dataset  
`metadata`: comes from the `subsets` key in the `/collections/` dataset config file. Describes how to build the menu  
`subsetName`: 'Actor', 'Action', 'Coordinates', etc  
`redraw`: boolean, when set, rebuild any html outside the virtual dom. "hard redraw"  
`setRedraw`: function, call with false to to turn off the hard redraw on the next mithril redraw  
`preferences`: menu state (which bars are selected, location of brushes in date plot, etc)

This interface shared for all the page load menus, subset menus, aggregation menus, results menus and D3M constraint menus.

The canvas state object is passed to the canvas and mutated as the user makes changes. The state object is stored under a key in `eventdata.subsetPreferences`.

### Metadata
There are three kinds of hardcoded metadata:  

`/collections/`: each file represents a dataset. This information is used on the homepage, and determines what operations are available on the dataset.  
`/alignments/`: each file contains a list of equivalencies between formats  
`/formats/`: these are scraped from the dataset codebooks. Any code used in the dataset has a label in these files.  

When data is collected to draw a subset menu, there is an additional step: 
If the column collected uses an alignment or format, a request is sent to retrieve it at the metadata api endpoint.
The returned metadata is stored in the frontend global variables `app.formattingData` and `app.alignmentData`.

### Data Pipeline
An abstract description of data subsetting steps is recorded in the global variable `app.manipulations`.  
An abstract description of the pending subset step and aggregation step are stored in `app.looseSteps`.  

Many database queries need to be constructed depending on application state. An abstract query description is built:  
`abstract query = (subsetting steps) + (pending subset, aggregation step or menu step)`

The abstract query is an array of objects, where each object represents a logical step in a data processing pipeline.
The abstract query is passed into a database adapter that converts the abstract query into an actual query.   
`{query, variables} = queryMongo.buildPipeline(abstractQuery, variables)`

The adapter also tracks the variables available at each step of the pipeline.

MongoDB is the only database with an adapter: `assets/app/manipulations/queryMongo.js`  

The MongoDB adapter targets the MongoDB 'aggregation framework' specification:  
https://docs.mongodb.com/manual/core/aggregation-pipeline/
   

### Abstract Steps
Each step of an abstract data pipeline is in one of these general formats:
```
{
    type: 'transform',
    transformations: [{name: 'y', equation: 'x^2 + 3'}, ...],
    expansions: [...]
}
```
```
{
    type: 'subset',
    abstractQuery: [JQTree structure]
}
```
```
{
    type: 'aggregate',
    measuresUnit: [JQTree structure],
    measuresAccum: [JQTree structure]
}
```
```
{
    type: 'menu',
    metadata: {
        type: 'date',
        ...
    },
    preferences: {...}
}
```  

The 'transform' step type is only used in D3M.  
The 'menu' step type is typically appended to an abstract pipeline just before the query is built.  

The JQTree structure is documented in `assets/app/manipulations/queryAbstract.js`


## Tools
For those who are just starting out with web development, suddenly needing Mithril, Babel, Webpack, NPM, Django, etc is very confusing. So I wrote an explanation on how the code in the IDE makes its way to your browser screen.

When we develop the .html file is hosted from a Django server. Django provides some administration features, like easy integration with a database and templates.

Starting with templates— A template is an html file, but there’s some additional markup for spots in the file that get replaced by variables in Django. So when you edit the domain in the /admin/ menu, Django inserts values into the html template at marked up spots before serving it as html.

The template file is practically empty, but it uses a script tag to include a .js file generated by webpack. This .js file includes a modified version of all of the static files for TwoRavens (.js, .css, .png). Some static files are too big to be bundled inline, or aren’t the right file type, so they get served from /static/ instead.

The reason I said ‘modified’ is, we actually have webpack configured to bundle the output of Babel, which transpiles our fancy new ES6 JavaScript to be cross-browser compatible with older JavaScript versions

To get Babel and webpack to update the bundle (the mashed up .js file) automatically, we run npm with a file watcher setting. To get Django to serve the html template we start the Django server. Both of these are handled with ‘fab run’ (or 'fab run_eventdata_dev'), and the output from the npm file watcher is displayed in that console.



That’s all fine and well, but we still haven’t actually generated any of the html dom yet, all we have is JavaScript.

Mithril is mounted to the body of the template. So when the page is loaded, the JavaScript executes and all the mithril code in index.js is loaded into a virtual dom, a purely JavaScript data structure. Mithril then converts the virtual dom into actual html and writes it to the body.

Whenever mithril ‘redraws’ it updates the virtual dom with menu state you define in JavaScript variables, and then updates only the relevant portions of the html.

A mithril redraw is automatically invoked when state is modified in the callback of a mithril virtual dom element (any m(...) element). Alternatively, if you update state outside of a mithril context (for example from a d3.js plot, or in the callback for a data request), you can trigger a redraw manually via m.redraw()
