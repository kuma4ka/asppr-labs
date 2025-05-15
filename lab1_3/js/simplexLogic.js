import { logToProtocol, logTableau, formatTableauAsHTML } from './protocolGenerator.js';

const M_VALUE = 1000;
const EPSILON = 1e-9;

let moduleOriginalNumDecisionVariables = 0;

function deepCopyTableau(tableau) {
    return JSON.parse(JSON.stringify(tableau));
}

function performMJE(tableauState, pivotRowIdx, pivotColIdx) {
    let newTableau = deepCopyTableau(tableauState.tableau);
    let newVariableNames = [...tableauState.variableNames];
    let newBasisHeaders = [...tableauState.basisHeaders];

    const pivotElement = newTableau[pivotRowIdx][pivotColIdx];

    if (Math.abs(pivotElement) < EPSILON) {
        logToProtocol(`ПОМИЛКА: Розв'язувальний елемент дорівнює нулю [${pivotRowIdx}][${pivotColIdx}]. Обчислення зупинено.`, 'text');
        return { ...tableauState, tableau: newTableau, error: true };
    }

    for (let j = 0; j < newTableau[pivotRowIdx].length; j++) {
        newTableau[pivotRowIdx][j] /= pivotElement;
    }

    for (let i = 0; i < newTableau.length; i++) {
        if (i !== pivotRowIdx) {
            const factor = newTableau[i][pivotColIdx];
            for (let j = 0; j < newTableau[i].length; j++) {
                newTableau[i][j] -= factor * newTableau[pivotRowIdx][j];
            }
        }
    }

    const enteringVarFullName = newVariableNames[pivotColIdx];
    const enteringVarName = enteringVarFullName.startsWith('-') ? enteringVarFullName.substring(1) : enteringVarFullName;
    newBasisHeaders[pivotRowIdx] = `${enteringVarName} =`;

    return { tableau: newTableau, variableNames: newVariableNames, basisHeaders: newBasisHeaders, error: false };
}

function initializeTableauStructure(inputData) {
    const { constraints, numVariables: numDecisionVars } = inputData;
    let slackVarCount = 0;
    let artificialVarCount = 0;
    let surplusVarCount = 0;

    const constraintDetails = constraints.map((c, index) => {
        const detail = { originalIndex: index, type: c.type, artificialVarIndex: -1, slackVarIndex: -1, surplusVarIndex: -1 };
        if (c.type === 'le') {
            detail.slackVarIndex = slackVarCount++;
        } else if (c.type === 'ge') {
            logToProtocol(`(Обмеження типу '>=' обробляється додаванням штучної та відніманням надлишкової змінної)`, 'text');
            detail.surplusVarIndex = surplusVarCount++;
            detail.artificialVarIndex = artificialVarCount++;
        } else if (c.type === 'eq') {
            detail.artificialVarIndex = artificialVarCount++;
        }
        return detail;
    });

    const numTotalVarsInTableau = numDecisionVars + slackVarCount + surplusVarCount + artificialVarCount;
    const tableauHeight = constraints.length + 1;
    const tableauWidth = numTotalVarsInTableau + 1;

    const tableau = Array(tableauHeight).fill(null).map(() => Array(tableauWidth).fill(0));
    let variableNames = [];
    const basisHeaders = [];

    for (let i = 0; i < numDecisionVars; i++) variableNames.push(`-x${i + 1}`);

    let sCounterForAllSlacksAndSurplus = 0;
    constraintDetails.forEach(detail => {
        if (detail.slackVarIndex !== -1) {
            variableNames[numDecisionVars + detail.slackVarIndex] = (`-s${detail.slackVarIndex + 1}`);
        }
    });
    let currentSurplusNamingIndex = slackVarCount + 1;
    constraintDetails.forEach(detail => {
        if (detail.surplusVarIndex !== -1) {
            variableNames[numDecisionVars + slackVarCount + detail.surplusVarIndex] = (`-s${currentSurplusNamingIndex++}`);
        }
    });

    for(let i = numDecisionVars; i < numDecisionVars + slackVarCount + surplusVarCount; i++){
        if(!variableNames[i]){
            variableNames[i] = `-s_undef${i}`;
        }
    }

    for (let i = 0; i < artificialVarCount; i++) variableNames[numDecisionVars + slackVarCount + surplusVarCount + i] = (`-a${i + 1}`);

    if (variableNames.length === numTotalVarsInTableau) {
        variableNames.push("1");
    } else {
        while(variableNames.length < numTotalVarsInTableau) variableNames.push("-errV");
        variableNames[numTotalVarsInTableau] = "1";
    }

    return { tableau, variableNames, basisHeaders, constraintDetails, numDecisionVars, slackVarCount, surplusVarCount, artificialVarCount, tableauWidth };
}

