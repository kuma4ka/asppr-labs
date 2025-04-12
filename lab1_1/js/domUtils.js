import { EPSILON } from './constants.js'; // Потрібен для display функцій

export const elements = {
    rowsAInput: document.getElementById('rowsA'),
    colsAInput: document.getElementById('colsA'),
    matrixAInputsContainer: document.getElementById('matrixA-input'),
    vectorBInputsContainer: document.getElementById('vectorB-input'),
    calcInverseBtn: document.getElementById('calcInverseBtn'),
    calcRankBtn: document.getElementById('calcRankBtn'),
    solveSLEBtn: document.getElementById('solveSLEBtn'),
    fillVariantBtn: document.getElementById('fillVariantBtn'),
    messageArea: document.getElementById('message-area'),
    inverseOutput: document.getElementById('inverse-output'),
    rankOutput: document.getElementById('rank-output'),
    solutionOutput: document.getElementById('solution-output'),
    protocolOutput: document.getElementById('protocol-output')
};

export function setMessage(msg, type = 'info') {
    if (elements.messageArea) {
        elements.messageArea.textContent = msg;
        elements.messageArea.className = `message ${type}`;
    }
}

export function generateMatrixInputs(rows, cols, containerElement, prefix) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    containerElement.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.step = 'any';
            input.id = `${prefix}_${i}_${j}`;
            input.placeholder = `${prefix}[${i}][${j}]`;
            input.value = 0;
            containerElement.appendChild(input);
        }
    }
}

export function generateVectorInputs(rows, containerElement, prefix) {
    if (!containerElement) return;
    containerElement.innerHTML = '';
    containerElement.style.gridTemplateColumns = 'auto';
    for (let i = 0; i < rows; i++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 'any';
        input.id = `${prefix}_${i}`;
        input.placeholder = `${prefix}[${i}]`;
        input.value = 0;
        containerElement.appendChild(input);
    }
}

export function readMatrix(rows, cols, prefix) {
    const matrix = []; // Use simple array init
    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < cols; j++) {
            const inputId = `${prefix}_${i}_${j}`;
            const input = document.getElementById(inputId);
            if (!input) {
                setMessage(`Помилка: Не знайдено поле ${inputId}`, 'error');
                return null;
            }
            const value = parseFloat(input.value);
            if (isNaN(value)) {
                setMessage(`Помилка: Нечислове значення у ${prefix}[${i}][${j}] ('${input.value || ''}')`, 'error');
                return null;
            }
            row.push(value);
        }
        matrix.push(row);
    }
    return matrix;
}

export function readVector(rows, prefix) {
    const vector = [];
    for (let i = 0; i < rows; i++) {
        const inputId = `${prefix}_${i}`;
        const input = document.getElementById(inputId);
        if (!input) {
            setMessage(`Помилка: Не знайдено поле ${inputId}`, 'error');
            return null;
        }
        const value = parseFloat(input.value);
        if (isNaN(value)) {
            setMessage(`Помилка: Нечислове значення у ${prefix}[${i}] ('${input.value || ''}')`, 'error');
            return null;
        }
        vector.push(value);
    }
    return vector;
}

