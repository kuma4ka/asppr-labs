import { initDOMReferences } from './domUtils.js';
import { setupInputFields, addConstraintRow } from './dom/domElements.js';
import { manageDownloadButtonVisibility, clearOutputs, displaySolution, displayMessage } from './dom/domDisplay.js';
import { getElementValueAsInt } from './dom/formAccessors.js';

import { parseInput } from './parser.js';
import { generateInitialTableau, transformProblem } from './problemTransformer.js';
import { ProtocolLogger } from './protocolLogger.js';
import {
    extractSolution,
    findFeasibleSolution,
    findOptimalSolution,
    checkIfIntegerSolution,
    findRowForGomoryCut,
    calculateGomoryCutCoefficients,
    addGomoryCutToTableau
} from './simplexSolver.js';
import { EPSILON, MAX_GOMORY_ITERATIONS } from './config.js';

const numVarsInput = document.getElementById('numVars');
const setupVarsButton = document.getElementById('setupVarsButton');
const objCoeffsContainer = document.getElementById('objCoeffsContainer');
const objectiveTypeSelect = document.getElementById('objectiveType');
const constraintsContainer = document.getElementById('constraintsContainer');
const addConstraintButton = document.getElementById('addConstraintButton');
const solveButton = document.getElementById('solveButton');
const loadExample1Button = document.getElementById('loadExample1Button');
const loadExample2Button = document.getElementById('loadExample2Button');
const loadExample3Button = document.getElementById('loadExample3Button');
const loadVariant20Button = document.getElementById('loadVariant20Button');
const downloadProtocolButton = document.getElementById('downloadProtocolButton');

const protocolOutputDiv = document.getElementById('protocolOutput');
const finalResultDiv = document.getElementById('finalResult');
const solveIntegerCheckboxId = 'solveInteger';


initDOMReferences({ objCoeffsContainer, constraintsContainer });

function loadExample(exampleData) {
    numVarsInput.value = exampleData.numVars;
    setupInputFields(exampleData.numVars);
    objectiveTypeSelect.value = exampleData.objective.isMin ? 'min' : 'max';
    const objInputsDOM = objCoeffsContainer.querySelectorAll('input.coeff-input');
    exampleData.objective.coeffs.forEach((c, i) => { if (objInputsDOM[i]) objInputsDOM[i].value = c || '0'; });
    constraintsContainer.innerHTML = '';
    exampleData.constraints.forEach(c => addConstraintRow(exampleData.numVars, c));
    if (exampleData.solveInteger !== undefined) {
        document.getElementById(solveIntegerCheckboxId).checked = exampleData.solveInteger;
    } else {
        document.getElementById(solveIntegerCheckboxId).checked = false;
    }
    clearOutputs(protocolOutputDiv, finalResultDiv);
}

