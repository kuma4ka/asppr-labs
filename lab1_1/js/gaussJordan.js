import { EPSILON } from './constants.js';
import { MatrixUtils } from './matrixUtils.js';
import {
    generateProtocolHeader,
    generateStepProtocol,
    generateRankStepProtocol,
    generateFinalMatrix,
    generateFinalVector,
    generateSolutionCalculationProtocol
} from './protocolFormatter.js';

export class GaussJordan {

    static findAndSwapPivotRow(matrix, startRow, col, numRows) {
        let pivotRow = startRow;
        let maxPivotValue = 0;
        if (startRow < numRows && col < matrix[startRow]?.length) {
            maxPivotValue = Math.abs(matrix[startRow][col]);
        } else {
            return false;
        }

        for (let i = startRow + 1; i < numRows; i++) {
            if (i < numRows && col < matrix[i]?.length) {
                const currentAbsValue = Math.abs(matrix[i][col]);
                if (currentAbsValue > maxPivotValue) {
                    maxPivotValue = currentAbsValue;
                    pivotRow = i;
                }
            }
        }

        if (maxPivotValue < EPSILON) {
            let foundBackup = false;
            for (let i = startRow + 1; i < numRows; i++) {
                if (i < numRows && col < matrix[i]?.length) {
                    if (Math.abs(matrix[i][col]) > EPSILON) {
                        pivotRow = i;
                        foundBackup = true;
                        break;
                    }
                }
            }
            if (!foundBackup && startRow < numRows && col < matrix[startRow]?.length && Math.abs(matrix[startRow][col]) > EPSILON) {
                pivotRow = startRow;
            } else if (!foundBackup) {
                return false;
            }
        }

        if (pivotRow !== startRow) {
            if (pivotRow < numRows && startRow < numRows) {
                [matrix[startRow], matrix[pivotRow]] = [matrix[pivotRow], matrix[startRow]];
                return true;
            } else {
                return false;
            }
        }

        if (startRow < numRows && col < matrix[startRow]?.length && Math.abs(matrix[startRow][col]) < EPSILON) {
            return false;
        } else if (!(startRow < numRows && col < matrix[startRow]?.length)) {
            return false;
        }
        return true;
    }

    static gaussJordanStep(matrix, pivotRow, pivotCol, numRows, numCols) {
        if (pivotRow >= numRows || pivotCol >= numCols || pivotRow < 0 || pivotCol < 0 || !matrix[pivotRow]) {
            return { success: false, pivotValue: NaN };
        }

        const pivotValue = matrix[pivotRow][pivotCol];

        if (Math.abs(pivotValue) < EPSILON) {
            return { success: false, pivotValue: pivotValue };
        }

        try {
            for (let j = pivotCol; j < numCols; j++) {
                if (j < matrix[pivotRow].length) {
                    matrix[pivotRow][j] /= pivotValue;
                }
            }
            if (pivotCol < matrix[pivotRow].length) {
                matrix[pivotRow][pivotCol] = 1;
            }

            for (let i = 0; i < numRows; i++) {
                if (i !== pivotRow) {
                    if (i < numRows && matrix[i] && pivotCol < matrix[i].length && matrix[pivotRow] && pivotCol < matrix[pivotRow].length) {
                        const factor = matrix[i][pivotCol];
                        if (Math.abs(factor) > EPSILON) {
                            for (let j = pivotCol; j < numCols; j++) {
                                if (j < matrix[i].length && j < matrix[pivotRow].length) {
                                    matrix[i][j] -= factor * matrix[pivotRow][j];
                                    if (Math.abs(matrix[i][j]) < EPSILON) matrix[i][j] = 0;
                                }
                            }
                            matrix[i][pivotCol] = 0;
                        }
                    }
                }
            }
            return { success: true, pivotValue: pivotValue };
        } catch (e) {
            console.error(`Помилка на кроці Гауса-Жордана для pivot [${pivotRow}, ${pivotCol}]: `, e);
            return { success: false, pivotValue: pivotValue };
        }
    }


