import { MatrixUtils } from './matrixUtils.js';
import { EPSILON } from './constants.js';

function formatMatrix(matrix) {
    if (!matrix || matrix.length === 0) return "  (Порожня матриця)\n";
    let maxWidth = 0;
    try {
        matrix.forEach(row => {
            if (!Array.isArray(row)) throw new Error("Рядок матриці не є масивом");
            row.forEach(x => {
                const len = (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2) : String(x)).length;
                if (len > maxWidth) maxWidth = len;
            });
        });
        maxWidth = Math.max(6, maxWidth);

        return matrix.map(row => {
            if (!Array.isArray(row)) return "  (Некоректний рядок)";
            return "    " + row.map(x => (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2).padStart(maxWidth + 1) : String(x).padStart(maxWidth + 1))).join(" ");
        }).join("\n") + "\n";
    } catch (e) {
        console.error("Помилка форматування матриці: ", e);
        return "  (Помилка форматування)\n";
    }
}

function formatMatrixRow(row) {
    if (!row || !Array.isArray(row)) return "  (Порожній або некоректний рядок)";
    let maxWidth = 0;
    try {
        row.forEach(x => {
            const len = (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2) : String(x)).length;
            if (len > maxWidth) maxWidth = len;
        });
        maxWidth = Math.max(6, maxWidth);
        return "    " + row.map(x => (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2).padStart(maxWidth + 1) : String(x).padStart(maxWidth + 1))).join(" ");
    } catch (e) {
        console.error("Помилка форматування рядка матриці: ", e);
        return "  (Помилка форматування)";
    }
}

function formatVector(vector) {
    if (!vector || !Array.isArray(vector)) return "  (Порожній або некоректний вектор)\n";
    if (vector.length === 0) return "  (Порожній вектор)\n";
    let maxWidth = 0;
    try {
        vector.forEach(x => {
            const len = (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2) : String(x)).length;
            if (len > maxWidth) maxWidth = len;
        });
        maxWidth = Math.max(6, maxWidth);
        // Форматуємо горизонтально, як у прикладі
        return "    " + vector.map(x => (typeof x === 'number' && !isNaN(x) ? (Math.abs(x) < EPSILON ? 0 : x).toFixed(2).padStart(maxWidth + 1) : String(x).padStart(maxWidth + 1))).join(" ") + "\n";
    } catch (e) {
        console.error("Помилка форматування вектора: ", e);
        return "  (Помилка форматування)\n";
    }
}

export function generateProtocolHeader(type, A, B = null) {
    let protocol = "\nЗгенерований протокол обчислення:\n";
    const A_copy = MatrixUtils.cloneMatrix(A);
    let B_copy = null;

    if (B && Array.isArray(B) && B.length > 0) {
        if (Array.isArray(B[0])) { B_copy = MatrixUtils.cloneMatrix(B); }
        else { B_copy = [...B]; }
    }

    switch (type) {
        case "inverse":
            protocol += "  Знаходження оберненої матриці:\n";
            break;
        case "rank":
            protocol += "  Знаходження рангу матриці:\n";
            break;
        case "solve_direct":
            protocol += "  Знаходження розв’язків СЛАР (прямий метод Гауса-Жордана):\n";
            break;
        case "solve_inverse":
            protocol += "  Знаходження розв’язків СЛАР 1-м методом (за допомогою оберненої матриці):\n";
            protocol += "  Етап 1: Знаходження оберненої матриці:\n";
            break;
        default:
            protocol += "  Невідома операція:\n";
    }

    protocol += "\nВхідна матриця А:\n" + (A_copy ? formatMatrix(A_copy) : "  (Помилка завантаження матриці A)");

    if (type === 'solve_direct') {
        if (B_copy && !Array.isArray(B_copy[0])) {
            protocol += "\nВхідний вектор В:\n" + formatVector(B_copy);
        } else {
            protocol += "\nВхідний вектор В: Не надано або некоректний формат.\n";
        }
    }

    protocol += "\nПротокол обчислення:\n";
    return protocol;
}


