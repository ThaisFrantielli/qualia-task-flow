#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Uso: node scripts/json_to_csv.cjs <input.json> <output.csv>');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) usage();
const inPath = path.resolve(args[0]);
const outPath = path.resolve(args[1]);
if (!fs.existsSync(inPath)) { console.error('Arquivo JSON não encontrado:', inPath); process.exit(2); }
const raw = fs.readFileSync(inPath, 'utf8').trim();
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  // attempt to wrap as array if file contains objects separated by commas or concatenated
  try {
    const maybe = '[' + raw.replace(/}\s*\{/g, '},{') + ']';
    data = JSON.parse(maybe);
  } catch (e2) {
    console.error('Erro ao parsear JSON:', e.message || e);
    process.exit(3);
  }
}
if (!Array.isArray(data)) data = [data];

// collect all keys
const keySet = new Set();
for (const r of data) {
  Object.keys(r || {}).forEach(k => keySet.add(k));
}
const keys = Array.from(keySet);

function quoteCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(';') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const lines = [];
lines.push(keys.join(';'));
for (const r of data) {
  const row = keys.map(k => quoteCell(r[k] === undefined ? '' : r[k]));
  lines.push(row.join(';'));
}
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('CSV escrito:', outPath, 'linhas:', data.length);
