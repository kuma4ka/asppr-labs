import { formatNumber } from './utils.js';
import { EPSILON } from './config.js';

export class ProtocolLogger {
    constructor(outputDivId) {
        this.outputDiv = document.getElementById(outputDivId);
        this.clear();
    }

    clear() {
        if (this.outputDiv) this.outputDiv.innerHTML = '';
    }

    addHeading(level, text) {
        const heading = document.createElement(`h${level}`);
        heading.textContent = text;
        this.outputDiv.appendChild(heading);
    }

    addParagraph(htmlContent) {
        const p = document.createElement('p');
        p.innerHTML = htmlContent;
        this.outputDiv.appendChild(p);
    }

    addPreformatted(text) {
        const pre = document.createElement('pre');
        pre.textContent = text;
        this.outputDiv.appendChild(pre);
    }

    addTable(tableau, rowVars, colVars, captionText, pivotRow = -1, pivotCol = -1) {
        const tableContainer = document.createElement('div');

        let html = `<caption>${captionText}</caption>`;
        html += '<table><thead><tr><th></th>';

        colVars.forEach((v, index) => {
            const displayVar = v;
            html += `<th class="${index === pivotCol ? 'highlight-col' : ''}">${displayVar}</th>`;
        });
        html += '</tr></thead><tbody>';

        tableau.forEach((row, i) => {
            const rowClass = i === pivotRow ? 'highlight-row' : '';
            html += `<tr class="${rowClass}">`;
            html += `<td class="header-col ${rowClass} ${pivotCol === -1 ? '' : (i === pivotRow ? 'highlight-col' : '')}">${rowVars[i]} =</td>`;
            row.forEach((val, j) => {
                const isPivot = i === pivotRow && j === pivotCol;
                const cellClass = `${isPivot ? 'highlight-pivot' : ''} ${j === pivotCol ? 'highlight-col' : ''}`;
                html += `<td class="${cellClass}">${formatNumber(val)}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;
        this.outputDiv.appendChild(tableContainer);
    }

    _formatTerm(coeff, varIndex, isFirstTerm) {
        if (Math.abs(coeff) < EPSILON) return '';
        let sign = isFirstTerm ? (coeff < 0 ? '- ' : '') : (coeff < 0 ? ' - ' : ' + ');
        let coeffAbs = Math.abs(coeff);
        let coeffStr = (Math.abs(coeffAbs - 1) < EPSILON) ? '' : `${formatNumber(coeffAbs)}*`;
        return `${sign}${coeffStr}x<sub>${varIndex + 1}</sub>`;
    }


    start(problemData, transformedData) {
        this.addHeading(3, "Постановка задачі:");
        let objTerms = problemData.objective.coeffs
            .map((c, j) => this._formatTerm(c, j, false))
            .filter(term => term !== '');
        if (objTerms.length > 0 && objTerms[0].startsWith(' + ')) {
            objTerms[0] = objTerms[0].substring(3); // Remove " + "
        } else if (objTerms.length > 0 && objTerms[0].startsWith(' - ')) {
            objTerms[0] = '-' + objTerms[0].substring(3); // Keep only "-"
        }

        let objStr = `Z = ${objTerms.length > 0 ? objTerms.join('') : '0.00'}`;
        objStr += ` → ${problemData.objective.isMin ? 'min' : 'max'}`;
        this.addParagraph(objStr);

        this.addParagraph("при обмеженнях:");
        const ul = document.createElement('ul');
        problemData.constraints.forEach(c => {
            const li = document.createElement('li');
            let constraintTerms = c.coeffs
                .map((cf, j) => this._formatTerm(cf, j, false))
                .filter(term => term !== '');
            if (constraintTerms.length > 0 && constraintTerms[0].startsWith(' + ')) {
                constraintTerms[0] = constraintTerms[0].substring(3);
            } else if (constraintTerms.length > 0 && constraintTerms[0].startsWith(' - ')) {
                constraintTerms[0] = '-' + constraintTerms[0].substring(3);
            }
            li.innerHTML = `${constraintTerms.length > 0 ? constraintTerms.join('') : '0.00'} ${c.type === '<=' ? '≤' : '≥'} ${formatNumber(c.b)}`;
            ul.appendChild(li);
        });
        this.outputDiv.appendChild(ul);
        this.addParagraph( `x<sub>j</sub> ≥ 0, j = 1..${problemData.numVars}`);
        this.addParagraph("<hr>");

        if (problemData.objective.isMin) {
            this.addParagraph("Перехід до задачі максимізації функції мети Z':");
            let zPrimeTerms = transformedData.zPrimeCoeffs
                .map((c, j) => this._formatTerm(c, j, false))
                .filter(term => term !== '');
            if (zPrimeTerms.length > 0 && zPrimeTerms[0].startsWith(' + ')) {
                zPrimeTerms[0] = zPrimeTerms[0].substring(3);
            } else if (zPrimeTerms.length > 0 && zPrimeTerms[0].startsWith(' - ')) {
                zPrimeTerms[0] = '-' + zPrimeTerms[0].substring(3);
            }
            let zPrimeStr = `Z' = ${zPrimeTerms.length > 0 ? zPrimeTerms.join('') : '0.00'} → max`;
            this.addParagraph(zPrimeStr);
        }

        this.addParagraph("Перепишемо систему обмежень (вигляд «... ≥ 0»):");
        transformedData.yEquations.forEach((eq, index) => {
            this.addParagraph(`${index + 1}) ${eq}`); // Add numbering
        });
        this.addParagraph("<hr>");
    }


    logInitialTableau(tableau, rowVars, colVars) {
        this.addHeading(3, "Вхідна симплекс-таблиця:");
        this.addTable(tableau, rowVars, colVars, "");
    }

    startFeasibilitySearch() {
        this.addHeading(3, "Пошук опорного розв’язку:");
    }

    logFeasibilityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        this.addParagraph(`<b>Крок ${stepNum} (Опорний):</b>`);
        this.addParagraph(reason);
        if(pivotRowVar && pivotColVar) {
            this.addParagraph(`Розв'язувальний рядок: <b>${pivotRowVar}</b>`);
            this.addParagraph(`Розв'язувальний стовпець: <b>${pivotColVar}</b>`);
            if (pivotElementValue !== null && typeof pivotElementValue !== 'undefined') {
                this.addParagraph(`Розв'язувальний елемент: ${formatNumber(pivotElementValue)}`);
            }
        }
        this.addTable(tableau, rowVars, colVars, "Таблиця:", pivotRowIdx, pivotColIdx);
    }

    logFeasibleFound(solutionX) {
        this.addParagraph(`<b>Знайдено опорний розв’язок:</b>`);
        this.addPreformatted(`X = (${solutionX.map(formatNumber).join('; ')})`);
        this.addParagraph("<hr>");
    }

    logContradictory() {
        this.addParagraph("<b>Система обмежень є суперечливою. Розв'язку не існує.</b>");
        this.addParagraph("<hr>");
    }

    startOptimalitySearch() {
        this.addHeading(3, "Пошук оптимального розв’язку:");
    }

    logOptimalityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        this.addParagraph(`<b>Крок ${stepNum} (Оптимальний):</b>`);
        this.addParagraph(reason);
        if(pivotRowVar && pivotColVar) {
            this.addParagraph(`Розв'язувальний рядок: <b>${pivotRowVar}</b>`);
            this.addParagraph(`Розв'язувальний стовпець: <b>${pivotColVar}</b>`);
            if (pivotElementValue !== null && typeof pivotElementValue !== 'undefined') {
                this.addParagraph(`Розв'язувальний елемент: ${formatNumber(pivotElementValue)}`);
            }
        }
        this.addTable(tableau, rowVars, colVars, "Таблиця:", pivotRowIdx, pivotColIdx);
    }

    logOptimalFound(solutionX, zValue, isMin) {
        this.addParagraph(`<b>Знайдено оптимальний розв’язок:</b>`);
        this.addPreformatted(`X = (${solutionX.map(formatNumber).join('; ')})`);
        const zType = isMin ? "Min(Z)" : "Max(Z)";
        this.addPreformatted(`${zType} = ${formatNumber(zValue)}`);
        this.addParagraph("<hr>");
    }

    logUnbounded(isMin) {
        const message = isMin
            ? "Функція мети Z' не обмежена зверху, отже, вихідна функція Z не обмежена знизу."
            : "Функція мети Z не обмежена зверху.";
        this.addParagraph(`<b>${message} Оптимального розв'язку не існує.</b>`);
        this.addParagraph("<hr>");
    }
}