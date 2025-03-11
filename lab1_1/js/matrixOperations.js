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
    
    let protocol = "Знаходження оберненої матриці:\n\n";
    
    protocol += "Вхідна матриця А:\n";
    for (let i = 0; i < n; i++) {
        let row = "   ";
        for (let j = 0; j < n; j++) {
            row += A[i][j].toString().padStart(2) + " ";
        }
        protocol += row + "\n";
    }
    protocol += "\n";
    
    protocol += "Протокол обчислення:\n\n";
    protocol += "Розширена матриця [A|I]:\n";
    for (let i = 0; i < n; i++) {
        let row = "   ";
        for (let j = 0; j < 2 * n; j++) {
            row += aug[i][j].toString().padStart(2) + " ";
            if (j === n - 1) row += "| ";
        }
        protocol += row + "\n";
    }
    protocol += "\n";
    
    for (let i = 0; i < n; i++) {
        protocol += `Крок #${i + 1}\n`;
        
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
        
        protocol += `Розв'язувальний елемент: A[${i + 1}, ${i + 1}] = ${pivot.toFixed(2)}\n`;
        
        for (let j = 0; j < 2 * n; j++) {
            aug[i][j] /= pivot;
        }
        
        let normalizedRow = "   ";
        for (let j = 0; j < 2 * n; j++) {
            normalizedRow += aug[i][j].toFixed(2).padStart(6) + " ";
            if (j === n - 1) normalizedRow += "| ";
        }
        protocol += `Рядок ${i + 1} після нормалізації:\n${normalizedRow}\n`;
        
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            let factor = aug[k][i];
            for (let j = 0; j < 2 * n; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
        }
        
        protocol += "Матриця після виконання ЗЖВ:\n";
        for (let row = 0; row < n; row++) {
            let rowValues = "   ";
            for (let col = 0; col < 2 * n; col++) {
                rowValues += aug[row][col].toFixed(2).padStart(6) + " ";
                if (col === n - 1) rowValues += "| ";
            }
            protocol += rowValues + "\n";
        }
        protocol += "\n";
    }
    
    let inv = [];
    for (let i = 0; i < n; i++) {
        inv[i] = aug[i].slice(n, 2 * n);
    }
    
    protocol += "Обернена матриця A^(-1):\n";
    for (let i = 0; i < n; i++) {
        let row = "   ";
        for (let j = 0; j < n; j++) {
            row += inv[i][j].toFixed(2).padStart(6) + " ";
        }
        protocol += row + "\n";
    }
    
    return { inverse: inv, protocol: protocol };
}

export function calculateRank(A) {
    const m = A.length;
    const n = A[0].length;
    let M = A.map(row => row.slice());
    let rank = 0;
    
    let protocol = "Знаходження рангу матриці:\n\n";
    
    protocol += "Вхідна матриця А:\n";
    for (let i = 0; i < m; i++) {
        let row = "   ";
        for (let j = 0; j < n; j++) {
            row += A[i][j].toString().padStart(2) + " ";
        }
        protocol += row + "\n";
    }
    protocol += "\n";
    
    protocol += "Протокол обчислення:\n\n";
    
    let row = 0;
    for (let col = 0; col < n; col++) {
        if (row >= m) break;
        
        protocol += `Крок #${col + 1}: Обробка стовпця ${col + 1}\n`;
        
        if (col > 0) {
            protocol += "Поточна матриця:\n";
            for (let i = 0; i < m; i++) {
                let rowValues = "   ";
                for (let j = 0; j < n; j++) {
                    rowValues += M[i][j].toFixed(2).padStart(6) + " ";
                }
                protocol += rowValues + "\n";
            }
        }
        
        let pivotRow = -1;
        for (let i = row; i < m; i++) {
            if (Math.abs(M[i][col]) > 1e-10) {
                pivotRow = i;
                break;
            }
        }
        
        if (pivotRow === -1) {
            protocol += `   Стовпець ${col + 1} не містить ненульових елементів, переходимо до наступного стовпця\n\n`;
            continue;
        }
        
        if (pivotRow !== row) {
            let temp = M[row];
            M[row] = M[pivotRow];
            M[pivotRow] = temp;
            protocol += `Поміняли місцями рядок ${row + 1} з рядком ${pivotRow + 1}\n`;
        }
        
        let pivot = M[row][col];
        protocol += `Розв'язувальний елемент: A[${row + 1}, ${col + 1}] = ${pivot.toFixed(2)}\n`;
        
        for (let j = col; j < n; j++) {
            M[row][j] /= pivot;
        }
        
        let normalizedRow = "   ";
        for (let j = 0; j < n; j++) {
            normalizedRow += M[row][j].toFixed(2).padStart(6) + " ";
        }
        protocol += `Рядок ${row + 1} після нормалізації:\n${normalizedRow}\n`;
        
        for (let i = row + 1; i < m; i++) {
            let factor = M[i][col];
            if (Math.abs(factor) < 1e-10) continue;
            
            for (let j = col; j < n; j++) {
                M[i][j] -= factor * M[row][j];
            }
        }
        
        protocol += "Матриця після виконання ЗЖВ:\n";
        for (let i = 0; i < m; i++) {
            let rowValues = "   ";
            for (let j = 0; j < n; j++) {
                rowValues += M[i][j].toFixed(2).padStart(6) + " ";
            }
            protocol += rowValues + "\n";
        }
        protocol += "\n";
        
        row++;
        rank++;
    }
    
    protocol += `Ранг матриці: ${rank}\n`;
    
    return { rank: rank, protocol: protocol };
}