async function solve() {
    const logger = new ProtocolLogger('protocolOutput');
    clearOutputs(protocolOutputDiv, finalResultDiv);

    try {
        const problemData = parseInput(numVarsInput, objectiveTypeSelect, objCoeffsContainer, constraintsContainer, solveIntegerCheckboxId);
        let transformedData = transformProblem(problemData);
        let { tableau, rowVars, colVars } = generateInitialTableau(transformedData);

        logger.start(problemData, transformedData);

        if (!problemData.solveInteger) {
            logger.logInitialTableau(tableau, rowVars, colVars);
            const feasibilityResult = findFeasibleSolution(tableau, rowVars, colVars, logger);
            if (!feasibilityResult.feasible) {
                displayMessage('finalResult', logger.outputDiv.querySelector('p:last-of-type')?.textContent || 'Не вдалося знайти опорний розв\'язок.');
                if (protocolOutputDiv.innerHTML.trim() !== '') manageDownloadButtonVisibility(true);
                return;
            }
            tableau = feasibilityResult.tableau;
            rowVars = feasibilityResult.rowVars;
            colVars = feasibilityResult.colVars;
            const feasibleSolution = extractSolution(tableau,rowVars,colVars,problemData.numVars);
            logger.logFeasibleFound(feasibleSolution.x);

            const optimalityResult = findOptimalSolution(tableau, rowVars, colVars, logger, problemData.objective.isMin);
            if (optimalityResult.optimal) {
                const finalSolution = extractSolution(optimalityResult.tableau, optimalityResult.rowVars, optimalityResult.colVars, problemData.numVars);

                let optimalZ = -finalSolution.z;
                if (problemData.objective.isMin) {
                    optimalZ = -finalSolution.z;
                }
                if(Math.abs(optimalZ) < EPSILON) optimalZ = 0;


                logger.logOptimalFound(finalSolution.x, optimalZ, problemData.objective.isMin);
                displaySolution(finalSolution.x, optimalZ, problemData.objective.isMin, "Оптимальний розв'язок:", 'finalResult');
            } else if (optimalityResult.unbounded) {
                displayMessage('finalResult', logger.outputDiv.querySelector('p:last-of-type')?.textContent || 'Функція мети необмежена.');
            } else {
                displayMessage('finalResult', 'Не вдалося знайти оптимальний розв\'язок (можливо, перевищено ліміт ітерацій).');
            }
        } else {
            let gomoryIteration = 0;
            while (gomoryIteration < MAX_GOMORY_ITERATIONS) {
                gomoryIteration++;
                logger.logGomoryIterationHeader(gomoryIteration);

                if(gomoryIteration > 1) {
                    logger.logInitialTableau(tableau, rowVars, colVars, `Симплекс-таблиця для ітерації Гоморі ${gomoryIteration}:`);
                } else {
                    logger.logInitialTableau(tableau, rowVars, colVars);
                }

                const feasibilityResult = findFeasibleSolution(tableau, rowVars, colVars, logger);
                if (!feasibilityResult.feasible) {
                    displayMessage('finalResult', logger.outputDiv.querySelector('p:last-of-type')?.textContent || 'Не вдалося знайти опорний розв\'язок на ітерації Гоморі.');
                    if (protocolOutputDiv.innerHTML.trim() !== '') manageDownloadButtonVisibility(true);
                    return;
                }
                tableau = feasibilityResult.tableau;
                rowVars = feasibilityResult.rowVars;
                colVars = feasibilityResult.colVars;
                const feasibleSolution = extractSolution(tableau,rowVars,colVars,problemData.numVars);
                logger.logFeasibleFound(feasibleSolution.x);

                const optimalityResult = findOptimalSolution(tableau, rowVars, colVars, logger, problemData.objective.isMin);
                if (!optimalityResult.optimal) {
                    if (optimalityResult.unbounded) {
                        displayMessage('finalResult', 'Функція мети необмежена на поточній ітерації Гоморі.');
                    } else {
                        displayMessage('finalResult', 'Не вдалося знайти оптимальний розв\'язок на поточній ітерації Гоморі.');
                    }
                    if (protocolOutputDiv.innerHTML.trim() !== '') manageDownloadButtonVisibility(true);
                    return;
                }
                tableau = optimalityResult.tableau;
                rowVars = optimalityResult.rowVars;
                colVars = optimalityResult.colVars;

                const currentSolution = extractSolution(tableau, rowVars, colVars, problemData.numVars);
                let currentZ = -currentSolution.z;
                if (problemData.objective.isMin) {
                    currentZ = -currentSolution.z;
                }
                if(Math.abs(currentZ) < EPSILON) currentZ = 0;
                logger.logOptimalFound(currentSolution.x, currentZ, problemData.objective.isMin);


                logger.logIntegerCheck(currentSolution.x, checkIfIntegerSolution(currentSolution.x, EPSILON));
                if (checkIfIntegerSolution(currentSolution.x, EPSILON)) {
                    displaySolution(currentSolution.x, currentZ, problemData.objective.isMin, "Оптимальний цілочисловий розв'язок:", 'finalResult');
                    if (protocolOutputDiv.innerHTML.trim() !== '') manageDownloadButtonVisibility(true);
                    return;
                }

                const constColIdx = colVars.indexOf("1");
                const cutInfo = findRowForGomoryCut(tableau, rowVars, constColIdx, problemData.numVars, EPSILON);

                if (cutInfo.rowIndex === -1) {
                    displayMessage('finalResult', 'Не вдалося знайти рядок для відсічення Гоморі (всі базисні змінні цілі або дробові частини близькі до нуля). Можливо, рішення вже цілочислове з урахуванням точності.', false);
                    if (protocolOutputDiv.innerHTML.trim() !== '') manageDownloadButtonVisibility(true);
                    return;
                }
                const sourceRowVarName = rowVars[cutInfo.rowIndex];
                logger.logRowForCutSelection(sourceRowVarName, cutInfo.maxFractionalPart);

                const tableauRowForCutCoeffs = tableau[cutInfo.rowIndex];
                const fractionalCoefficientsAndConst = calculateGomoryCutCoefficients(tableauRowForCutCoeffs, colVars, EPSILON);
                logger.logGomoryCutCoefficients(tableauRowForCutCoeffs, colVars, `s${gomoryIteration}_from_${sourceRowVarName.replace(/^-/, '')}`);


                const newSlackVarName = `s${gomoryIteration}`;
                const updatedTableData = addGomoryCutToTableau(tableau, rowVars, colVars, fractionalCoefficientsAndConst, newSlackVarName);
                tableau = updatedTableData.tableau;
                rowVars = updatedTableData.rowVars;
                colVars = updatedTableData.colVars;
                logger.addParagraph(`Додано відсічення ${newSlackVarName}.`);

            }

            if (gomoryIteration >= MAX_GOMORY_ITERATIONS) {
                logger.logGomoryLimitReached();
                displayMessage('finalResult', 'Перевищено ліміт ітерацій Гоморі. Цілочисловий розв\'язок не знайдено.');
            }
        }

    } catch (error) {
        console.error("Error during solving:", error);
        displayMessage('finalResult', `Помилка: ${error.message}`);
    } finally {
        if (protocolOutputDiv.innerHTML.trim() !== '') {
            manageDownloadButtonVisibility(true);
        }
    }
}


