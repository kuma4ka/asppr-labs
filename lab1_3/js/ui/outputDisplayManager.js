import { getDOMElement } from './domElements.js';

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