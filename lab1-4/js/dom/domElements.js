import { objCoeffsContainerRef, constraintsContainerRef } from '../domUtils.js';
import { manageDownloadButtonVisibility } from './domDisplay.js';

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
        plus.style.marginRight = '4px';
        span.insertBefore(plus, input);
    }
    return span;
}

export function addConstraintRow(numVars, constraintData = null) {
    if (!constraintsContainerRef) {
        console.error("constraintsContainerRef is not initialized in domElements.js");
        return;
    }
    const constraintId = `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
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
        <option value="=" ${constraintData?.type === '=' ? 'selected' : ''}>=</option>
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
    if (!objCoeffsContainerRef || !constraintsContainerRef) {
        console.error("DOM refs not initialized in domElements.js for setupInputFields");
        return;
    }
    objCoeffsContainerRef.innerHTML = '';
    for (let i = 0; i < numVars; i++) {
        objCoeffsContainerRef.appendChild(createCoeffInput(i));
    }
    constraintsContainerRef.innerHTML = '';
    addConstraintRow(numVars);
    manageDownloadButtonVisibility(false);
}