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
// for debugging - if not in PRODUCTION, prints args
export let cdb = _ => PRODUCTION || console.log(_);
export let byId = id => document.getElementById(id);
/**
 deletes the first instance of obj from arr
 @param {Object[]} arr - array
 @param {Object} [obj] - object
 */
export let remove = (arr, obj) => {
    let idx = arr.indexOf(obj);
    idx !== -1 && arr.splice(idx, 1);
};
/**
 toggles inclusion of the obj in collection
 @param {Object[]} collection - array or set
 @param {Object} [obj] - object
 */
export let toggle = (collection, obj) => {
    if (Array.isArray(collection)) {
        let idx = collection.indexOf(obj);
        idx === -1 ? collection.push(obj) : collection.splice(idx, 1)
    } else if (collection instanceof Set)
        collection.has(obj) ? collection.delete(obj) : collection.add(obj)
};
export let add = (collection, obj) => {
    if (Array.isArray(collection)) {
        !collection.includes(obj) && collection.push(obj);
    } else if (collection instanceof Set)
        collection.add(obj)
};
// pretty precision formatting- null and undefined are NaN, attempt to parse strings to float
// if valid number, returns a Number at less than or equal to precision (trailing decimal zeros are ignored)
export function formatPrecision(value, precision = 4) {
    if (value === null) return NaN;
    let numeric = value * 1;
    if (isNaN(numeric)) return value;

    // determine number of digits in value
    let digits = Math.max(Math.floor(Math.log10(Math.abs(Number(String(numeric).replace(/[^0-9]/g, ''))))), 0) + 1;

    return (digits <= precision || precision === 0) ? numeric : numeric.toPrecision(precision) * 1
}

// generate a number from text (cheap hash)
export let generateID = text => Array.from({length: text.length})
    .reduce((hash, _, i) => ((hash << 5) - hash + text.charCodeAt(i)) | 0, 0);
export let omniSort = (a, b) => {
    if (a === undefined && b !== undefined) return -1;
    if (b === undefined && a !== undefined) return 1;
    if (a === b) return 0;
    if (typeof a === 'number') return a - b;
    if (typeof a === 'string') return a.localeCompare(b);
    return (a < b) ? -1 : 1;
};

export function melt(data, factors, value = "value", variable = "variable") {
    factors = new Set(factors);
    let outData = [];
    data.forEach(record => {
        let UID = [...factors].reduce((out, idx) => {
            out[idx] = record[idx];
            return out;
        }, {});

        Object.keys(record)
            .filter(key => !factors.has(key))
            .forEach(idxMelted => outData.push(Object.assign(
                {}, UID,
                {[variable]: idxMelted, [value]: record[idxMelted]})))
    });
    return outData;
}

// replacement: allow duplicates in samples
// ordered: preserve the order in the original array
export let sample = (arr, n = 1, replacement = false, ordered = false) => {
    let indices;
    if (replacement)
        indices = Array.from({length: n})
            .map(() => Math.floor(Math.random() * arr.length));
    else {
        let buckets = Array.from({length: arr.length}).map((_, i) => i);

        indices = Array.from({length: Math.min(n, arr.length)}).map(() => {
            let index = Math.floor(Math.random() * buckets.length);
            let temp = buckets[index];
            buckets.splice(index, 1);
            return temp;
        });
    }

    if (ordered) indices = indices.sort();
    return indices.map(i => arr[i]);
};

// n linearly spaced points between min and max
export let linspace = (min, max, n) => Array.from({length: n})
    .map((_, i) => min + (max - min) / (n - 1) * i);
export let setDefault = (obj, id, value) => obj[id] = id in obj ? obj[id] : value;
export let setDefaultRecursive = (obj, map) => map
    .reduce((obj, pair) => setDefault(obj, pair[0], pair[1]), obj);
export let setRecursive = (obj, map) => {
    let [attr, value] = map[map.length - 1];
    setDefaultRecursive(obj, map.slice(0, -1))[attr] = value;
}

export function minutesToString(minutes) {
    let seconds = minutes * 60;

    let numDays = Math.floor((seconds % 31536000) / 86400);
    let strDays = numDays ? (numDays + ` day${numDays === 1 ? '' : 's'} `) : "";

    let numHours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    let strHours = numHours ? (numHours + ` hour${numHours === 1 ? '' : 's'} `) : "";

    let numMinutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    let strMinutes = numMinutes ? (numMinutes + ` minute${numMinutes === 1 ? '' : 's'} `) : "";

    return (strDays + strHours + strMinutes).replace("  ", " ");
}