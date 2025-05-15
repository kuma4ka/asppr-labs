import { logToProtocol } from '../protocol/protocolManager.js';
import { logTableau } from '../protocol/protocolFormatters.js';
import { performMJE, extractSolution, deepCopyTableau } from './tableauOperations.js';

const EPSILON = 1e-9;

function selectPivotColumn(tableauState, objectiveType, isPhaseI) {
    const { tableau, variableNames } = tableauState;
    const objRow = tableau[0];
    let pivotColIndex = -1;

    if (objectiveType === 'minimize') {
        let maxPositiveCoeff = EPSILON;
        for (let j = 0; j < variableNames.length - 1; j++) {
            if (variableNames[j].startsWith("-a") && !isPhaseI) continue;
            if (isPhaseI && variableNames[j].startsWith("-s")) continue;
            if (objRow[j] > maxPositiveCoeff) {
                maxPositiveCoeff = objRow[j];
                pivotColIndex = j;
            }
        }
    } else {
        let minNegativeCoeff = -EPSILON;
        for (let j = 0; j < variableNames.length - 1; j++) {
            if (variableNames[j].startsWith("-a") && !isPhaseI) continue;
            if (isPhaseI && variableNames[j].startsWith("-s")) continue;
            if (objRow[j] < minNegativeCoeff) {
                minNegativeCoeff = objRow[j];
                pivotColIndex = j;
            }
        }
    }
    return pivotColIndex;
}

function selectPivotRow(tableauState, pivotColIndex) {
    const { tableau } = tableauState;
    let pivotRowIndex = -1;
    let minRatio = Infinity;

    for (let i = 1; i < tableau.length; i++) {
        const valInPivotCol = tableau[i][pivotColIndex];
        const rhsVal = tableau[i][tableau[0].length - 1];
        if (valInPivotCol > EPSILON) {
            const ratio = rhsVal / valInPivotCol;
            if (ratio >= -EPSILON && ratio < minRatio) {
                minRatio = ratio;
                pivotRowIndex = i;
            }
        }
    }
    return { pivotRowIndex, minRatio };
}

export function removeZeroRows(tableauState, originalNumDecisionVariables) {
    logToProtocol("\nВидалення нуль-рядків (за Рисунком 3.2):", 'text');
    let currentTableauState = { ...tableauState, tableau: deepCopyTableau(tableauState.tableau) };
    let iterationLimit = currentTableauState.variableNames.length * 2;
    let count = 0;
    let operationsCount = 0;

    while (count < iterationLimit) {
        count++;
        let zeroRowIdx = -1;
        for (let i = 1; i < currentTableauState.basisHeaders.length; i++) {
            if (typeof currentTableauState.basisHeaders[i] === 'string' && currentTableauState.basisHeaders[i].startsWith('a')) {
                zeroRowIdx = i;
                logToProtocol(`Знайдено "0-рядок" (рядок зі штучною змінною в базисі): ${currentTableauState.basisHeaders[i]} (індекс ${zeroRowIdx})`, 'text');
                break;
            }
        }

        if (zeroRowIdx === -1) {
            logToProtocol("Не знайдено \"0-рядків\" (або штучних змінних в базисі для обробки цим методом). Завершення видалення нуль-рядків.", 'text');
            break;
        }

        let pivotColIdx_zeroRow = -1;
        let maxPositiveInZeroRow = -EPSILON;

        for (let j = 0; j < originalNumDecisionVariables; j++) {
            if (currentTableauState.tableau[zeroRowIdx][j] > EPSILON && currentTableauState.tableau[zeroRowIdx][j] > maxPositiveInZeroRow) {
                maxPositiveInZeroRow = currentTableauState.tableau[zeroRowIdx][j];
                pivotColIdx_zeroRow = j;
            }
        }

        if (pivotColIdx_zeroRow === -1) {
            logToProtocol(`В "0-рядку" ${currentTableauState.basisHeaders[zeroRowIdx]} не знайдено додатного елемента серед вихідних змінних для вибору розв'язувального стовпця.`, 'text');
            break;
        }
        logToProtocol(`Обрано розв'язувальний стовпець для "0-рядка": ${currentTableauState.variableNames[pivotColIdx_zeroRow]}`, 'text');

        const pivotRowForZeroRemoval = zeroRowIdx;
        logToProtocol(`Процедура МЖВ для "0-рядка": Рядок=${currentTableauState.basisHeaders[pivotRowForZeroRemoval]}, Стовпець=${currentTableauState.variableNames[pivotColIdx_zeroRow]}`, 'text');

        const mjeResult = performMJE(currentTableauState, pivotRowForZeroRemoval, pivotColIdx_zeroRow);
        if (mjeResult.error) return { ...currentTableauState, error: true, summary: "Помилка під час видалення 0-рядків." };
        currentTableauState = mjeResult;
        operationsCount++;

        logTableau(currentTableauState.tableau, currentTableauState.variableNames, currentTableauState.basisHeaders, `Таблиця після МЖВ для "0-рядка"`);
        logToProtocol(`Крок "викреслення 0-стовпця" не реалізовано чітко через неоднозначність визначення "0-стовпця".`, 'text');
    }
    if (count >= iterationLimit && operationsCount > 0) {
        logToProtocol("Досягнуто ліміт ітерацій при видаленні нуль-рядків.", 'text');
    }
    return { ...currentTableauState, error: false, summary: `Процес видалення "0-рядків" завершено після ${operationsCount} операцій.` };
}

