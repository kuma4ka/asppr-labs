export function getElementValue(element) {
    if (!element) throw new Error("DOM element reference is missing.");
    return element.value;
}

export function getElementValueAsInt(element) {
    const val = parseInt(getElementValue(element), 10);
    if (isNaN(val)) throw new Error(`Invalid integer value in element ${element.id || element.name || ''}`);
    return val;
}

export function getElementValueAsFloat(element) {
    const valStr = getElementValue(element).replace(',', '.');
    const val = parseFloat(valStr);
    if (isNaN(val)) throw new Error(`Invalid float value in element ${element.id || element.name || ''}: '${valStr}'`);
    return val;
}

export function querySelectorAllAsArray(parent, selector) {
    return Array.from(parent.querySelectorAll(selector));
}

export function getCheckboxState(elementId) {
    const checkbox = document.getElementById(elementId);
    if (!checkbox) throw new Error(`Checkbox with id ${elementId} not found.`);
    return checkbox.checked;
}