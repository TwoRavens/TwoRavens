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
