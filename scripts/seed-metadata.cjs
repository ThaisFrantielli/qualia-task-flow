#!/usr/bin/env node
// scripts/seed-metadata.js
// Usage:
// 1) Place your data in `scripts/metadata_input.txt` (CSV/semicolon/TSV) and run:
//    node scripts/seed-metadata.js scripts/metadata_input.txt
// 2) Or pipe data to stdin:
//    cat mydata.txt | node scripts/seed-metadata.js
// Expected columns (header names accepted, case-insensitive):
// "Contrato de Locação" (id_referencia), "Contrato Comercial", "ValorAquisicao", "Estratégia"

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function usage() {
  console.log('Usage: node scripts/seed-metadata.js [input-file]');
  console.log('If no input-file given the script reads from stdin.');
}

function parseCurrency(raw) {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // keep digits, comma, dot, minus
  const only = s.replace(/[^0-9,.-]/g, '');
  let cleaned = only;
  try {
    if (only.includes(',') && only.includes('.')) {
      // decide which is decimal by position
      if (only.lastIndexOf(',') > only.lastIndexOf('.')) {
        // comma likely decimal, remove dots (thousands) and replace comma -> dot
        cleaned = only.replace(/\./g, '').replace(',', '.');
      } else {
        // dot likely decimal, remove commas
        cleaned = only.replace(/,/g, '');
      }
    } else if (only.includes(',')) {
      // comma as decimal separator
      cleaned = only.replace(/,/g, '.');
    } else {
      // keep as is (dot decimal or integer)
      cleaned = only;
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
}

function detectDelimiter(line) {
  if (line.indexOf(';') >= 0) return ';';
  if (line.indexOf('\t') >= 0) return '\t';
  if (line.indexOf(',') >= 0) return ',';
  return null;
}

function normalizeHeader(h) {
  return h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapHeaders(headers) {
  // returns mapping from expected keys to column index
  const map = {};
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (n.includes('contrato') && n.includes('loc') ) map.id_referencia = i;
    else if (n.includes('contrato comercial') || (n.includes('comercial') && n.includes('contrato'))) map.contrato_comercial = i;
    else if (n.includes('valor') && n.includes('aquis')) map.valor_aquisicao = i;
    else if (n.includes('estrateg') || n.includes('estratég')) map.estrategia = i;
    // fallbacks
    else if (n === 'contrato') map.id_referencia = map.id_referencia ?? i;
  });
  return map;
}

async function runText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    console.error('No data found');
    process.exit(2);
  }

  const delim = detectDelimiter(lines[0]) || detectDelimiter(lines.slice(0, 5).find(Boolean) || '') || ';';
  const cols = lines[0].split(delim).map(s => s.trim());
  let startAt = 0;
  let mapping = {};

  // detect header by checking if first row contains non-contract-like text
  const firstRowIsHeader = cols.some(c => /contrato|valor|estrateg/i.test(c));
  if (firstRowIsHeader) {
    mapping = mapHeaders(cols);
    startAt = 1;
  }

  // if mapping doesn't include all expected, assume order: id_ref, contrato_comercial, valor_aquisicao, estrategia
  const ensureIndex = (key, fallbackIndex) => {
    if (typeof mapping[key] === 'number') return mapping[key];
    return fallbackIndex;
  };

  const rows = [];
  for (let i = startAt; i < lines.length; i++) {
    const parts = lines[i].split(delim).map(s => s.trim());
    if (parts.length === 0) continue;
    const id_referencia = parts[ensureIndex('id_referencia', 0)] || null;
    const contrato_comercial = parts[ensureIndex('contrato_comercial', 1)] || null;
    const raw_valor = parts[ensureIndex('valor_aquisicao', 2)] || null;
    const estrategia = parts[ensureIndex('estrategia', 3)] || null;
    if (!id_referencia) continue;
    const valor_aquisicao = parseCurrency(raw_valor);
    rows.push({ id_referencia: id_referencia.trim(), contrato_comercial: contrato_comercial ? contrato_comercial.trim() : null, valor_aquisicao, estrategia: estrategia ? estrategia.trim() : null, acao_usuario: estrategia ? estrategia.trim() : null });
  }

  if (rows.length === 0) {
    console.error('No valid rows parsed');
    process.exit(3);
  }

  // Build DB client from ORACLE_PG_* env vars
  const env = process.env;
  const pgHost = env.ORACLE_PG_HOST;
  const pgPort = env.ORACLE_PG_PORT;
  const pgUser = env.ORACLE_PG_USER;
  const pgPassword = env.ORACLE_PG_PASSWORD;
  const pgDatabase = env.ORACLE_PG_DATABASE;
  const pgUrl = env.ORACLE_PG_URL || env.ORACLE_PG_CONNECTION_STRING || null;

  const clientConfig = pgUrl ? { connectionString: pgUrl } : {
    host: pgHost || 'localhost',
    port: pgPort ? Number(pgPort) : 5432,
    user: pgUser,
    password: pgPassword,
    database: pgDatabase || undefined,
  };

  const client = new Client(clientConfig);
  try {
    await client.connect();
  } catch (e) {
    console.error('Failed to connect to Postgres. Check ORACLE_PG_* env vars. Error:', e.message || e);
    process.exit(4);
  }

  const upsertSql = `
    INSERT INTO public.dim_contratos_metadata (id_referencia, contrato_comercial, valor_aquisicao, estrategia, acao_usuario)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id_referencia) DO UPDATE SET
      contrato_comercial = EXCLUDED.contrato_comercial,
      valor_aquisicao = EXCLUDED.valor_aquisicao,
      estrategia = EXCLUDED.estrategia,
      acao_usuario = EXCLUDED.acao_usuario;
  `;

  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const r of rows) {
      const params = [r.id_referencia, r.contrato_comercial, r.valor_aquisicao, r.estrategia, r.acao_usuario];
      await client.query(upsertSql, params);
      inserted++;
    }
    await client.query('COMMIT');
  } catch (e) {
    console.error('Error executing upserts:', e.message || e);
    try { await client.query('ROLLBACK'); } catch (er) {}
    await client.end();
    process.exit(5);
  }

  await client.end();
  console.log(`Processed ${rows.length} rows. Upsert attempts: ${inserted}`);
}

async function main() {
  const arg = process.argv[2];
  if (arg) {
    const p = path.resolve(arg);
    if (!fs.existsSync(p)) {
      console.error('File not found:', p);
      usage();
      process.exit(1);
    }
    const text = fs.readFileSync(p, 'utf8');
    await runText(text);
    return;
  }

  // read from stdin
  const stdin = process.stdin;
  if (stdin.isTTY) {
    usage();
    process.exit(1);
  }
  let data = '';
  stdin.setEncoding('utf8');
  for await (const chunk of stdin) {
    data += chunk;
  }
  await runText(data);
}

main().catch(err => {
  console.error('Fatal error:', err && err.stack ? err.stack : err);
  process.exit(10);
});
