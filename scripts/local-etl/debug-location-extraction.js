
require('dotenv').config({ path: 'c:/Users/frant/Documents/qualia-task-flow/scripts/local-etl/.env' });
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE,
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 30000
};

async function analyzeLocations() {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query(`
            SELECT UltimoEnderecoTelemetria 
            FROM Veiculos 
            WHERE UltimoEnderecoTelemetria IS NOT NULL AND RTRIM(LTRIM(UltimoEnderecoTelemetria)) <> ''
        `);
        
        const hierarquia = {};
        const errors = [];

        result.recordset.forEach(r => {
            const fullAddr = (r.UltimoEnderecoTelemetria || '').trim();
            let uf = 'ND';
            let city = 'Não Identificado';

            // --- LÓGICA DO DASHBOARD ---
            const ufMatch = fullAddr.match(/\(([A-Z]{2})\)/);
            if (ufMatch) uf = ufMatch[1];
            else if (fullAddr.toUpperCase().includes('DISTRITO FEDERAL')) uf = 'DF';
            else {
                const suffixMatch = fullAddr.match(/[\s-]([A-Z]{2})(?:$|[,\s])/);
                if(suffixMatch) uf = suffixMatch[1];
            }

            try {
                let cleanAddr = fullAddr.replace(/^[^\(]+\([A-Z]{2}\)[:\s]*/, '');
                const parts = cleanAddr.split(',').map(p => p.trim()).filter(p => p.length > 0);
                
                for (let i = parts.length - 1; i >= 0; i--) {
                    const part = parts[i].toUpperCase();
                    if (part === 'BRASIL') continue;
                    if (/\d{5}-?\d{3}/.test(part)) continue;
                    if (part.startsWith('REGIÃO')) continue;
                    if (part.startsWith('MICRORREGIÃO')) continue;
                    if (part.startsWith('VILA ')) continue;
                    if (part.startsWith('JARDIM ')) continue;
                    if (part.length < 3 || /^\d+/.test(part)) continue;
                    
                    city = parts[i];
                    break;
                }
            } catch (e) {}
            // ---------------------------

            if (uf !== 'ND') {
                city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
                if (!hierarquia[uf]) hierarquia[uf] = {};
                hierarquia[uf][city] = (hierarquia[uf][city] || 0) + 1;
            } else {
                errors.push(fullAddr);
            }
        });

        console.log('--- RELATÓRIO DE EXTRAÇÃO ---');
        Object.keys(hierarquia).sort().forEach(uf => {
            console.log(`\n[${uf}]`);
            const cities = Object.entries(hierarquia[uf]).sort((a,b) => b[1] - a[1]);
            cities.forEach(([c, count]) => {
                console.log(`  - ${c}: ${count}`);
            });
        });

    } catch (err) {
        console.error(err);
    } finally {
        await sql.close();
    }
}

analyzeLocations();
