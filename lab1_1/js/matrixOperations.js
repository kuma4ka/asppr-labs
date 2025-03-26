import { generateProtocolHeader, generateStepProtocol, generateFinalMatrix, generateFinalVector } from "./protocolGenerator.js";

export function calculateInverse(A) {
    let n = A.length;
    let inv = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    );
    let protocol = generateProtocolHeader("inverse", A);

    for (let i = 0; i < n; i++) {
        let pivot = A[i][i];
        if (Math.abs(pivot) < 1e-10) {
            protocol += "Матриця вироджена!\n";
            return { inverse: null, protocol };
        }

        for (let j = 0; j < n; j++) {
            A[i][j] = parseFloat((A[i][j] / pivot).toFixed(3));
            inv[i][j] = parseFloat((inv[i][j] / pivot).toFixed(3));
        }
        protocol += generateStepProtocol(i, pivot, A, inv);

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                let factor = A[k][i];
                for (let j = 0; j < n; j++) {
                    A[k][j] = parseFloat((A[k][j] - factor * A[i][j]).toFixed(3));
                    inv[k][j] = parseFloat((inv[k][j] - factor * inv[i][j]).toFixed(3));
                }
                protocol += generateStepProtocol(k, factor, A, inv);
            }
        }
    }

    protocol += generateFinalMatrix("Обернена матриця:", inv);
    return { inverse: inv, protocol };
}

export function calculateRank(A) {
    let rank = 0;
    let protocol = generateProtocolHeader("rank", A);
    let m = A.length, n = A[0].length;

    for (let i = 0; i < Math.min(m, n); i++) {
        let pivot = parseFloat(A[i][i].toFixed(3));
        protocol += `Крок ${i + 1}: Опорний елемент = ${pivot}\n`;
        if (Math.abs(pivot) > 1e-10) rank++;
    }
    protocol += `Ранг матриці: ${rank}\n`;
    return { rank, protocol };
}

export function solveSystem(A, B) {
    let n = A.length;
    let aug = A.map((row, i) => [...row, B[i]]);
    let protocol = generateProtocolHeader("solve", A, B);

    for (let i = 0; i < n; i++) {
        let pivot = aug[i][i];
        if (Math.abs(pivot) < 1e-10) {
            protocol += "Система не має єдиного розв’язку!\n";
            return { solution: null, protocol };
        }

        for (let j = 0; j < n + 1; j++) {
            aug[i][j] = parseFloat((aug[i][j] / pivot).toFixed(3));
        }
        protocol += generateStepProtocol(i, pivot, aug);

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                let factor = aug[k][i];
                for (let j = 0; j < n + 1; j++) {
                    aug[k][j] = parseFloat((aug[k][j] - factor * aug[i][j]).toFixed(3));
                }
                protocol += generateStepProtocol(k, factor, aug);
            }
        }
    }

    let solution = aug.map(row => parseFloat(row[n].toFixed(3)));
    protocol += generateFinalVector("Розв’язок X:", solution);
    return { solution, protocol };
}
