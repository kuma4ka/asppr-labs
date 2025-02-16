document.addEventListener("DOMContentLoaded", () => {
    initMatrices();
});

const defaultMatrixA = [
    [-1, 3, -2],
    [3, -1, 3],
    [1, 2, -3]
];

const defaultMatrixB = [
    [3],
    [4],
    [2]
];

function initMatrices() {
    renderMatrix("matrixA", defaultMatrixA);
    renderMatrix("matrixB", defaultMatrixB);
}

function renderMatrix(elementId, matrix) {
    const table = document.getElementById(elementId);
    table.innerHTML = "";

    matrix.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");
        row.forEach((cell, colIndex) => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.value = cell;
            input.dataset.row = rowIndex;
            input.dataset.col = colIndex;
            input.addEventListener("input", updateMatrix);
            td.appendChild(input);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function updateMatrix(event) {
    const input = event.target;
    const row = parseInt(input.dataset.row);
    const col = parseInt(input.dataset.col);
    const newValue = parseFloat(input.value);

    if (!isNaN(newValue)) {
        if (input.closest("#matrixA")) {
            defaultMatrixA[row][col] = newValue;
        } else {
            defaultMatrixB[row][col] = newValue;
        }
    }
}

function displayOutput(result) {
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = "";

    if (Array.isArray(result)) {
        const table = document.createElement("table");
        table.classList.add("matrix-output");

        result.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(cell => {
                const td = document.createElement("td");
                td.textContent = cell.toFixed(4);
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        outputElement.appendChild(table);
    } else {
        outputElement.innerHTML = `<p>${result}</p>`;
    }
}

function calculateInverse() {
    try {
        const matrixA = math.matrix(defaultMatrixA);
        const inverseA = math.inv(matrixA);
        displayOutput(inverseA._data);
    } catch (error) {
        displayOutput(`Помилка: ${error.message}`);
    }
}

function calculateRank() {
    try {
        const matrixA = math.matrix(defaultMatrixA);
        const lup = math.lup(matrixA);
        const U = lup.U.toArray();
        let rank = U.filter(row => row.some(value => Math.abs(value) > 1e-10)).length;
        displayOutput(`Ранг матриці: <strong>${rank}</strong>`);
    } catch (error) {
        displayOutput(`Помилка: ${error.message}`);
        console.error(error);
    }
}

function solveByInverse() {
    try {
        const matrixA = math.matrix(defaultMatrixA);
        const matrixB = math.matrix(defaultMatrixB);
        const inverseA = math.inv(matrixA);
        const solution = math.multiply(inverseA, matrixB);
        displayOutput(solution._data);
    } catch (error) {
        displayOutput(`Помилка: ${error.message}`);
    }
}