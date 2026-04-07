const fs = require('fs');
const txt = fs.readFileSync('fat_manutencao_unificado_part1of26.json', 'utf8');
const j = JSON.parse(txt);
const arr = Array.isArray(j) ? j : (j.data || []);
const s = arr[0];

// Print all keys with their values
for (const k of Object.keys(s)) {
  console.log(`${k}: ${JSON.stringify(s[k])}`);
}
