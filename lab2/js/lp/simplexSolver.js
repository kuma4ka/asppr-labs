import { EPSILON, MAX_SIMPLEX_STEPS } from '../config.js';
import { formatNumber } from '../utils.js';

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


export function findFeasibleSolution(initialTableau, initialRowVars, initialColVars, logger, originalInitialColVars) {
    let currentTableau = initialTableau.map(row => [...row]);
    let currentRowVars = [...initialRowVars];
    let currentColVars = [...initialColVars];
    const numTableauRows = currentTableau.length;
    const numBasicRows = numTableauRows - 1;
    const numTableauCols = currentTableau[0].length;
    const constColIndex = numTableauCols - 1;
    let step = 0;

    logger.startFeasibilitySearch();

    while (step < MAX_SIMPLEX_STEPS) {
        step++;
        let pivotRowIdx = -1;
        let minConstInBasicRows = -EPSILON;

        for (let i = 0; i < numBasicRows; i++) {
            if (currentTableau[i][constColIndex] < minConstInBasicRows) {
                minConstInBasicRows = currentTableau[i][constColIndex];
                pivotRowIdx = i;
            }
        }

        if (pivotRowIdx === -1) {
            logger.logFeasibilityStep(step, "Всі вільні члени в базисних рядках невід'ємні.", null, null, null, currentTableau, currentRowVars, currentColVars, -1, -1);
            return { tableau: currentTableau, rowVars: currentRowVars, colVars: currentColVars, feasible: true, originalInitialColVars };
        }

        let reason = `Знайдено від'ємний вільний член ${formatNumber(minConstInBasicRows)} у рядку <b>${currentRowVars[pivotRowIdx].split(' ')[1] || currentRowVars[pivotRowIdx]}</b>.`;
        let pivotColIdx = -1;
        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[pivotRowIdx][j] < -EPSILON) {
                pivotColIdx = j;
                break;
            }
        }

        if (pivotColIdx === -1) {
            reason += ` У рядку ${currentRowVars[pivotRowIdx].split(' ')[1] || currentRowVars[pivotRowIdx]} немає від'ємних елементів для вибору розв'язувального стовпця. Система суперечлива.`;
            logger.logFeasibilityStep(step, reason, currentRowVars[pivotRowIdx], null, null, currentTableau, currentRowVars, currentColVars, pivotRowIdx, -1);
            logger.logContradictory();
            return { feasible: false };
        }

        reason += ` Обрано розв'язувальний стовпець <b>${currentColVars[pivotColIdx].split(', ')[1] || currentColVars[pivotColIdx]}</b>.`;

        const pivotElementValue = currentTableau[pivotRowIdx][pivotColIdx];
        reason += ` Розв'язувальний елемент ${formatNumber(pivotElementValue)}. Виконуємо МЖВ...`;
        logger.logFeasibilityStep(step, reason, currentRowVars[pivotRowIdx], currentColVars[pivotColIdx], pivotElementValue, currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);

        const result = performMJE(currentTableau, currentRowVars, currentColVars, pivotRowIdx, pivotColIdx);
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
    }
    return { feasible: false };
}

export function findOptimalSolution(feasibleTableau, feasibleRowVars, feasibleColVars, logger, isMin, originalInitialColVars) {
    let currentTableau = feasibleTableau.map(row => [...row]);
    let currentRowVars = [...feasibleRowVars];
    let currentColVars = [...feasibleColVars];
    const numBasicRows = currentTableau.length - 1;
    const zRowIndex = currentTableau.length - 1;
    const numTableauCols = currentTableau[0].length;
    const constColIndex = numTableauCols - 1;
    let step = 0;

    logger.startOptimalitySearch();

    while (step < MAX_SIMPLEX_STEPS) {
        step++;
        let pivotColIdx = -1;
        let minZcoeffInZRow = -EPSILON;

        for (let j = 0; j < constColIndex; j++) {
            if (currentTableau[zRowIndex][j] < minZcoeffInZRow) {
                minZcoeffInZRow = currentTableau[zRowIndex][j];
                pivotColIdx = j;
            }
        }

        if (pivotColIdx === -1) {
            logger.logOptimalityStep(step, "Всі коефіцієнти в Z-рядку (окрім вільного члена) невід'ємні. Оптимум знайдено.", null, null, null, currentTableau, currentRowVars, currentColVars, -1, -1);
            return { tableau: currentTableau, rowVars: currentRowVars, colVars: currentColVars, optimal: true, originalInitialColVars };
        }

        let reason = `Знайдено від'ємний коефіцієнт ${formatNumber(minZcoeffInZRow)} у Z-рядку. Обрано розв'язувальний стовпець <b>${currentColVars[pivotColIdx].split(', ')[1] || currentColVars[pivotColIdx]}</b>.`;
        let minRatio = Infinity;
        let pivotRowIdx = -1;

        for (let i = 0; i < numBasicRows; i++) {
            if (currentTableau[i][pivotColIdx] > EPSILON) {
                const ratio = currentTableau[i][constColIndex] / currentTableau[i][pivotColIdx];
                if (ratio >= -EPSILON && ratio < minRatio) {
                    minRatio = ratio;
                    pivotRowIdx = i;
                } else if (Math.abs(ratio - minRatio) < EPSILON) {
                    if (pivotRowIdx === -1 || (currentRowVars[i].split(' ')[1] || currentRowVars[i]) < (currentRowVars[pivotRowIdx].split(' ')[1] || currentRowVars[pivotRowIdx])) {
                        pivotRowIdx = i;
                    }
                }
            }
        }

        if (pivotRowIdx === -1) {
            reason += ` У стовпці ${currentColVars[pivotColIdx].split(', ')[1] || currentColVars[pivotColIdx]} немає додатніх елементів для розрахунку відношення. Функція необмежена.`;
            logger.logOptimalityStep(step, reason, null, currentColVars[pivotColIdx], null, currentTableau, currentRowVars, currentColVars, -1, pivotColIdx);
            logger.logUnbounded(isMin);
            return { optimal: false, unbounded: true };
        }

        const pivotElementValue = currentTableau[pivotRowIdx][pivotColIdx];
        reason += ` Тест відношень для стовпця ${currentColVars[pivotColIdx].split(', ')[1] || currentColVars[pivotColIdx]}: minRatio \u2248 ${formatNumber(minRatio)} у рядку <b>${currentRowVars[pivotRowIdx].split(' ')[1] || currentRowVars[pivotRowIdx]}</b>. Виконуємо МЖВ...`;
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
    }
    return { optimal: false };
}

