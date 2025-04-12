const EPSILON = 1e-9;

const numVarsInput = document.getElementById('numVars');
const setupVarsButton = document.getElementById('setupVarsButton');
const objCoeffsContainer = document.getElementById('objCoeffsContainer');
const objectiveTypeSelect = document.getElementById('objectiveType');
const constraintsContainer = document.getElementById('constraintsContainer');
const addConstraintButton = document.getElementById('addConstraintButton');
const solveButton = document.getElementById('solveButton');
const loadExample1Button = document.getElementById('loadExample1Button');
const loadExample2Button = document.getElementById('loadExample2Button');
const loadVariant20Button = document.getElementById('loadVariant20Button'); // ДОДАНО
const protocolOutputDiv = document.getElementById('protocolOutput');
const finalResultDiv = document.getElementById('finalResult');

function formatNumber(num) {
    if (Math.abs(num) < EPSILON) return "0.00";
    return num.toFixed(2);
}

function createCoeffInput(index, value = '0') {
    const span = document.createElement('span');
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'coeff-input';
    input.value = value;
    input.step = 'any';
    input.dataset.index = index;
    span.appendChild(input);
    span.appendChild(document.createTextNode(`x${index + 1}`));
    if (index > 0) {
        const plus = document.createElement('span');
        plus.textContent = ' + ';
        span.insertBefore(plus, input);
    }
    return span;
}

function setupInputFields(numVars) {
    objCoeffsContainer.innerHTML = '';
    for (let i = 0; i < numVars; i++) {
        objCoeffsContainer.appendChild(createCoeffInput(i));
    }
    constraintsContainer.innerHTML = '';
    addConstraintRow(numVars);
}

function addConstraintRow(numVars, constraintData = null) {
    const constraintId = `constraint-${Date.now()}-${Math.random()}`;
    const rowDiv = document.createElement('div');
    rowDiv.className = 'constraint-row';
    rowDiv.id = constraintId;

    const coeffsDiv = document.createElement('div');
    coeffsDiv.className = 'coeffs-container';
    for (let i = 0; i < numVars; i++) {
        const value = constraintData ? (constraintData.coeffs[i] || '0') : '0';
        coeffsDiv.appendChild(createCoeffInput(i, value));
    }
    rowDiv.appendChild(coeffsDiv);

    const select = document.createElement('select');
    select.innerHTML = `
        <option value="<=" ${constraintData?.type === '<=' ? 'selected' : ''}>≤</option>
        <option value=">=" ${constraintData?.type === '>=' ? 'selected' : ''}>≥</option>
    `;
    rowDiv.appendChild(select);

    const constInput = document.createElement('input');
    constInput.type = 'number';
    constInput.value = constraintData ? (constraintData.b || '0') : '0';
    constInput.step = 'any';
    constInput.placeholder = 'b';
    rowDiv.appendChild(constInput);

    const removeButton = document.createElement('button');
    removeButton.textContent = 'Видалити';
    removeButton.className = 'remove-constraint';
    removeButton.onclick = () => {
        const rowToRemove = document.getElementById(constraintId);
        if (rowToRemove) rowToRemove.remove();
    };
    rowDiv.appendChild(removeButton);

    constraintsContainer.appendChild(rowDiv);
}

