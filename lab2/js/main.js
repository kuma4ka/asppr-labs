import * as domUtils from './dom/domUtils.js';
import { parseInput } from './lp/parser.js';
import { transformProblem, generateInitialTableau } from './lp/problemTransformer.js';
import { ProtocolLogger } from './logging/protocolLogger.js';
import { extractSolution, findFeasibleSolution, findOptimalSolution, extractDualSolution } from './lp/simplexSolver.js';
import { buildDualProblem, formatDualProblemForDisplay } from './lp/dualBuilder.js';

const numVarsInput = document.getElementById('numVars');
const setupVarsButton = document.getElementById('setupVarsButton');
const objCoeffsContainer = document.getElementById('objCoeffsContainer');
const objectiveTypeSelect = document.getElementById('objectiveType');
const constraintsContainer = document.getElementById('constraintsContainer');
const addConstraintButton = document.getElementById('addConstraintButton');
const solveButton = document.getElementById('solveButton');
const buildDualButton = document.getElementById('buildDualButton');
const loadExample1Button = document.getElementById('loadExample1Button');
const loadExample2Button = document.getElementById('loadExample2Button');
const loadVariant20Button = document.getElementById('loadVariant20Button');

const protocolOutputDiv = document.getElementById('protocolOutput');
const finalResultDiv = document.getElementById('finalResult');

domUtils.initDOMReferences({ objCoeffsContainer, constraintsContainer });

function loadExample(exampleData) {
    numVarsInput.value = exampleData.numVars;
    domUtils.setupInputFields(exampleData.numVars, exampleData.objective.coeffs);
    objectiveTypeSelect.value = exampleData.objective.isMin ? 'min' : 'max';

    constraintsContainer.innerHTML = '';
    exampleData.constraints.forEach(c => domUtils.addConstraintRow(exampleData.numVars, c));

    if (protocolOutputDiv) protocolOutputDiv.innerHTML = '';
    if (finalResultDiv) {
        finalResultDiv.innerHTML = '';
        finalResultDiv.classList.add('hidden-effectively');
        const outputSection = document.getElementById('output');
        if (outputSection) {
            const resultHeader = Array.from(outputSection.getElementsByTagName('h2')).find(h2 => h2.textContent.includes('Результат:'));
            if(resultHeader) resultHeader.style.display = 'none';
        }
    }
}

function solve() {
    const logger = new ProtocolLogger('protocolOutput');
    domUtils.clearOutputs(protocolOutputDiv, finalResultDiv);
    domUtils.setResultVisibility(false);
    logger.clear();

    try {
        const problemData = parseInput(numVarsInput, objectiveTypeSelect, objCoeffsContainer, constraintsContainer);
        const transformedData = transformProblem(problemData);
        const initialTableauData = generateInitialTableau(transformedData);

        logger.start(problemData, transformedData);
        logger.logInitialTableau(initialTableauData.tableau, initialTableauData.rowVars, initialTableauData.colVars);

        const feasibilityResult = findFeasibleSolution(
            initialTableauData.tableau,
            initialTableauData.rowVars,
            initialTableauData.colVars,
            logger,
            initialTableauData.originalColVars
        );

        if (!feasibilityResult.feasible) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type') || logger.outputDiv.querySelector('pre:last-of-type');
            domUtils.displayMessage('finalResult', lastMessageElem?.textContent || 'Не вдалося знайти опорний розв\'язок.', true);
            return;
        }

        const currentPrimalSolutionForLog = extractSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            problemData.numVars
        );
        const dualSolutionAfterFeasibility = extractDualSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            problemData.constraints.length,
            transformedData.originalConstraintTypes,
            problemData.objective.isMin,
            feasibilityResult.originalInitialColVars
        );

        logger.logFeasibleFound(currentPrimalSolutionForLog.x, dualSolutionAfterFeasibility);

        const optimalityResult = findOptimalSolution(
            feasibilityResult.tableau,
            feasibilityResult.rowVars,
            feasibilityResult.colVars,
            logger,
            problemData.objective.isMin,
            feasibilityResult.originalInitialColVars
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

            const finalDualSolutionU = extractDualSolution(
                optimalityResult.tableau,
                optimalityResult.rowVars,
                optimalityResult.colVars,
                problemData.constraints.length,
                transformedData.originalConstraintTypes,
                problemData.objective.isMin,
                optimalityResult.originalInitialColVars
            );

            logger.logOptimalFound(finalSolution.x, optimalZ, problemData.objective.isMin, finalDualSolutionU, !problemData.objective.isMin, optimalZ);
            domUtils.displaySolution(finalSolution.x, optimalZ, problemData.objective.isMin, "Оптимальний розв'язок:", 'finalResult', finalDualSolutionU, !problemData.objective.isMin, optimalZ);
        } else if (optimalityResult.unbounded) {
            const lastMessageElem = logger.outputDiv.querySelector('p:last-of-type') || logger.outputDiv.querySelector('pre:last-of-type');
            domUtils.displayMessage('finalResult', lastMessageElem?.textContent || 'Функція мети необмежена.', true);
        } else {
            domUtils.displayMessage('finalResult', 'Не вдалося знайти оптимальний розв\'язок (можливо, перевищено ліміт ітерацій).', true);
        }

    } catch (error) {
        console.error("Error during solving:", error);
        domUtils.displayMessage('finalResult', `Помилка: ${error.message}`, true);
        if (logger && typeof logger.addParagraph === 'function') {
            logger.addParagraph(`<span class="error-message">Помилка під час розв'язання: ${error.message}</span>`);
        }
    }
}

