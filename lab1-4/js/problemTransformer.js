import { EPSILON } from './config.js';
import { formatNumber } from './utils.js';

export function transformProblem(parsedData) {
    const { numVars, objective, constraints } = parsedData;
    const numConstraints = constraints.length;

    let zPrimeCoeffs = [...objective.coeffs];
    if (objective.isMin) {
        zPrimeCoeffs = zPrimeCoeffs.map(c => -c);
    }

    const yEquations = [];
    const tableauRowCoeffs_NegX = [];
    const tableauConstants = [];
    const originalConstraintTypes = [];
    const artificialVarIndices = [];

    constraints.forEach((constraint, i) => {
        let rowCoeffs = Array(numVars).fill(0);
        let constantForTableau;
        let equationString = '';
        let tempCoeffs_eq = [];
        let tempConst_eq = 0;

        originalConstraintTypes.push(constraint.type);

        if (constraint.type === '<=') {
            rowCoeffs = constraint.coeffs.map(c => c);
            constantForTableau = constraint.b;
            tempCoeffs_eq = constraint.coeffs.map(c => -c);
            tempConst_eq = constraint.b;
        } else if (constraint.type === '>=') {
            rowCoeffs = constraint.coeffs.map(c => -c);
            constantForTableau = -constraint.b;
            tempCoeffs_eq = [...constraint.coeffs];
            tempConst_eq = -constraint.b;
        } else { // '='
            rowCoeffs = constraint.coeffs.map(c => c);
            constantForTableau = constraint.b;
            tempCoeffs_eq = constraint.coeffs.map(c => -c);
            tempConst_eq = constraint.b;
        }

        equationString = `y<sub>${i + 1}</sub> = `;
        let terms = [];
        tempCoeffs_eq.forEach((c, j) => {
            if (Math.abs(c) > EPSILON) {
                let sign = (terms.length > 0 || c < 0) ? (c < 0 ? ' - ' : ' + ') : (c < 0 ? '-' : '');
                if (terms.length === 0 && c > 0) sign = '';
                let coeffAbs = Math.abs(c);
                let coeffStr = (Math.abs(coeffAbs - 1) < EPSILON && coeffAbs !== 0) ? '' : `${formatNumber(coeffAbs)}*`;
                terms.push(`${sign}${coeffStr}x<sub>${j + 1}</sub>`);
            }
        });

        if (terms.length === 0 && Math.abs(tempConst_eq) < EPSILON) {
            equationString += "0.00";
        } else {
            equationString += terms.join('');
            if (Math.abs(tempConst_eq) > EPSILON || terms.length === 0) {
                let sign = (tempConst_eq >= 0) ? (terms.length > 0 ? ' + ' : '') : ' - ';
                if (terms.length === 0 && tempConst_eq <0) sign = '-';

                equationString += `${sign}${formatNumber(Math.abs(tempConst_eq))}`;
            }
        }
        equationString += " &ge; 0";

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
        yEquations,
        originalConstraintTypes,
        artificialVarIndices
    };
}

export function generateInitialTableau(transformedData) {
    const { numVars, numConstraints, zPrimeCoeffs, tableauRowCoeffs_NegX, tableauConstants } = transformedData;
    const tableau = [];

    for (let i = 0; i < numConstraints; i++) {
        const row = [...tableauRowCoeffs_NegX[i]];
        row.push(tableauConstants[i]);
        tableau.push(row);
    }

    const zRow = [];
    for (let j = 0; j < numVars; j++) {
        zRow.push(zPrimeCoeffs[j] !== 0 ? zPrimeCoeffs[j] : 0);
    }
    zRow.push(0);
    tableau.push(zRow);

    const rowVars = Array.from({ length: numConstraints }, (_, i) => `y${i + 1}`);
    rowVars.push("Z'");
    const colVars = Array.from({ length: numVars }, (_, i) => `-x${i + 1}`);
    colVars.push("1");

    return { tableau, rowVars, colVars };
}