function parseInput() {
    const numVars = parseInt(numVarsInput.value, 10);
    if (isNaN(numVars) || numVars < 1) {
        throw new Error("Невірна кількість змінних.");
    }

    const objective = { coeffs: [], isMin: objectiveTypeSelect.value === 'min' };
    const objInputs = objCoeffsContainer.querySelectorAll('input');
    if (objInputs.length !== numVars) throw new Error("Кількість полів для цільової функції не відповідає кількості змінних.");
    objInputs.forEach(input => {
        const val = parseFloat(input.value);
        if (isNaN(val)) throw new Error(`Невірний коефіцієнт '${input.value}' у цільовій функції.`);
        objective.coeffs.push(val);
    });

    const constraints = [];
    const constraintRows = constraintsContainer.querySelectorAll('.constraint-row');
    if (constraintRows.length === 0) {
        throw new Error("Не додано жодного обмеження.");
    }
    constraintRows.forEach((row, index) => {
        const constraint = { coeffs: [], type: '', b: 0 };
        const coeffInputs = row.querySelectorAll('.coeffs-container input');
        if (coeffInputs.length !== numVars) throw new Error(`Кількість полів для обмеження ${index + 1} не відповідає кількості змінних.`);

        coeffInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (isNaN(val)) throw new Error(`Невірний коефіцієнт '${input.value}' в обмеженні ${index + 1}.`);
            constraint.coeffs.push(val);
        });

        const select = row.querySelector('select');
        constraint.type = select.value;

        const constInput = row.querySelector('input[type="number"]:not(.coeff-input)');
        const bVal = parseFloat(constInput.value);
        if (isNaN(bVal)) throw new Error(`Невірне значення вільного члена '${constInput.value}' в обмеженні ${index + 1}.`);
        constraint.b = bVal;

        constraints.push(constraint);
    });

    return { numVars, objective, constraints };
}


function transformProblem(parsedData) {
    const { numVars, objective, constraints } = parsedData;
    const numConstraints = constraints.length;

    let zPrimeCoeffs = [...objective.coeffs];
    if (objective.isMin) {
        zPrimeCoeffs = zPrimeCoeffs.map(c => -c);
    }

    const yEquations = [];
    const tableauRowCoeffs_NegX = [];
    const tableauConstants = [];

    constraints.forEach((constraint, i) => {
        let rowCoeffs = [];
        let constantForTableau;
        let equationString = `y<sub>${i + 1}</sub> = `;
        let tempCoeffs_eq = [];
        let tempConst_eq = 0;

        if (constraint.type === '<=') {
            rowCoeffs = constraint.coeffs.map(c => c);
            constantForTableau = constraint.b;
            tempCoeffs_eq = constraint.coeffs.map(c => -c);
            tempConst_eq = constraint.b;

        } else {
            rowCoeffs = constraint.coeffs.map(c => -c);
            constantForTableau = -constraint.b;
            tempCoeffs_eq = [...constraint.coeffs];
            tempConst_eq = -constraint.b;
        }

        let terms = [];
        tempCoeffs_eq.forEach((c, j) => {
            if (Math.abs(c) > EPSILON) {
                let sign = (terms.length > 0) ? (c >= 0 ? ' + ' : ' - ') : (c >= 0 ? '' : '- ');
                let coeffStr = (Math.abs(Math.abs(c) - 1) < EPSILON) ? '' : `${formatNumber(Math.abs(c))}*`;
                terms.push(`${sign}${coeffStr}x<sub>${j + 1}</sub>`);
            }
        });
        if (terms.length === 0 && Math.abs(tempConst_eq) < EPSILON) {
            equationString += "0.00";
        } else {
            equationString += terms.join('');
            if (Math.abs(tempConst_eq) > EPSILON || terms.length === 0) {
                equationString += (tempConst_eq >= 0 ? (terms.length > 0 ? ' + ' : '') : ' - ') + formatNumber(Math.abs(tempConst_eq));
            }
        }

        equationString += " ≥ 0";

        yEquations.push(equationString);
        tableauRowCoeffs_NegX.push(rowCoeffs);
        tableauConstants.push(constantForTableau);
    });


    return {
        numVars,
        numConstraints,
        originalObjective: objective,
        zPrimeCoeffs,
        tableauRowCoeffs_NegX,
        tableauConstants,
        yEquations
    };
}