export function solveSystem(A, B) {
    const n = A.length;
    let aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = A[i].slice();
        aug[i].push(B[i]);
    }
    
    let protocol = "Знаходження розв'язків СЛАР 2-м методом:\n\n";
    
    protocol += "Вхідна матриця А:\n";
    for (let i = 0; i < n; i++) {
        let row = "   ";
        for (let j = 0; j < n; j++) {
            row += A[i][j].toString().padStart(2) + " ";
        }
        protocol += row + "\n";
    }
    protocol += "\n";
    
    protocol += "Вхідна матриця В:\n   ";
    for (let i = 0; i < n; i++) {
        protocol += B[i].toString().padStart(2) + " ";
    }
    protocol += "\n\n";
    
    protocol += "Протокол обчислення:\n\n";
    protocol += "Переписана система:\n";
    for (let i = 0; i < n; i++) {
        let row = "   ";
        for (let j = 0; j < n + 1; j++) {
            row += aug[i][j].toString().padStart(2) + " ";
        }
        protocol += row + "\n";
    }
    protocol += "\n";
    
    for (let i = 0; i < n; i++) {
        protocol += `Крок #${i + 1}\n`;
        
        if (i > 0) {
            protocol += "Поточна матриця:\n";
            for (let row = i; row < n; row++) {
                let rowValues = "   ";
                for (let col = i; col <= n; col++) {
                    rowValues += aug[row][col].toFixed(2).padStart(6) + " ";
                }
                protocol += rowValues + "\n";
            }
        }
        
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
        
        protocol += `Розв'язувальний елемент: A[${i + 1}, ${i + 1}] = ${pivot.toFixed(2)}\n`;
        
        for (let j = i; j < n + 1; j++) {
            aug[i][j] /= pivot;
        }
        
        let normalizedRow = "   ";
        for (let j = i; j < n + 1; j++) {
            normalizedRow += aug[i][j].toFixed(2).padStart(6) + " ";
        }
        protocol += `Рядок ${i + 1} після нормалізації:\n${normalizedRow}\n`;
        
        // Eliminate other rows
        for (let k = 0; k < n; k++) {
            if (k === i) continue;
            let factor = aug[k][i];
            for (let j = i; j < n + 1; j++) {
                aug[k][j] -= factor * aug[i][j];
            }
        }
        
        protocol += "Матриця після виконання ЗЖВ:\n";
        for (let row = 0; row < n; row++) {
            let rowValues = "   ";
            for (let col = 0; col < n + 1; col++) {
                rowValues += aug[row][col].toFixed(2).padStart(6) + " ";
            }
            protocol += rowValues + "\n";
        }
        protocol += "\n";
    }
    
    let solution = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        solution[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            solution[i] -= aug[i][j] * solution[j];
        }
    }
    
    protocol += "Розв'язки:\n";
    for (let i = 0; i < n; i++) {
        protocol += `X[${i + 1}] = ${solution[i].toFixed(2)}\n`;
    }
    
    return { solution: solution, protocol: protocol };
}