setupVarsButton.addEventListener('click', () => {
    try {
        const numVars = getElementValueAsInt(numVarsInput);
        if (numVars > 0) {
            setupInputFields(numVars);
        } else {
            alert("Кількість змінних має бути більше 0.");
        }
    } catch (error) {
        alert(`Помилка: ${error.message}`);
    }
});

addConstraintButton.addEventListener('click', () => {
    try {
        const numVars = getElementValueAsInt(numVarsInput);
        if (numVars > 0) {
            addConstraintRow(numVars);
        } else {
            alert("Спочатку налаштуйте коректну кількість змінних.");
        }
    } catch (error) {
        alert(`Помилка: ${error.message}`);
    }
});

solveButton.addEventListener('click', solve);

downloadProtocolButton.addEventListener('click', () => {
    const protocolText = protocolOutputDiv.innerText || protocolOutputDiv.textContent;
    if (!protocolText.trim()) {
        alert("Протокол порожній.");
        return;
    }
    const blob = new Blob([protocolText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'protocol.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
});

loadExample1Button.addEventListener('click', () => {
    loadExample({
        numVars: 2,
        objective: { coeffs: [3, 5], isMin: false },
        constraints: [
            { coeffs: [1, 0], type: '<=', b: 4 },
            { coeffs: [0, 2], type: '<=', b: 12 },
            { coeffs: [3, 2], type: '<=', b: 18 }
        ],
        solveInteger: false
    });
});

loadExample2Button.addEventListener('click', () => {
    loadExample({
        numVars: 2,
        objective: { coeffs: [7, 9], isMin: false },
        constraints: [
            { coeffs: [-1, 3], type: '<=', b: 6 },
            { coeffs: [7, 1], type: '<=', b: 35 }
        ],
        solveInteger: true
    });
});

loadExample3Button.addEventListener('click', () => {
    loadExample({
        numVars: 3,
        objective: { coeffs: [4, 5, 1], isMin: false },
        constraints: [
            { coeffs: [3, 2, 0], type: '<=', b: 10 },
            { coeffs: [1, 4, 0], type: '<=', b: 11 },
            { coeffs: [3, 3, 1], type: '<=', b: 13 }
        ],
        solveInteger: true
    });
});

loadVariant20Button.addEventListener('click', () => {
    loadExample({
        numVars: 4,
        objective: { coeffs: [8,12,10,14], isMin: false },
        constraints: [
            { coeffs: [2,3,2,4], type: '<=', b: 20 },
            { coeffs: [3,2,3,2], type: '<=', b: 18 },
            { coeffs: [4,3,2,1], type: '<=', b: 16 }
        ],
        solveInteger: false
    });
});


document.addEventListener('DOMContentLoaded', () => {
    try {
        const initialVars = getElementValueAsInt(numVarsInput);
        if (initialVars > 0) {
            setupInputFields(initialVars);
        } else {
            numVarsInput.value = 2;
            setupInputFields(2);
        }
    } catch (error) {
        console.warn("Initial setup failed, defaulting.", error);
        numVarsInput.value = 2;
        setupInputFields(2);
    }
    loadVariant20Button.click();
    document.getElementById(solveIntegerCheckboxId).checked = false;
    manageDownloadButtonVisibility(false);
});