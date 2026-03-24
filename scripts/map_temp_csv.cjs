#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Uso: node scripts/map_temp_csv.cjs <input.csv> <output.csv>');
  process.exit(1);
}
const inP = path.resolve(args[0]);
const outP = path.resolve(args[1]);
if (!fs.existsSync(inP)) { console.error('Arquivo não encontrado:', inP); process.exit(2); }
const txt = fs.readFileSync(inP,'utf8').split(/\r?\n/);
if (txt.length === 0) { console.error('CSV vazio'); process.exit(2); }
const delim = txt[0].includes(';') ? ';' : ',';
const headers = txt[0].split(delim).map(h=>h.trim());
const mapping = {
  'VlrLocacao': 'ValorLocacao',
  'VlrReembolso': 'ValorReembolsaveis',
  'VlrMultas': 'ValorMultas',
  'VlrTotal': 'ValorTotal',
  'Competencia': 'DataCompetencia'
};
const newHeaders = headers.map(h => mapping[h] || h);
const outLines = [newHeaders.join(';')];
for (let i = 1; i < txt.length; i++) {
  if (!txt[i]) continue;
  outLines.push(txt[i]);
}
fs.writeFileSync(outP, outLines.join('\n'), 'utf8');
console.log('CSV mapeado escrito:', outP);