function generateInitialTableau(transformedData) {
    const { numVars, numConstraints, zPrimeCoeffs, tableauRowCoeffs_NegX, tableauConstants } = transformedData;
    const tableau = [];

    for (let i = 0; i < numConstraints; i++) {
        const row = [...tableauRowCoeffs_NegX[i]];
        row.push(tableauConstants[i]);
        tableau.push(row);
    }

    const zRow = [];
    for (let j = 0; j < numVars; j++) {
        zRow.push(zPrimeCoeffs[j] !== 0 ? -zPrimeCoeffs[j] : 0);
    }
    zRow.push(0);
    tableau.push(zRow);

    const rowVars = Array.from({ length: numConstraints }, (_, i) => `y${i + 1}`);
    rowVars.push("Z'");

    const colVars = Array.from({ length: numVars }, (_, i) => `-x${i + 1}`);
    colVars.push("1");

    return { tableau, rowVars, colVars };
}


class ProtocolLogger {
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

    start(problemData, transformedData) {
        this.addHeading(3, "Постановка задачі:");
        let objTerms = problemData.objective.coeffs
            .map((c, j) => ({ coeff: c, index: j }))
            .filter(item => Math.abs(item.coeff) > EPSILON)
            .map((item, k) => {
                let sign = (k > 0) ? (item.coeff >= 0 ? ' + ' : ' - ') : (item.coeff >= 0 ? '' : '- ');
                let coeffStr = (Math.abs(Math.abs(item.coeff) - 1) < EPSILON) ? '' : `${formatNumber(Math.abs(item.coeff))}*`;
                return `${sign}${coeffStr}x<sub>${item.index + 1}</sub>`;
            });
        let objStr = `Z = ${objTerms.length > 0 ? objTerms.join('') : '0.00'}`;
        objStr += ` → ${problemData.objective.isMin ? 'min' : 'max'}`;
        this.addParagraph(objStr);

        this.addParagraph("при обмеженнях:");
        const ul = document.createElement('ul');
        problemData.constraints.forEach(c => {
            const li = document.createElement('li');
            let constraintTerms = c.coeffs
                .map((cf, j) => ({ coeff: cf, index: j }))
                .filter(item => Math.abs(item.coeff) > EPSILON)
                .map((item, k) => {
                    let sign = (k > 0) ? (item.coeff >= 0 ? ' + ' : ' - ') : (item.coeff >= 0 ? '' : '- ');
                    let coeffStr = (Math.abs(Math.abs(item.coeff) - 1) < EPSILON) ? '' : `${formatNumber(Math.abs(item.coeff))}*`;
                    return `${sign}${coeffStr}x<sub>${item.index + 1}</sub>`;
                });
            li.innerHTML = `${constraintTerms.length > 0 ? constraintTerms.join('') : '0.00'} ${c.type === '<=' ? '≤' : '≥'} ${formatNumber(c.b)}`;
            ul.appendChild(li);
        });
        this.outputDiv.appendChild(ul);
        this.addParagraph( `x<sub>j</sub> ≥ 0, j = 1..${problemData.numVars}`);
        this.addParagraph("<hr>");

        if (problemData.objective.isMin) {
            this.addParagraph("Перехід до задачі максимізації функції мети Z':");
            let zPrimeTerms = transformedData.zPrimeCoeffs
                .map((c, j) => ({ coeff: c, index: j }))
                .filter(item => Math.abs(item.coeff) > EPSILON)
                .map((item, k) => {
                    let sign = (k > 0) ? (item.coeff >= 0 ? ' + ' : ' - ') : (item.coeff >= 0 ? '' : '- ');
                    let coeffStr = (Math.abs(Math.abs(item.coeff) - 1) < EPSILON) ? '' : `${formatNumber(Math.abs(item.coeff))}*`;
                    return `${sign}${coeffStr}x<sub>${item.index + 1}</sub>`;
                });
            let zPrimeStr = `Z' = ${zPrimeTerms.length > 0 ? zPrimeTerms.join('') : '0.00'} → max`;
            this.addParagraph(zPrimeStr);
        }

        this.addParagraph("Перепишемо систему обмежень (вигляд «... ≥ 0»):");
        transformedData.yEquations.forEach(eq => {
            this.addParagraph(eq);
        });
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
    }

    logContradictory() {
        this.addParagraph("<b>Система обмежень є суперечливою. Розв'язку не існує.</b>");
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
    }

