# How to use the Mithril Common library
Each component is a self-contained menu element. To use one of these components in your menu:
1. import the component `import Classname from "./common/views/Classname";`
2. create a new instance `m(Classname, {interface options}, children)`

...where 'Classname' refers to the name of the component and {interface options} are specified below (and in the class' .js file).

# Git management
To add common to a new project:
```git submodule add -b master https://github.com/TwoRavens/common.git assets/common```
To update common in an existing project:
```git submodule update --remote```


## Button
Arbitrary attributes may be passed. This is more of a proof of concept
```
m(Button, {
    id: 'buttonID',
    text: 'Click Me!',
    onclick: () => console.log("buttonID was clicked"),
    })
```

## ButtonRadio

```
m(ButtonRadio, {
    sections: [
            {
                value: 'Button 1',
                title: 'Hover text',
                attrsInterface: {optional object of attributes}
            },
            ...
        ],
    defaultSection: string (optional),
    activeSection: string (optional),
    onclick: (value) => console.log(value + " was clicked.")
    attrsAll: {optional object of attributes to apply to the bar}
    attrsButtons: {optional object of attributes to apply to all buttons}
    selectWidth: 20 (optional int),
    hoverBonus: 10 (optional int),
    vertical: boolean (optional)
    })
```

The selectWidth option forces the selected button to be n percent wide.
The other buttons on the bar compensate.
If not included, then every button has even spacing.

The hoverBonus option makes the hovered button n percent larger when hovered.
Both hoverBonus and selectWidth may be used together. On both, don't pass a string%, pass the numeric.

defaultSection sets which element is selected on page load
activeSelection forces the selected element. This is for convenience when external events change the selected button

## Canvas
```
m(Canvas, {
    attrsAll: { additional attributes to apply to the outer div }
    }, contents)
```

Purpose:
1. if a left or right panel is not permitted to occlude the content on the canvas, this class resizes the contents to maintain a margin away from the panels
2. if the contents of the canvas overflow and cause a scroll bar, the left and right panel are shifted to maintain a margin
 
## Dropdown
```
m(Dropdown, {
    id: 'dropdownID' (applied to button and selectors)
    items: ['Item 1', 'Item 2', 'Item 3'],
    activeItem: 'Item 1', (optional)
    onclickChild: (value) => console.log(value + " was clicked.")
    dropWidth: 100px (sets the width of the dropdown)
    })
 ```

## DropdownPopup

```
m(DropdownPopup, {
    header: "my header",
    sections: [
        {
            name: "option 1",
            content: m(...)
        },
        {
            name: "option 2",
            content: m(...)
        }
    ],
    callback: (value) => console.log(value + " was selected.")
    attrsAll: {} (optional)
    })
```

When clicked, a menu pops up with a list of buttons. Click a button to enter a sub-menu.

## Footer
```
m(Footer, m(...))
```
Takes on the display settings defined in common.js.

## Header
```
m(Header, {
        image: src image,
        attrsInterface: {optional object of attributes}
    },
    m(...))
```

Creates a header bar at the top of the screen
The TwoRavens logo and hover are baked in
Resizes automatically for mobile formatting

## ListTags
```
m(ListTags, {
    tags: ['value 1', 'value 2', 'value 3'],
    attrsTags: {}, (attributes to apply to each tag)
    ondelete: (tag) => console.log(tag + " was deleted"),
    readonly: boolean
})
```

Returns an inline array of elements with bubbles around them
Each bubble contains the tag and a cancel button (if not readonly)


## MenuHeaders
Separate a list of elements with headers. Interchangeable with MenuTabbed.
```
m(MenuHeaders, {
    sections: [..., 
        {
            value: string
            idSuffix: suffix to add to generated id strings
            contents: m(...)
            display: if 'none', then the section will be hidden
        }]
    })
```

## MenuTabbed
Separate a list of elements with tabs. Interchangeable with MenuHeaders.
```
m(MenuTabbed, {
    id: string,
    sections: [..., 
        {
            value: string
            title: text to use on hover,
            idSuffix: suffix to add to generated id strings
            contents: m(...)
            display: if 'none', then the button won't be visible on the button bar
        }],
    callback: (value) => console.log(value + " was clicked!"),
    attrsAll: {attributes to apply to the menu, EG height style}
    })
```
The ids for the generated buttons and content areas are generated via 'idSuffix' passed into sections.
For example if idSuffix is 'Type', then there will be html objects with 'btnType' and 'tabType' ids.

## Panel
```
m(Panel, {
    side: 'left' || 'right',
    label: 'text at top of header',
    hover: Bool
    contents: m(...),
    width: css string width,
    attrsAll: { apply attributes to the outer div }
})
```

If hover is true, then the canvas is occluded by the panels.
If hover is false, then the canvas is resized to maintain a margin as panels are opened/closed or canvas contents overflow.

Contents for each partition are described in the sections list.
If tabs are set, then the width of the panel may be set in the section options.
If headers are set, the width of the panel is set globally.

Sometimes the contents of a panel should not be accessible via the tab bar.
Setting the toggle 'visible' prevents it from appearing in the tab bar.

## PanelList
```
m(PanelList, {
        id: 'id of container',
        items: ['Clickable 1', 'Clickable 2', 'Clickable 3'],

        colors: { app.selVarColor: ['Clickable 1'] }, (optional)
        classes: { 'item-lineout': ['Clickable 1', 'Clickable 3'] }, (optional)

        callback: (item) => console.log(item + " clicked."),
        popup: (item) => { return 'PopupContent'}, (optional)

        attrsAll: {... additional attributes for the entire list},
        attrsItems: {... additional attributes for each item}
    })
```

colors is an object that maps a color to a list or set of items with that color. Order colors by increasing priority.
classes acts similarly, but one item may have several classes. Standard css rules apply for stacking css classes.
popup returns the popup contents when called with the item. If not set, then popup is not drawn

## Peek
Widget for displaying a full-page data preview. Handle all logic for loading and preparing the data from within your app. There is code within Peek.js that belongs in the app you're implementing the preview for.

## Table
```
m(Table, {
    id: id (String),
    headers: ['col1Header', 'col2Header'],
    data: [['row1col1', 'row1col2'], ['row2col1', 'row2col2']] or function
    activeRow: 'row1col1', (optional)
    onclick: (uid, colID) => console.log(uid + " row was clicked, column number " + colID + " was clicked"), (optional)
    showUID: true | false, (optional)

    attrsAll: { apply attributes to all divs },(optional)
    attrsRows: { apply attributes to each row }, (optional)
    attrsCells: { apply attributes to each cell } (optional)
    tableTags: [ m('colgroup', ...), m('caption', ...), m('tfoot', ...)]
    abbreviation: int
    })
```

The UID for the table is the key for identifying a certain row.
The UID is the first column, and its value is passed in the onclick callback.
The first column may be hidden via showUID: false. This does not remove the first header

The data parameter attempts to render anything it gets. Feel free to pass Arrays of Arrays, Arrays of Objects, Objects, and Arrays of mixed Objects and Arrays. It should just render.
    Passing an Object will be rendered as a column for keys and a column for values
    Passing an Array of Objects will render the value for a key under the header column with the same name
    Passing an Array of Objects without a header will infer the header names from the unique keys in the objects

Table tags allows passing colgroups, captions, etc. into the table manually. Can be a single element or list

When abbreviation is set, strings are shortened to int number of characters


## TextField
```
m(TextField, {
    id: string,
    cancellable: Bool NOT IMPLEMENTED
    oninput: (value) => console.log(value), called with value of field
    onblur: (value) => console.log(value),
    *: any attribute may be passed
    })
```

## TextFieldSuggestion
NOTE this requires js-levenshtein to be installed from npm. Tested with version 1.1.3.
Install with: `npm install --save js-levenshtein`

```
m(TextField, {
    id: string,
    suggestions: ['possibility 1', 'possibility 2'],
    enforce: boolean,
    oninput: called with value of field
    *: any attribute may be passed
    })
```

suggestions are shown below the text box.
if enforce is true, then the value must be one of the suggestions
Can pass attributes directly, for example 'placeholder' or 'oninput'

## TwoPanel
a menu with left and right components.
On desktop, the center is draggable
On mobile, can switch between left and right menus on click

```
m(TwoPanel, {
    left: m(...),
    right: m(...),
    })
```