function populateConstraintRows(tableauState, constraints) {
    const { tableau, constraintDetails, numDecisionVars, slackVarCount, tableauWidth, variableNames } = tableauState;
    let basisHeaders = [];

    for (let i = 0; i < constraints.length; i++) {
        const c = constraints[i];
        const detail = constraintDetails[i];
        const rowIdx = i + 1;

        for (let j = 0; j < numDecisionVars; j++) {
            tableau[rowIdx][j] = c.coeffs[j];
        }
        tableau[rowIdx][tableauWidth - 1] = c.rhs;

        if (c.type === 'le') {
            const slackVarName = `-s${detail.slackVarIndex + 1}`;
            const slackVarCol = variableNames.indexOf(slackVarName);
            if(slackVarCol !== -1) tableau[rowIdx][slackVarCol] = 1;
            else console.error(`Не знайдено стовпець для ${slackVarName}`);
            basisHeaders.push(`s${detail.slackVarIndex + 1} =`);
        } else if (c.type === 'eq') {
            const artVarName = `-a${detail.artificialVarIndex + 1}`;
            const artVarCol = variableNames.indexOf(artVarName);
            if(artVarCol !== -1) tableau[rowIdx][artVarCol] = 1;
            else console.error(`Не знайдено стовпець для ${artVarName}`);
            basisHeaders.push(`a${detail.artificialVarIndex + 1} =`);
        } else if (c.type === 'ge') {
            let sBaseIdx = 0;
            for(let k=0; k < detail.originalIndex; k++){ if(constraintDetails[k].type === 'le' || constraintDetails[k].type === 'ge') sBaseIdx++;}

            const actualSurplusName = `-s${slackVarCount + detail.surplusVarIndex +1}`;
            const surplusVarCol = variableNames.indexOf(actualSurplusName);

            const artVarName = `-a${detail.artificialVarIndex + 1}`;
            const artVarCol = variableNames.indexOf(artVarName);

            if(surplusVarCol !== -1) tableau[rowIdx][surplusVarCol] = -1;
            else console.error(`Не знайдено стовпець для надлишкової: ${actualSurplusName}. Індекс деталі: ${detail.surplusVarIndex}`);
            if(artVarCol !== -1) tableau[rowIdx][artVarCol] = 1;
            else console.error(`Не знайдено стовпець для ${artVarName}`);
            basisHeaders.push(`a${detail.artificialVarIndex + 1} =`);
        }
    }
    while (basisHeaders.length < constraints.length) {
        basisHeaders.push(`РядНевизначено${basisHeaders.length + 1}=`);
    }
    basisHeaders.unshift("Z =");
    tableauState.basisHeaders = basisHeaders;
}

