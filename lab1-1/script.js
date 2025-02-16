document.addEventListener("DOMContentLoaded", () => {
    initMatrices();
    document.getElementById("downloadProtocolBtn").addEventListener("click", generateProtocol);

    const actionButtons = document.querySelectorAll(".buttons-container button:not(#downloadProtocolBtn)");
    actionButtons.forEach(button => {
        button.addEventListener("click", () => {
            const header = document.getElementById("header-output");
            header.style.display = "block";
            const outputElement = document.getElementById("output");
            outputElement.style.display = "block";
        });
    });
});

const defaultMatrixA = [
    [6, 2, 5],
    [-3, 4, -1],
    [1, 4, 3]
];

const defaultMatrixB = [
    [1],
    [6],
    [6]
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
        return inverseA;
    } catch (error) {
        displayOutput(`Error: ${error.message}`);
        return null;
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
        displayOutput(`Error: ${error.message}`);
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
        displayOutput(`Error: ${error.message}`);
    }
}

function generateProtocol() {
    let protocolText = "Протокол розв’язання системи лінійних рівнянь (метод оберненої матриці)\n\n";

    protocolText += "Вхідна матриця A:\n";
    protocolText += matrixToString(defaultMatrixA) + "\n\n";

    protocolText += "Протокол обчислень:\n\n";

    protocolText += "Крок #1\n";
    protocolText += "Розв’язувальний елемент: A[1,1] = " + defaultMatrixA[0][0].toFixed(2) + "\n";
    protocolText += "Матриця після виконання Гауссової елімінації:\n";
    let matrixStep1 = performGaussianEliminationStep(defaultMatrixA, 0);
    protocolText += matrixToString(matrixStep1) + "\n\n";

    protocolText += "Крок #2\n";
    protocolText += "Розв’язувальний елемент: A[2,2] = " + matrixStep1[1][1].toFixed(2) + "\n";
    protocolText += "Матриця після виконання Гауссової елімінації:\n";
    let matrixStep2 = performGaussianEliminationStep(matrixStep1, 1);
    protocolText += matrixToString(matrixStep2) + "\n\n";

    protocolText += "Крок #3\n";
    protocolText += "Розв’язувальний елемент: A[3,3] = " + matrixStep2[2][2].toFixed(2) + "\n";
    protocolText += "Матриця після виконання Гауссової елімінації:\n";
    let matrixStep3 = performGaussianEliminationStep(matrixStep2, 2);
    protocolText += matrixToString(matrixStep3) + "\n\n";

    protocolText += "Обернена матриця:\n";
    const inverseMatrix = calculateInverse();
    protocolText += matrixToString(inverseMatrix._data) + "\n\n";

    protocolText += "Вхідна матриця B:\n";
    protocolText += matrixToString(defaultMatrixB) + "\n\n";

    protocolText += "Розв’язання системи:\n";
    const solution = math.multiply(inverseMatrix, math.matrix(defaultMatrixB));
    protocolText += `X[1] = 1.00 * ${inverseMatrix._data[0][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[0][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[0][2].toFixed(2)} = ${solution._data[0][0].toFixed(2)}\n`;
    protocolText += `X[2] = 1.00 * ${inverseMatrix._data[1][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[1][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[1][2].toFixed(2)} = ${solution._data[1][0].toFixed(2)}\n`;
    protocolText += `X[3] = 1.00 * ${inverseMatrix._data[2][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[2][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[2][2].toFixed(2)} = ${solution._data[2][0].toFixed(2)}\n`;

    downloadProtocolFile(protocolText);
}

function matrixToString(matrix) {
    return matrix.map(row => row.map(cell => cell.toFixed(2)).join("  ")).join("\n");
}

function performGaussianEliminationStep(matrix, rowIndex) {
    let newMatrix = matrix.map(r => r.slice());
    let pivotValue = newMatrix[rowIndex][rowIndex];

    for (let i = rowIndex + 1; i < newMatrix.length; i++) {
        let factor = newMatrix[i][rowIndex] / pivotValue;
        for (let j = rowIndex; j < newMatrix[i].length; j++) {
            newMatrix[i][j] -= factor * newMatrix[rowIndex][j];
        }
    }
    return newMatrix;
}

function downloadProtocolFile(protocolText) {
    const blob = new Blob([protocolText], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "протокол_обчислень.txt";
    link.click();
}
