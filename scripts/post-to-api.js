#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000/api/save-metadata';
const inputPath = process.argv[2] || path.join(__dirname, 'metadata_input.txt');

function detectDelimiter(line) {
  if (line.indexOf('\t') >= 0) return '\t';
  if (line.indexOf(';') >= 0) return ';';
  return ',';
}

function mapHeaders(headers) {
  return headers.map(h => h && h.toString().trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, '_'));
}

function parseCurrency(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // remove non numeric except ., and ,
  const cleaned = s.replace(/[^0-9,\.]/g, '');
  // if contains comma and dot -> assume Brazilian thousands dot and comma decimal
  if (cleaned.indexOf(',') >= 0 && cleaned.indexOf('.') >= 0) {
    return Number(cleaned.replace(/\./g, '').replace(/,/, '.'));
  }
  // if only comma present -> replace comma with dot
  if (cleaned.indexOf(',') >= 0) return Number(cleaned.replace(/,/, '.'));
  return Number(cleaned);
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('Arquivo não encontrado:', inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    console.error('Arquivo vazio');
    process.exit(1);
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = mapHeaders(lines[0].split(delimiter));

  const rows = lines.slice(1).map(line => {
    const parts = line.split(delimiter);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (parts[i] || '').trim());
    return obj;
  });

  console.log(`Enviando ${rows.length} linhas para ${API_URL} (arquivo: ${inputPath})`);

  let success = 0;
  let failed = 0;

  for (const r of rows) {
    // map fields according to expected columns
    const payload = {
      id_referencia: r['contrato_de_locacao'] || r['contrato_de_locacao'] || r['contrato'],
      contrato_comercial: r['contrato_comercial'] || null,
      estrategia: r['estrategia'] || r['estrategia'] || null,
      acao_usuario: r['estrategia'] || r['acao_usuario'] || null,
      valor_aquisicao: parseCurrency(r['valoraquisicao'] || r['valor_aquisicao'] || r['valor'] || null),
    };

    try {
      const fetchFn = (typeof fetch === 'function') ? fetch : (await import('node-fetch')).default;
      const res = await fetchFn(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const txt = await res.text();
      if (res.ok) {
        success++;
      } else {
        failed++;
        console.error('Erro ao enviar', payload.id_referencia, res.status, txt);
      }
    } catch (err) {
      failed++;
      console.error('Request failed for', payload.id_referencia, err && err.message ? err.message : err);
    }
  }

  console.log('Pronto. Sucesso:', success, 'Falhas:', failed);
}

main().catch(err => { console.error(err); process.exit(1); });