    logUnbounded(isMin) {
        const message = isMin
            ? "Функція мети Z' не обмежена зверху, отже, вихідна функція Z не обмежена знизу."
            : "Функція мети Z не обмежена зверху.";
        this.addParagraph(`<b>${message} Оптимального розв'язку не існує.</b>`);
    }
}


function performMJE(currentTableau, currentRowVars, currentColVars, r, s) {
    const numRows = currentTableau.length;
    const numCols = currentTableau[0].length;
    const pivotElement = currentTableau[r][s];

    if (Math.abs(pivotElement) < EPSILON) {
        console.error(`MJE Error: Zero pivot element at [${r}, ${s}]`);
        return null;
    }

    const newTableau = currentTableau.map(row => [...row]);
    const newRowVars = [...currentRowVars];
    const newColVars = [...currentColVars];

    const tempTableau = currentTableau.map(row => [...row]);

    tempTableau[r][s] = 1;

    for (let i = 0; i < numRows; i++) {
        if (i !== r) {
            tempTableau[i][s] = -currentTableau[i][s];
        }
    }

    for (let i = 0; i < numRows; i++) {
        if (i === r) continue;
        for (let j = 0; j < numCols; j++) {
            if (j === s) continue;
            tempTableau[i][j] = currentTableau[i][j] * currentTableau[r][s] - currentTableau[i][s] * currentTableau[r][j];
        }
    }

    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            newTableau[i][j] = tempTableau[i][j] / pivotElement;
        }
    }

    const tempVar = newRowVars[r];
    newRowVars[r] = newColVars[s];
    newColVars[s] = tempVar;

    return { tableau: newTableau, rowVars: newRowVars, colVars: newColVars };
}


function findFeasibleSolution(initialTableau, initialRowVars, initialColVars, logger) {
    let currentTableau = initialTableau.map(row => [...row]);
    let currentRowVars = [...initialRowVars];
    let currentColVars = [...initialColVars];
    const numRows = currentTableau.length - 1;
    const numColsTotal = currentTableau[0].length;
    const constColIndex = numColsTotal - 1;
    let step = 0;
    const MAX_STEPS = 50;

    logger.startFeasibilitySearch();

    while (step < MAX_STEPS) {
        step++;
        let pivotRowIdx = -1;
        let minConst = 0;

        for (let i = 0; i < numRows; i++) {
            if (currentTableau[i][constColIndex] < minConst - EPSILON) {
                minConst = currentTableau[i][constColIndex];
                pivotRowIdx = i;
            }
        }

        if (pivotRowIdx === -1) {
            logger.logFeasibilityStep(step, "Всі вільні члени невід'ємні.", null, null, null, currentTableau, currentRowVars, currentColVars, -1, -1);
            return { tableau: currentTableau, rowVars: currentRowVars, colVars: currentColVars, feasible: true };
        }

        let reason = `Знайдено від'ємний вільний член ${formatNumber(minConst)} у рядку <b>${currentRowVars[pivotRowIdx]}</b>.`;

        let pivotColIdx = -1;
        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[pivotRowIdx][j] < -EPSILON) {
                pivotColIdx = j;
                break;
            }
        }

        if (pivotColIdx === -1) {
            reason += ` У рядку ${currentRowVars[pivotRowIdx]} немає від'ємних елементів. Система суперечлива.`;
            logger.logFeasibilityStep(step, reason, currentRowVars[pivotRowIdx], null, null, currentTableau, currentRowVars, currentColVars, pivotRowIdx, -1);
            logger.logContradictory();
            return { feasible: false };
        }

        reason += ` Обрано розв'язувальний стовпець <b>${currentColVars[pivotColIdx]}</b> (перший знайдений від'ємний елемент).`;

        let minRatio = Infinity;
        let actualPivotRowIdx = -1;
        for (let i = 0; i < numRows; i++) {
            if (currentTableau[i][pivotColIdx] > EPSILON) {
                const ratio = currentTableau[i][constColIndex] / currentTableau[i][pivotColIdx];
                if (ratio >= -EPSILON && ratio < minRatio - EPSILON) {
                    minRatio = ratio;
                    actualPivotRowIdx = i;
                } else if (Math.abs(ratio - minRatio) < EPSILON) {
                    if (actualPivotRowIdx === -1 || i < actualPivotRowIdx) {
                        actualPivotRowIdx = i;
                    }
                }
            }
        }

        if (actualPivotRowIdx === -1) {
            reason += ` Не вдалося знайти розв'язувальний рядок (всі елементи в стовпці ${currentColVars[pivotColIdx]} недодатні). Система суперечлива.`;
            logger.logFeasibilityStep(step, reason, currentRowVars[pivotRowIdx], currentColVars[pivotColIdx], null, currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);
            logger.logContradictory();
            return { feasible: false };
        }

        const pivotElementValue = currentTableau[actualPivotRowIdx][pivotColIdx];
        reason += ` Тест відношень для стовпця ${currentColVars[pivotColIdx]}: minRatio ≈ ${formatNumber(minRatio)} у рядку <b>${currentRowVars[actualPivotRowIdx]}</b>. Виконуємо МЖВ...`;

        logger.logFeasibilityStep(step, reason, currentRowVars[actualPivotRowIdx], currentColVars[pivotColIdx], pivotElementValue, currentTableau, currentRowVars, currentColVars, actualPivotRowIdx, pivotColIdx);

        const result = performMJE(currentTableau, currentRowVars, currentColVars, actualPivotRowIdx, pivotColIdx);
        if (!result) {
            logger.addParagraph("Помилка під час виконання МЖВ.");
            return { feasible: false };
        }

        currentTableau = result.tableau;
        currentRowVars = result.rowVars;
        currentColVars = result.colVars;
    }

    if (step >= MAX_STEPS) {
        logger.addParagraph("Перевищено максимальну кількість ітерацій пошуку опорного розв'язку.");
        return { feasible: false };
    }

    return { feasible: false };
}


