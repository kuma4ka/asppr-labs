let protocolLogStore = [];

export function initializeProtocol() {
    protocolLogStore = [];
    logToProtocol("Згенерований протокол обчислення:", 'text');
}

export function logToProtocol(content, type = 'text') {
    protocolLogStore.push({ type, content });
}

export function getProtocolTextForDownload() {
    return protocolLogStore.map(item => {
        if (item.type === 'htmlTable') {
            const tableElement = document.createElement('div');
            tableElement.innerHTML = item.content;
            let textTable = "";
            const title = tableElement.querySelector('h4');
            if (title) textTable += title.textContent + "\n";

            const table = tableElement.querySelector('table');
            if (table) {
                const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.padEnd(12)).join('');
                textTable += headers + "\n";
                textTable += "-".repeat(headers.length) + "\n";
                Array.from(table.querySelectorAll('tr')).forEach(tr => {
                    if (tr.querySelectorAll('th').length > 0) return;
                    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.padEnd(12)).join('');
                    textTable += cells + "\n";
                });
            } else {
                textTable = item.content;
            }
            return textTable;
        }
        return item.content;
    }).join('\n');
}

export function getProtocolHTML() {
    return protocolLogStore.map(item => {
        if (item.type === 'htmlTable') {
            return item.content;
        } else if (item.type === 'text') {
            const pre = document.createElement('pre');
            pre.textContent = item.content;
            return pre.outerHTML;
        }
        return `<p>${item.content}</p>`;
    }).join('');
}

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
        html += `<h4>${title}</h4>`;
    }
    html += '<table class="simplex-protocol-table">';
    html += '<thead><tr><th></th>';
    columnHeaders.forEach(name => {
        html += `<th>${name}</th>`;
    });
    html += '</tr></thead><tbody>';

    tableau.forEach((row, rowIndex) => {
        html += `<tr><td>${rowHeaders[rowIndex] || `Ряд ${rowIndex}`}</td>`;
        row.forEach(val => {
            html += `<td>${val.toFixed(2)}</td>`;
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