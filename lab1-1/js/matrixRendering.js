import { updateMatrix } from './matrixOptions.js';

export function initMatrices(matrixA, matrixB) {
    renderMatrix("matrixA", matrixA);
    renderMatrix("matrixB", matrixB);
}

export function renderMatrix(elementId, matrix) {
    const table = document.getElementById(elementId);
    table.innerHTML = "";

    matrix.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");
        row.forEach((cell, colIndex) => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number";
            input.value = cell;
            input.dataset.row = rowIndex;
            input.dataset.col = colIndex;
            input.addEventListener("input", updateMatrix);
            td.appendChild(input);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

export function displayOutput(result) {
    const outputElement = document.getElementById("output");
    outputElement.innerHTML = "";

    if (Array.isArray(result)) {
        const table = document.createElement("table");
        table.classList.add("matrix-output");

        result.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(cell => {
                const td = document.createElement("td");
                td.textContent = cell.toFixed(4);
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        outputElement.appendChild(table);
    } else {
        outputElement.innerHTML = `<p>${result}</p>`;
    }
}