export function findSupportSolution(initialTableauState, objectiveType, originalNumDecisionVariables) {
    logToProtocol("\nЕтап 1: Пошук опорного розв’язку (Фаза I, якщо необхідно):", 'text');
    let currentTableauState = { ...initialTableauState, tableau: deepCopyTableau(initialTableauState.tableau) };
    let iteration = 0;
    const MAX_PHASE_I_ITERATIONS = originalNumDecisionVariables * 2 + 10;

    let hasArtificialInBasisAtStart = currentTableauState.basisHeaders.some(h => typeof h === 'string' && h.startsWith('a'));
    if (!hasArtificialInBasisAtStart) {
        logToProtocol("Фаза I не потрібна: штучні змінні відсутні в початковому базисі.", 'text');
        const { solution: supportSolution } = extractSolution(currentTableauState, objectiveType, originalNumDecisionVariables);
        const xValues = [];
        for (let i = 1; i <= originalNumDecisionVariables; i++) {
            xValues.push(supportSolution[`x${i}`] ? supportSolution[`x${i}`].toFixed(2) : "0.00");
        }
        const bfsSummaryText = xValues.join('; ');
        logToProtocol(`Опорний розв'язок (початковий): X = (${bfsSummaryText})`, 'text');
        return { ...currentTableauState, error: false, feasible: true, basicFeasibleSolutionForSummary: bfsSummaryText };
    }

    while (iteration < MAX_PHASE_I_ITERATIONS) {
        iteration++;
        const pivotColIdx_phaseI = selectPivotColumn(currentTableauState, objectiveType, true);

        if (pivotColIdx_phaseI === -1) {
            logToProtocol(`Фаза I: Не знайдено стовпця для введення в базис. Перевірка штучних змінних.`, 'text');
            break;
        }

        logToProtocol(`\n--- Фаза I: Ітерація ${iteration} ---`, 'text');
        logToProtocol(`Розв’язувальний стовпець (Фаза I): ${currentTableauState.variableNames[pivotColIdx_phaseI]} (значення в Z-ряді: ${currentTableauState.tableau[0][pivotColIdx_phaseI].toFixed(2)})`, 'text');

        const { pivotRowIndex: pivotRowIdx_phaseI, minRatio } = selectPivotRow(currentTableauState, pivotColIdx_phaseI);

        if (pivotRowIdx_phaseI === -1) {
            logToProtocol("Фаза I: Поточний розв'язок необмежений відносно штучної цільової функції або немає допустимого напрямку.", 'text');
            return { ...currentTableauState, error: true, feasible: false, basicFeasibleSolutionForSummary: "Н/Д" };
        }
        if (typeof currentTableauState.basisHeaders[pivotRowIdx_phaseI] === 'undefined') {
            logToProtocol(`ПОМИЛКА (Фаза I): Не вдалося знайти заголовок для розв'язувального рядка з індексом ${pivotRowIdx_phaseI}.`, 'text');
            return { ...currentTableauState, error: true, feasible: false, basicFeasibleSolutionForSummary: "Н/Д" };
        }
        logToProtocol(`Розв’язувальний рядок (Фаза I): ${currentTableauState.basisHeaders[pivotRowIdx_phaseI]} (min ratio: ${minRatio.toFixed(3)})`, 'text');

        const mjeResult = performMJE(currentTableauState, pivotRowIdx_phaseI, pivotColIdx_phaseI);
        if (mjeResult.error) return { ...mjeResult, feasible: false, basicFeasibleSolutionForSummary: "Н/Д" };
        currentTableauState = mjeResult;
        logTableau(currentTableauState.tableau, currentTableauState.variableNames, currentTableauState.basisHeaders, "Таблиця після МЖВ (Фаза I)");

        const stillArtificialInBasis = currentTableauState.basisHeaders.some(h => typeof h === 'string' && h.startsWith('a'));
        if (!stillArtificialInBasis) {
            logToProtocol("Фаза I завершена: всі штучні змінні виведені з базису.", 'text');
            break;
        }
    }

    if (iteration >= MAX_PHASE_I_ITERATIONS) {
        logToProtocol("Досягнуто ліміт ітерацій у Фазі I.", 'text');
    }

    let finalCheckArtificialInBasis = false;
    for (let i = 1; i < currentTableauState.basisHeaders.length; i++) {
        if (typeof currentTableauState.basisHeaders[i] === 'string' && currentTableauState.basisHeaders[i].startsWith("a")) {
            if (currentTableauState.tableau[i][currentTableauState.tableau[0].length - 1] > EPSILON) {
                finalCheckArtificialInBasis = true;
                break;
            }
        }
    }

    const { solution: supportSolutionAfterPhaseI } = extractSolution(currentTableauState, objectiveType, originalNumDecisionVariables);
    const xValuesSupportAfterPhaseI = [];
    for (let i = 1; i <= originalNumDecisionVariables; i++) {
        xValuesSupportAfterPhaseI.push(supportSolutionAfterPhaseI[`x${i}`] ? supportSolutionAfterPhaseI[`x${i}`].toFixed(2) : "0.00");
    }
    const bfsSummaryText = xValuesSupportAfterPhaseI.join('; ');

    if (finalCheckArtificialInBasis) {
        logToProtocol("Фаза I завершена, але штучні змінні залишились в базисі з позитивним значенням. Вихідна задача не має розв'язку.", 'text');
        return { ...currentTableauState, error: false, feasible: false, basicFeasibleSolutionForSummary: bfsSummaryText };
    } else {
        logToProtocol("Фаза I успішно завершена. Знайдено опорний розв'язок вихідної задачі.", 'text');
    }
    logToProtocol(`Опорний розв'язок (після Фази I): X = (${bfsSummaryText})`, 'text');

    return { ...currentTableauState, error: false, feasible: true, basicFeasibleSolutionForSummary: bfsSummaryText };
}


