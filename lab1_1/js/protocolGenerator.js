export function generateProtocolHeader(type, A, B = null) {
    let protocol = "\nЗгенеруємо програмно протокол обчислень для ";
    if (type === "inverse") {
        protocol += "знаходження оберненої матриці:\n\nЗнаходження оберненої матриці:\n";
    } else if (type === "rank") {
        protocol += "знаходження рангу матриці:\n\nЗнаходження рангу матриці:\n";
    } else if (type === "solve") {
        protocol += "розв’язання системи лінійних рівнянь:\n\nЗнаходження розв'язків СЛАР 2-м методом:\n";
    }
    protocol += "\nВхідна матриця А:\n" + formatMatrix(A);
    if (B) {
        protocol += "\nВхідна матриця В:\n" + formatVector(B);
    }
    protocol += "\nПротокол обчислення:\n";
    return protocol;
}

export function generateStepProtocol(step, pivot, A, inv = null, column = null) {
    let protocol = `\nКрок #${step + 1}`;
    if (column !== null) {
        protocol += `: Обробка стовпця ${column + 1}`;
    }
    protocol += `\nРозв'язувальний елемент: A[${step + 1}, ${step + 1}] = ${pivot.toFixed(2)}\n`;
    protocol += "Рядок " + (step + 1) + " після нормалізації:\n";
    protocol += formatMatrixRow(A[step]) + "\n";
    protocol += "Матриця після виконання ЗЖВ:\n";
    protocol += formatMatrix(A);
    if (inv) {
        protocol += "Допоміжна матриця:\n";
        protocol += formatMatrix(inv);
    }
    return protocol;
}

export function generateFinalMatrix(title, matrix) {
    let protocol = `\n${title}:\n`;
    protocol += formatMatrix(matrix);
    return protocol;
}

export function generateFinalVector(title, vector) {
    let protocol = `\n${title}:\n`;
    protocol += formatVector(vector);
    return protocol;
}

function formatMatrix(matrix) {
    return matrix.map(row => "    " + row.map(x => x.toFixed(2).padStart(6)).join(" ")).join("\n") + "\n";
}

function formatMatrixRow(row) {
    return "    " + row.map(x => x.toFixed(2).padStart(6)).join(" ");
}

function formatVector(vector) {
    return "    " + vector.map(x => x.toFixed(2).padStart(6)).join(" ") + "\n";
}