export function generateStepProtocol(step, pivot, matrixState, stepType = "ЗЖВ") {
    const matrixState_copy = MatrixUtils.cloneMatrix(matrixState);
    if (!matrixState_copy) return "\nПомилка копіювання матриці на кроці протоколу.\n";

    let protocol = `\nКрок #${step + 1}\n`;
    protocol += `Розв’язувальний елемент: A[${step + 1}, ${step + 1}] = ${typeof pivot === 'number' ? pivot.toFixed(2) : 'N/A'}\n`;
    protocol += "Матриця після виконання ЗЖВ:\n";
    protocol += formatMatrix(matrixState_copy);
    return protocol;
}


export function generateRankStepProtocol(pivotRow, pivotCol, pivotValue, matrixState) {
    const matrixState_copy = MatrixUtils.cloneMatrix(matrixState);
    if (!matrixState_copy) return "\nПомилка копіювання матриці на кроці протоколу (ранг).\n";

    let protocol = `\nКрок (Ранг): Опорний елемент для стовпця ${pivotCol + 1} в рядку ${pivotRow + 1}.\n`;
    protocol += `Значення опорного елемента: ${typeof pivotValue === 'number' ? pivotValue.toFixed(2) : 'N/A'}\n`;
    protocol += `Матриця після елімінації нижче рядка ${pivotRow + 1}:\n`; // Скорочено
    protocol += formatMatrix(matrixState_copy);
    return protocol;
}

export function generateFinalMatrix(title, matrix) {
    if (!matrix) return `\n${title}: Не вдалося обчислити.\n`;
    const matrix_copy = MatrixUtils.cloneMatrix(matrix);
    if (!matrix_copy) return `\n${title}: Помилка копіювання фінальної матриці.\n`;
    let protocol = `\n${title}:\n`;
    protocol += formatMatrix(matrix_copy);
    return protocol;
}

export function generateFinalVector(title, vector) {
    if (!vector) return `\n${title}: Не вдалося обчислити.\n`;
    const vector_copy = Array.isArray(vector) ? [...vector] : null;
    if (!vector_copy) return `\n${title}: Помилка копіювання фінального вектора.\n`;
    let protocol = `\n${title}:\n`; // Залишаємо як є
    protocol += formatVector(vector_copy);
    return protocol;
}


export function generateSolutionCalculationProtocol(inverseMatrix, vectorB, solutionVector) {
    if (!inverseMatrix || !vectorB || !solutionVector || !Array.isArray(vectorB) || !Array.isArray(solutionVector)) {
        return "\nПомилка: Недостатньо даних для протоколу обчислення розв'язків.\n";
    }
    const n = vectorB.length;
    if (inverseMatrix.length !== n || !Array.isArray(inverseMatrix[0]) || inverseMatrix[0].length !== n || solutionVector.length !== n) {
        return "\nПомилка: Невідповідність розмірів для протоколу обчислення розв'язків.\n";
    }

    let protocol = "\n\nЕтап 2: Обчислення розв’язків X = A⁻¹ * B:\n";

    protocol += "\nВхідна матриця В:\n" + formatVector(vectorB);
    protocol += "Обчислення розв’язків:\n";

    try {
        for (let i = 0; i < n; i++) {
            protocol += `  X[${i + 1}] = `;
            let sumParts = [];
            for (let j = 0; j < n; j++) {
                const term = `${inverseMatrix[i][j].toFixed(2)} * ${vectorB[j].toFixed(2)}`;
                sumParts.push(term);
            }
            protocol += sumParts.join(" + ");
            protocol += ` = ${solutionVector[i].toFixed(2)}\n`;
        }
    } catch (e) {
        console.error("Помилка генерації протоколу обчислення розв'язків: ", e);
        protocol += "  (Помилка під час генерації деталей обчислення)\n";
    }

    return protocol;
}