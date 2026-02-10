const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'run-sync-v2.js');
let content = fs.readFileSync(filePath, 'utf8');

// Localizar onde inserir o código (após o if finalRowCount === 0 e antes do // 6. Inserir no PostgreSQL)
const marker = '        // 6. Inserir no PostgreSQL com transação';
const insertIndex = content.indexOf(marker);

if (insertIndex === -1) {
    console.error('Marker não encontrado!');
    process.exit(1);
}

const insertCode = `        // 5.5. Se modo JSON_ONLY: salvar JSON e retornar (pular inserção no Postgres)
        if (JSON_ONLY) {
            saveJSONToPublicData(tableName, finalData, dwLastUpdate);
            const duration = ((performance.now() - start) / 1000).toFixed(2);
            console.log(\`      ✅ \${progressStr} \${tableName} (\${finalData.length} linhas) - \${duration}s\`);
            finalData = null;
            return;
        }

`;

const before = content.substring(0, insertIndex);
const after = content.substring(insertIndex);

const newContent = before + insertCode + after;
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Arquivo modificado com sucesso! Lógica de saveJSON adicionada.');
