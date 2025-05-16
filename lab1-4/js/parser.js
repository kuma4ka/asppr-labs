import { getElementValue, getElementValueAsFloat, getElementValueAsInt, querySelectorAllAsArray, getCheckboxState } from './dom/formAccessors.js';

export function parseInput(numVarsInput, objectiveTypeSelect, objCoeffsContainer, constraintsContainer, solveIntegerCheckboxId) {
    const numVars = getElementValueAsInt(numVarsInput);
    if (numVars < 1) {
        throw new Error("Кількість змінних має бути більше 0.");
    }

    const objective = { coeffs: [], isMin: getElementValue(objectiveTypeSelect) === 'min' };
    const objInputs = querySelectorAllAsArray(objCoeffsContainer, 'input.coeff-input');
    if (objInputs.length !== numVars) throw new Error(`Кількість полів для цільової функції (${objInputs.length}) не відповідає кількості змінних (${numVars}). Натисніть 'Налаштувати Поля'.`);
    objInputs.forEach((input, i) => {
        try {
            const val = getElementValueAsFloat(input);
            objective.coeffs.push(val);
        } catch (e) {
            throw new Error(`Невірний коефіцієнт '${input.value}' у цільовій функції для x${i + 1}.`);
        }
    });

    const constraints = [];
    const constraintRows = querySelectorAllAsArray(constraintsContainer, '.constraint-row');
    if (constraintRows.length === 0) {
        throw new Error("Не додано жодного обмеження.");
    }
    constraintRows.forEach((row, index) => {
        const constraint = { coeffs: [], type: '', b: 0 };
        const coeffInputs = querySelectorAllAsArray(row, '.coeffs-container input.coeff-input');
        if (coeffInputs.length !== numVars) throw new Error(`Кількість полів для обмеження ${index + 1} (${coeffInputs.length}) не відповідає кількості змінних (${numVars}).`);
        coeffInputs.forEach((input, i) => {
            try {
                const val = getElementValueAsFloat(input);
                constraint.coeffs.push(val);
            } catch (e) {
                throw new Error(`Невірний коефіцієнт '${input.value}' в обмеженні ${index + 1} для x${i + 1}.`);
            }
        });
        const select = row.querySelector('select');
        constraint.type = getElementValue(select);
        const constInput = row.querySelector('input[type="number"]:not(.coeff-input)');
        try {
            const bVal = getElementValueAsFloat(constInput);
            constraint.b = bVal;
        } catch (e) {
            throw new Error(`Невірне значення вільного члена '${constInput.value}' в обмеженні ${index + 1}.`);
        }
        constraints.push(constraint);
    });

    const solveInteger = getCheckboxState(solveIntegerCheckboxId);

    return { numVars, objective, constraints, solveInteger };
}