    static findInverse(matrixA, setMessageCallback) {
        let protocol = '';
        const initialA = MatrixUtils.cloneMatrix(matrixA);
        if (!initialA) {
            setMessageCallback("Помилка: Не вдалося скопіювати вхідну матрицю.", "error");
            return { result: null, protocol: "Помилка копіювання матриці." };
        }
        protocol += generateProtocolHeader('inverse', initialA);

        const n = initialA.length;
        if (n === 0 || !initialA[0] || n !== initialA[0].length) {
            setMessageCallback("Помилка: Матриця для інверсії повинна бути квадратною та не порожньою.", "error");
            return { result: null, protocol: protocol + "\nПомилка: Матриця не квадратна або порожня." };
        }

        const identity = MatrixUtils.createIdentity(n);
        const augmented = MatrixUtils.augmentMatrix(initialA, identity);
        if (!augmented) {
            setMessageCallback("Помилка при створенні розширеної матриці.", "error");
            return { result: null, protocol: protocol + "\nПомилка розширення матриці." };
        }

        const numRows = n;
        const numCols = 2 * n;

        for (let i = 0; i < n; i++) {
            const pivotSearchSuccess = GaussJordan.findAndSwapPivotRow(augmented, i, i, numRows);
            const pivotValueForStep = (i < numRows && i < augmented[i]?.length) ? augmented[i][i] : NaN;

            if (!pivotSearchSuccess || Math.abs(pivotValueForStep) < EPSILON) {
                setMessageCallback("Матриця сингулярна (опорний елемент нульовий).", "error");
                protocol += `\nКрок #${i+1}: Не знайдено ненульовий опорний елемент у стовпці ${i+1}.\nМатриця сингулярна.`;
                return { result: null, protocol: protocol };
            }

            const stepResult = GaussJordan.gaussJordanStep(augmented, i, i, numRows, numCols);
            protocol += generateStepProtocol(i, stepResult.pivotValue, augmented);

            if (!stepResult.success) {
                setMessageCallback("Матриця сингулярна (проблема під час кроку обчислення).", "error");
                protocol += "\nПомилка під час виконання кроку Гауса-Жордана.";
                return { result: null, protocol: protocol };
            }
        }

        let isIdentity = true;
        for(let i=0; i<n; ++i){
            for(let j=0; j<n; ++j){
                const expected = (i===j) ? 1: 0;
                if(i >= augmented.length || !augmented[i] || j >= augmented[i].length || Math.abs(augmented[i][j] - expected) > EPSILON * 100) {
                    isIdentity = false;
                    break;
                }
            }
            if (!isIdentity) break;
        }
        if (!isIdentity) {
            protocol += "\nУвага: Ліва частина матриці не точно одинична після обчислень.\n";
        }

        const inverse = MatrixUtils.extractSubMatrix(augmented, 0, n, n, numCols);
        if (!inverse) {
            protocol += "\nПомилка вилучення результату оберненої матриці.";
            return { result: null, protocol: protocol };
        }

        protocol += generateFinalMatrix("Обернена матриця", inverse);
        return { result: inverse, protocol: protocol };
    }

