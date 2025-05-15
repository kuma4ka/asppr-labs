export function parseObjectiveFunction(objectiveRawStr, numVariables) {
    const objectiveCoeffs = Array(numVariables).fill(0);
    if (!objectiveRawStr.trim()) {
        return { coeffs: objectiveCoeffs, error: "Цільова функція не заповнена." };
    }
    const objTerms = objectiveRawStr.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x(\d+)/gi);
    if (!objTerms && objectiveRawStr.trim() !== "0") {
        if (!/x\d+/i.test(objectiveRawStr) && objectiveRawStr.trim() !== "0" ) {
            return { coeffs: objectiveCoeffs, error: "Некоректний формат цільової функції. Очікуються терми типу '3x1', '-2x2' тощо." };
        }
    }

    if (objTerms) {
        objTerms.forEach(term => {
            const parts = term.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x(\d+)/i);
            if (parts && parts.length === 3) {
                let coeff = parseFloat(parts[1].replace(/\s/g, ''));
                if (isNaN(coeff)) {
                    coeff = parts[1].includes('-') ? -1 : 1;
                }
                const varIndex = parseInt(parts[2]) - 1;
                if (varIndex >= 0 && varIndex < numVariables) {
                    objectiveCoeffs[varIndex] = coeff;
                } else {
                    return { coeffs: [], error: `Змінна x${parts[2]} виходить за межі вказаної кількості змінних (${numVariables}).` };
                }
            }
        });
    }
    return { coeffs: objectiveCoeffs, error: null };
}

export function parseConstraints(constraintElements, numVariables) {
    const constraints = [];
    const errors = [];
    if (constraintElements.length === 0) {
        errors.push("Не додано жодного обмеження.");
        return { constraints, errors };
    }

    for (let i = 0; i < constraintElements.length; i++) {
        const el = constraintElements[i];
        const eqRawStr = el.querySelector('.constraint-eq').value;
        const type = el.querySelector('.constraint-type').value;
        const rhsStr = el.querySelector('.constraint-rhs').value;
        const rhs = parseFloat(rhsStr);

        if (!eqRawStr.trim()) {
            errors.push(`Обмеження ${i + 1}: Ліва частина не заповнена.`);
            continue;
        }
        if (rhsStr.trim() === "" || isNaN(rhs)) {
            errors.push(`Обмеження ${i + 1}: Права частина (RHS) має бути числом.`);
            continue;
        }

        const constraintCoeffs = Array(numVariables).fill(0);
        const terms = eqRawStr.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x(\d+)/gi);

        if (!terms && eqRawStr.trim() !== "0") {
            if (!/x\d+/i.test(eqRawStr) && eqRawStr.trim() !== "0" ) {
                errors.push(`Обмеження ${i + 1}: Некоректний формат лівої частини. Очікуються терми типу '3x1', '-2x2' тощо.`);
                continue;
            }
        }

        if (terms) {
            let termError = false;
            terms.forEach(term => {
                const parts = term.match(/([+-]?\s*\d*\.?\d*)\s*\*?\s*x(\d+)/i);
                if (parts && parts.length === 3) {
                    let coeff = parseFloat(parts[1].replace(/\s/g, ''));
                    if (isNaN(coeff)) {
                        coeff = parts[1].includes('-') ? -1 : 1;
                    }
                    const varIndex = parseInt(parts[2]) - 1;
                    if (varIndex >= 0 && varIndex < numVariables) {
                        constraintCoeffs[varIndex] = coeff;
                    } else {
                        errors.push(`Обмеження ${i + 1}: Змінна x${parts[2]} виходить за межі вказаної кількості змінних (${numVariables}).`);
                        termError = true;
                    }
                }
            });
            if (termError) continue;
        }
        constraints.push({ raw: eqRawStr, coeffs: constraintCoeffs, type: type, rhs: rhs });
    }
    return { constraints, errors };
}

export function getInputData() {
    const validationMessages = [];

    const objectiveRawStrElement = document.getElementById('objective-function');
    const objectiveTypeElement = document.getElementById('objective-type');
    const numVariablesElement = document.getElementById('num-variables');
    const constraintElements = document.querySelectorAll('.constraint');

    const objectiveRawStr = objectiveRawStrElement ? objectiveRawStrElement.value : "";
    const objectiveType = objectiveTypeElement ? objectiveTypeElement.value : "minimize";
    const numVariablesStr = numVariablesElement ? numVariablesElement.value : "0";
    const numVariables = parseInt(numVariablesStr);

    if (!objectiveRawStr.trim()) {
        validationMessages.push("Цільова функція не може бути порожньою.");
    }
    if (isNaN(numVariables) || numVariables <= 0) {
        validationMessages.push("Кількість змінних має бути додатним числом.");
        return { errorMessages: validationMessages, isValid: false };
    }
    if (numVariables > 15) {
        validationMessages.push("Кількість змінних не повинна перевищувати 15 для даної реалізації.");
        return { errorMessages: validationMessages, isValid: false };
    }

    if (constraintElements.length === 0) {
        validationMessages.push("Будь ласка, додайте хоча б одне обмеження.");
    }

    const objectiveParsed = parseObjectiveFunction(objectiveRawStr, numVariables);
    if (objectiveParsed.error) {
        validationMessages.push(objectiveParsed.error);
    }

    const constraintsParsed = parseConstraints(constraintElements, numVariables);
    if (constraintsParsed.errors && constraintsParsed.errors.length > 0) {
        validationMessages.push(...constraintsParsed.errors);
    }

    if (validationMessages.length > 0) {
        return { errorMessages: validationMessages, isValid: false };
    }

    return {
        objective: { raw: objectiveRawStr, coeffs: objectiveParsed.coeffs, type: objectiveType },
        constraints: constraintsParsed.constraints,
        numVariables: numVariables,
        isValid: true,
        errorMessages: []
    };
}