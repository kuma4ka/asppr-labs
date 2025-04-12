export class MatrixUtils {
    static createMatrix(rows, cols, value = 0) {
        return Array.from({ length: rows }, () => Array(cols).fill(value));
    }

    static createIdentity(n) {
        const matrix = MatrixUtils.createMatrix(n, n, 0);
        for (let i = 0; i < n; i++) {
            matrix[i][i] = 1;
        }
        return matrix;
    }

    static cloneMatrix(matrix) {
        if (!matrix) return null;
        try {
            return matrix.map(row => Array.isArray(row) ? [...row] : row);
        } catch (e) {
            console.error("Помилка при клонуванні матриці: ", e);
            return null;
        }
    }

    static augmentMatrix(A, B) {
        const A_copy = MatrixUtils.cloneMatrix(A);
        if (!A_copy) return null;

        if (!B || B.length === 0) {
            return A_copy;
        }

        try {
            if (B[0]?.length === undefined) { // B is a vector
                if (A_copy.length !== B.length) {
                    console.error(`Неможливо розширити: рядки A (${A_copy.length}) != довжина B (${B.length}).`);
                    return null;
                }
                return A_copy.map((row, i) => [...row, B[i]]);
            } else { // B is a matrix
                if (A_copy.length !== B.length) {
                    console.error(`Неможливо розширити: рядки A (${A_copy.length}) != рядки B (${B.length}).`);
                    return null;
                }
                return A_copy.map((row, i) => [...row, ...B[i]]);
            }
        } catch (e) {
            console.error("Помилка при розширенні матриці: ", e);
            return null;
        }
    }

    static extractSubMatrix(matrix, startRow, endRow, startCol, endCol) {
        if (!matrix) return null;
        try {
            return matrix.slice(startRow, endRow).map(row => Array.isArray(row) ? row.slice(startCol, endCol) : []);
        } catch (e) {
            console.error("Помилка при вилученні підматриці: ", e);
            return null;
        }
    }
}