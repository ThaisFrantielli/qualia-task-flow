/*
  Script simples para normalizar localidades usando src/lib/normalizeLocation.ts
  Produz relatórios JSON em ./tmp/

  Uso: node scripts/normalize-locations.js public/data/dim_frota.json
*/
const fs = require('fs');
const path = require('path');

const normalize = require('../src/lib/normalizeLocation').default;

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error('Usage: node scripts/normalize-locations.js <input-json-path> [output-dir]');
  process.exit(1);
}

const input = argv[0];
const outdir = argv[1] || path.join('tmp');

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
const report = [];
const undefinedEntries = [];

for (let i = 0; i < raw.length; i++) {
  const item = raw[i];
  const local = item.Municipio || item.Cidade || item.Localidade || item.UltimoEnderecoTelemetria || item.Endereco || '';
  const res = normalize(local);

  const identifiers = {
    Placa: item.Placa || item.placa || item.Plate || null,
    IdVeiculo: item.IdVeiculo || item.Id || item.id || null
  };

  report.push({ index: i, identifiers, original: local, normalized: res, raw: item });

  // mark as undefined if not a municipality or no state detected
  if (!res.isMunicipio || !res.state || res.state === 'ND') {
    undefinedEntries.push({ index: i, identifiers, original: local, normalized: res, raw: item });
  }
}

fs.mkdirSync(outdir, { recursive: true });
const outReport = path.join(outdir, 'normalized-locations-report.json');
const outUndefined = path.join(outdir, 'normalized-locations-undefined.json');
fs.writeFileSync(outReport, JSON.stringify(report, null, 2), 'utf8');
fs.writeFileSync(outUndefined, JSON.stringify(undefinedEntries, null, 2), 'utf8');
console.log('Wrote report to', outReport);
console.log('Wrote undefined entries to', outUndefined, 'count:', undefinedEntries.length);
