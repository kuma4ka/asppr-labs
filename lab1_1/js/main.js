import { GaussJordan } from './gaussJordan.js';
import * as DOM from './domUtils.js';

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillWithRandomData() {
    try {
        const rows = parseInt(DOM.elements.rowsAInput?.value || '3');
        const cols = parseInt(DOM.elements.colsAInput?.value || '3');
        const minVal = -9;
        const maxVal = 9;

        if (isNaN(rows) || isNaN(cols) || rows < 1 || cols < 1) {
            DOM.setMessage("Будь ласка, встановіть коректні розміри матриці (мінімум 1x1).", "error");
            return;
        }

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const input = document.getElementById(`A_${i}_${j}`);
                if (input) {
                    input.value = getRandomInt(minVal, maxVal);
                }
            }
        }

        for (let i = 0; i < rows; i++) {
            const inputB = document.getElementById(`B_${i}`);
            if (inputB) {
                inputB.value = getRandomInt(minVal, maxVal);
            }
        }
        DOM.clearResultsAndProtocol();
        DOM.setMessage(`Матриці заповнено випадковими числами від ${minVal} до ${maxVal}.`, "success");

    } catch (error) {
        console.error("Помилка при заповненні випадковими даними:", error);
        DOM.setMessage("Сталася помилка при заповненні випадковими даними.", "error");
    }
}

function fillWithVariantData() {
    const variantA = [
        [-1, 3, -2],
        [3, -1, 3],
        [1, 2, -3]
    ];
    const variantB = [3, 4, 2];
    const rows = 3;
    const cols = 3;

    if (DOM.elements.rowsAInput) DOM.elements.rowsAInput.value = rows;
    if (DOM.elements.colsAInput) DOM.elements.colsAInput.value = cols;
    DOM.updateInputs();

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const input = document.getElementById(`A_${i}_${j}`);
            if (input) input.value = variantA[i][j];
        }
        const inputB = document.getElementById(`B_${i}`);
        if (inputB) inputB.value = variantB[i];
    }

    DOM.setMessage("Матриці заповнено даними за варіантом.", "success");
}

