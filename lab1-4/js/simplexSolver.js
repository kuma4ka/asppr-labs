import { EPSILON, MAX_SIMPLEX_STEPS } from './config.js';
import { formatNumber, getFractionalPart } from './utils.js';

export function performMJE(currentTableau, currentRowVars, currentColVars, r, s) {
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

    newTableau[r][s] = 1 / pivotElement;
    for (let j = 0; j < numCols; j++) {
        if (j !== s) {
            newTableau[r][j] = currentTableau[r][j] / pivotElement;
        }
    }
    for (let i = 0; i < numRows; i++) {
        if (i !== r) {
            newTableau[i][s] = -currentTableau[i][s] / pivotElement;
        }
    }
    for (let i = 0; i < numRows; i++) {
        if (i === r) continue;
        for (let j = 0; j < numCols; j++) {
            if (j === s) continue;
            newTableau[i][j] = currentTableau[i][j] - (currentTableau[i][s] * currentTableau[r][j]) / pivotElement;
        }
    }

    const tempVar = newRowVars[r];
    newRowVars[r] = newColVars[s];
    newColVars[s] = tempVar;

    return { tableau: newTableau, rowVars: newRowVars, colVars: newColVars };
}

export function findFeasibleSolution(initialTableau, initialRowVars, initialColVars, logger) {
    let currentTableau = initialTableau.map(row => [...row]);
    let currentRowVars = [...initialRowVars];
    let currentColVars = [...initialColVars];
    const numRows = currentTableau.length - 1;
    const numColsTotal = currentTableau[0].length;
    const constColIndex = numColsTotal - 1;
    let step = 0;

    logger.startFeasibilitySearch();

    while (step < MAX_SIMPLEX_STEPS) {
        step++;
        let pivotRowIdx = -1;
        let minConst = -EPSILON;

        for (let i = 0; i < numRows; i++) {
            if (currentTableau[i][constColIndex] < minConst) {
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

        const actualPivotRowIdx = pivotRowIdx;

        const pivotElementValue = currentTableau[actualPivotRowIdx][pivotColIdx];
        reason += ` Розв'язувальний рядок: <b>${currentRowVars[actualPivotRowIdx]}</b>. Виконуємо МЖВ...`;
        logger.logFeasibilityStep(step, reason, currentRowVars[actualPivotRowIdx], currentColVars[pivotColIdx], pivotElementValue, currentTableau, currentRowVars, currentColVars, actualPivotRowIdx, pivotColIdx);

        const result = performMJE(currentTableau, currentRowVars, currentColVars, actualPivotRowIdx, pivotColIdx);
        if (!result) {
            logger.addParagraph("Помилка під час виконання МЖВ у пошуку опорного розв'язку.");
            return { feasible: false };
        }
        currentTableau = result.tableau;
        currentRowVars = result.rowVars;
        currentColVars = result.colVars;
    }

    if (step >= MAX_SIMPLEX_STEPS) {
        logger.addParagraph("Перевищено максимальну кількість ітерацій пошуку опорного розв'язку.");
        return { feasible: false };
    }
    return { feasible: false };
}

export function findOptimalSolution(feasibleTableau, feasibleRowVars, feasibleColVars, logger, isMin) {
    let currentTableau = feasibleTableau.map(row => [...row]);
    let currentRowVars = [...feasibleRowVars];
    let currentColVars = [...feasibleColVars];
    const numRows = currentTableau.length - 1;
    const zRowIndex = currentTableau.length - 1;
    const numColsTotal = currentTableau[0].length;
    const constColIndex = numColsTotal - 1;
    let step = 0;

    logger.startOptimalitySearch();

    while (step < MAX_SIMPLEX_STEPS) {
        step++;
        let pivotColIdx = -1;
        let maxZcoeff = EPSILON;

        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[zRowIndex][j] > maxZcoeff) {
                maxZcoeff = currentTableau[zRowIndex][j];
                pivotColIdx = j;
            }
        }

        if (pivotColIdx === -1) {
            logger.logOptimalityStep(step, "Всі коефіцієнти в Z'-рядку не додатні (&le; 0). Оптимум знайдено.", null, null, null, currentTableau, currentRowVars, currentColVars, -1, -1);
            return { tableau: currentTableau, rowVars: currentRowVars, colVars: currentColVars, optimal: true, unbounded: false };
        }

        let reason = `Знайдено додатний коефіцієнт ${formatNumber(maxZcoeff)} у Z'-рядку. Обрано розв'язувальний стовпець <b>${currentColVars[pivotColIdx]}</b>.`;
        let minRatio = Infinity;
        let pivotRowIdx = -1;

        for (let i = 0; i < numRows; i++) {
            if (currentTableau[i][pivotColIdx] > EPSILON) {
                const ratio = currentTableau[i][constColIndex] / currentTableau[i][pivotColIdx];
                if (ratio < minRatio - EPSILON) {
                    minRatio = ratio;
                    pivotRowIdx = i;
                } else if (Math.abs(ratio - minRatio) < EPSILON) {
                    if (pivotRowIdx === -1 || currentRowVars[i].localeCompare(currentRowVars[pivotRowIdx]) < 0) {
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
        reason += ` Тест відношень для стовпця ${currentColVars[pivotColIdx]}: minRatio &asymp; ${formatNumber(minRatio)} у рядку <b>${currentRowVars[pivotRowIdx]}</b>. Виконуємо МЖВ...`;
        logger.logOptimalityStep(step, reason, currentRowVars[pivotRowIdx], currentColVars[pivotColIdx], pivotElementValue, currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);

        const result = performMJE(currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);
        if (!result) {
            logger.addParagraph("Помилка під час виконання МЖВ у пошуку оптимального розв'язку.");
            return { optimal: false, unbounded: false };
        }
        currentTableau = result.tableau;
        currentRowVars = result.rowVars;
        currentColVars = result.colVars;
    }

    if (step >= MAX_SIMPLEX_STEPS) {
        logger.addParagraph("Перевищено максимальну кількість ітерацій пошуку оптимального розв'язку.");
        return { optimal: false, unbounded: false };
    }
    return { optimal: false, unbounded: false };
}

export function extractSolution(finalTableau, finalRowVars, finalColVars, numDecisionVars) {
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
                    solution[index] = (Math.abs(finalTableau[i][constColIndex]) < EPSILON) ? 0 : finalTableau[i][constColIndex];
                }
            } catch (e) {
                console.error("Error parsing variable name in extractSolution:", varName, e);
            }
        }
    }
    const zValue = finalTableau[zRowIndex][constColIndex];
    return { x: solution, z: zValue };
}


