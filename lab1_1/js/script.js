import {calculateInverse, calculateRank, solveSystem} from './matrixOperations.js';

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
            // Variant 20: A = [ [-1, 3, -2], [3, -1, 3], [1, 2, -3] ]
            const defaultA = [
                [-1, 3, -2],
                [3,  -1, 3],
                [1, 2, -3]
            ];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    document.getElementById(`a_${i}_${j}`).value = defaultA[i][j];
                }
            }
            // For system solving, set B from variant 20 = [3, 4, 2]
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

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                document.getElementById(`a_${i}_${j}`).value = Math.floor(Math.random() * 20) - 10;
            }
        }

        if (operation === 'solve') {
            for (let i = 0; i < rows; i++) {
                document.getElementById(`b_${i}`).value = Math.floor(Math.random() * 20) - 10;
            }
        }
    }

    document.getElementById('generateMatrix').addEventListener('click', generateMatrixInputs);
    document.getElementById('generateRandomValues').addEventListener('click', generateRandomValues);
    document.getElementById('calculate').addEventListener('click', calculate);
    document.getElementById('operation').addEventListener('change', generateMatrixInputs);

    generateMatrixInputs();

});