export function findOptimalSolutionPhaseII(tableauStateFromPhaseI, objectiveType, originalNumDecisionVariables) {
    logToProtocol("\nЕтап 2: Пошук оптимального розв’язку (Фаза II):", 'text');
    let currentTableauState = { ...tableauStateFromPhaseI, tableau: deepCopyTableau(tableauStateFromPhaseI.tableau) };
    let iteration = 0;
    const MAX_PHASE_II_ITERATIONS = 20;
    let optimizationSummary = [];

    while (iteration < MAX_PHASE_II_ITERATIONS) {
        iteration++;
        const pivotColIdx_phaseII = selectPivotColumn(currentTableauState, objectiveType, false);

        if (pivotColIdx_phaseII === -1) {
            logToProtocol("Фаза II: Оптимальність досягнута.", 'text');
            optimizationSummary.push(`Ітерація ${iteration}: Оптимальність досягнута.`);
            break;
        }

        logToProtocol(`\n--- Фаза II: Ітерація ${iteration} ---`, 'text');
        const pivotColName = currentTableauState.variableNames[pivotColIdx_phaseII];
        const pivotColZValue = currentTableauState.tableau[0][pivotColIdx_phaseII].toFixed(2);
        logToProtocol(`Розв’язувальний стовпець (Фаза II): ${pivotColName} (значення в Z-ряді: ${pivotColZValue})`, 'text');
        optimizationSummary.push(`Ітерація ${iteration}: Розв. стовпець ${pivotColName} (Z-знач: ${pivotColZValue}).`);


        const { pivotRowIndex: pivotRowIdx_phaseII, minRatio } = selectPivotRow(currentTableauState, pivotColIdx_phaseII);

        if (pivotRowIdx_phaseII === -1) {
            logToProtocol("Фаза II: Задача необмежена.", 'text');
            optimizationSummary.push(`Ітерація ${iteration}: Задача необмежена.`);
            return { ...currentTableauState, optimalSolution: "Unbounded", optimalZ: "Unbounded", error: false, optimizationSummary: optimizationSummary.join('\n') };
        }
        if (typeof currentTableauState.basisHeaders[pivotRowIdx_phaseII] === 'undefined') {
            logToProtocol(`ПОМИЛКА (Фаза II): Не вдалося знайти заголовок для розв'язувального рядка з індексом ${pivotRowIdx_phaseII}.`, 'text');
            optimizationSummary.push(`Ітерація ${iteration}: Помилка вибору рядка.`);
            return { ...currentTableauState, optimalSolution: "Error", optimalZ: "Error", error: true, optimizationSummary: optimizationSummary.join('\n') };
        }
        const pivotRowName = currentTableauState.basisHeaders[pivotRowIdx_phaseII];
        logToProtocol(`Розв’язувальний рядок (Фаза II): ${pivotRowName} (min ratio: ${minRatio.toFixed(3)})`, 'text');
        optimizationSummary.push(` Розв. рядок ${pivotRowName} (min ratio: ${minRatio.toFixed(3)}).`);


        const mjeResult = performMJE(currentTableauState, pivotRowIdx_phaseII, pivotColIdx_phaseII);
        if (mjeResult.error) return { ...mjeResult, optimizationSummary: optimizationSummary.join('\n') };
        currentTableauState = mjeResult;
        logTableau(currentTableauState.tableau, currentTableauState.variableNames, currentTableauState.basisHeaders, "Таблиця після МЖВ (Фаза II)");

        if (iteration >= MAX_PHASE_II_ITERATIONS) {
            logToProtocol("Досягнуто ліміт ітерацій у Фазі II.", 'text');
            optimizationSummary.push(`Ітерація ${iteration}: Досягнуто ліміт ітерацій.`);
            break;
        }
    }

    const { solution, zValue } = extractSolution(currentTableauState, objectiveType, originalNumDecisionVariables);

    logToProtocol("\nЗнайдено оптимальний розв’язок (після Фази II):", 'text');
    let finalSolutionArray = Array(originalNumDecisionVariables).fill("0.00");
    Object.keys(solution).forEach(key => {
        if (key.startsWith('x')) {
            const idx = parseInt(key.substring(1)) - 1;
            if (idx >= 0 && idx < originalNumDecisionVariables) {
                finalSolutionArray[idx] = solution[key].toFixed(2);
            }
        }
    });
    logToProtocol(`X = (${finalSolutionArray.join('; ')})`, 'text');
    logToProtocol(`${objectiveType === 'minimize' ? 'Min' : 'Max'} (Z) = ${zValue.toFixed(2)}`, 'text');

    return { ...currentTableauState, optimalSolution: solution, optimalZ: zValue, error: false, optimizationSummary: optimizationSummary.join('\n') };
}