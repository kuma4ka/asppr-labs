import { getDOMElement } from './domElements.js';

export function addConstraintRowToDOM(constraintsArea, equation = "", type = "le", rhs = "") {
    const constraintDiv = document.createElement('div');
    constraintDiv.classList.add('constraint');
    constraintDiv.innerHTML = `
        <input type="text" class="constraint-eq" placeholder="напр., 1x1 + 2x2" value="${equation}">
        <select class="constraint-type">
            <option value="eq" ${type === 'eq' ? 'selected' : ''}>=</option>
            <option value="le" ${type === 'le' ? 'selected' : ''}><=</option>
            <option value="ge" ${type === 'ge' ? 'selected' : ''}>>=</option>
        </select>
        <input type="number" class="constraint-rhs" placeholder="Прав. частина" value="${rhs}">
    `;
    constraintsArea.appendChild(constraintDiv);
    return constraintDiv;
}

export function setInputValues(data) {
    const objectiveFunctionInput = getDOMElement('objective-function');
    const objectiveTypeSelect = getDOMElement('objective-type');
    const numVariablesInput = getDOMElement('num-variables');
    const constraintsArea = getDOMElement('constraints-area');

    if (objectiveFunctionInput) objectiveFunctionInput.value = data.objective.raw;
    if (objectiveTypeSelect) objectiveTypeSelect.value = data.objective.type;
    if (numVariablesInput) numVariablesInput.value = data.numVariables;

    if (constraintsArea) {
        while (constraintsArea.firstChild) {
            constraintsArea.removeChild(constraintsArea.firstChild);
        }
        const h3 = document.createElement('h3');
        h3.textContent = "Обмеження:";
        constraintsArea.appendChild(h3);

        data.constraints.forEach(c => {
            addConstraintRowToDOM(constraintsArea, c.raw, c.type, c.rhs);
        });
    }
}