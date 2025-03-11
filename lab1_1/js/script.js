document.addEventListener("DOMContentLoaded", function() {

    function generateMatrixInputs() {
        const operation = document.getElementById('operation').value;
        const rows = parseInt(document.getElementById('rows').value);
        const cols = parseInt(document.getElementById('cols').value);
        const useVariant20 = document.getElementById('useVariant20').checked;
        const matrixAContainer = document.getElementById('matrixA');
        matrixAContainer.innerHTML = '';
        let tableA = document.createElement('table');

        for (let i = 0; i < rows; i++) {
            let tr = document.createElement('tr');
            for (let j = 0; j < cols; j++) {
                let td = document.createElement('td');
                let input = document.createElement('input');
                input.type = 'number';
                input.className = 'matrix-input';
                input.id = `a_${i}_${j}`;
                input.value = "0";
                td.appendChild(input);
                tr.appendChild(td);
            }
            tableA.appendChild(tr);
        }
        matrixAContainer.appendChild(tableA);

        const vectorBSection = document.getElementById('vectorBSection');
        const vectorBContainer = document.getElementById('vectorB');
        if (operation === 'solve') {
            vectorBSection.style.display = 'block';
            vectorBContainer.innerHTML = '';
            let tableB = document.createElement('table');
            for (let i = 0; i < rows; i++) {
                let tr = document.createElement('tr');
                let td = document.createElement('td');
                let input = document.createElement('input');
                input.type = 'number';
                input.className = 'matrix-input';
                input.id = `b_${i}`;
                input.value = "0";
                td.appendChild(input);
                tr.appendChild(td);
                tableB.appendChild(tr);
            }
            vectorBContainer.appendChild(tableB);
        } else {
            vectorBSection.style.display = 'none';
        }

        if (useVariant20 && rows === 3 && cols === 3) {
            // Variant 20: A = [ [1, -3, 1], [3, 1, -2], [2, -3, 3] ]
            const defaultA = [
                [1, -3, 1],
                [3,  1, -2],
                [2, -3, 3]
            ];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    document.getElementById(`a_${i}_${j}`).value = defaultA[i][j];
                }
            }
            // For system solving, set B = [3, 4, 2]
            if (operation === 'solve') {
                const defaultB = [3, 4, 2];
                for (let i = 0; i < 3; i++) {
                    document.getElementById(`b_${i}`).value = defaultB[i];
                }
            }
        }
    }

    function getMatrixA() {
        const rows = parseInt(document.getElementById('rows').value);
        const cols = parseInt(document.getElementById('cols').value);
        let A = [];
        for (let i = 0; i < rows; i++) {
            let row = [];
            for (let j = 0; j < cols; j++) {
                row.push(parseFloat(document.getElementById(`a_${i}_${j}`).value));
            }
            A.push(row);
        }
        return A;
    }

    function getVectorB() {
        const rows = parseInt(document.getElementById('rows').value);
        let B = [];
        for (let i = 0; i < rows; i++) {
            B.push(parseFloat(document.getElementById(`b_${i}`).value));
        }
        return B;
    }

    function calculateInverse(A) {
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

    function calculateRank(A) {
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

    function solveSystem(A, B) {
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

    function calculate() {
        const operation = document.getElementById('operation').value;
        const A = getMatrixA();
        let resultText = "";
        let protocolText = "";
        if (operation === 'inverse') {
            if (A.length !== A[0].length) {
                resultText = "Матриця A має бути квадратною для обчислення оберненої матриці.";
            } else {
                let { inverse, protocol } = calculateInverse(A);
                protocolText = protocol;
                if (inverse === null) {
                    resultText = "Матриця є виродженою; оберненої матриці не існує.";
                } else {
                    resultText = "Обернена матриця (A⁻¹):\n";
                    inverse.forEach(row => {
                        resultText += row.map(x => x.toFixed(2)).join("\t") + "\n";
                    });
                }
            }
        } else if (operation === 'rank') {
            let { rank, protocol } = calculateRank(A);
            protocolText = protocol;
            resultText = "Ранг матриці A: " + rank;
        } else if (operation === 'solve') {
            const B = getVectorB();
            if (A.length !== B.length) {
                resultText = "Кількість рядків у матриці A має дорівнювати кількості елементів у векторі B.";
            } else {
                let { solution, protocol } = solveSystem(A, B);
                protocolText = protocol;
                if (solution === null) {
                    resultText = "Система не має єдиного розв'язку.";
                } else {
                    resultText = "Вектор розв'язку X:\n";
                    solution.forEach((x, i) => {
                        resultText += `X[${i + 1}] = ${x.toFixed(2)}\n`;
                    });
                }
            }
        }
        document.getElementById('resultOutput').textContent = resultText;
        document.getElementById('protocolOutput').textContent = protocolText;
    }

    function generateRandomValues() {
        const operation = document.getElementById('operation').value;
        const rows = parseInt(document.getElementById('rows').value);
        const cols = parseInt(document.getElementById('cols').value);

        // Generate random values for matrix A
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const randomValue = Math.floor(Math.random() * 20) - 10; // Random values between -10 and 10
                document.getElementById(`a_${i}_${j}`).value = randomValue;
            }
        }

        // Generate random values for vector B if in solve mode
        if (operation === 'solve') {
            for (let i = 0; i < rows; i++) {
                const randomValue = Math.floor(Math.random() * 20) - 10;
                document.getElementById(`b_${i}`).value = randomValue;
            }
        }
    }

    document.getElementById('generateMatrix').addEventListener('click', generateMatrixInputs);
    document.getElementById('generateRandomValues').addEventListener('click', generateRandomValues);
    document.getElementById('calculate').addEventListener('click', calculate);
    document.getElementById('operation').addEventListener('change', generateMatrixInputs);

    generateMatrixInputs();

});
