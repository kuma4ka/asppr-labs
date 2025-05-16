import { formatNumber } from '../utils.js';
import { EPSILON } from '../config.js';

export class ProtocolLogger {
    constructor(outputDivId) {
        this.outputDiv = document.getElementById(outputDivId);
        this.clear();
        this.sectionCounter = 0;
    }

    clear() {
        if (this.outputDiv) this.outputDiv.innerHTML = '';
        this.sectionCounter = 0;
    }

    _createSection() {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'protocol-section';
        this.outputDiv.appendChild(sectionDiv);
        return sectionDiv;
    }

    _appendToCurrentSection(element) {
        let currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        if (!currentSection || this.sectionCounter === 0) { // Ensure a section exists
            currentSection = this._createSection();
        }
        currentSection.appendChild(element);
    }


    addHeading(level, text, inNewSection = false) {
        let targetContainer = this.outputDiv;
        if (!inNewSection && level > 2) { // h3 and h4 usually go inside a section
            targetContainer = this.outputDiv.querySelector('.protocol-section:last-child') || this._createSection();
        } else if (inNewSection) {
            targetContainer = this._createSection();
        }


        const heading = document.createElement(`h${level}`);
        heading.textContent = text;
        targetContainer.appendChild(heading);
        if (inNewSection && level <=2) this.sectionCounter++;
    }

    addParagraph(htmlContent, inNewSection = false) {
        let targetContainer = this.outputDiv.querySelector('.protocol-section:last-child');
        if (inNewSection || !targetContainer) {
            targetContainer = this._createSection();
        }
        const p = document.createElement('p');
        p.innerHTML = htmlContent;
        targetContainer.appendChild(p);
    }

    addPreformatted(text, inNewSection = false) {
        let targetContainer = this.outputDiv.querySelector('.protocol-section:last-child');
        if (inNewSection || !targetContainer) {
            targetContainer = this._createSection();
        }
        const pre = document.createElement('pre');
        pre.textContent = text;
        targetContainer.appendChild(pre);
    }

    addHr() {
        const hr = document.createElement('hr');
        hr.className = 'protocol-divider';
        this._appendToCurrentSection(hr);
    }


