import {formatNumber} from "../utils.js";

export function manageDownloadButtonVisibility(visible) {
    const button = document.getElementById('downloadProtocolButton');
    if (button) {
        button.style.display = visible ? 'inline-block' : 'none';
    }
}

export function displaySolution(solution, zValue, isMin, message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let solutionString = solution.map((val, i) => `x<sub>${i + 1}</sub> = ${formatNumber(val)}`).join('; ');
    let zString = `${isMin ? 'Min(Z)' : 'Max(Z)'} = ${formatNumber(zValue)}`;

    container.innerHTML = `<p class="success-message">${message}</p><pre>X = (${solutionString})\n${zString}</pre>`;
}

export function displayMessage(containerId, message, isError = true) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p class="${isError ? 'error-message' : 'success-message'}">${message}</p>`;
}

export function clearOutputs(protocolDiv, finalResultDiv) {
    if (protocolDiv) protocolDiv.innerHTML = '';
    if (finalResultDiv) finalResultDiv.innerHTML = '';
    manageDownloadButtonVisibility(false);
}