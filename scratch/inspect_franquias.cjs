const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/dim_regras_contrato_part1of8.json', 'utf8'));
const rows = Array.isArray(data) ? data : data.data;

const franquias = rows.filter(r => r.NomeRegra && r.NomeRegra.toLowerCase().includes('franquia'));
const nonZero = franquias.filter(r => parseFloat(r.ConteudoRegra) > 0);

console.log(`Total franquias in part 1: ${franquias.length}`);
console.log(`Non-zero franquias in part 1: ${nonZero.length}`);
if (nonZero.length > 0) {
  console.log(nonZero.slice(0, 5));
}