    static calculateRank(matrixA, setMessageCallback) {
        let protocol = '';
        const initialA = MatrixUtils.cloneMatrix(matrixA);
        if (!initialA) {
            setMessageCallback("Помилка: Не вдалося скопіювати вхідну матрицю.", "error");
            return { result: -1, protocol: "Помилка копіювання матриці." };
        }
        protocol += generateProtocolHeader('rank', initialA);

        if (initialA.length === 0 || !initialA[0] || initialA[0].length === 0) {
            setMessageCallback("Матриця порожня, ранг 0.", "info");
            return { result: 0, protocol: protocol + "\nМатриця порожня, ранг 0." };
        }

        const matrix = initialA;
        const numRows = matrix.length;
        const numCols = matrix[0].length;
        let rank = 0;
        let pivotRow = 0;

        for (let j = 0; j < numCols && pivotRow < numRows; j++) {
            let maxRow = pivotRow;
            let maxPivotValue = 0;
            if (pivotRow < numRows && j < matrix[pivotRow]?.length) {
                maxPivotValue = Math.abs(matrix[pivotRow][j]);
            } else continue;

            for (let i = pivotRow + 1; i < numRows; i++) {
                if (i < numRows && j < matrix[i]?.length) {
                    const currentAbsValue = Math.abs(matrix[i][j]);
                    if (currentAbsValue > maxPivotValue) {
                        maxPivotValue = currentAbsValue;
                        maxRow = i;
                    }
                }
            }

            if (maxPivotValue < EPSILON) {
                protocol += `\nКрок (Ранг): Стовпець ${j + 1}: немає ненульових елементів нижче або на рядку ${pivotRow + 1}. Пропуск.\n`;
                continue;
            }

            if (pivotRow !== maxRow) {
                protocol += `\nКрок (Ранг): Стовпець ${j + 1}: Перестановка рядків ${pivotRow + 1} та ${maxRow + 1}.\n`;
                [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow], matrix[pivotRow]];
            }

            const pivotValue = matrix[pivotRow][j];

            if (Math.abs(pivotValue) < EPSILON) {
                protocol += `\nКрок (Ранг): Стовпець ${j + 1}: Опорний елемент став нульовим після перестановки? Пропуск.\n`;
                continue;
            }


            for (let i = pivotRow + 1; i < numRows; i++) {
                if (i < numRows && j < matrix[i]?.length) {
                    const factor = matrix[i][j] / pivotValue;
                    for (let k = j; k < numCols; k++) {
                        if (k < matrix[i]?.length && k < matrix[pivotRow]?.length) {
                            matrix[i][k] -= factor * matrix[pivotRow][k];
                            if (Math.abs(matrix[i][k]) < EPSILON) matrix[i][k] = 0;
                        }
                    }
                }
            }

            protocol += generateRankStepProtocol(pivotRow, j, pivotValue, matrix);
            pivotRow++;
            rank++;
        }

