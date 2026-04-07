const fs = require('fs');

// Inspect dim_regras_contrato (first part)
const txt = fs.readFileSync('dim_regras_contrato_part1of8.json', 'utf8');
const j = JSON.parse(txt);
if (Array.isArray(j) && j.length > 0) {
  console.log('dim_regras_contrato keys:', JSON.stringify(Object.keys(j[0])));
  console.log('sample[0]:', JSON.stringify(j[0], null, 2));
} else {
  console.log('type:', typeof j, 'keys:', JSON.stringify(Object.keys(j)));
}
