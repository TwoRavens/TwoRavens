## How to use the Mithril Common library
Many of the UI elements for TwoRavens have already been standardized to a common style. Many of the components used in this style are broken out into Mithril classes in the Common library, located in assets/Common/. To use one of these components in your menu, import the component and create a new instance:

 ```
m(Classname, {interface options}) 
 ```

...where 'Classname' refers to the name of the component and {interface options} are specified below (and in the class' .js file).

# Button
Arbitrary attributes may be passed
```
m(Button, {
    id: 'buttonID',
    text: 'Click Me!',
    onclick: () => console.log("buttonID was clicked"),
    })
```

# ButtonRadio
```
m(ButtonRadio, {
    id: string,
    sections: [
            {
                value: 'Button 1',
                title: 'Hover text'
            }, 
            ...
        ],
    onclick: (value) => console.log(value + " was clicked.")
    attrsAll: {optional object of attributes to apply to the bar}
    attrsButtons: {optional object of attributes to apply to each button}
    selectWidth: 25 (optional),
    hoverBonus: 15 (optional)
    })
```
The selectWidth option forces the selected button to be n percent wide. The other buttons on the bar compensate. If not included, then every button has even spacing.
The hoverBonus option makes the hovered button n percent larger when hovered. Both hoverBonus and selectWidth may be used together.

# Canvas
```
m(Canvas, {
    contents: m(...)
    })
```

Purpose:
 1. if a left or right panel is not permitted to occlude the content on the canvas, this class resizes the contents to maintain a margin away from the panels
 2. if the contents of the canvas overflow and cause a scroll bar, the left and right panel are shifted to maintain a margin
 
# Dropdown
 ```
m(Dropdown, {
    id: 'dropdownID' (applied to button and selectors)
    items: ['Item 1', 'Item 2', 'Item 3'],
    onclickChild: (value) => console.log(value + " was clicked.")
    dropWidth: 100 (sets the width of the dropdown)
    })
 ```

# Footer
```
m(Footer, {
    contents: m(...)
    })
```
Takes on the display settings defined in common.js.

# Header
```
m(Header, {
    contents: m(...)
    })
```
Takes on the display settings defined in common.js.
The navbar brand/hover is baked into this class

# MenuTabbed
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

# MenuHeaders
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

# Panel
```
m(Panel, {
    side: 'left' || 'right',
    label: 'text at top of header',
    hover: Bool
    contents: m(...),
    width: int pixels
    })
```
If hover is true, then the canvas is occluded by the panels. 
If hover is false, then the canvas is resized to maintain a margin as panels are opened/closed or canvas contents overflow.

Contents for each partition are described in the sections list. 
If tabs are set, then the width of the panel may be set in the section options. 
If headers are set, the width of the panel is set globally.

Sometimes the contents of a panel should not be accessible via the tab bar. 
Setting the toggle 'visible' prevents it from appearing in the tab bar.

# PanelList
```
m(PanelList, {
    id: 'id of container',
    items: ['Clickable 1', 'Clickable 2'],
    itemsSelected: ['Clickable 1'],
    callback: (item) => console.log(item + " clicked."),
    attrsInterface: {... additional attributes for each item}
    })
```

# Text Field
```
m(TextField, {
    id: 'id of field'
    cancellable: Bool NOT IMPLEMENTED
    })
```
