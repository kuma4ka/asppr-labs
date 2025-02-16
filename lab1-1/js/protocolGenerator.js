import { calculateInverse } from './matrixCalculations.js';

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

export function generateProtocol(matrixA, matrixB) {
    let protocolText = "Протокол розв’язання системи лінійних рівнянь (метод оберненої матриці)\n\n";

    protocolText += "Вхідна матриця A:\n";
    protocolText += matrixToString(matrixA) + "\n\n";

    protocolText += "Протокол обчислень:\n\n";

    protocolText += "Крок #1\n";
    protocolText += "Розв’язувальний елемент: A[1,1] = " + matrixA[0][0].toFixed(2) + "\n";
    protocolText += "Матриця після виконання Гауссової елімінації:\n";
    let matrixStep1 = performGaussianEliminationStep(matrixA, 0);
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
    const inverseMatrix = calculateInverse(matrixA);
    protocolText += matrixToString(inverseMatrix._data) + "\n\n";

    protocolText += "Вхідна матриця B:\n";
    protocolText += matrixToString(matrixB) + "\n\n";

    protocolText += "Розв’язання системи:\n";
    const solution = math.multiply(inverseMatrix, math.matrix(matrixB));
    protocolText += `X[1] = 1.00 * ${inverseMatrix._data[0][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[0][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[0][2].toFixed(2)} = ${solution._data[0][0].toFixed(2)}\n`;
    protocolText += `X[2] = 1.00 * ${inverseMatrix._data[1][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[1][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[1][2].toFixed(2)} = ${solution._data[1][0].toFixed(2)}\n`;
    protocolText += `X[3] = 1.00 * ${inverseMatrix._data[2][0].toFixed(2)} + 6.00 * ${inverseMatrix._data[2][1].toFixed(2)} + 6.00 * ${inverseMatrix._data[2][2].toFixed(2)} = ${solution._data[2][0].toFixed(2)}\n`;

    downloadProtocolFile(protocolText);
}