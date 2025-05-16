import { formatNumber } from '../utils.js';
import { EPSILON } from '../config.js';

function formatTermForDualDisplay(coeff, varIndex, isFirstTerm, varSymbol = 'u') {
    if (Math.abs(coeff) < EPSILON) return '';
    let sign = '';
    let valStr = formatNumber(Math.abs(coeff));
    let parenOpen = '';
    let parenClose = '';

    if (coeff < 0) {
        parenOpen = '(';
        parenClose = ')';
    }

    if (isFirstTerm) {
        sign = coeff < 0 ? `${parenOpen}-` : '';
        if (coeff < 0) valStr = `${valStr}${parenClose}`;
    } else {
        sign = coeff < 0 ? ` + ${parenOpen}-` : ' + ';
        if (coeff < 0) valStr = `${valStr}${parenClose}`;
    }

    let termVarPart = `*${varSymbol}${varIndex + 1}`;
    if (Math.abs(Math.abs(coeff)-1) < EPSILON) {
        termVarPart = `${varSymbol}${varIndex + 1}`;
        valStr = '';
        if (isFirstTerm && coeff < 0 ) sign = `${parenOpen}-`;
        else if (isFirstTerm && coeff > 0) sign = ``;
        else if (!isFirstTerm && coeff < 0) sign = ` + ${parenOpen}-`;
        else if (!isFirstTerm && coeff > 0) sign = ` + `;
        if (coeff < 0 && Math.abs(Math.abs(coeff)-1) < EPSILON && parenOpen) termVarPart = `${termVarPart}${parenClose}`;
        else if (coeff < 0 && valStr && parenOpen) valStr = `${formatNumber(Math.abs(coeff))}${parenClose}`;
        else if (coeff<0 && !parenOpen) sign = '-';
    }
    if (parenOpen && !valStr && Math.abs(Math.abs(coeff)-1) < EPSILON) {
        return `${sign}${termVarPart}`;
    }
    return `${sign}${valStr}${termVarPart}`;
}


export function buildDualProblem(parsedPrimalData) {
    const primalObjective = parsedPrimalData.objective;
    const primalConstraints = parsedPrimalData.constraints;
    const numPrimalVars = parsedPrimalData.numVars;
    const numPrimalConstraints = primalConstraints.length;

    const dualProblem = {
        numVars: numPrimalConstraints,
        objective: {
            coeffs: [],
            isMin: !primalObjective.isMin
        },
        constraints: [],
        varTypes: [],
        constraintTypes: []
    };

    dualProblem.objective.coeffs = primalConstraints.map(c => c.b);

    for (let j = 0; j < numPrimalVars; j++) {
        const dualConstraintCoeffs = primalConstraints.map(c => c.coeffs[j]);
        dualProblem.constraints.push({
            coeffs: dualConstraintCoeffs,
            b: primalObjective.coeffs[j]
        });
    }

    if (primalObjective.isMin) {
        dualProblem.constraintTypes = Array(numPrimalVars).fill('<=');
    } else {
        dualProblem.constraintTypes = Array(numPrimalVars).fill('>=');
    }

    primalConstraints.forEach(constraint => {
        if (primalObjective.isMin) {
            if (constraint.type === '<=') {
                dualProblem.varTypes.push('<=0');
            } else {
                dualProblem.varTypes.push('>=0');
            }
        } else {
            if (constraint.type === '<=') {
                dualProblem.varTypes.push('>=0');
            } else {
                dualProblem.varTypes.push('<=0');
            }
        }
    });

    return dualProblem;
}

export function formatDualProblemForDisplay(dualProblemData) {
    let output = "";
    const objType = dualProblemData.objective.isMin ? "min" : "max";

    let objTermsArray = [];
    dualProblemData.objective.coeffs.forEach((c, i) => {
        const term = formatTermForDualDisplay(c, i, objTermsArray.length === 0, 'u');
        if(term) objTermsArray.push(term);
    });
    if (objTermsArray.length === 0 && dualProblemData.objective.coeffs.length > 0) {
        objTermsArray.push("0,00");
    }

    output += `W = ${objTermsArray.join("") || "0,00"} \u2192 ${objType}\n`;
    output += "при обмеженнях:\n";

    dualProblemData.constraints.forEach((constraint, i) => {
        let constraintTermsArray = [];
        constraint.coeffs.forEach((c, j) => {
            const term = formatTermForDualDisplay(c, j, constraintTermsArray.length === 0, 'u');
            if(term) constraintTermsArray.push(term);
        });
        if (constraintTermsArray.length === 0 && constraint.coeffs.length > 0) {
            constraintTermsArray.push("0,00");
        }

        const constraintTypeStr = dualProblemData.constraintTypes[i];
        output += `v${i+1} = ${constraintTermsArray.join("") || "0,00"} ${constraintTypeStr} ${formatNumber(constraint.b)}\n`;
    });

    dualProblemData.varTypes.forEach((varType, i) => {
        output += `u${i + 1} ${varType}\n`;
    });

    return output;
}