function initializeObjectiveRow(tableauState, objective) {
    const { tableau, constraintDetails, numDecisionVars, artificialVarCount, tableauWidth, variableNames } = tableauState;
    const objCoeffs = [...objective.coeffs];
    const isMinimization = objective.type === 'minimize';

    for (let j = 0; j < numDecisionVars; j++) {
        tableau[0][j] = isMinimization ? objCoeffs[j] : -objCoeffs[j];
    }

    if (artificialVarCount > 0) {
        for (let i = 0; i < constraintDetails.length; i++) {
            const detail = constraintDetails[i];
            if (detail.artificialVarIndex !== -1) {
                const artVarName = `-a${detail.artificialVarIndex + 1}`;
                const artCol = variableNames.indexOf(artVarName);
                const constraintRowIdxInTableau = i + 1;

                if (artCol !==-1 && Math.abs(tableau[constraintRowIdxInTableau][artCol] - 1) < EPSILON) {
                    const M_effect = isMinimization ? M_VALUE : -M_VALUE;
                    for (let j_col = 0; j_col < tableauWidth; j_col++) {
                        tableau[0][j_col] -= M_effect * tableau[constraintRowIdxInTableau][j_col];
                    }
                }
            }
        }
    }
}

export function initializeSimplex(inputData) {
    moduleOriginalNumDecisionVariables = inputData.numVariables;
    const tableauState = initializeTableauStructure(inputData);
    populateConstraintRows(tableauState, inputData.constraints);
    initializeObjectiveRow(tableauState, inputData.objective);
    return tableauState;
}