function handleBuildDualProblem() {
    const logger = new ProtocolLogger('protocolOutput');
    domUtils.setResultVisibility(false);

    let isProtocolEmpty = true;
    if (protocolOutputDiv && protocolOutputDiv.innerHTML.trim() !== '') {
        isProtocolEmpty = false;
    }

    if (isProtocolEmpty) {
        logger.clear();
    } else if (protocolOutputDiv) {
        const hr = document.createElement('hr');
        hr.className = 'protocol-divider';
        protocolOutputDiv.appendChild(hr);
    }

    try {
        const problemData = parseInput(numVarsInput, objectiveTypeSelect, objCoeffsContainer, constraintsContainer);

        let primalProblemLogged = false;
        if (protocolOutputDiv) {
            const headers = protocolOutputDiv.getElementsByTagName('h3');
            for (let i = 0; i < headers.length; i++) {
                if (headers[i].textContent.includes("Постановка прямої задачі")) {
                    primalProblemLogged = true;
                    break;
                }
            }
        }

        if (!primalProblemLogged) {
            const transformedData = transformProblem(problemData);
            logger.start(problemData, transformedData);
        }

        const dualProblemData = buildDualProblem(problemData);
        const formattedDualProblem = formatDualProblemForDisplay(dualProblemData);
        logger.logDualProblem(formattedDualProblem);

    } catch (error) {
        console.error("Error building dual problem:", error);
        if(finalResultDiv) domUtils.displayMessage('finalResult', `Помилка при побудові двоїстої задачі: ${error.message}`, true);
        if(protocolOutputDiv && logger && typeof logger.addParagraph === 'function') {
            logger.addParagraph(`<span class="error-message">Помилка при побудові двоїстої задачі: ${error.message}</span>`);
        }
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

if(solveButton) solveButton.addEventListener('click', solve);
if(buildDualButton) buildDualButton.addEventListener('click', handleBuildDualProblem);

if(loadExample1Button) loadExample1Button.addEventListener('click', () => {
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

if(loadExample2Button) loadExample2Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [10, -1, -42, -52], isMin: false },
        constraints: [
            { coeffs: [-3, 1, 4, 1], type: '<=', b: 1 },
            { coeffs: [3, -2, 2, -2], type: '<=', b: -9 },
            { coeffs: [-2, 1, 1, 3], type: '<=', b: 2 },
            { coeffs: [-2, 1, 1, 3], type: '>=', b: 2 },
            { coeffs: [-3, 2, -3, 0], type: '<=', b: 7 },
            { coeffs: [-3, 2, -3, 0], type: '>=', b: 7 }
        ]
    });
});

if(loadVariant20Button) loadVariant20Button.addEventListener('click', () => {
    loadExample({
        numVars: 2,
        objective: { coeffs: [2, 1], isMin: false },
        constraints: [
            { coeffs: [1, -1], type: '<=', b: 2 },
            { coeffs: [1, -1], type: '>=', b: 2 },
            { coeffs: [1, 2], type: '<=', b: 5 }
        ]
    });
});

document.addEventListener('DOMContentLoaded', () => {
    try {
        const initialVars = domUtils.getElementValueAsInt(numVarsInput);
        if (initialVars > 0) {
            domUtils.setupInputFields(initialVars);
        } else {
            numVarsInput.value = 2;
            domUtils.setupInputFields(2);
        }
    } catch (error) {
        console.warn("Initial setup failed, defaulting.", error);
        numVarsInput.value = 2;
        domUtils.setupInputFields(2);
    }
    domUtils.setResultVisibility(false);
    if (typeof loadVariant20Button !== 'undefined' && loadVariant20Button) {
        loadVariant20Button.click();
    }
});