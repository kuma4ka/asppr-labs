import { calculateInverse, calculateRank, solveSystem } from "./matrixOperations.js";

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("generateMatrix").addEventListener("click", generateMatrixInputs);
    document.getElementById("generateVariantMatrix").addEventListener("click", generateVariantMatrix);
    document.getElementById("calculate").addEventListener("click", calculate);
    document.getElementById("operation").addEventListener("change", generateMatrixInputs);
    generateMatrixInputs();
});

function generateMatrixInputs() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("cols").value);
    const operation = document.getElementById("operation").value;
    const matrixAContainer = document.getElementById("matrixA");
    matrixAContainer.innerHTML = "";

    let tableA = document.createElement("table");
    for (let i = 0; i < rows; i++) {
        let tr = document.createElement("tr");
        for (let j = 0; j < cols; j++) {
            let td = document.createElement("td");
            let input = document.createElement("input");
            input.type = "number";
            input.className = "matrix-input";
            input.id = `a_${i}_${j}`;
            input.value = "0";
            td.appendChild(input);
            tr.appendChild(td);
        }
        tableA.appendChild(tr);
    }
    matrixAContainer.appendChild(tableA);

    if (operation === "solve") {
        document.getElementById("vectorBSection").style.display = "block";
        const vectorBContainer = document.getElementById("vectorB");
        vectorBContainer.innerHTML = "";
        let tableB = document.createElement("table");
        for (let i = 0; i < rows; i++) {
            let tr = document.createElement("tr");
            let td = document.createElement("td");
            let input = document.createElement("input");
            input.type = "number";
            input.className = "matrix-input";
            input.id = `b_${i}`;
            input.value = "0";
            td.appendChild(input);
            tr.appendChild(td);
            tableB.appendChild(tr);
        }
        vectorBContainer.appendChild(tableB);
    } else {
        document.getElementById("vectorBSection").style.display = "none";
    }
}

function generateVariantMatrix() {
    const A_variant = [
        [-1, 3, -2],
        [3, -1, 3],
        [1, 2, -3]
    ];
    const B_variant = [3, 4, 2];

    document.getElementById("rows").value = 3;
    document.getElementById("cols").value = 3;
    generateMatrixInputs();

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            document.getElementById(`a_${i}_${j}`).value = A_variant[i][j];
        }
    }

    if (document.getElementById("operation").value === "solve") {
        document.getElementById("vectorBSection").style.display = "block";
        for (let i = 0; i < 3; i++) {
            document.getElementById(`b_${i}`).value = B_variant[i];
        }
    }
}

function getMatrixA() {
    const rows = parseInt(document.getElementById("rows").value);
    const cols = parseInt(document.getElementById("cols").value);
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
    const rows = parseInt(document.getElementById("rows").value);
    let B = [];
    for (let i = 0; i < rows; i++) {
        B.push(parseFloat(document.getElementById(`b_${i}`).value));
    }
    return B;
}

function calculate() {
    const operation = document.getElementById("operation").value;
    const A = getMatrixA();
    let resultText = "", protocolText = "";

    if (A.some(row => row.some(value => isNaN(value) || value === ""))) {
        resultText = "Будь ласка, заповніть всі поля матриці A.";
        document.getElementById("resultOutput").textContent = resultText;
        document.getElementById("protocolOutput").textContent = "";
        return;
    }

    let B = [];
    if (operation === "solve") {
        B = getVectorB();
        if (B.some(value => isNaN(value) || value === "")) {
            resultText = "Будь ласка, заповніть всі поля вектору B.";
            document.getElementById("resultOutput").textContent = resultText;
            document.getElementById("protocolOutput").textContent = "";
            return;
        }
    }

    if (operation === "inverse") {
        let { inverse, protocol, error } = calculateInverse(A);
        if (error) {
            resultText = error;
            protocolText = "";
        } else {
            protocolText = protocol;
            resultText = inverse ? "Обернена матриця:\n" + inverse.map(row => row.join("\t")).join("\n") : "Матриця є виродженою.";
        }
    } else if (operation === "rank") {
        let { rank, protocol, error } = calculateRank(A);
        if (error) {
            resultText = error;
            protocolText = "";
        } else {
            protocolText = protocol;
            resultText = `Ранг матриці: ${rank}`;
        }
    } else if (operation === "solve") {
        let { solution, protocol, error } = solveSystem(A, B);
        if (error) {
            resultText = error;
            protocolText = "";
        } else {
            protocolText = protocol;
            resultText = solution ? `Розв’язок X: ${solution.join(" ")}` : "Система не має єдиного розв’язку.";
        }
    }

    document.getElementById("resultOutput").textContent = resultText;
    document.getElementById("protocolOutput").textContent = protocolText;
}