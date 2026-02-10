const fs = require('fs');
const path = require('path');

/**
 * Salva dados como JSON em public/data/
 * @param {string} tableName - Nome da tabela
 * @param {Array} data - Dados a serem salvos
 * @param {Date|null} dwLastUpdate - Data de atualização do DW
 * @returns {string} - Caminho do arquivo salvo
 */
function saveJSONToPublicData(tableName, data, dwLastUpdate = null) {
    const jsonDir = path.join(__dirname, '../../public/data');
    
    if (!fs.existsSync(jsonDir)) {
        fs.mkdirSync(jsonDir, { recursive: true });
    }
    
    const fileName = `${tableName}.json`;
    const filePath = path.join(jsonDir, fileName);
    
    const now = new Date();
    const generatedAtIso = now.toISOString();

    let dwIso = null;
    let dwLocal = null;
    if (dwLastUpdate) {
        const dwDate = (dwLastUpdate instanceof Date) ? dwLastUpdate : new Date(dwLastUpdate);
        if (!isNaN(dwDate.getTime())) {
            dwIso = dwDate.toISOString();
            dwLocal = dwDate.toLocaleString('pt-BR');
        }
    }

    const payload = {
        metadata: {
            generated_at: generatedAtIso,
            generated_at_local: now.toLocaleString('pt-BR'),
            dw_last_update: dwIso,
            dw_last_update_local: dwLocal,
            table: tableName,
            record_count: data.length,
            etl_version: '2.0'
        },
        data: data
    };
    
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');
    
    return filePath;
}

module.exports = { saveJSONToPublicData };
