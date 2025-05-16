import { EPSILON } from '../config.js';
import { getFractionalPart } from '../utils.js';

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