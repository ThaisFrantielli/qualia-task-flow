const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_regras_contrato_part1of8.json', 'utf8'));

console.log('Array?', Array.isArray(data));
const rows = Array.isArray(data) ? data : data.data;

if (rows && rows.length > 0) {
  console.log('Columns:');
  console.log(Object.keys(rows[0]));
  
  console.log('\nData sample (franquia):');
  const franquiaRows = rows.filter(r => JSON.stringify(r).toLowerCase().includes('franquia'));
  if (franquiaRows.length > 0) {
    console.log(franquiaRows.slice(0, 5));
  } else {
    console.log('No "franquia" rows found in part 1.');
  }
}