export function displayMatrix(matrix, element, label = "", precision = 2) {
    if (!element) return;
    element.style.gridTemplateColumns = '1fr';
    element.innerHTML = '';

    const labelElement = document.createElement('div');
    labelElement.style.fontWeight = 'bold';
    labelElement.style.marginBottom = '5px';
    labelElement.style.gridColumn = '1 / -1';

    if (!matrix) {
        labelElement.textContent = label ? `${label}: Немає даних` : 'Немає даних';
        element.appendChild(labelElement);
        return;
    }
    if (matrix.length === 0 || !Array.isArray(matrix[0]) || matrix[0].length === 0) {
        labelElement.textContent = label ? `${label}: Порожня матриця` : 'Порожня матриця';
        element.appendChild(labelElement);
        return;
    }

    if (label) {
        labelElement.textContent = label;
        element.appendChild(labelElement);
    }

    const rows = matrix.length;
    const cols = matrix[0].length;
    element.style.gridTemplateColumns = `repeat(${cols}, auto)`;

    let maxWidth = 0;
    try {
        matrix.forEach(row => {
            if (!Array.isArray(row)) throw new Error("Невірний формат рядка матриці");
            row.forEach(x => {
                const len = (typeof x === 'number' && Math.abs(x) < EPSILON ? 0 : x).toFixed(precision).length;
                if (len > maxWidth) maxWidth = len;
            });
        });
        maxWidth = Math.max(6, maxWidth);
    } catch (e) {
        console.error("Помилка визначення ширини для displayMatrix: ", e);
        maxWidth = 6; // Fallback width
    }


    for (let r = 0; r < rows; r++) {
        if (!Array.isArray(matrix[r])) continue; // Skip invalid rows
        for (let c = 0; c < cols; c++) {
            if (c >= matrix[r].length) continue; // Skip if column index is out of bounds for the row

            const cell = document.createElement('span');
            const value = matrix[r][c];
            cell.textContent = (typeof value === 'number' && Math.abs(value) < EPSILON ? 0 : value).toFixed(precision).padStart(maxWidth + 1);
            cell.style.display = 'inline-block';
            cell.style.textAlign = 'right';
            cell.style.minWidth = `${maxWidth * 8}px`;
            cell.style.padding = '2px 5px';
            cell.style.border = '1px solid #eee';
            cell.style.margin = '1px';
            element.appendChild(cell);
        }
    }
}

export function displayVector(vector, element, label = "", precision = 2) {
    if (!element) return;
    element.innerHTML = '';
    element.style.gridTemplateColumns = 'auto';

    const labelElement = document.createElement('div');
    labelElement.style.fontWeight = 'bold';
    labelElement.style.marginBottom = '5px';

    if (!vector || !Array.isArray(vector)) {
        labelElement.textContent = label ? `${label}: Немає даних` : 'Немає даних';
        element.appendChild(labelElement);
        return;
    }
    if (vector.length === 0) {
        labelElement.textContent = label ? `${label}: Порожній вектор` : 'Порожній вектор';
        element.appendChild(labelElement);
        return;
    }

    if (label) {
        labelElement.textContent = label;
        element.appendChild(labelElement);
    }

    let maxWidth = 0;
    try {
        vector.forEach(x => {
            const len = (typeof x === 'number' && Math.abs(x) < EPSILON ? 0 : x).toFixed(precision).length;
            if (len > maxWidth) maxWidth = len;
        });
        maxWidth = Math.max(6, maxWidth);
    } catch(e) {
        console.error("Помилка визначення ширини для displayVector: ", e);
        maxWidth = 6;
    }


    vector.forEach(val => {
        const cell = document.createElement('span');
        const value = val;
        cell.textContent = (typeof value === 'number' && Math.abs(value) < EPSILON ? 0 : value).toFixed(precision).padStart(maxWidth + 1);
        cell.style.display = 'block';
        cell.style.textAlign = 'right';
        cell.style.minWidth = `${maxWidth * 8}px`;
        cell.style.padding = '2px 5px';
        cell.style.border = '1px solid #eee';
        cell.style.margin = '1px';
        element.appendChild(cell);
    });
}


export function clearResultsAndProtocol() {
    if (elements.inverseOutput) {
        elements.inverseOutput.innerHTML = '';
        elements.inverseOutput.style.gridTemplateColumns = '1fr';
    }
    if (elements.rankOutput) elements.rankOutput.innerHTML = '';
    if (elements.solutionOutput) {
        elements.solutionOutput.innerHTML = '';
        elements.solutionOutput.style.gridTemplateColumns = '1fr';
    }
    if (elements.protocolOutput) elements.protocolOutput.textContent = '';
}

export function updateInputs() {
    let rows = parseInt(elements.rowsAInput?.value || '3');
    let cols = parseInt(elements.colsAInput?.value || '3');

    rows = Math.max(1, isNaN(rows) ? 3 : rows);
    cols = Math.max(1, isNaN(cols) ? 3 : cols);
    if (elements.rowsAInput) elements.rowsAInput.value = rows;
    if (elements.colsAInput) elements.colsAInput.value = cols;

    generateMatrixInputs(rows, cols, elements.matrixAInputsContainer, 'A');
    generateVectorInputs(rows, elements.vectorBInputsContainer, 'B');

    clearResultsAndProtocol();
    setMessage("Введіть значення або використайте кнопку 'Заповнити за варіантом'.", "info");
}