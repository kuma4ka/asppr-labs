import * as domUtils from './domUtils.js';
import { parseInput } from './parser.js';
import { transformProblem, generateInitialTableau } from './problemTransformer.js';
import { ProtocolLogger } from './protocolLogger.js';
import { findFeasibleSolution, findOptimalSolution, extractSolution } from './simplexSolver.js';

const numVarsInput = document.getElementById('numVars');
const setupVarsButton = document.getElementById('setupVarsButton');
const objCoeffsContainer = document.getElementById('objCoeffsContainer');
const objectiveTypeSelect = document.getElementById('objectiveType');
const constraintsContainer = document.getElementById('constraintsContainer');
const addConstraintButton = document.getElementById('addConstraintButton');
const solveButton = document.getElementById('solveButton');
const loadExample1Button = document.getElementById('loadExample1Button');
const loadExample2Button = document.getElementById('loadExample2Button');
const loadVariant20Button = document.getElementById('loadVariant20Button');
const protocolOutputDiv = document.getElementById('protocolOutput');
const finalResultDiv = document.getElementById('finalResult');

domUtils.initDOMReferences({ objCoeffsContainer, constraintsContainer });

function loadExample(exampleData) {
    numVarsInput.value = exampleData.numVars;
    domUtils.setupInputFields(exampleData.numVars);

    objectiveTypeSelect.value = exampleData.objective.isMin ? 'min' : 'max';
    const objInputs = objCoeffsContainer.querySelectorAll('input');
    exampleData.objective.coeffs.forEach((c, i) => {
        if(objInputs[i]) objInputs[i].value = c || '0';
    });

    constraintsContainer.innerHTML = '';
    exampleData.constraints.forEach(c => domUtils.addConstraintRow(exampleData.numVars, c));

    domUtils.clearOutputs(protocolOutputDiv, finalResultDiv);
}

function solve() {
    const logger = new ProtocolLogger('protocolOutput');
    domUtils.clearOutputs(null, finalResultDiv);

    try {
        const problemData = parseInput(numVarsInput, objectiveTypeSelect, objCoeffsContainer, constraintsContainer);
        const transformedData = transformProblem(problemData);
        const initialTableauData = generateInitialTableau(transformedData);

        logger.clear();
        logger.start(problemData, transformedData);
        logger.logInitialTableau(initialTableauData.tableau, initialTableauData.rowVars, initialTableauData.colVars);

        const feasibilityResult = findFeasibleSolution(
            initialTableauData.tableau,
            initialTableauData.rowVars,
            initialTableauData.colVars,
            logger
        );

        if (!feasibilityResult.feasible) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type');
            domUtils.displayMessage('finalResult', lastMessageElem?.textContent || 'Не вдалося знайти опорний розв\'язок.');
            return;
        }

        const feasibleSolution = extractSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            problemData.numVars
        );
        logger.logFeasibleFound(feasibleSolution.x);

        const optimalityResult = findOptimalSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            logger,
            problemData.objective.isMin
        );

        if (optimalityResult.optimal) {
            const finalSolution = extractSolution(
                optimalityResult.tableau,
                optimalityResult.rowVars,
                optimalityResult.colVars,
                problemData.numVars
            );
            const optimalZprime = finalSolution.z;
            const optimalZ = problemData.objective.isMin ? -optimalZprime : optimalZprime;

            logger.logOptimalFound(finalSolution.x, optimalZ, problemData.objective.isMin);
            domUtils.displaySolution(finalSolution.x, optimalZ, problemData.objective.isMin, "Оптимальний розв'язок:", 'finalResult');

        } else if (optimalityResult.unbounded) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type');
            domUtils.displayMessage('finalResult', lastMessageElem?.textContent || 'Функція мети необмежена.');
        } else {
            domUtils.displayMessage('finalResult','Не вдалося знайти оптимальний розв\'язок (можливо, перевищено ліміт ітерацій).');
        }

    } catch (error) {
        console.error("Error during solving:", error);
        domUtils.displayMessage('finalResult', `Помилка: ${error.message}`);
        logger.clear();
    }
}


setupVarsButton.addEventListener('click', () => {
    try {
        const numVars = domUtils.getElementValueAsInt(numVarsInput);
        if (numVars > 0) {
            domUtils.setupInputFields(numVars);
        } else {
            alert("Кількість змінних має бути більше 0.");
        }
    } catch (error) {
        alert(`Помилка: ${error.message}`);
    }
});

addConstraintButton.addEventListener('click', () => {
    try {
        const numVars = domUtils.getElementValueAsInt(numVarsInput);
        if (numVars > 0) {
            domUtils.addConstraintRow(numVars);
        } else {
            alert("Спочатку налаштуйте коректну кількість змінних.");
        }
    } catch (error) {
        alert(`Помилка: ${error.message}`);
    }
});

solveButton.addEventListener('click', solve);

loadExample1Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [1, 2, -1, -1], isMin: false },
        constraints: [
            { coeffs: [1, 1, -1, -2], type: '<=', b: 6 },
            { coeffs: [1, 1, 1, -1], type: '>=', b: 5 },
            { coeffs: [2, -1, 3, 4], type: '<=', b: 10 }
        ]
    });
});

loadExample2Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [-2, 3, 0, -3], isMin: true },
        constraints: [
            { coeffs: [1, 1, -1, -2], type: '<=', b: 6 },
            { coeffs: [1, 1, 1, -1], type: '>=', b: 5 },
            { coeffs: [2, -1, 3, 4], type: '<=', b: 10 }
        ]
    });
});

loadVariant20Button.addEventListener('click', () => {
    loadExample({
        numVars: 5,
        objective: { coeffs: [3, 0, -1, 0, 1], isMin: true },
        constraints: [
            { coeffs: [-1, 0, 3, -2, 1], type: '<=', b: 3 },
            { coeffs: [1, -1, 0, 1, 1], type: '<=', b: 3 },
            { coeffs: [1, 3, -1, -1, 1], type: '<=', b: 2 }
        ]
    });
});


document.addEventListener('DOMContentLoaded', () => {
    try {
        const initialVars = domUtils.getElementValueAsInt(numVarsInput);
        if (initialVars > 0) {
            domUtils.setupInputFields(initialVars);
        } else {
            numVarsInput.value = 4;
            domUtils.setupInputFields(4);
        }
    } catch (error) {
        console.warn("Initial setup failed, defaulting to 4 variables.", error);
        numVarsInput.value = 4;
        domUtils.setupInputFields(4);
    }
});