function findOptimalSolution(feasibleTableau, feasibleRowVars, feasibleColVars, logger, isMin) {
    let currentTableau = feasibleTableau.map(row => [...row]);
    let currentRowVars = [...feasibleRowVars];
    let currentColVars = [...feasibleColVars];
    const numRows = currentTableau.length - 1;
    const zRowIndex = currentTableau.length - 1;
    const numColsTotal = currentTableau[0].length;
    const constColIndex = numColsTotal - 1;
    let step = 0;
    const MAX_STEPS = 50;

    logger.startOptimalitySearch();

    while (step < MAX_STEPS) {
        step++;
        let pivotColIdx = -1;
        let minZcoeff = 0;

        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[zRowIndex][j] < minZcoeff - EPSILON) {
                minZcoeff = currentTableau[zRowIndex][j];
                pivotColIdx = j;
            }
        }

        if (pivotColIdx === -1) {
            logger.logOptimalityStep(step, "Всі коефіцієнти в Z'-рядку невід'ємні.", null, null, null, currentTableau, currentRowVars, currentColVars, -1, -1);
            return { tableau: currentTableau, rowVars: currentRowVars, colVars: currentColVars, optimal: true };
        }

        let reason = `Знайдено від'ємний коефіцієнт ${formatNumber(minZcoeff)} у Z'-рядку. Обрано розв'язувальний стовпець <b>${currentColVars[pivotColIdx]}</b>.`;

        let minRatio = Infinity;
        let pivotRowIdx = -1;
        for (let i = 0; i < numRows; i++) {
            if (currentTableau[i][pivotColIdx] > EPSILON) {
                const ratio = currentTableau[i][constColIndex] / currentTableau[i][pivotColIdx];
                if (ratio >= -EPSILON && ratio < minRatio - EPSILON) {
                    minRatio = ratio;
                    pivotRowIdx = i;
                } else if (Math.abs(ratio - minRatio) < EPSILON) {
                    if (pivotRowIdx === -1 || i < pivotRowIdx) {
                        pivotRowIdx = i;
                    }
                }
            }
        }

        if (pivotRowIdx === -1) {
            reason += ` У стовпці ${currentColVars[pivotColIdx]} немає додатніх елементів для розрахунку відношення. Функція необмежена.`;
            logger.logOptimalityStep(step, reason, null, currentColVars[pivotColIdx], null, currentTableau, currentRowVars, currentColVars, -1, pivotColIdx);
            logger.logUnbounded(isMin);
            return { optimal: false, unbounded: true };
        }

        const pivotElementValue = currentTableau[pivotRowIdx][pivotColIdx];
        reason += ` Тест відношень для стовпця ${currentColVars[pivotColIdx]}: minRatio ≈ ${formatNumber(minRatio)} у рядку <b>${currentRowVars[pivotRowIdx]}</b>. Виконуємо МЖВ...`;

        logger.logOptimalityStep(step, reason, currentRowVars[pivotRowIdx], currentColVars[pivotColIdx], pivotElementValue, currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);

        const result = performMJE(currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);
        if (!result) {
            logger.addParagraph("Помилка під час виконання МЖВ.");
            return { optimal: false };
        }

        currentTableau = result.tableau;
        currentRowVars = result.rowVars;
        currentColVars = result.colVars;
    }

    if (step >= MAX_STEPS) {
        logger.addParagraph("Перевищено максимальну кількість ітерацій пошуку оптимального розв'язку.");
        return { optimal: false };
    }

    return { optimal: false };
}

