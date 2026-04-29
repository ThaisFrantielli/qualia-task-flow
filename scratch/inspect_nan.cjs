const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_regras_contrato_part1of8.json', 'utf8'));
const rows = Array.isArray(data) ? data : data.data;

const franquias = rows.filter(r => r.NomeRegra && r.NomeRegra.toLowerCase().includes('franquia'));
const nonNumeric = franquias.filter(r => isNaN(parseFloat(r.ConteudoRegra)) && r.ConteudoRegra !== '0.00');

console.log(`Total franquias: ${franquias.length}`);
console.log(`Non-numeric franquias: ${nonNumeric.length}`);
if (nonNumeric.length > 0) {
  console.log(nonNumeric.slice(0, 5));
} else {
  console.log("No non-numeric franquias found.");
}
