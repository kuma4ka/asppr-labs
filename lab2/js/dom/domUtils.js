import { formatNumber } from '../utils.js';

let objCoeffsContainerRef;
let constraintsContainerRef;

export function initDOMReferences(refs) {
    objCoeffsContainerRef = refs.objCoeffsContainer;
    constraintsContainerRef = refs.constraintsContainer;
}

export function createCoeffInput(index, value = '0', varSymbol = 'X') {
    const wrapperSpan = document.createElement('span');
    wrapperSpan.style.display = 'inline-flex';
    wrapperSpan.style.alignItems = 'center';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'coeff-input';
    input.value = value;
    input.step = 'any';
    input.dataset.index = index;

    if (index > 0) {
        const plusSign = document.createElement('span');
        plusSign.textContent = ' + ';
        plusSign.style.margin = '0 4px';
        wrapperSpan.appendChild(plusSign);
    }

    wrapperSpan.appendChild(input);

    const varNameSpan = document.createElement('span');
    varNameSpan.innerHTML = ` * ${varSymbol}[${index + 1}]`;
    varNameSpan.style.marginLeft = '2px';

    wrapperSpan.appendChild(varNameSpan);

    return wrapperSpan;
}

export function addConstraintRow(numVars, constraintData = null) {
    if (!constraintsContainerRef) return;
    const constraintId = `constraint-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const rowDiv = document.createElement('div');
    rowDiv.className = 'constraint-row';
    rowDiv.id = constraintId;

    const coeffsDiv = document.createElement('div');
    coeffsDiv.className = 'coeffs-container';
    for (let i = 0; i < numVars; i++) {
        const value = constraintData ? (constraintData.coeffs[i] === undefined ? '0' : constraintData.coeffs[i].toString()) : '0';
        coeffsDiv.appendChild(createCoeffInput(i, value, 'X'));
    }
    rowDiv.appendChild(coeffsDiv);

    const select = document.createElement('select');
    select.innerHTML = `
        <option value="<=" ${constraintData?.type === '<=' ? 'selected' : ''}>&le;</option>
        <option value=">=" ${constraintData?.type === '>=' ? 'selected' : ''}>&ge;</option>
    `;
    rowDiv.appendChild(select);

    const constInput = document.createElement('input');
    constInput.type = 'number';
    constInput.value = constraintData ? (constraintData.b === undefined ? '0' : constraintData.b.toString()) : '0';
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

export function setupInputFields(numVars, coeffs = null) {
    if (!objCoeffsContainerRef || !constraintsContainerRef) return;
    objCoeffsContainerRef.innerHTML = '';
    for (let i = 0; i < numVars; i++) {
        const coeffValue = coeffs ? (coeffs[i] === undefined ? '0' : coeffs[i].toString()) : '0';
        objCoeffsContainerRef.appendChild(createCoeffInput(i, coeffValue, 'X'));
    }
    constraintsContainerRef.innerHTML = '';
    if (numVars > 0) {
        addConstraintRow(numVars);
    }
}

export function setResultVisibility(visible) {
    const finalResultContainer = document.getElementById('finalResult');
    const outputSection = document.getElementById('output'); // Батьківський блок для .output-section

    if (finalResultContainer && outputSection) {
        const resultHeader = Array.from(outputSection.getElementsByTagName('h2')).find(h2 => h2.textContent.includes('Результат:'));

        if (visible) {
            if (resultHeader) resultHeader.style.display = ''; // Показати заголовок
            finalResultContainer.classList.remove('hidden-effectively');
            finalResultContainer.style.display = ''; // Показати блок результату
        } else {
            if (resultHeader) resultHeader.style.display = 'none'; // Сховати заголовок
            finalResultContainer.classList.add('hidden-effectively');
            finalResultContainer.style.display = 'none'; // Сховати блок результату
            finalResultContainer.innerHTML = ''; // Очистити вміст
        }
    }
}

export function displaySolution(solution, zValue, isMin, message, containerId, dualSolutionU = null, dualObjectiveIsMin = null, primalObjectiveValue = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    setResultVisibility(true); // Показати секцію результату

    let solutionString = solution.map((val, i) => `X[${i + 1}] = ${formatNumber(val)}`).join('; ');
    let zString = `${isMin ? 'Min(Z)' : 'Max(Z)'} = ${formatNumber(zValue)}`;

    let outputHTML = `<p class="success-message">${message}</p><pre>Розв’язки прямої задачі:\nX = (${solutionString})\n${zString}`;

    if (dualSolutionU) {
        let dualSolutionString = dualSolutionU.map((val, i) => `u${i + 1} = ${formatNumber(val)}`).join('; ');
        outputHTML += `\n\nРозв’язки двоїстої задачі:\nU = (${dualSolutionString})`;
        if (primalObjectiveValue !== null && dualObjectiveIsMin !== null) {
            const WValue = primalObjectiveValue;
            const WStringType = dualObjectiveIsMin ? "Min(W)" : "Max(W)";
            outputHTML += `\n${WStringType} = ${formatNumber(WValue)}`;
        }
    }
    outputHTML += `</pre>`;
    container.innerHTML = outputHTML;
}

export function displayMessage(containerId, message, isError = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    setResultVisibility(true); // Показати секцію результату, навіть якщо це помилка
    container.innerHTML = `<p class="${isError ? 'error-message' : 'success-message'}">${message}</p>`;
}

export function clearOutputs(protocolDiv, finalResultDiv) {
    if (protocolDiv) protocolDiv.innerHTML = '';
    // Тепер приховування finalResultDiv керується через setResultVisibility
    // Але ми все ще можемо очистити його вміст тут, якщо потрібно
    if (finalResultDiv) {
        finalResultDiv.innerHTML = '';
        // Не будемо тут викликати setResultVisibility(false), це зроблять функції solve та handleBuildDualProblem
    }
}


export function getElementValue(element) {
    if (!element) throw new Error("DOM element reference is missing.");
    return element.value;
}

export function getElementValueAsInt(element) {
    const valStr = getElementValue(element);
    if (valStr.trim() === '') throw new Error(`Integer value is missing in element ${element.id || 'with no id'}`);
    const val = parseInt(valStr, 10);
    if (isNaN(val)) throw new Error(`Invalid integer value '${valStr}' in element ${element.id || 'with no id'}`);
    return val;
}

export function getElementValueAsFloat(element) {
    const valStr = getElementValue(element);
    if (valStr.trim() === '') throw new Error(`Float value is missing in element ${element.id || 'with no id'}`);
    const val = parseFloat(valStr.replace(',', '.'));
    if (isNaN(val)) throw new Error(`Invalid float value '${valStr}' in element ${element.id || 'with no id'}`);
    return val;
}

export function querySelectorAllAsArray(parent, selector) {
    return Array.from(parent.querySelectorAll(selector));
}