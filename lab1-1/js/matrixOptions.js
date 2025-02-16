export const defaultMatrixA = [
    [6, 2, 5],
    [-3, 4, -1],
    [1, 4, 3]
];

export const defaultMatrixB = [
    [1],
    [6],
    [6]
];

export function updateMatrix(event) {
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