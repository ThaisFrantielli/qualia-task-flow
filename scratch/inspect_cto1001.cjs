const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_regras_contrato_part1of8.json', 'utf8'));
const rows = Array.isArray(data) ? data : data.data;

const cto1001 = rows.filter(r => r.Contrato === 'CTO-1001' && r.NomeRegra && r.NomeRegra.toLowerCase().includes('franquia'));

console.log('CTO-1001 franquia rules:', cto1001.length);
if (cto1001.length > 0) console.log(cto1001);
