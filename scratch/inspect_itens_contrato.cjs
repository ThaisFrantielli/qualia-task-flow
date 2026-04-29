const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_itens_contrato.json', 'utf8'));
const rows = Array.isArray(data) ? data : data.data;

if (rows && rows.length > 0) {
  console.log('dim_itens_contrato columns:', Object.keys(rows[0]));
  console.log(rows.slice(0, 3));
}
