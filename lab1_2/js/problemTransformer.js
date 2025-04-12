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
                let coeffStr = (Math.abs(Math.abs(c) - 1) < EPSILON && c !== 0) ? '' : `${formatNumber(Math.abs(c))}*`; // Handle coeff=1 or -1
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