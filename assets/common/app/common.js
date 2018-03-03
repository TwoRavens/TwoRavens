// Global configuration

export let aboutText = 'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.';

export let panelMargin = 10;  // in pixels
export let heightHeader = 62;
export let heightFooter = 40;

export let menuColor = '#f9f9f9';
export let borderColor = '1px solid #adadad';

// initial color scale used to establish the initial colors of nodes
// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
export let colors = d3.scale.category20();
export let csColor = '#419641';
export let dvColor = '#28a4c9';
export let gr1Color = '#14bdcc';  // initially was #24a4c9', but that is dvColor, and we track some properties by color assuming them unique
export let gr1Opacity = [0,1];
export let gr2Color = '#ffcccc';
export let gr2Opacity = [0,1];

export let grayColor = '#c0c0c0';
export let nomColor = '#ff6600';
export let varColor = '#f0f8ff'; // d3.rgb("aliceblue");
export let taggedColor = '#f5f5f5'; // d3.rgb("whitesmoke");
export let timeColor = '#2d6ca2';

export let d3Color = '#1f77b4'; // d3's default blue
export let selVarColor = '#fa8072'; // d3.rgb("salmon");


// Global features
export let panelOpen = {
    'left': true,
    'right': true
};

// If you invoke from outside a mithril context, run m.redraw() to trigger the visual update
export function setPanelOpen(side, state=true) {
    panelOpen[side] = state;
    panelCallback[side](state);
}

export function togglePanelOpen(side) {
    panelOpen[side] = !panelOpen[side];
    panelCallback[side](panelOpen[side])
}

// Optionally trigger callback after setting panel state (but before redraw)
export let panelCallback = {
    'left': Function,
    'right': Function
};
export function setPanelCallback(side, callback) {panelCallback[side] = callback}

// Number of pixels occluded by the panels. Left at zero if panels are hovering
export let panelOcclusion = {
    'left': 0,
    'right': 0
};
export function setPanelOcclusion(side, state) {panelOcclusion[side] = state}

export const scrollbarWidth = getScrollbarWidth();
export let canvasScroll = {
    vertical: false,
    horizontal: false
};

// If scroll bar has been added or removed from canvas, update state and return true.
export function scrollBarChanged() {
    let canvas = document.getElementById('canvas');
    if (canvas === null) return false;

    let newState = {
        vertical: canvas.scrollHeight > canvas.clientHeight,
        horizontal: canvas.scrollWidth > canvas.clientWidth
    };

    if (newState['vertical'] !== canvasScroll['vertical'] || newState['horizontal'] !== canvasScroll['horizontal']) {
        canvasScroll = newState;
        return true;
    } else return false;
}

// Merge arrays and objects up to one layer deep
export function mergeAttributes(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    for (const key in source) {
        if (Array.isArray(source[key]) && Array.isArray(target[key]))
            target[key].concat(source[key]);

        else if (typeof target[key] === 'object' && typeof source[key] === 'object')
            Object.assign(target[key], source[key]);

        else target[key] = source[key];
    }
    return mergeAttributes(target, ...sources);
}

// https://stackoverflow.com/a/13382873
function getScrollbarWidth() {
    let outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.width = "100px";
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

    document.body.appendChild(outer);

    let widthNoScroll = outer.offsetWidth;
    // force scrollbars
    outer.style.overflow = "scroll";

    // add innerdiv
    let inner = document.createElement("div");
    inner.style.width = "100%";
    outer.appendChild(inner);

    let widthWithScroll = inner.offsetWidth;

    // remove divs
    outer.parentNode.removeChild(outer);

    return widthNoScroll - widthWithScroll;
}