        setMessageCallback(`Ранг матриці: ${rank}`, "success");
        protocol += `\nОбчислення рангу завершено. Ранг = ${rank}\n`;
        protocol += generateFinalMatrix("Матриця у (приблизно) східчастій формі", matrix);
        return { result: rank, protocol: protocol };
    }

    static solveLinearSystem(matrixA, vectorB, setMessageCallback) {
        let protocol = '';
        const initialA = MatrixUtils.cloneMatrix(matrixA);
        const initialB = vectorB ? [...vectorB] : null;
        if (!initialA || !initialB) {
            setMessageCallback("Помилка: Не вдалося скопіювати вхідні дані.", "error");
            return { result: null, protocol: "Помилка копіювання вхідних даних." };
        }
        protocol += generateProtocolHeader('solve_direct', initialA, initialB);

        const n = initialA.length;
        if (n === 0 || !initialA[0] || n !== initialA[0].length) {
            setMessageCallback("Помилка: Матриця A повинна бути квадратною та не порожньою.", "error");
            return { result: null, protocol: protocol + "\nПомилка: Матриця A не квадратна або порожня." };
        }
        if (n !== initialB.length) {
            setMessageCallback(`Помилка: Невідповідність розмірів A(${n}x${n}) та B(${initialB.length}).`, "error");
            return { result: null, protocol: protocol + "\nПомилка: Невідповідність розмірів A та B." };
        }

        const augmented = MatrixUtils.augmentMatrix(initialA, initialB);
        if (!augmented) {
            setMessageCallback("Помилка при створенні розширеної матриці.", "error");
            return { result: null, protocol: protocol + "\nПомилка розширення матриці." };
        }
        const numRows = n;
        const numCols = n + 1;

        for (let i = 0; i < n; i++) {
            const pivotSearchSuccess = GaussJordan.findAndSwapPivotRow(augmented, i, i, numRows);
            const pivotValueForStep = (i < numRows && i < augmented[i]?.length) ? augmented[i][i] : NaN;

            if (!pivotSearchSuccess || Math.abs(pivotValueForStep) < EPSILON) {
                let isInconsistent = false;
                if (i < numRows && augmented[i] && numCols - 1 < augmented[i].length && Math.abs(augmented[i][numCols - 1]) > EPSILON) {
                    let rowSum = 0;
                    for(let k=0; k < n; ++k) {
                        if (k < augmented[i].length) rowSum += Math.abs(augmented[i][k]);
                    }
                    if (Math.abs(rowSum) < EPSILON) {
                        isInconsistent = true;
                    }
                }

                if (isInconsistent) {
                    setMessageCallback("Система несумісна (0 = C, C != 0).", "error");
                    protocol += `\nКрок #${i+1}: Система несумісна (рядок ${i+1}).`;
                } else {
                    setMessageCallback("Система сингулярна (немає унікального розв'язку).", "error");
                    protocol += `\nКрок #${i+1}: Не знайдено опорний елемент. Система сингулярна.`;
                }
                return { result: null, protocol: protocol };
            }

            const stepResult = GaussJordan.gaussJordanStep(augmented, i, i, numRows, numCols);
            protocol += generateStepProtocol(i, stepResult.pivotValue, augmented);

            if (!stepResult.success) {
                setMessageCallback("Система сингулярна (проблема під час кроку обчислення).", "error");
                protocol += "\nПомилка під час виконання кроку Гауса-Жордана.";
                return { result: null, protocol: protocol };
            }
        }

        for (let i = 0; i < n; i++) {
            if (!augmented[i]) continue;
            let rowSum = 0;
            for(let k=0; k < n; ++k) {
                if(k < augmented[i].length) {
                    rowSum += Math.abs(augmented[i][k]);
                }
            }
            if(Math.abs(rowSum) < EPSILON && (n < augmented[i].length && Math.abs(augmented[i][n]) > EPSILON)) {
                setMessageCallback("Система несумісна (виявлено після завершення).", "error");
                protocol += `\nПеревірка: Система несумісна (рядок ${i+1} має вигляд [0 ... 0 | C], C != 0).`;
                return { result: null, protocol: protocol };
            }
        }

        const solution = augmented.map(row => (row && row.length > n) ? row[n] : NaN);
        if (solution.some(isNaN)) {
            setMessageCallback("Помилка під час вилучення розв'язку.", "error");
            protocol += "\nПомилка вилучення результату.";
            return { result: null, protocol: protocol };
        }

        setMessageCallback("Систему лінійних рівнянь розв'язано (прямий метод).", "success");
        protocol += generateFinalVector("Результат (Вектор розв'язків x)", solution);
        return { result: solution, protocol: protocol };
    }

    static solveUsingInverse(matrixA, vectorB, setMessageCallback) {
        let combinedProtocol = '';
        const initialA = MatrixUtils.cloneMatrix(matrixA);
        const initialB = vectorB ? [...vectorB] : null;

        if (!initialA || !initialB) {
            setMessageCallback("Помилка: Не вдалося скопіювати вхідні дані.", "error");
            return { result: null, protocol: "Помилка копіювання вхідних даних." };
        }

        combinedProtocol += generateProtocolHeader('solve_inverse', initialA, initialB);

        let inverseFindMessage = { msg: '', type: 'info' };
        const inverseResult = GaussJordan.findInverse(matrixA, (msg, type) => {
            inverseFindMessage = { msg, type };
        });

        combinedProtocol += inverseResult.protocol;

        if (!inverseResult.result) {
            setMessageCallback(inverseFindMessage.msg || "Помилка: Не вдалося знайти обернену матрицю.", inverseFindMessage.type || "error");
            return { result: null, protocol: combinedProtocol };
        }
        const inverseMatrix = inverseResult.result;

        if (typeof MatrixUtils.multiplyMatrixVector !== 'function') {
            const errorMsg = "Помилка: Функція множення матриці на вектор не знайдена.";
            setMessageCallback(errorMsg, "error");
            combinedProtocol += "\n" + errorMsg;
            return { result: null, protocol: combinedProtocol };
        }
        const solutionVector = MatrixUtils.multiplyMatrixVector(inverseMatrix, vectorB);

        if (!solutionVector) {
            const errorMsg = "Помилка: Не вдалося виконати множення оберненої матриці на вектор B.";
            setMessageCallback(errorMsg, "error");
            combinedProtocol += "\n" + errorMsg;
            return { result: null, protocol: combinedProtocol };
        }

        combinedProtocol += generateSolutionCalculationProtocol(inverseMatrix, initialB, solutionVector);

        setMessageCallback("Систему лінійних рівнянь розв'язано методом оберненої матриці.", "success");

        return { result: solutionVector, protocol: combinedProtocol };
    }
}