function displaySolution(solution, zValue, isMin, message, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let solutionString = solution.map((val, i) => `x<sub>${i + 1}</sub> = ${formatNumber(val)}`).join('; ');
    let zString = `${isMin ? 'Min(Z)' : 'Max(Z)'} = ${formatNumber(zValue)}`;
    if (isMin) {
        zString += ` (Max(Z') = ${formatNumber(-zValue)})`;
    }

    container.innerHTML = `<p class="success-message">${message}</p><pre>X = (${solutionString})\n${zString}</pre>`;
}


function extractSolution(finalTableau, finalRowVars, finalColVars, numDecisionVars) {
    const solution = new Array(numDecisionVars).fill(0);
    const zRowIndex = finalTableau.length - 1;
    const constColIndex = finalTableau[0].length - 1;

    for (let i = 0; i < zRowIndex; i++) {
        let varName = finalRowVars[i];
        let actualVarName = varName.startsWith('-') ? varName.substring(1) : varName;

        if (actualVarName.startsWith('x')) {
            try {
                const index = parseInt(actualVarName.substring(1), 10) - 1;
                if (index >= 0 && index < numDecisionVars) {
                    solution[index] = finalTableau[i][constColIndex];
                }
            } catch (e) {
                console.error("Error parsing variable name in extractSolution:", varName, e);
            }
        }
    }
    const zValue = finalTableau[zRowIndex][constColIndex];
    return { x: solution, z: zValue };
}


