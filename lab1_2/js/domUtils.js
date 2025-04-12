import { formatNumber } from './utils.js';
import { EPSILON } from './config.js';

let objCoeffsContainerRef;
let constraintsContainerRef;

export function initDOMReferences(refs) {
    objCoeffsContainerRef = refs.objCoeffsContainer;
    constraintsContainerRef = refs.constraintsContainer;
}

export function createCoeffInput(index, value = '0') {
    const span = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'coeff-input';
    input.value = value;
    input.step = 'any';
    input.dataset.index = index;
    span.appendChild(input);
    const textNode = document.createElement('span');
    textNode.innerHTML = `x<sub>${index + 1}</sub>`;
    span.appendChild(textNode);

    if (index > 0) {
        const plus = document.createElement('span');
        plus.textContent = ' + ';
        plus.style.margin = '0 2px';
        span.insertBefore(plus, input);
    }
    return span;
}

export function addConstraintRow(numVars, constraintData = null) {
    if (!constraintsContainerRef) return;

    const constraintId = `constraint-${Date.now()}-${Math.random()}`;
    const rowDiv = document.createElement('div');
    rowDiv.className = 'constraint-row';
    rowDiv.id = constraintId;

    const coeffsDiv = document.createElement('div');
    coeffsDiv.className = 'coeffs-container';
    for (let i = 0; i < numVars; i++) {
        const value = constraintData ? (constraintData.coeffs[i] || '0') : '0';
        coeffsDiv.appendChild(createCoeffInput(i, value));
    }
    rowDiv.appendChild(coeffsDiv);

    const select = document.createElement('select');
    select.innerHTML = `
        <option value="<=" ${constraintData?.type === '<=' ? 'selected' : ''}>≤</option>
        <option value=">=" ${constraintData?.type === '>=' ? 'selected' : ''}>≥</option>
    `;
    rowDiv.appendChild(select);

    const constInput = document.createElement('input');
    constInput.type = 'number';
    constInput.value = constraintData ? (constraintData.b || '0') : '0';
    constInput.step = 'any';
    constInput.placeholder = 'b';
    rowDiv.appendChild(constInput);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Видалити';
    removeButton.className = 'remove-constraint';
    removeButton.type = 'button';
    removeButton.onclick = () => {
        const rowToRemove = document.getElementById(constraintId);
        if (rowToRemove) rowToRemove.remove();
    };
    rowDiv.appendChild(removeButton);

    constraintsContainerRef.appendChild(rowDiv);
}


export function setupInputFields(numVars) {
    if (!objCoeffsContainerRef || !constraintsContainerRef) return;

    objCoeffsContainerRef.innerHTML = '';
    for (let i = 0; i < numVars; i++) {
        objCoeffsContainerRef.appendChild(createCoeffInput(i));
    }
    constraintsContainerRef.innerHTML = '';
    addConstraintRow(numVars);
}


export function displaySolution(solution, zValue, isMin, message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let solutionString = solution.map((val, i) => `x<sub>${i + 1}</sub> = ${formatNumber(val)}`).join('; ');
    let zString = `${isMin ? 'Min(Z)' : 'Max(Z)'} = ${formatNumber(zValue)}`;
    if (isMin && Math.abs(zValue) > EPSILON) {
        zString += ` (Max(Z') = ${formatNumber(-zValue)})`;
    }

    container.innerHTML = `<p class="success-message">${message}</p><pre>X = (${solutionString})\n${zString}</pre>`;
}

export function displayMessage(containerId, message, isError = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p class="${isError ? 'error-message' : 'success-message'}">${message}</p>`;
}

export function clearOutputs(protocolDiv, finalResultDiv) {
    if(protocolDiv) protocolDiv.innerHTML = '';
    if(finalResultDiv) finalResultDiv.innerHTML = '';
}

export function getElementValue(element) {
    if (!element) throw new Error("DOM element reference is missing.");
    return element.value;
}

export function getElementValueAsInt(element) {
    const val = parseInt(getElementValue(element), 10);
    if (isNaN(val)) throw new Error(`Invalid integer value in element ${element.id || ''}`);
    return val;
}

export function getElementValueAsFloat(element) {
    const val = parseFloat(getElementValue(element));
    if (isNaN(val)) throw new Error(`Invalid float value in element ${element.id || ''}`);
    return val;
}

export function querySelectorAllAsArray(parent, selector) {
    return Array.from(parent.querySelectorAll(selector));
}