export function checkIfIntegerSolution(solutionX, epsilon = EPSILON) {
    for (const val of solutionX) {
        if (Math.abs(val - Math.round(val)) > epsilon) {
            return false;
        }
    }
    return true;
}

export function findRowForGomoryCut(tableau, rowVars, constColIndex, numDecisionVars, epsilon = EPSILON) {
    let maxFractionalPart = -1;
    let rowIndexForCut = -1;
    const zRowIndex = tableau.length - 1;

    for (let i = 0; i < zRowIndex; i++) {
        const varName = rowVars[i];
        const actualVarName = varName.startsWith('-') ? varName.substring(1) : varName;
        let isRelevantVar = false;

        if (actualVarName.startsWith('x')) {
            try {
                const decisionVarIndex = parseInt(actualVarName.substring(1), 10) - 1;
                if (decisionVarIndex >= 0 && decisionVarIndex < numDecisionVars) {
                    const value = tableau[i][constColIndex];
                    if (Math.abs(value - Math.round(value)) > epsilon) {
                        isRelevantVar = true;
                    }
                }
            } catch (e) { }
        }

        if (isRelevantVar) {
            const value = tableau[i][constColIndex];
            const fractionalPart = getFractionalPart(value, epsilon);
            if (fractionalPart > maxFractionalPart + epsilon) {
                maxFractionalPart = fractionalPart;
                rowIndexForCut = i;
            }
        }
    }
    if (maxFractionalPart < epsilon && rowIndexForCut === -1) return { rowIndex: -1, maxFractionalPart: 0 };
    return { rowIndex: rowIndexForCut, maxFractionalPart };
}


export function calculateGomoryCutCoefficients(tableauRow, colVars, epsilon = EPSILON) {
    const constColIndex = tableauRow.length - 1;
    const cutCoefficients = [];

    for (let j = 0; j < constColIndex; j++) {
        cutCoefficients.push(getFractionalPart(tableauRow[j], epsilon));
    }
    cutCoefficients.push(getFractionalPart(tableauRow[constColIndex], epsilon));
    return cutCoefficients;
}


export function addGomoryCutToTableau(tableau, rowVars, colVars, cutCoefficientsFromSourceRow, newSlackVarName) {
    const numTableauRows = tableau.length;
    const numTableauCols = tableau[0].length;
    const zRowOriginalIndex = numTableauRows - 1;
    const constColOriginalIndex = numTableauCols - 1;

    const newTableau = [];

    for (let i = 0; i < zRowOriginalIndex; i++) {
        const existingRow = [...tableau[i]];
        const constantTerm = existingRow[constColOriginalIndex];
        const varsPart = existingRow.slice(0, constColOriginalIndex);
        newTableau.push([...varsPart, 0, constantTerm]);
    }

    const newCutRow = [];
    const fractional_b_from_source = cutCoefficientsFromSourceRow[cutCoefficientsFromSourceRow.length - 1];

    for (let k = 0; k < cutCoefficientsFromSourceRow.length - 1; k++) {
        newCutRow.push(-cutCoefficientsFromSourceRow[k]);
    }
    newCutRow.push(0);
    newCutRow.push(-fractional_b_from_source);
    newTableau.push(newCutRow);

    const existingZRow = [...tableau[zRowOriginalIndex]];
    const zConstant = existingZRow[constColOriginalIndex];
    const zVarsPart = existingZRow.slice(0, constColOriginalIndex);
    newTableau.push([...zVarsPart, 0, zConstant]);


    const newRowVars = [...rowVars.slice(0, zRowOriginalIndex), newSlackVarName, rowVars[zRowOriginalIndex]];
    const newColVars = [];
    for(let j=0; j < constColOriginalIndex; j++) {
        newColVars.push(colVars[j]);
    }
    newColVars.push(`-${newSlackVarName}`);
    newColVars.push(colVars[constColOriginalIndex]);

    return { tableau: newTableau, rowVars: newRowVars, colVars: newColVars };
}