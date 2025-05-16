import { formatNumber, getFractionalPart } from './utils.js';
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
        let html = captionText ? `<caption>${captionText}</caption>` : '';
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

    _formatTerm(coeff, varIndex, isFirstTermInSum) {
        if (Math.abs(coeff) < EPSILON) return '';
        let sign = '';
        if (isFirstTermInSum) {
            sign = coeff < 0 ? '-' : '';
        } else {
            sign = coeff < 0 ? ' - ' : ' + ';
        }
        let coeffAbs = Math.abs(coeff);
        let coeffStr = (Math.abs(coeffAbs - 1) < EPSILON && coeffAbs !== 0) ? '' : `${formatNumber(coeffAbs)}*`;
        return `${sign}${coeffStr}x<sub>${varIndex + 1}</sub>`;
    }

    start(problemData, transformedData) {
        this.addHeading(3, "Постановка задачі:");
        let objTerms = problemData.objective.coeffs
            .map((c, j) => this._formatTerm(c, j, j === 0 && c >=0))
            .filter(term => term !== '');

        let firstTerm = objTerms.length > 0 ? objTerms[0].trimStart() : "0.00";
        if (firstTerm.startsWith('+')) firstTerm = firstTerm.substring(1).trimStart();
        let objStr = `Z = ${firstTerm}`;
        for(let k=1; k < objTerms.length; k++) objStr += objTerms[k];
        if(objTerms.length === 0) objStr = "Z = 0.00";


        objStr += ` &rarr; ${problemData.objective.isMin ? 'min' : 'max'}`;
        this.addParagraph(objStr);
        this.addParagraph("при обмеженнях:");
        const ul = document.createElement('ul');
        problemData.constraints.forEach(c => {
            const li = document.createElement('li');
            let constraintTerms = c.coeffs
                .map((cf, j) => this._formatTerm(cf, j, j === 0 && cf >=0))
                .filter(term => term !== '');

            let firstConstrTerm = constraintTerms.length > 0 ? constraintTerms[0].trimStart() : "0.00";
            if (firstConstrTerm.startsWith('+')) firstConstrTerm = firstConstrTerm.substring(1).trimStart();
            let constrStr = firstConstrTerm;
            for(let k=1; k < constraintTerms.length; k++) constrStr += constraintTerms[k];
            if(constraintTerms.length === 0) constrStr = "0.00";


            li.innerHTML = `${constrStr} ${c.type === '<=' ? '&le;' : (c.type === '>=' ? '&ge;' : '=')} ${formatNumber(c.b)}`;
            ul.appendChild(li);
        });
        this.outputDiv.appendChild(ul);
        this.addParagraph(`x<sub>j</sub> &ge; 0, j=1..${problemData.numVars}`);
        this.addParagraph("<hr>");

        if (problemData.objective.isMin) {
            this.addParagraph("Перехід до задачі максимізації функції мети Z':");
            let zPrimeTerms = transformedData.zPrimeCoeffs
                .map((c, j) => this._formatTerm(c, j, j === 0 && c >=0))
                .filter(term => term !== '');

            let firstZPrimeTerm = zPrimeTerms.length > 0 ? zPrimeTerms[0].trimStart() : "0.00";
            if (firstZPrimeTerm.startsWith('+')) firstZPrimeTerm = firstZPrimeTerm.substring(1).trimStart();
            let zPrimeStr = `Z' = ${firstZPrimeTerm}`;
            for(let k=1; k < zPrimeTerms.length; k++) zPrimeStr += zPrimeTerms[k];
            if(zPrimeTerms.length === 0) zPrimeStr = "Z' = 0.00";

            zPrimeStr += " &rarr; max";
            this.addParagraph(zPrimeStr);
        }

        this.addParagraph("Перепишемо систему обмежень (вигляд &laquo;... &ge; 0&raquo;):");
        transformedData.yEquations.forEach((eq, index) => {
            this.addParagraph(`${index + 1}) ${eq}`);
        });
        this.addParagraph("<hr>");
    }

    logInitialTableau(tableau, rowVars, colVars, caption = "Вхідна симплекс-таблиця:") {
        this.addHeading(3, caption);
        this.addTable(tableau, rowVars, colVars, "");
    }

    startFeasibilitySearch() {
        this.addHeading(3, "Пошук опорного розв'язку:");
    }

    logFeasibilityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        this.addParagraph(`<b>Крок ${stepNum} (Опорний):</b>`);
        this.addParagraph(reason);
        if (pivotRowVar && pivotColVar) {
            if (pivotRowVar) this.addParagraph(`Обраний розв'язувальний рядок: <b>${pivotRowVar}</b>`);
            if (pivotColVar) this.addParagraph(`Обраний розв'язувальний стовпець: <b>${pivotColVar}</b>`);
            if (pivotElementValue !== null && typeof pivotElementValue !== 'undefined') {
                this.addParagraph(`Розв'язувальний елемент: ${formatNumber(pivotElementValue)}`);
            }
        }
        this.addTable(tableau, rowVars, colVars, "Таблиця:", pivotRowIdx, pivotColIdx);
    }

    logFeasibleFound(solutionX) {
        this.addParagraph(`<b>Знайдено опорний розв'язок:</b>`);
        this.addPreformatted(`X = (${solutionX.map(val => formatNumber(val)).join('; ')})`);
        this.addParagraph("<hr>");
    }

    logContradictory() {
        this.addParagraph("<b>Система обмежень є суперечливою. Розв'язку не існує.</b>");
        this.addParagraph("<hr>");
    }

    startOptimalitySearch() {
        this.addHeading(3, "Пошук оптимального розв'язку:");
    }

    logOptimalityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        this.addParagraph(`<b>Крок ${stepNum} (Оптимальний):</b>`);
        this.addParagraph(reason);
        if (pivotRowVar && pivotColVar) {
            this.addParagraph(`Розв'язувальний рядок: <b>${pivotRowVar}</b>`);
            this.addParagraph(`Розв'язувальний стовпець: <b>${pivotColVar}</b>`);
            if (pivotElementValue !== null && typeof pivotElementValue !== 'undefined') {
                this.addParagraph(`Розв'язувальний елемент: ${formatNumber(pivotElementValue)}`);
            }
        }
        this.addTable(tableau, rowVars, colVars, "Таблиця:", pivotRowIdx, pivotColIdx);
    }

    logOptimalFound(solutionX, zValue, isMin) {
        this.addParagraph(`<b>Знайдено оптимальний розв'язок:</b>`);
        this.addPreformatted(`X = (${solutionX.map(val => formatNumber(val)).join('; ')})`);
        const zType = isMin ? "Min(Z)" : "Max(Z)";
        let zStr = `${zType} = ${formatNumber(zValue)}`;
        this.addPreformatted(zStr);
        this.addParagraph("<hr>");
    }

    logUnbounded(isMin) {
        const message = isMin
            ? "Функція мети Z' не обмежена зверху, отже, вихідна функція Z не обмежена знизу."
            : "Функція мети Z не обмежена зверху.";
        this.addParagraph(`<b>${message} Оптимального розв'язку не існує.</b>`);
        this.addParagraph("<hr>");
    }

    logGomoryIterationHeader(iterationNumber) {
        this.addHeading(3, `Ітерація Гоморі №${iterationNumber}`);
    }

    logIntegerCheck(solutionX, isInteger) {
        this.addParagraph("Перевірка на цілочисловість поточного розв'язку:");
        this.addPreformatted(`X = (${solutionX.map(val => formatNumber(val)).join('; ')})`);
        if (isInteger) {
            this.addParagraph("<b>Розв'язок є цілочисловим.</b>");
        } else {
            this.addParagraph("Розв'язок не є цілочисловим.");
        }
    }

    logRowForCutSelection(varName, fractionalPart) {
        this.addParagraph(`Обрано змінну для побудови відсічення Гоморі: <b>${varName}</b>.`);
        this.addParagraph(`Максимальна дробова частина: ${formatNumber(fractionalPart, 4)}.`);
    }

    logGomoryCutCoefficients(sourceTableRowCoefficients, colVarsOriginalOrder, newSlackVarName) {
        let cutString = `${newSlackVarName} + `;
        let terms = [];
        const constColIndexInSource = sourceTableRowCoefficients.length -1;

        for (let j = 0; j < constColIndexInSource; j++) {
            const fractional_aj = getFractionalPart(sourceTableRowCoefficients[j]);
            if (Math.abs(fractional_aj) > EPSILON) {
                terms.push(`${formatNumber(fractional_aj,4)}(${colVarsOriginalOrder[j]})`);
            }
        }
        const fractional_b = getFractionalPart(sourceTableRowCoefficients[constColIndexInSource]);

        if (terms.length > 0) {
            cutString += terms.join(' + ');
        } else {
            cutString += "0";
        }
        cutString += ` = ${formatNumber(fractional_b,4)}`;
        this.addParagraph(`Рядок-джерело відсічення Гоморі (дробові частини): ${newSlackVarName} + &Sigma; {a<sub>ij</sub>} (-x<sub>j</sub>) = {b<sub>i</sub>}`);
        this.addParagraph(`де {a<sub>ij</sub>} та {b<sub>i</sub>} - дробові частини елементів рядка для <b>${newSlackVarName.replace('s_from_','')}</b>`);
        this.addParagraph(`Сформоване відсічення: ${cutString}`);
        this.addParagraph(`Або, $s_k = -\\{b_i\\} + \\sum (-\\{a_{ij}\\})(-x_j)$, де $-x_j$ - поточні небазисні змінні.`);
    }

    logGomoryLimitReached() {
        this.addParagraph("<b>Перевищено максимальну кількість ітерацій методу Гоморі. Цілочисловий розв'язок не знайдено в межах ліміту.</b>");
        this.addParagraph("<hr>");
    }
}