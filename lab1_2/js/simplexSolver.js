import { EPSILON, MAX_SIMPLEX_STEPS } from './config.js';
import { formatNumber } from './utils.js';

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
        let minConst = -EPSILON; // Allow for small negative numbers due to precision

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
        let minZcoeff = -EPSILON; // Look for elements strictly less than 0

        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[zRowIndex][j] < minZcoeff) {
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

    if (step >= MAX_SIMPLEX_STEPS) {
        logger.addParagraph("Перевищено максимальну кількість ітерацій пошуку оптимального розв'язку.");
        return { optimal: false };
    }

    return { optimal: false };
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
                    solution[index] = Math.abs(finalTableau[i][constColIndex]) < EPSILON ? 0 : finalTableau[i][constColIndex];
                }
            } catch (e) {
                console.error("Error parsing variable name in extractSolution:", varName, e);
            }
        }
    }
    const zValue = finalTableau[zRowIndex][constColIndex];
    return { x: solution, z: zValue };
}