export function extractSolution(finalTableau, finalRowVars, finalColVars, numDecisionVars) {
    const solution = new Array(numDecisionVars).fill(0);
    const zRowIndex = finalTableau.length - 1;
    const constColIndex = finalTableau[0].length - 1;

    for (let i = 0; i < zRowIndex; i++) {
        let varName = finalRowVars[i].split(' ')[1] || finalRowVars[i];
        if (!varName) varName = finalRowVars[i];

        if (varName && !varName.toLowerCase().includes('y')) {
            let actualVarName = varName.startsWith('-') ? varName.substring(1) : varName;
            if (actualVarName.startsWith('X[')) {
                try {
                    const index = parseInt(actualVarName.substring(2, actualVarName.length - 1), 10) - 1;
                    if (index >= 0 && index < numDecisionVars) {
                        solution[index] = Math.abs(finalTableau[i][constColIndex]) < EPSILON ? 0 : finalTableau[i][constColIndex];
                    }
                } catch (e) {
                    console.error("Error parsing variable name in extractSolution:", varName, e);
                }
            }
        }
    }
    const zValue = finalTableau[zRowIndex][constColIndex];
    return { x: solution, z: zValue };
}

export function extractDualSolution(finalTableau, finalRowVars, finalColVars, numPrimalConstraints, originalPrimalConstraintTypes, objectiveIsMin, originalInitialColVars) {
    const dualSolution = new Array(numPrimalConstraints).fill(0);
    const zRow = finalTableau[finalTableau.length - 1];

    for (let k = 0; k < numPrimalConstraints; k++) {
        const initialSlackVarYName = `y${k + 1}`;
        let found = false;

        for (let j = 0; j < originalInitialColVars.length; j++) {
            let currentTableColVar = finalColVars[j];
            if (typeof currentTableColVar !== 'string') currentTableColVar = '';
            let colVarToCheck = currentTableColVar.split(', ')[1] || currentTableColVar;

            let originalBaseName = originalInitialColVars[j];
            if (typeof originalBaseName !== 'string') originalBaseName = '';
            originalBaseName = originalBaseName.startsWith('-') ? originalBaseName.substring(1) : originalBaseName;
            originalBaseName = originalBaseName.replace(/^X\[\d+\]$/, initialSlackVarYName); // Map X[i] to y_i based on convention if needed

            if (colVarToCheck.replace(/^X\[\d+\]$/, initialSlackVarYName) === initialSlackVarYName || originalBaseName === initialSlackVarYName) {
                let u_val = zRow[j];
                if (objectiveIsMin) {
                    u_val = -u_val;
                }
                dualSolution[k] = u_val;
                found = true;
                break;
            }
        }
        if (!found) {
            for(let r=0; r < finalRowVars.length -1; ++r) {
                let rowVarName = finalRowVars[r].split(' ')[1] || finalRowVars[r];
                if (rowVarName === initialSlackVarYName) {
                    dualSolution[k] = 0;
                    found = true;
                    break;
                }
            }
        }

        if (found && originalPrimalConstraintTypes && originalPrimalConstraintTypes[k]) {
            if (originalPrimalConstraintTypes[k] === '>=') {
                if (!objectiveIsMin){ // Primal max, constraint >=
                    dualSolution[k] = -dualSolution[k];
                }
            } else if (originalPrimalConstraintTypes[k] === '<=') {
                if (objectiveIsMin){ // Primal min, constraint <=
                    dualSolution[k] = -dualSolution[k];
                }
            }
        }
    }
    return dualSolution.map(val => Math.abs(val) < EPSILON ? 0 : val);
}