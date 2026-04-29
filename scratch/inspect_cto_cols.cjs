const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_contratos_locacao.json', 'utf8'));
const rows = Array.isArray(data) ? data : data.data;
if (rows && rows.length > 0) {
  console.log('Columns:', Object.keys(rows[0]));
  const cto1001 = rows.filter(r => r.ContratoComercial === 'CTO-1001');
  if (cto1001.length > 0) {
    console.log(cto1001[0]);
  }
}