function solve() {
    const logger = new ProtocolLogger('protocolOutput');
    finalResultDiv.innerHTML = '';

    try {
        const problemData = parseInput();
        const transformedData = transformProblem(problemData);
        const initialTableauData = generateInitialTableau(transformedData);

        logger.start(problemData, transformedData);
        logger.logInitialTableau(initialTableauData.tableau, initialTableauData.rowVars, initialTableauData.colVars);

        const feasibilityResult = findFeasibleSolution(
            initialTableauData.tableau,
            initialTableauData.rowVars,
            initialTableauData.colVars,
            logger
        );

        if (!feasibilityResult.feasible) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type');
            finalResultDiv.innerHTML = `<p class="error-message">${lastMessageElem?.textContent || 'Не вдалося знайти опорний розв\'язок.'}</p>`;
            return;
        }

        const feasibleSolution = extractSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            problemData.numVars
        );
        logger.logFeasibleFound(feasibleSolution.x);

        const optimalityResult = findOptimalSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            logger,
            problemData.objective.isMin
        );

        if (optimalityResult.optimal) {
            const finalSolution = extractSolution(
                optimalityResult.tableau,
                optimalityResult.rowVars,
                optimalityResult.colVars,
                problemData.numVars
            );
            const optimalZprime = finalSolution.z;
            const optimalZ = problemData.objective.isMin ? -optimalZprime : optimalZprime;

            logger.logOptimalFound(finalSolution.x, optimalZ, problemData.objective.isMin);

            displaySolution(finalSolution.x, optimalZ, problemData.objective.isMin, "Оптимальний розв'язок:", 'finalResult');

        } else if (optimalityResult.unbounded) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type');
            finalResultDiv.innerHTML = `<p class="error-message">${lastMessageElem?.textContent || 'Функція мети необмежена.'}</p>`;
        } else {
            finalResultDiv.innerHTML = `<p class="error-message">Не вдалося знайти оптимальний розв'язок (можливо, перевищено ліміт ітерацій).</p>`;
        }

    } catch (error) {
        console.error("Error during solving:", error);
        finalResultDiv.innerHTML = `<p class="error-message">Помилка: ${error.message}</p>`;

    }
}


setupVarsButton.addEventListener('click', () => {
    const numVars = parseInt(numVarsInput.value, 10);
    if (!isNaN(numVars) && numVars > 0) {
        setupInputFields(numVars);
    } else {
        alert("Будь ласка, введіть коректну кількість змінних (більше 0).");
    }
});

addConstraintButton.addEventListener('click', () => {
    const numVars = parseInt(numVarsInput.value, 10);
    if (!isNaN(numVars) && numVars > 0) {
        addConstraintRow(numVars);
    } else {
        alert("Спочатку налаштуйте кількість змінних.");
    }
});

solveButton.addEventListener('click', solve);


function loadExample(exampleData) {
    numVarsInput.value = exampleData.numVars;
    setupInputFields(exampleData.numVars);

    objectiveTypeSelect.value = exampleData.objective.isMin ? 'min' : 'max';
    const objInputs = objCoeffsContainer.querySelectorAll('input');
    exampleData.objective.coeffs.forEach((c, i) => {
        if(objInputs[i]) objInputs[i].value = c || '0'; // Handle potential missing coeffs
    });

    constraintsContainer.innerHTML = '';
    exampleData.constraints.forEach(c => addConstraintRow(exampleData.numVars, c));

    protocolOutputDiv.innerHTML = '';
    finalResultDiv.innerHTML = '';
}

loadExample1Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [1, 2, -1, -1], isMin: false },
        constraints: [
            { coeffs: [1, 1, -1, -2], type: '<=', b: 6 },
            { coeffs: [1, 1, 1, -1], type: '>=', b: 5 },
            { coeffs: [2, -1, 3, 4], type: '<=', b: 10 }
        ]
    });
});

loadExample2Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [-2, 3, 0, -3], isMin: true },
        constraints: [
            { coeffs: [1, 1, -1, -2], type: '<=', b: 6 },
            { coeffs: [1, 1, 1, -1], type: '>=', b: 5 },
            { coeffs: [2, -1, 3, 4], type: '<=', b: 10 }
        ]
    });
});

loadVariant20Button.addEventListener('click', () => {
    loadExample({
        numVars: 5,
        objective: { coeffs: [3, 0, -1, 0, 1], isMin: true },
        constraints: [
            { coeffs: [-1, 0, 3, -2, 1], type: '<=', b: 3 },
            { coeffs: [1, -1, 0, 1, 1], type: '<=', b: 3 },
            { coeffs: [1, 3, -1, -1, 1], type: '<=', b: 2 }
        ]
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const initialVars = parseInt(numVarsInput.value, 10);
    if (!isNaN(initialVars) && initialVars > 0) {
        setupInputFields(initialVars);
    } else {
        numVarsInput.value = 4;
        setupInputFields(4);
    }
});