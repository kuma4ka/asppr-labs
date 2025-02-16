import { calculateInverse, calculateRank, solveByInverse } from './matrixCalculations.js';
import { generateProtocol } from './protocolGenerator.js';
import { defaultMatrixA, defaultMatrixB } from './matrixOptions.js';

export function initializeButtons() {
    const buttons = {
        'inverse-btn': () => calculateInverse(defaultMatrixA),
        'rank-btn': () => calculateRank(defaultMatrixA),
        'solve-btn': () => solveByInverse(defaultMatrixA, defaultMatrixB),
        'downloadProtocolBtn': () => generateProtocol(defaultMatrixA, defaultMatrixB)
    };

    Object.entries(buttons).forEach(([id, handler]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    });

    const actionButtons = document.querySelectorAll(".buttons-container button:not(#downloadProtocolBtn)");
    actionButtons.forEach(button => {
        button.addEventListener("click", showOutputSection);
    });
}

function showOutputSection() {
    const header = document.getElementById("header-output");
    const outputElement = document.getElementById("output");
    header.style.display = "block";
    outputElement.style.display = "block";
}