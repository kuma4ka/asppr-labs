export function getDOMElement(id) {
    return document.getElementById(id);
}

export function clearOutputDisplays() {
    const idsToClear = [
        'initial-table-display',
        'zero-row-protocol-summary',
        'basic-feasible-solution-summary',
        'optimization-protocol-summary',
        'optimal-solution-display',
        'optimal-z-display',
        'calculation-protocol-display'
    ];
    idsToClear.forEach(id => {
        const el = getDOMElement(id);
        if (el) el.innerHTML = "";
    });
    const downloadContainer = getDOMElement('download-protocol-container');
    if(downloadContainer) downloadContainer.style.display = 'none';
}

export function displayInitialTableauSummary(tableauHTML) {
    const displayArea = getDOMElement('initial-table-display');
    if (displayArea) {
        displayArea.innerHTML = tableauHTML;
    }
}

export function displayZeroRowSummary(summaryText) {
    const displayArea = getDOMElement('zero-row-protocol-summary');
    if (displayArea) {
        displayArea.textContent = summaryText;
    }
}

export function displayBasicFeasibleSolutionSummary(solutionText) {
    const displayArea = getDOMElement('basic-feasible-solution-summary');
    if (displayArea) {
        displayArea.textContent = solutionText;
    }
}

export function displayOptimizationSummary(summaryText) {
    const displayArea = getDOMElement('optimization-protocol-summary');
    if (displayArea) {
        displayArea.textContent = summaryText;
    }
}

export function displayCalculationProtocol(protocolHTML) {
    const displayArea = getDOMElement('calculation-protocol-display');
    if (displayArea) {
        displayArea.innerHTML = protocolHTML;
    }
    const downloadContainer = getDOMElement('download-protocol-container');
    if(downloadContainer && protocolHTML.length > 0) {
        downloadContainer.style.display = 'block';
    } else if (downloadContainer) {
        downloadContainer.style.display = 'none';
    }
}

export function displayFinalSolution(optimalSolution, optimalZ, objectiveType) {
    const solutionDisplay = getDOMElement('optimal-solution-display');
    const zDisplay = getDOMElement('optimal-z-display');

    if (solutionDisplay && typeof optimalSolution === 'object' && optimalSolution !== null) {
        const solutionString = Object.keys(optimalSolution)
            .filter(key => key.startsWith('x'))
            .sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)))
            .map(key => `${key}=${optimalSolution[key].toFixed(2)}`)
            .join('; ');
        solutionDisplay.textContent = `Оптимальний Розв'язок (X):\n(${solutionString})`;
    } else if (solutionDisplay) {
        solutionDisplay.textContent = `Оптимальний Розв'язок (X): ${optimalSolution}`;
    }

    if (zDisplay && typeof optimalZ === 'number') {
        zDisplay.textContent = `${objectiveType === 'minimize' ? 'Min' : 'Max'} (Z) = ${optimalZ.toFixed(2)}`;
    } else if (zDisplay) {
        zDisplay.textContent = `Оптимальне Z: ${optimalZ}`;
    }
}

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

export function setupDownloadButton(protocolTextGetterFunction) {
    const downloadButton = getDOMElement('download-protocol-button');
    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            const protocolText = protocolTextGetterFunction();
            if (!protocolText || protocolText.length === 0) {
                alert("Протокол порожній. Немає чого завантажувати.");
                return;
            }
            const blob = new Blob([protocolText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'simplex_protocol.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}