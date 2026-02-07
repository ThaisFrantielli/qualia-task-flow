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
    
    const payload = {
        metadata: {
            generated_at: new Date().toISOString(),
            dw_last_update: dwLastUpdate ? dwLastUpdate.toISOString() : null,
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
