export function elem(selectors) {
    return document.querySelector(selectors);
}

export function fadeIn(selectors) {
    return $(selectors).fadeIn();
}

export function fadeOut(selectors, duration) {
    return $(selectors).fadeOut(duration);
}

export function fadeTo(selectors, duration, complete) {
    return $(selectors).fadeTo(duration, complete);
}

export function remove(selectors) {
    let el = elem(selectors);
    el.parentNode.removeChild(el);
}

export function setAttrs(selectors, attrs) {
    let el = elem(selectors);
    Object.entries(attrs).forEach(([x, y]) => el.setAttribute(x, y));
};

export function trigger(selectors, event) {
    let evt = document.createEvent('HTMLEvents');
    evt.initEvent(event, true, false);
    elem(selectors).dispatchEvent(evt);
}


/*
 *  Check if a nested key exists.
 *  example:   isKeyDefined(selectedSolution, 'pipeline.id')
 *   returns object or "undefined"
 */
export const isKeyDefined = (obj, key_str) =>{
    return key_str.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
}

/**
 *  Copy to clipboard
 *  reference: https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
 */
export const copyToClipboard = str => {
  const el = document.createElement('textarea');  // Create a <textarea> element
  el.value = str;                                 // Set its value to the string that you want copied
  el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
  el.style.position = 'absolute';
  el.style.left = '-9999px';                      // Move outside the screen to make it invisible
  document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
  const selected =
    document.getSelection().rangeCount > 0        // Check if there is any content selected previously
      ? document.getSelection().getRangeAt(0)     // Store selection if found
      : false;                                    // Mark as false to know no selection existed before
  el.select();                                    // Select the <textarea> content
  document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
  document.body.removeChild(el);                  // Remove the <textarea> element
  if (selected) {                                 // If a selection existed before copying
    document.getSelection().removeAllRanges();    // Unselect everything on the HTML document
    document.getSelection().addRange(selected);   // Restore the original selection
  }
};


/*
 * Add comma separator for numbers over 1,000
 */
export const numberWithCommas = some_number => {
    return some_number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const getClearWorkspacesLink = _ => {
  return window.location.origin + clear_user_workspaces_url;
  // '/user-workspaces/clear-user-workspaces';
}


/*
 * Clear workspace and return to the pebbles page
 */
export const clearWorkpacesAndReloadPage = _ => {
    document.location = getClearWorkspacesLink();
    // return some_number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