    addTable(tableau, rowVars, colVars, captionText, pivotRow = -1, pivotCol = -1) {
        let currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        if (!currentSection) currentSection = this._createSection();

        const tableContainer = document.createElement('div');
        if(captionText) {
            const cap = document.createElement('caption');
            cap.textContent = captionText;
            tableContainer.appendChild(cap);
        }

        let html = '<table><thead><tr><th></th>';
        colVars.forEach((v, index) => {
            html += `<th class="${index === pivotCol ? 'highlight-col' : ''} tableau-header-cell">${v}</th>`;
        });
        html += '</tr></thead><tbody>';
        tableau.forEach((row, i) => {
            const rowClass = i === pivotRow ? 'highlight-row' : '';
            html += `<tr class="${rowClass}">`;
            html += `<td class="header-col tableau-header-cell ${rowClass} ${pivotCol === -1 ? '' : (i === pivotRow ? 'highlight-col' : '')}">${rowVars[i]} =</td>`;
            row.forEach((val, j) => {
                const isPivot = i === pivotRow && j === pivotCol;
                const cellClass = `${isPivot ? 'highlight-pivot' : ''} ${j === pivotCol ? 'highlight-col' : ''}`;
                html += `<td class="${cellClass}">${formatNumber(val)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';
        tableContainer.innerHTML = html;
        currentSection.appendChild(tableContainer);
    }

    _formatMathTerm(coeff, varNameFull, isFirstTerm) {
        if (Math.abs(coeff) < EPSILON) return '';
        let sign = '';
        let valStr = formatNumber(Math.abs(coeff));
        let parenOpen = '';
        let parenClose = '';

        if (coeff < 0) {
            parenOpen = '(';
            parenClose = ')';
        }

        if (isFirstTerm) {
            sign = coeff < 0 ? `${parenOpen}-` : '';
            if (coeff < 0) valStr = `${valStr}${parenClose}`;
        } else {
            sign = coeff < 0 ? ` + ${parenOpen}-` : ' + ';
            if (coeff < 0) valStr = `${valStr}${parenClose}`;
        }

        let termVarPart = `*${varNameFull}`;
        if (Math.abs(Math.abs(coeff)-1) < EPSILON) {
            termVarPart = varNameFull;
            valStr = '';
            if (isFirstTerm && coeff < 0 ) sign = `${parenOpen}-`;
            else if (isFirstTerm && coeff > 0) sign = ``;
            else if (!isFirstTerm && coeff < 0) sign = ` + ${parenOpen}-`;
            else if (!isFirstTerm && coeff > 0) sign = ` + `;
            if (coeff < 0 && Math.abs(Math.abs(coeff)-1) < EPSILON && parenOpen) termVarPart = `${termVarPart}${parenClose}`;
            else if (coeff < 0 && valStr && parenOpen) valStr = `${formatNumber(Math.abs(coeff))}${parenClose}`;
            else if (coeff < 0 && !parenOpen) sign = '-'; // Handle -X if no parens
        }
        if (parenOpen && !valStr && Math.abs(Math.abs(coeff)-1) < EPSILON) { // for (-X[1])
            return `${sign}${termVarPart}`;
        }
        return `${sign}${valStr}${termVarPart}`;
    }


    start(problemData, transformedData) {
        this.sectionCounter++;
        const primalSection = this._createSection();

        const h3Primal = document.createElement('h3');
        h3Primal.textContent = "Постановка прямої задачі:";
        primalSection.appendChild(h3Primal);

        let objTermsArray = [];
        problemData.objective.coeffs.forEach((c,j) => {
            const term = this._formatMathTerm(c, `X[${j+1}]`, objTermsArray.length === 0);
            if (term) objTermsArray.push(term);
        });
        if (objTermsArray.length === 0) objTermsArray.push('0,00');

        const pObj = document.createElement('p');
        pObj.innerHTML = `<span class="math-expression">Z = ${objTermsArray.join('')} &rarr; ${problemData.objective.isMin ? 'min' : 'max'}</span>`;
        primalSection.appendChild(pObj);

        const pConstraintsHeader = document.createElement('p');
        pConstraintsHeader.textContent = "при обмеженнях:";
        primalSection.appendChild(pConstraintsHeader);

        const ul = document.createElement('ul');
        problemData.constraints.forEach(c => {
            const li = document.createElement('li');
            let constraintTermsArray = [];
            c.coeffs.forEach((cf, j) => {
                const term = this._formatMathTerm(cf, `X[${j+1}]`, constraintTermsArray.length === 0);
                if(term) constraintTermsArray.push(term);
            });
            if (constraintTermsArray.length === 0) constraintTermsArray.push('0,00');

            li.innerHTML = `<span class="math-expression">${constraintTermsArray.join('')} ${c.type === '<=' ? '\u2264' : '\u2265'} ${formatNumber(c.b)}</span>`;
            ul.appendChild(li);
        });
        primalSection.appendChild(ul);
        const pNonNeg = document.createElement('p');
        pNonNeg.innerHTML = `<span class="math-expression">X[j] \u2265 0, j=1..${problemData.numVars}</span>`;
        primalSection.appendChild(pNonNeg);

        if ((problemData.objective.isMin && transformedData.zPrimeCoeffs) || transformedData.yEquations) {
            this.addHr();
        }
        let currentSection = primalSection;


        if (problemData.objective.isMin && transformedData.zPrimeCoeffs) {
            currentSection = this._createSection();
            this.sectionCounter++;
            const pZPrimeHeader = document.createElement('p');
            pZPrimeHeader.textContent = "Перехід до задачі максимізації функції мети Z':";
            currentSection.appendChild(pZPrimeHeader);

            let zPrimeTermsArray = [];
            transformedData.zPrimeCoeffs.forEach((c,j) => {
                const term = this._formatMathTerm(c, `X[${j+1}]`,zPrimeTermsArray.length === 0);
                if (term) zPrimeTermsArray.push(term);
            });
            if (zPrimeTermsArray.length === 0) zPrimeTermsArray.push('0,00');
            const pZPrime = document.createElement('p');
            pZPrime.innerHTML = `<span class="math-expression">Z' = ${zPrimeTermsArray.join('')} &rarr; max</span>`;
            currentSection.appendChild(pZPrime);
        }

        if(transformedData.yEquations && transformedData.yEquations.length > 0) {
            if(currentSection !== primalSection || (problemData.objective.isMin && transformedData.zPrimeCoeffs)) this.addHr();
            currentSection = this.outputDiv.querySelector('.protocol-section:last-child') || this._createSection();
            if(this.outputDiv.querySelectorAll('.protocol-section').length <= this.sectionCounter) this.sectionCounter++;


            const pYEqHeader = document.createElement('p');
            pYEqHeader.textContent = "Перепишемо систему обмежень прямої задачі:";
            currentSection.appendChild(pYEqHeader);
            transformedData.yEquations.forEach((eq, index) => {
                const pEq = document.createElement('p');
                const eqWithoutY = eq.substring(eq.indexOf('=') + 1).trim();
                pEq.innerHTML = `<span class="math-expression">${formatNumber(index + 1, 0)}) ${eqWithoutY}</span>`;
                currentSection.appendChild(pEq);
            });
        }
        this.addHr();
    }

    logInitialTableau(tableau, rowVars, colVars) {
        this.sectionCounter++;
        const section = this._createSection();
        const h3 = document.createElement('h3');
        h3.textContent = "Вхідна симплекс-таблиця для пари взаємно двоїстих задач:";
        section.appendChild(h3);
        this.addTable(tableau, rowVars, colVars, "");
    }

    startFeasibilitySearch() {
        this.sectionCounter++;
        const section = this._createSection();
        const p = document.createElement('p');
        p.innerHTML = "<b>Пошук опорного розв’язку:</b>";
        section.appendChild(p);
    }

    logFeasibilityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        const currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        const pReason = document.createElement('p');
        pReason.innerHTML = reason;
        currentSection.appendChild(pReason);

        if (pivotRowVar && pivotColVar && !reason.startsWith("Всі вільні члени")) {
            const pRow = document.createElement('p');
            pRow.innerHTML = `Розв’язувальний рядок: <b>${pivotRowVar.split(' ')[1] || pivotRowVar}</b>`;
            currentSection.appendChild(pRow);
            const pCol = document.createElement('p');
            pCol.innerHTML = `Розв’язувальний стовпець: <b>${pivotColVar.split(', ')[1] || pivotColVar}</b>`;
            currentSection.appendChild(pCol);
        }
        this.addTable(tableau, rowVars, colVars, "", pivotRowIdx, pivotColIdx);
    }

    logFeasibleFound(solutionX, dualSolutionU) {
        const currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        const pHeader = document.createElement('p');
        pHeader.innerHTML = `<b>Знайдено опорний розв’язок:</b>`;
        currentSection.appendChild(pHeader);

        const prePrimal = document.createElement('pre');
        prePrimal.textContent = `Розв’язки прямої задачі:\nX = (${solutionX.map(val => formatNumber(val)).join('; ')})`;
        currentSection.appendChild(prePrimal);

        if (dualSolutionU) {
            const preDual = document.createElement('pre');
            preDual.textContent = `Розв’язки двоїстої задачі:\nU = (${dualSolutionU.map(val => formatNumber(val)).join('; ')})`;
            currentSection.appendChild(preDual);
        }
        this.addHr();
    }

    logContradictory() {
        this.addParagraph("<b>Система обмежень є суперечливою. Розв'язку не існує.</b>", false);
        this.addHr();
    }

    startOptimalitySearch() {
        this.sectionCounter++;
        const section = this._createSection();
        const p = document.createElement('p');
        p.innerHTML = "<b>Пошук оптимального розв’язку:</b>";
        section.appendChild(p);
    }

    logOptimalityStep(stepNum, reason, pivotRowVar, pivotColVar, pivotElementValue, tableau, rowVars, colVars, pivotRowIdx, pivotColIdx) {
        const currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        const pReason = document.createElement('p');
        pReason.innerHTML = reason;
        currentSection.appendChild(pReason);

        if (pivotRowVar && pivotColVar && !reason.includes("Всі коефіцієнти в Z-рядку")) {
            const pRow = document.createElement('p');
            pRow.innerHTML = `Розв’язувальний рядок: <b>${pivotRowVar.split(' ')[1] || pivotRowVar}</b>`;
            currentSection.appendChild(pRow);
            const pCol = document.createElement('p');
            pCol.innerHTML = `Розв’язувальний стовпець: <b>${pivotColVar.split(', ')[1] || pivotColVar}</b>`;
            currentSection.appendChild(pCol);
        }
        this.addTable(tableau, rowVars, colVars, "", pivotRowIdx, pivotColIdx);
    }

    logOptimalFound(solutionX, zValue, isMin, dualSolutionU, dualObjectiveIsMin) {
        const currentSection = this.outputDiv.querySelector('.protocol-section:last-child');
        const pHeader = document.createElement('p');
        pHeader.innerHTML = `<b>Знайдено оптимальний розв’язок:</b>`;
        currentSection.appendChild(pHeader);

        const prePrimalX = document.createElement('pre');
        prePrimalX.textContent = `Розв’язки прямої задачі:\nX = (${solutionX.map(val => formatNumber(val)).join('; ')})`;
        currentSection.appendChild(prePrimalX);

        const zType = isMin ? "Min(Z)" : "Max(Z)";
        const prePrimalZ = document.createElement('pre');
        prePrimalZ.textContent = `${zType} = ${formatNumber(zValue)}`;
        currentSection.appendChild(prePrimalZ);

        if (dualSolutionU) {
            const preDualU = document.createElement('pre');
            preDualU.textContent = `Розв’язки двоїстої задачі:\nU = (${dualSolutionU.map(val => formatNumber(val)).join('; ')})`;
            currentSection.appendChild(preDualU);

            if (dualObjectiveIsMin !== null) {
                const WValue = zValue;
                const WStringType = dualObjectiveIsMin ? "Min(W)" : "Max(W)";
                const preDualW = document.createElement('pre');
                preDualW.textContent = `${WStringType} = ${formatNumber(WValue)}`;
                currentSection.appendChild(preDualW);
            }
        }
        this.addHr();
    }

    logUnbounded(isMin) {
        const message = isMin ?
            "Функція мети Z' не обмежена зверху, отже, вихідна функція Z не обмежена знизу." :
            "Функція мети Z не обмежена зверху.";
        this.addParagraph(`<b>${message} Оптимального розв'язку не існує.</b>`, false);
        this.addHr();
    }

    logDualProblem(dualProblemDataFormatted) {
        this.sectionCounter++;
        const section = this._createSection();
        const h3 = document.createElement('h3');
        h3.textContent = "Постановка двоїстої задачі:";
        section.appendChild(h3);
        this.addPreformatted(dualProblemDataFormatted);
        this.addHr();
    }
}