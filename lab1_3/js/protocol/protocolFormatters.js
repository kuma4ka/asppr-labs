import { logToProtocol } from './protocolManager.js';

function formatVariableProtocol(coeff, varIndex, isFirst) {
    if (Math.abs(coeff) < 1e-9) return "";
    let sign = coeff < 0 ? "-" : (isFirst ? "" : "+");
    if (isFirst && coeff < 0) sign = "-";
    else if (isFirst && coeff > 0) sign = "";

    const absCoeff = Math.abs(coeff);
    const coeffStr = (absCoeff === 1 && varIndex !== -1) ? "" : absCoeff.toFixed(2).replace('.00', '');
    return `${sign} ${coeffStr}${varIndex !== -1 ? `x${varIndex + 1}` : ''}`;
}

export function formatObjectiveFunctionForProtocol(objectiveCoeffs, objectiveType, numVariables) {
    let str = "Z = ";
    let firstTerm = true;
    for (let i = 0; i < numVariables; i++) {
        const coeff = objectiveCoeffs[i] || 0;
        if (Math.abs(coeff) > 1e-9) {
            str += formatVariableProtocol(coeff, i, firstTerm);
            firstTerm = false;
        }
    }
    if (firstTerm) str += "0";
    str += ` -> ${objectiveType === 'minimize' ? 'min' : 'max'}`;
    return str;
}

export function formatConstraintForProtocolDisplay(constraintCoeffs, constraintType, rhs, numVariables) {
    let str = "";
    let firstTerm = true;
    for (let i = 0; i < numVariables; i++) {
        const coeff = constraintCoeffs[i] || 0;
        if (Math.abs(coeff) > 1e-9) {
            str += formatVariableProtocol(coeff, i, firstTerm);
            firstTerm = false;
        }
    }
    if (firstTerm) str += "0";
    str += ` ${constraintType} ${rhs.toFixed(2).replace('.00', '')}`;
    return str;
}

export function logProblemStatement(inputData) {
    logToProtocol("\nПостановка задачі:", 'text');
    const objStr = formatObjectiveFunctionForProtocol(inputData.objective.coeffs, inputData.objective.type, inputData.numVariables);
    logToProtocol(objStr, 'text');
    logToProtocol("при обмеженнях:", 'text');
    inputData.constraints.forEach(c => {
        logToProtocol(formatConstraintForProtocolDisplay(c.coeffs, c.type, c.rhs, inputData.numVariables), 'text');
    });
    let nonNegativity = "x[j] >= 0, j = 1";
    if (inputData.numVariables > 1) {
        nonNegativity += `..${inputData.numVariables}`;
    }
    logToProtocol(nonNegativity, 'text');
}

export function logStandardFormConstraints(constraints, numVariables) {
    logToProtocol("\nПерепишемо систему обмежень:", 'text');
    constraints.forEach(c => {
        let str = "";
        let first = true;
        for (let i = 0; i < numVariables; i++) {
            const coeff = c.coeffs[i] || 0;
            if (Math.abs(coeff) > 1e-9) {
                if (!first) str += coeff > 0 ? ` + ` : ` - `;
                else if (coeff < 0) str += `-`;
                str += `${Math.abs(coeff).toFixed(2)} * X[${i+1}]`;
                first = false;
            }
        }
        if (c.type === 'ge' && c.raw.includes(c.rhs.toString())) {
            logToProtocol(formatConstraintForProtocolDisplay(c.coeffs, c.type, c.rhs, numVariables) + " (Трансформація для протоколу потребує уточнення)", 'text');
        } else {
            logToProtocol(`(Потрібно трансформувати для протоколу): ${formatConstraintForProtocolDisplay(c.coeffs, c.type, c.rhs, numVariables)}`, 'text');
        }
    });
}

export function formatTableauAsHTML(tableau, columnHeaders, rowHeaders, title = "") {
    if (!tableau || tableau.length === 0) return "<p>Таблиця порожня.</p>";

    let html = "";
    if (title) {
        html += `<h4>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h4>`; // Екрануємо title
    }
    html += '<table class="simplex-protocol-table">';
    html += '<thead><tr><th></th>';
    columnHeaders.forEach(name => {
        html += `<th>${name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</th>`;
    });
    html += '</tr></thead><tbody>';

    tableau.forEach((row, rowIndex) => {
        const rowHeader = (rowHeaders[rowIndex] || `Ряд ${rowIndex}`).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += `<tr><td>${rowHeader}</td>`;
        row.forEach(val => {
            html += `<td>${Number(val).toFixed(2)}</td>`; // Переконуємось, що val є числом
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

export function logTableau(tableau, columnHeaders, rowHeaders, title = "") {
    const htmlTable = formatTableauAsHTML(tableau, columnHeaders, rowHeaders, title);
    logToProtocol(htmlTable, 'htmlTable');
}