import { getInputData } from './inputParser.js';
import {
    initializeProtocol,
    logProblemStatement,
    getProtocolTextForDownload,
    getProtocolHTML,
    logToProtocol
} from './protocolGenerator.js';
import { runFullSimplexAlgorithm } from './simplexLogic/simplexController.js';
import {
    clearOutputDisplays,
    displayCalculationProtocol,
    displayFinalSolution,
    addConstraintRowToDOM,
    getDOMElement,
    setInputValues,
    displayInitialTableauSummary,
    displayZeroRowSummary,
    displayBasicFeasibleSolutionSummary,
    displayOptimizationSummary,
    setupDownloadButton
} from './domUpdater.js';

function generateRandomProblemData() {
    const numVariables = Math.floor(Math.random() * 3) + 2;
    const numConstraints = Math.floor(Math.random() * 2) + 2;

    const objectiveCoeffs = [];
    let objectiveRaw = "";
    for (let i = 0; i < numVariables; i++) {
        const coeff = Math.floor(Math.random() * 20) - 10;
        objectiveCoeffs.push(coeff);
        if (coeff !== 0) {
            if (objectiveRaw.length > 0 && coeff > 0) {
                objectiveRaw += " + ";
            } else if (coeff < 0) {
                objectiveRaw += (objectiveRaw.length > 0 ? " " : "") + "- ";
            }
            objectiveRaw += `${Math.abs(coeff)}x${i + 1}`;
        }
    }
    if (objectiveRaw === "") objectiveRaw = "0x1";

    const objectiveType = Math.random() < 0.5 ? "minimize" : "maximize";

    const constraints = [];
    const constraintTypes = ["le", "ge", "eq"];
    for (let i = 0; i < numConstraints; i++) {
        const constraintCoeffs = [];
        let constraintRaw = "";
        for (let j = 0; j < numVariables; j++) {
            const coeff = Math.floor(Math.random() * 11) - 5;
            constraintCoeffs.push(coeff);
            if (coeff !== 0) {
                if (constraintRaw.length > 0 && coeff > 0) {
                    constraintRaw += " + ";
                } else if (coeff < 0) {
                    constraintRaw += (constraintRaw.length > 0 ? " " : "") + "- ";
                }
                constraintRaw += `${Math.abs(coeff)}x${j + 1}`;
            }
        }
        if (constraintRaw === "") constraintRaw = "0x1"; // Забезпечити хоча б одну змінну

        const type = constraintTypes[Math.floor(Math.random() * constraintTypes.length)];
        let rhs = Math.floor(Math.random() * 21);
        if (type === "ge" && Math.random() < 0.3) { // Іноді робимо RHS від'ємним для >= для тестування
            rhs = -Math.floor(Math.random() * 5) -1;
        }

        constraints.push({ raw: constraintRaw, type: type, rhs: rhs, coeffs: constraintCoeffs });
    }

    return {
        objective: {
            raw: objectiveRaw.trim().replace(/\+ -/g, '-').replace(/- -/g, '+'),
            type: objectiveType
        },
        constraints: constraints,
        numVariables: numVariables
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const addConstraintButton = getDOMElement('add-constraint');
    const constraintsArea = getDOMElement('constraints-area');
    const startSimplexButton = getDOMElement('start-simplex');
    const fillVariant20Button = getDOMElement('fill-variant-20');
    const fillRandomDataButton = getDOMElement('fill-random-data');

    setupDownloadButton(getProtocolTextForDownload);

    if (addConstraintButton) {
        addConstraintButton.addEventListener('click', () => {
            if (constraintsArea) addConstraintRowToDOM(constraintsArea);
        });
    }

    if (fillVariant20Button) {
        fillVariant20Button.addEventListener('click', () => {
            const variant20Data = {
                objective: {
                    raw: "3x1 - 1x3 + 1x5",
                    type: "minimize"
                },
                constraints: [
                    { raw: "-1x1 + 3x3 - 2x4 + 1x5", type: "eq", rhs: 3 },
                    { raw: "1x1 - 1x2 + 1x4 + 1x5", type: "le", rhs: 3 },
                    { raw: "1x1 + 3x2 - 1x3 - 1x4 + 1x5", type: "le", rhs: 2 }
                ],
                numVariables: 5
            };
            setInputValues(variant20Data);
        });
    }

    if (fillRandomDataButton) {
        fillRandomDataButton.addEventListener('click', () => {
            const randomData = generateRandomProblemData();
            setInputValues(randomData);
        });
    }

    if (startSimplexButton) {
        startSimplexButton.addEventListener('click', () => {
            clearOutputDisplays();
            initializeProtocol();

            const inputValidationResult = getInputData();
            if (!inputValidationResult.isValid) {
                alert("Помилка вхідних даних:\n" + inputValidationResult.errorMessages.join("\n"));
                const protocolDisplay = getDOMElement('calculation-protocol-display');
                if (protocolDisplay) {
                    protocolDisplay.innerHTML = `<pre style="color: red;">Помилка вхідних даних:\n${inputValidationResult.errorMessages.join("\n")}</pre>`;
                }
                return;
            }

            const inputData = {
                objective: inputValidationResult.objective,
                constraints: inputValidationResult.constraints,
                numVariables: inputValidationResult.numVariables
            };

            logProblemStatement(inputData);

            let result;
            try {
                result = runFullSimplexAlgorithm(inputData);
            } catch (e) {
                console.error("Сталася помилка під час виконання симплекс-методу:", e);
                logToProtocol(`\nКРИТИЧНА ПОМИЛКА під час обчислень: ${e.message}\n${e.stack || ''}`, 'text');
                displayCalculationProtocol(getProtocolHTML());
                alert("Під час обчислень сталася критична помилка. Перевірте консоль для деталей.");
                return;
            }

            if(result.initialTableauForSummary) {
                displayInitialTableauSummary(result.initialTableauForSummary);
            }

            if (result.zeroRowSummary) {
                displayZeroRowSummary(result.zeroRowSummary);
            } else {
                displayZeroRowSummary("Інформація про видалення 0-рядків не була згенерована окремо для резюме.\nДивіться детальний протокол.");
            }

            if (result.basicFeasibleSolutionSummary) {
                displayBasicFeasibleSolutionSummary(`X = (${result.basicFeasibleSolutionSummary})`);
            } else {
                const protocolHTMLContent = getProtocolHTML();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = protocolHTMLContent;
                const bfsLogElements = Array.from(tempDiv.querySelectorAll('pre, p')).filter(el => el.textContent.includes("Опорний розв'язок (після Фази I): X ="));
                if (bfsLogElements.length > 0) {
                    const bfsMatch = bfsLogElements[bfsLogElements.length-1].textContent.match(/X = \(([^)]+)\)/);
                    if (bfsMatch && bfsMatch[1]) {
                        displayBasicFeasibleSolutionSummary(`X = (${bfsMatch[1]})`);
                    } else {
                        displayBasicFeasibleSolutionSummary("Опорний розв'язок не був знайдений або не залогований для резюме.");
                    }
                } else {
                    displayBasicFeasibleSolutionSummary("Опорний розв'язок не був знайдений або не залогований для резюме.");
                }
            }

            if (result.optimizationSummary) {
                displayOptimizationSummary(result.optimizationSummary);
            } else {
                displayOptimizationSummary("Резюме кроків оптимізації не було згенеровано окремо.\nДивіться детальний протокол.");
            }

            displayFinalSolution(result.optimalSolution, result.optimalZ, inputData.objective.type);
            const finalProtocolHTML = getProtocolHTML();
            displayCalculationProtocol(finalProtocolHTML);

            console.log("Simplex process completed via main.js.");
        });
    }
});