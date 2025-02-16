import { displayOutput } from './matrixRendering.js';

export function calculateInverse(matrixA) {
    try {
        const matrix = math.matrix(matrixA);
        const inverseA = math.inv(matrix);
        displayOutput(inverseA._data);
        return inverseA;
    } catch (error) {
        displayOutput(`Error: ${error.message}`);
        return null;
    }
}

export function calculateRank(matrixA) {
    try {
        const matrix = math.matrix(matrixA);
        const lup = math.lup(matrix);
        const U = lup.U.toArray();
        let rank = U.filter(row => row.some(value => Math.abs(value) > 1e-10)).length;
        displayOutput(`Ранг матриці: <strong>${rank}</strong>`);
    } catch (error) {
        displayOutput(`Error: ${error.message}`);
        console.error(error);
    }
}

export function solveByInverse(matrixA, matrixB) {
    try {
        const mA = math.matrix(matrixA);
        const mB = math.matrix(matrixB);
        const inverseA = math.inv(mA);
        const solution = math.multiply(inverseA, mB);
        displayOutput(solution._data);
    } catch (error) {
        displayOutput(`Error: ${error.message}`);
    }
}