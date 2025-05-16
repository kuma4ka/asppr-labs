import { EPSILON } from '../config.js';
import { formatNumber } from '../utils.js';

function formatTermForYEq(coeff, varIndex, isFirstNonNegativeInTerm) {
    if (Math.abs(coeff) < EPSILON) return '';
    let sign = '';
    let valPart = formatNumber(Math.abs(coeff));

    if (isFirstNonNegativeInTerm) {
        sign = coeff < 0 ? '(-' : '';
        if (coeff < 0) valPart += ')';
    } else {
        sign = coeff < 0 ? ' + (-' : ' + ';
        if (coeff < 0) valPart += ')';
    }

    let xPart = `*X[${varIndex + 1}]`;
    if (Math.abs(Math.abs(coeff)-1) < EPSILON) {
        xPart = `X[${varIndex + 1}]`;
        valPart = '';
        if (isFirstNonNegativeInTerm && coeff < 0 ) sign = `(-`;
        else if (isFirstNonNegativeInTerm && coeff > 0) sign = ``;
        else if (!isFirstNonNegativeInTerm && coeff < 0) sign = ` + (-`;
        else if (!isFirstNonNegativeInTerm && coeff > 0) sign = ` + `;
        if (coeff < 0) xPart += ')';
    }

    return `${sign}${valPart}${xPart}`;
}


export function transformProblem(parsedData) {
    const { numVars, objective, constraints } = parsedData;
    const numConstraints = constraints.length;
    const originalConstraintTypes = constraints.map(c => c.type);

    let zPrimeCoeffs = [...objective.coeffs];
    if (objective.isMin) {
        zPrimeCoeffs = zPrimeCoeffs.map(c => (Math.abs(c) < EPSILON ? 0 : -c));
    }

    const yEquations = [];
    const tableauRowCoeffs_NegX = [];
    const tableauConstants = [];

    constraints.forEach((constraint, i) => {
        let rowCoeffsForTableau = [];
        let constantForTableau;

        let coeffsForYEquation = [];
        let constantForYEquation = 0;

        if (constraint.type === '<=') {
            rowCoeffsForTableau = constraint.coeffs.map(c => c);
            constantForTableau = constraint.b;
            coeffsForYEquation = constraint.coeffs.map(c => (Math.abs(c) < EPSILON ? 0 : -c));
            constantForYEquation = constraint.b;
        } else {
            rowCoeffsForTableau = constraint.coeffs.map(c => (Math.abs(c) < EPSILON ? 0 : -c));
            constantForTableau = (Math.abs(constraint.b) < EPSILON ? 0 : -constraint.b);
            coeffsForYEquation = constraint.coeffs.map(c => c);
            constantForYEquation = (Math.abs(constraint.b) < EPSILON ? 0 : -constraint.b);
        }

        let termsForYString = [];
        let firstNN = true;
        coeffsForYEquation.forEach((coeff, j) => {
            const term = formatTermForYEq(coeff, j, firstNN && coeff >=0);
            if (term) {
                termsForYString.push(term);
                if (firstNN && coeff >=0) firstNN = false;
                if (firstNN && coeff < 0) firstNN = false;
            }
        });

        let constantTermString = "";
        if (Math.abs(constantForYEquation) > EPSILON || termsForYString.length === 0) {
            let sign = constantForYEquation < 0 ? ' + (-' : ' + ';
            let valStr = formatNumber(Math.abs(constantForYEquation));
            if (constantForYEquation < 0) valStr += ')';

            if (termsForYString.length === 0) {
                sign = constantForYEquation < 0 ? '(-' : '';
                valStr = formatNumber(Math.abs(constantForYEquation));
                if (constantForYEquation < 0) valStr += ')';
            }
            constantTermString = `${sign}${valStr}`;
        }

        let yEquationRHS = termsForYString.join('');
        if (constantTermString) {
            yEquationRHS += constantTermString;
        }
        if (yEquationRHS.trim().startsWith('+ ')) {
            yEquationRHS = yEquationRHS.trim().substring(2);
        }

        let currentEquationString = `y<sub>${i + 1}</sub> = ${yEquationRHS || "0,00"} \u2265 0`;
        if (constraint.type === 'eq') { // Hypothetical for future
            currentEquationString = `y<sub>${i + 1}</sub> = ${yEquationRHS || "0,00"} = 0`;
        }

        yEquations.push(currentEquationString);
        tableauRowCoeffs_NegX.push(rowCoeffsForTableau);
        tableauConstants.push(constantForTableau);
    });

    return {
        numVars,
        numConstraints,
        originalObjective: objective,
        originalConstraintTypes,
        zPrimeCoeffs,
        tableauRowCoeffs_NegX: tableauRowCoeffs_NegX,
        tableauConstants: tableauConstants,
        yEquations
    };
}

export function generateInitialTableau(transformedData) {
    const { numVars, numConstraints, zPrimeCoeffs, tableauRowCoeffs_NegX, tableauConstants } = transformedData;
    const tableau = [];
    const originalColVars = [];

    for (let j = 0; j < numVars; j++) {
        originalColVars.push(`-X[${j + 1}]`);
    }
    originalColVars.push("W, 1");


    for (let i = 0; i < numConstraints; i++) {
        const row = [...tableauRowCoeffs_NegX[i]];
        row.push(tableauConstants[i]);
        tableau.push(row);
    }

    const zRow = [];
    for (let j = 0; j < numVars; j++) {
        zRow.push(Math.abs(zPrimeCoeffs[j]) < EPSILON ? 0 : -zPrimeCoeffs[j]);
    }
    zRow.push(0);
    tableau.push(zRow);

    const rowVars = Array.from({ length: numConstraints }, (_, i) => `u${i + 1} y${i + 1}`);
    rowVars.push("1 Z");

    const colVars = Array.from({ length: numVars }, (_, i) => `v${i+1}, -X[${i + 1}]`);
    colVars.push("W, 1");


    return { tableau, rowVars, colVars, originalColVars: originalColVars.slice(0, -1) };
}