export function removeZeroRows(tableauState) {
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

        for (let j = 0; j < moduleOriginalNumDecisionVariables; j++) {
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

export function findSupportSolution(initialTableauState, objectiveType) {
    logToProtocol("\nЕтап 1: Пошук опорного розв’язку (Фаза I, якщо необхідно):", 'text');
    let currentTableauState = { ...initialTableauState, tableau: deepCopyTableau(initialTableauState.tableau) };
    let iteration = 0;
    const MAX_PHASE_I_ITERATIONS = moduleOriginalNumDecisionVariables * 2 + 10;

    let hasArtificialInBasisAtStart = currentTableauState.basisHeaders.some(h => typeof h === 'string' && h.startsWith('a'));
    if (!hasArtificialInBasisAtStart) {
        logToProtocol("Фаза I не потрібна: штучні змінні відсутні в початковому базисі.", 'text');
        const { solution: supportSolution } = extractSolution(currentTableauState, objectiveType);
        const xValues = [];
        for (let i = 1; i <= moduleOriginalNumDecisionVariables; i++) {
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

    const { solution: supportSolutionAfterPhaseI } = extractSolution(currentTableauState, objectiveType);
    const xValuesSupportAfterPhaseI = [];
    for (let i = 1; i <= moduleOriginalNumDecisionVariables; i++) {
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

export function findOptimalSolutionPhaseII(tableauStateFromPhaseI, objectiveType) {
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

    const { solution, zValue } = extractSolution(currentTableauState, objectiveType);

    logToProtocol("\nЗнайдено оптимальний розв’язок (після Фази II):", 'text');
    let finalSolutionArray = Array(moduleOriginalNumDecisionVariables).fill("0.00");
    Object.keys(solution).forEach(key => {
        if (key.startsWith('x')) {
            const idx = parseInt(key.substring(1)) - 1;
            if (idx >= 0 && idx < moduleOriginalNumDecisionVariables) {
                finalSolutionArray[idx] = solution[key].toFixed(2);
            }
        }
    });
    logToProtocol(`X = (${finalSolutionArray.join('; ')})`, 'text');
    logToProtocol(`${objectiveType === 'minimize' ? 'Min' : 'Max'} (Z) = ${zValue.toFixed(2)}`, 'text');

    return { ...currentTableauState, optimalSolution: solution, optimalZ: zValue, error: false, optimizationSummary: optimizationSummary.join('\n') };
}

function extractSolution(tableauState, objectiveType) {
    const { tableau, basisHeaders } = tableauState;
    let solution = {};
    for (let i = 0; i < moduleOriginalNumDecisionVariables; i++) {
        solution[`x${i + 1}`] = 0;
    }

    for (let i = 1; i < tableau.length; i++) {
        const basisVarNameRaw = basisHeaders[i];
        if (typeof basisVarNameRaw !== 'string' || !basisVarNameRaw.trim()) {
            logToProtocol(`Увага: Пропущено рядок ${i} в extractSolution через недійсний заголовок базису: ${basisVarNameRaw}`, 'text');
            continue;
        }
        const match = basisVarNameRaw.match(/^(x|s|a|y|e)(\d+)\s*=/i);
        if (match) {
            const varType = match[1].toLowerCase();
            const varNum = parseInt(match[2]);
            const varValue = tableau[i][tableau[0].length - 1];
            if (varType === 'x' && varNum > 0 && varNum <= moduleOriginalNumDecisionVariables) {
                solution[`x${varNum}`] = varValue;
            }
            solution[`${varType}${varNum}`] = varValue;
        }
    }

    let zValueFromTableau = tableau[0][tableau[0].length - 1];
    let finalZValue = zValueFromTableau;

    if (objectiveType === 'minimize') {
        finalZValue = -zValueFromTableau;
    }

    return { solution, zValue: finalZValue };
}

export function runFullSimplexAlgorithm(inputData, getInitialStateOnly = false) {
    try {
        const initialTableauState = initializeSimplex(inputData);
        if (getInitialStateOnly) {
            return initialTableauState;
        }

        logTableau(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders, "Вхідна симплекс-таблиця (після ініціалізації, можливо з Big M)");

        const zeroRowResultState = removeZeroRows(initialTableauState);
        let zeroRowSummaryText = zeroRowResultState.summary || "Процес видалення 0-рядків завершено (деталі в протоколі).";
        if (zeroRowResultState.error) {
            return {
                optimalSolution: "Error during 0-row removal",
                optimalZ: "Error",
                finalTableau: zeroRowResultState.tableau,
                initialTableauForSummary: formatTableauAsHTML(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
                zeroRowSummary: "Помилка під час видалення 0-рядків.",
                basicFeasibleSolutionSummary: null,
                optimizationSummary: null
            };
        }

        const supportSolResultState = findSupportSolution(zeroRowResultState, inputData.objective.type);
        if (supportSolResultState.error || !supportSolResultState.feasible) {
            return {
                optimalSolution: supportSolResultState.feasible ? "Error" : "Infeasible (Фаза I)",
                optimalZ: supportSolResultState.feasible ? "Error" : "Infeasible (Фаза I)",
                finalTableau: supportSolResultState.tableau,
                initialTableauForSummary: formatTableauAsHTML(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
                zeroRowSummary: zeroRowSummaryText,
                basicFeasibleSolutionSummary: supportSolResultState.basicFeasibleSolutionForSummary || "Н/Д",
                optimizationSummary: null
            };
        }

        const optResultState = findOptimalSolutionPhaseII(supportSolResultState, inputData.objective.type);
        return {
            optimalSolution: optResultState.optimalSolution,
            optimalZ: optResultState.optimalZ,
            finalTableau: optResultState.tableau,
            initialTableauForSummary: formatTableauAsHTML(initialTableauState.tableau, initialTableauState.variableNames, initialTableauState.basisHeaders),
            zeroRowSummary: zeroRowSummaryText,
            basicFeasibleSolutionSummary: supportSolResultState.basicFeasibleSolutionForSummary,
            optimizationSummary: optResultState.optimizationSummary || "Етап оптимізації завершено (деталі в протоколі)."
        };
    } catch (e) {
        console.error("Критична помилка в runFullSimplexAlgorithm:", e);
        logToProtocol(`\n!!! КРИТИЧНА ПОМИЛКА АЛГОРИТМУ: ${e.message}\n${e.stack || ''}`, 'text');
        return {
            optimalSolution: "Критична помилка",
            optimalZ: "Помилка",
            finalTableau: [[]], // Порожня таблиця
            initialTableauForSummary: "Помилка ініціалізації",
            zeroRowSummary: "Помилка",
            basicFeasibleSolutionSummary: "Помилка",
            optimizationSummary: "Помилка"
        };
    }
}