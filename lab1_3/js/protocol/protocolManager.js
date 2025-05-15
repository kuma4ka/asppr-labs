let protocolLogStore = [];

export function initializeProtocol() {
    protocolLogStore = [];
    logToProtocol("Згенерований протокол обчислення:", 'text');
}

export function logToProtocol(content, type = 'text') {
    protocolLogStore.push({ type, content });
}

export function getProtocolTextForDownload() {
    return protocolLogStore.map(item => {
        if (item.type === 'htmlTable') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content;
            let text = "";
            const title = tempDiv.querySelector('h4');
            if (title) {
                text += title.textContent + "\n";
            }
            const table = tempDiv.querySelector('table');
            if (table) {
                const rows = Array.from(table.rows);
                rows.forEach(row => {
                    const cells = Array.from(row.cells);
                    text += cells.map(cell => cell.textContent.padEnd(12)).join(" ") + "\n";
                });
            } else {
                text = tempDiv.textContent || "";
            }
            return text.trim();
        }
        return item.content;
    }).join('\n\n');
}

export function getProtocolHTML() {
    return protocolLogStore.map(item => {
        if (item.type === 'htmlTable') {
            return item.content;
        } else if (item.type === 'text') {
            const pre = document.createElement('pre');
            pre.textContent = item.content;
            return pre.outerHTML;
        }
        const p = document.createElement('p');
        p.textContent = item.content;
        return p.outerHTML;
    }).join('');
}