function handleInverse() {
    DOM.clearResultsAndProtocol();
    const rows = parseInt(DOM.elements.rowsAInput?.value || '0');
    const cols = parseInt(DOM.elements.colsAInput?.value || '0');
    const protocolElement = DOM.elements.protocolOutput;

    if (rows !== cols || rows < 1) {
        const msg = "Помилка: Матриця для інверсії повинна бути квадратною та не порожньою.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }
    const matrixA = DOM.readMatrix(rows, cols, 'A');
    if (!matrixA) {
        if (protocolElement) protocolElement.textContent = DOM.elements.messageArea?.textContent || 'Помилка зчитування матриці A.';
        return;
    }

    const resultData = GaussJordan.findInverse(matrixA, DOM.setMessage);
    if (protocolElement) protocolElement.textContent = resultData.protocol;
    if (resultData.result) {
        DOM.displayMatrix(resultData.result, DOM.elements.inverseOutput);
    } else {
        if (DOM.elements.inverseOutput) DOM.elements.inverseOutput.innerHTML = '';
    }
}

function handleRank() {
    DOM.clearResultsAndProtocol();
    const rows = parseInt(DOM.elements.rowsAInput?.value || '0');
    const cols = parseInt(DOM.elements.colsAInput?.value || '0');
    const protocolElement = DOM.elements.protocolOutput;

    if (rows < 1 || cols < 1) {
        const msg = "Помилка: Розміри матриці мають бути принаймні 1x1.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }
    const matrixA = DOM.readMatrix(rows, cols, 'A');
    if (!matrixA) {
        if (protocolElement) protocolElement.textContent = DOM.elements.messageArea?.textContent || 'Помилка зчитування матриці A.';
        return;
    }

    const resultData = GaussJordan.calculateRank(matrixA, DOM.setMessage);
    if (protocolElement) protocolElement.textContent = resultData.protocol;
    if (resultData.result !== -1 && DOM.elements.rankOutput) {
        DOM.elements.rankOutput.textContent = resultData.result;
    } else if (DOM.elements.rankOutput) {
        DOM.elements.rankOutput.textContent = '';
    }
}

function handleSolve() {
    DOM.clearResultsAndProtocol();
    const rows = parseInt(DOM.elements.rowsAInput?.value || '0');
    const cols = parseInt(DOM.elements.colsAInput?.value || '0');
    const protocolElement = DOM.elements.protocolOutput;

    if (rows !== cols || rows < 1) {
        const msg = "Помилка: Матриця A для СЛАР повинна бути квадратною та не порожньою.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }
    const matrixA = DOM.readMatrix(rows, cols, 'A');
    const vectorB = DOM.readVector(rows, 'B');
    if (!matrixA || !vectorB) {
        if (protocolElement) protocolElement.textContent = DOM.elements.messageArea?.textContent || 'Помилка зчитування матриці A або вектора B.';
        return;
    }

    const isBZero = vectorB.every(val => val === 0);
    if (isBZero) {
        const msg = "Помилка: Вектор B не може складатися тільки з нулів.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }


    const resultData = GaussJordan.solveLinearSystem(matrixA, vectorB, DOM.setMessage);
    if (protocolElement) protocolElement.textContent = resultData.protocol;
    if (resultData.result) {
        DOM.displayVector(resultData.result, DOM.elements.solutionOutput);
    } else {
        if (DOM.elements.solutionOutput) {
            DOM.elements.solutionOutput.innerHTML = '';
            DOM.elements.solutionOutput.style.gridTemplateColumns = '1fr';
        }
    }
}

function handleSolveInverse() {
    DOM.clearResultsAndProtocol();
    const rows = parseInt(DOM.elements.rowsAInput?.value || '0');
    const cols = parseInt(DOM.elements.colsAInput?.value || '0');
    const protocolElement = DOM.elements.protocolOutput;

    if (rows !== cols || rows < 1) {
        const msg = "Помилка: Матриця A повинна бути квадратною та не порожньою.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }
    const matrixA = DOM.readMatrix(rows, cols, 'A');
    const vectorB = DOM.readVector(rows, 'B');
    if (!matrixA || !vectorB) {
        if (protocolElement) protocolElement.textContent = DOM.elements.messageArea?.textContent || 'Помилка зчитування матриці A або вектора B.';
        return;
    }

    const isBZero = vectorB.every(val => val === 0);
    if (isBZero) {
        const msg = "Помилка: Вектор B не може складатися тільки з нулів.";
        DOM.setMessage(msg, "error");
        if (protocolElement) protocolElement.textContent = msg;
        return;
    }

    const resultData = GaussJordan.solveUsingInverse(matrixA, vectorB, DOM.setMessage);

    if (protocolElement) protocolElement.textContent = resultData.protocol;
    if (resultData.result) {
        DOM.displayVector(resultData.result, DOM.elements.solutionOutput);
    } else {
        if (DOM.elements.solutionOutput) {
            DOM.elements.solutionOutput.innerHTML = '';
            DOM.elements.solutionOutput.style.gridTemplateColumns = '1fr';
        }
    }
}

function initialize() {
    if (DOM.elements.rowsAInput) {
        DOM.elements.rowsAInput.addEventListener('change', DOM.updateInputs);
    }
    if (DOM.elements.colsAInput) {
        DOM.elements.colsAInput.addEventListener('change', DOM.updateInputs);
    }
    if (DOM.elements.fillVariantBtn) {
        DOM.elements.fillVariantBtn.addEventListener('click', fillWithVariantData);
    }
    const fillRandomBtn = document.getElementById('fillRandomBtn');
    if (fillRandomBtn) {
        fillRandomBtn.addEventListener('click', fillWithRandomData);
    } else {
        console.error("Не знайдено кнопку 'fillRandomBtn'");
    }

    if (DOM.elements.calcInverseBtn) {
        DOM.elements.calcInverseBtn.addEventListener('click', handleInverse);
    }
    if (DOM.elements.calcRankBtn) {
        DOM.elements.calcRankBtn.addEventListener('click', handleRank);
    }
    if (DOM.elements.solveSLEBtn) {
        DOM.elements.solveSLEBtn.addEventListener('click', handleSolve);
    }
    const solveInverseBtn = document.getElementById('solveInverseBtn');
    if (solveInverseBtn) {
        solveInverseBtn.addEventListener('click', handleSolveInverse);
    }

    DOM.updateInputs();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}