export function calculateInverse(A) {
    const n = A.length;
    let aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = [];
        for (let j = 0; j < n; j++) {
            aug[i][j] = A[i][j];
        }
        for (let j = n; j < 2 * n; j++) {
            aug[i][j] = (j - n === i) ? 1 : 0;
        }
    }
    let protocol = "";
    for (let i = 0; i < n; i++) {
        let pivot = aug[i][i];
        if (Math.abs(pivot) < 1e-10) {
            let swapRow = i + 1;
            while (swapRow < n && Math.abs(aug[swapRow][i]) < 1e-10) swapRow++;
            if (swapRow < n) {
                let temp = aug[i];
                aug[i] = aug[swapRow];
                aug[swapRow] = temp;
                protocol += `Поміняли місцями рядок ${i + 1} з рядком ${swapRow + 1}\n`;
                pivot = aug[i][i];
            } else {
                protocol += "Матриця є виродженою, оберненої матриці не існує.\n";
                return { inverse: null, protocol: protocol };
            }
        }
        protocol += `Крок ${i + 1}: Опорний елемент A[${i + 1},${i + 1}] = ${pivot.toFixed(2)}\n`;
        for (let j = 0; j < 2 * n; j++) {
            aug[i][j] /= pivot;
        }
        protocol += `Рядок ${i + 1} після ділення: ${aug[i].map(x => x.toFixed(2)).join(" ")}\n`;
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            let factor = aug[k][i];
            for (let j = 0; j < 2 * n; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
            protocol += `Виключили елемент у рядку ${k + 1} використовуючи множник ${factor.toFixed(3)}\n`;
            protocol += `Рядок ${k + 1} стає: ${aug[k].map(x => x.toFixed(2)).join(" ")}\n`;
        }
    }
    let inv = [];
    for (let i = 0; i < n; i++) {
        inv[i] = aug[i].slice(n, 2 * n);
    }
    return { inverse: inv, protocol: protocol };
}

export function calculateRank(A) {
    const m = A.length;
    const n = A[0].length;
    let M = A.map(row => row.slice());
    let rank = 0;
    let protocol = "";
    let row = 0;
    for (let col = 0; col < n; col++) {
        let pivotRow = -1;
        for (let i = row; i < m; i++) {
            if (Math.abs(M[i][col]) > 1e-10) {
                pivotRow = i;
                break;
            }
        }
        if (pivotRow === -1) continue;
        if (pivotRow !== row) {
            let temp = M[row];
            M[row] = M[pivotRow];
            M[pivotRow] = temp;
            protocol += `Поміняли місцями рядок ${row + 1} з рядком ${pivotRow + 1}\n`;
        }
        let pivot = M[row][col];
        protocol += `Опорний елемент у рядку ${row + 1}, стовпці ${col + 1} = ${pivot.toFixed(2)}\n`;
        for (let j = col; j < n; j++) {
            M[row][j] /= pivot;
        }
        protocol += `Рядок ${row + 1} після масштабування: ${M[row].map(x => x.toFixed(2)).join(" ")}\n`;
        for (let i = row + 1; i < m; i++) {
            let factor = M[i][col];
            for (let j = col; j < n; j++) {
                M[i][j] -= factor * M[row][j];
            }
            protocol += `Виключили елемент у рядку ${i + 1} з множником ${factor.toFixed(3)}\n`;
            protocol += `Рядок ${i + 1} стає: ${M[i].map(x => x.toFixed(2)).join(" ")}\n`;
        }
        row++;
        rank++;
        if (row === m) break;
    }
    return { rank: rank, protocol: protocol };
}

export function solveSystem(A, B) {
    const n = A.length;
    let aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = A[i].slice();
        aug[i].push(B[i]);
    }
    let protocol = "";
    for (let i = 0; i < n; i++) {
        let pivot = aug[i][i];
        if (Math.abs(pivot) < 1e-10) {
            let swapRow = i + 1;
            while (swapRow < n && Math.abs(aug[swapRow][i]) < 1e-10) swapRow++;
            if (swapRow < n) {
                let temp = aug[i];
                aug[i] = aug[swapRow];
                aug[swapRow] = temp;
                protocol += `Поміняли місцями рядок ${i + 1} з рядком ${swapRow + 1}\n`;
                pivot = aug[i][i];
            } else {
                protocol += "Матриця є виродженою, єдиного розв'язку не існує.\n";
                return { solution: null, protocol: protocol };
            }
        }
        protocol += `Крок ${i + 1}: Опорний елемент A[${i + 1},${i + 1}] = ${pivot.toFixed(2)}\n`;
        for (let j = 0; j < n + 1; j++) {
            aug[i][j] /= pivot;
        }
        protocol += `Рядок ${i + 1} після масштабування: ${aug[i].map(x => x.toFixed(2)).join(" ")}\n`;
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            let factor = aug[k][i];
            for (let j = 0; j < n + 1; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
            protocol += `Виключили елемент у рядку ${k + 1} використовуючи множник ${factor.toFixed(3)}\n`;
            protocol += `Рядок ${k + 1} стає: ${aug[k].map(x => x.toFixed(2)).join(" ")}\n`;
        }
    }
    let solution = [];
    for (let i = 0; i < n; i++) {
        solution.push(aug[i][n]);
    }
    return { solution: solution, protocol: protocol };
} 