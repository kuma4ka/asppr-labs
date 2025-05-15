import { logToProtocol } from '../protocolGenerator.js';

const EPSILON = 1e-9;
let moduleOriginalNumDecisionVariablesForOps = 0;

export function setOriginalNumDecisionVariables(num) {
    moduleOriginalNumDecisionVariablesForOps = num;
}

export function deepCopyTableau(tableau) {
    return JSON.parse(JSON.stringify(tableau));
}

export function performMJE(tableauState, pivotRowIdx, pivotColIdx) {
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

export function initializeTableauStructure(inputData) {
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

    let sCounter = 0;
    for (let i = 0; i < slackVarCount; i++) {
        let isPureSlack = constraintDetails.find(d => d.slackVarIndex === i && d.type === 'le');
        if(isPureSlack) variableNames.push(`-s${++sCounter}`);
    }
    for (let i = 0; i < surplusVarCount; i++) variableNames.push(`-s${++sCounter}`);


    for (let i = 0; i < artificialVarCount; i++) variableNames[numDecisionVars + slackVarCount + surplusVarCount + i] = (`-a${i + 1}`);

    while(variableNames.length < numTotalVarsInTableau) {
        variableNames.push(`-errV${variableNames.length - numDecisionVars + 1}`);
    }
    if (variableNames.length === numTotalVarsInTableau) {
        variableNames.push("1");
    } else {
        variableNames[numTotalVarsInTableau] = "1";
    }

    return { tableau, variableNames, basisHeaders, constraintDetails, numDecisionVars, slackVarCount, surplusVarCount, artificialVarCount, tableauWidth };
}

export function populateConstraintRows(tableauState, constraints) {
    const { tableau, constraintDetails, numDecisionVars, slackVarCount, surplusVarCount, artificialVarCount, tableauWidth, variableNames } = tableauState;
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
            else console.error(`Не знайдено стовпець для ${slackVarName} в populateConstraintRows`);
            basisHeaders.push(`s${detail.slackVarIndex + 1} =`);
        } else if (c.type === 'eq') {
            const artVarName = `-a${detail.artificialVarIndex + 1}`;
            const artVarCol = variableNames.indexOf(artVarName);
            if(artVarCol !== -1) tableau[rowIdx][artVarCol] = 1;
            else console.error(`Не знайдено стовпець для ${artVarName} в populateConstraintRows`);
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


export function initializeObjectiveRow(tableauState, objective, M_VALUE_PARAM) {
    const { tableau, constraintDetails, numDecisionVars, slackVarCount, surplusVarCount, artificialVarCount, tableauWidth, variableNames } = tableauState;
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
                    const M_effect = isMinimization ? M_VALUE_PARAM : -M_VALUE_PARAM;
                    for (let j_col = 0; j_col < tableauWidth; j_col++) {
                        tableau[0][j_col] -= M_effect * tableau[constraintRowIdxInTableau][j_col];
                    }
                }
            }
        }
    }
}

export function extractSolution(tableauState, objectiveType, originalNumVars) {
    const { tableau, basisHeaders } = tableauState;
    let solution = {};
    for (let i = 0; i < originalNumVars; i++) {
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
            if (varType === 'x' && varNum > 0 && varNum <= originalNumVars) {
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