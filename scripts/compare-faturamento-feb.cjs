#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Uso: node scripts/compare-faturamento-feb.cjs --source source.csv|db --dashboard dashboard.csv --year 2026 --month 2 --expected 7018456.22');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const val = args[i + 1];
    if (!val) usage();
    if (key.startsWith('--')) out[key.slice(2)] = val;
  }
  return out;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = splitLine(lines[0], delim);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delim);
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = cols[j] !== undefined ? cols[j] : '';
    rows.push(obj);
  }
  return rows;
}

function splitLine(line, delim = ',') {
  const res = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === delim && !inQ) { res.push(cur); cur = ''; continue; }
    cur += ch;
  }
  res.push(cur);
  return res.map(s => s.trim());
}

function normalizeNumber(v) {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  s = s.replace(/\s/g, '').replace(/R\$/g, '').replace(/\u00A0/g, '');
  // Cases:
  // - both '.' and ',' present => '.' thousands, ',' decimal (BR) -> remove dots, replace comma
  // - only ',' present => comma is decimal
  // - only '.' present => could be decimal (e.g. 11588.01) or thousands (e.g. 1.158.801)
  if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
    const n2 = parseFloat(s);
    return isNaN(n2) ? 0 : n2;
  }
  if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
    s = s.replace(/,/g, '.');
    const n2 = parseFloat(s);
    return isNaN(n2) ? 0 : n2;
  }
  if (s.indexOf('.') !== -1 && s.indexOf(',') === -1) {
    // If dot followed by 1-2 digits at end, treat as decimal, else remove dots (thousands)
    if (/\.\d{1,2}$/.test(s)) {
      const n2 = parseFloat(s);
      return isNaN(n2) ? 0 : n2;
    }
    s = s.replace(/\./g, '');
    const n2 = parseFloat(s);
    return isNaN(n2) ? 0 : n2;
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function isCanceled(row) {
  const s = (row.SituacaoNota || row.Situacao || row.Status || row.IdSituacaoNota || '').toString().toLowerCase();
  if (s.includes('cancel')) return true;
  if (s.includes('cancelada')) return true;
  if (s === '3') return true;
  return false;
}

function getTipo(row) {
  return (row.TipoFaturamento || row.TipoNota || row.Tipo || row.Natureza || '').toString().trim();
}

function isLocacaoEmitidoValid(row) {
  const id = row.IdSituacaoNota || row['IdSituacao'] || row.SituacaoNota || '';
  const fa = row['FA/ND'] || row.FAND || row['FA_ND'] || row.FA || '';
  const hasId = id !== '' && id !== undefined;
  const hasFa = fa !== '' && fa !== undefined;
  if (!hasId || !hasFa) return true;
  const idn = parseInt(String(id).replace(/\D/g, ''), 10);
  const faStr = String(fa).trim().toUpperCase();
  return (idn === 1 || idn === 2) && faStr === 'FA';
}

function getValorByTipo(row) {
  if (row['Valor Faturado'] && row['Valor Faturado'] !== '') return normalizeNumber(row['Valor Faturado']);
  if (row.ValorLocacao && row.ValorLocacao !== '') return normalizeNumber(row.ValorLocacao);
  if (row.ValorReembolsaveis && row.ValorReembolsaveis !== '') return normalizeNumber(row.ValorReembolsaveis);
  if (row.ValorMultas && row.ValorMultas !== '') return normalizeNumber(row.ValorMultas);
  if (row.ValorTotal && row.ValorTotal !== '') return normalizeNumber(row.ValorTotal);
  if (row.Valor && row.Valor !== '') return normalizeNumber(row.Valor);
  return 0;
}

function monthOf(dateStr) {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{4})[-/](\d{1,2})/);
  if (m) return parseInt(m[2], 10);
  // try dd/mm/YYYY
  const mm = dateStr.match(/\/(\d{1,2})\//);
  if (mm) return parseInt(mm[1], 10);
  return null;
}

function aggregate(rows, year, month) {
  const byTipo = {};
  let total = 0;
  for (const r of rows) {
    if (isCanceled(r)) continue;
    const dc = r.DataCompetencia || r.Data || r.Data_Competencia || '';
    if (year) {
      const yMatch = String(dc).match(/(\d{4})/);
      if (!yMatch || parseInt(yMatch[1], 10) !== parseInt(year, 10)) continue;
    }
    if (month) {
      const m = monthOf(dc);
      if (m === null || m !== parseInt(month, 10)) continue;
    }
    const tipo = getTipo(r).toLowerCase();
    if (tipo.includes('loc')) {
      if (!isLocacaoEmitidoValid(r)) continue;
    }
    const val = getValorByTipo(r);
    total += val;
    if (!byTipo[tipo]) byTipo[tipo] = { total: 0, rows: [] };
    byTipo[tipo].total += val;
    byTipo[tipo].rows.push(Object.assign({}, r, { __valor: val }));
  }
  return { total, byTipo };
}

function fmtBRL(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

(async function main() {
  const args = parseArgs();
  if (!args.source || !args.dashboard) usage();
  const year = args.year ? parseInt(args.year, 10) : null;
  const month = args.month ? parseInt(args.month, 10) : null;
  const expected = args.expected ? parseFloat(String(args.expected).replace(/\./g, '').replace(',', '.')) : null;

  const dashPath = path.resolve(args.dashboard);
  if (!fs.existsSync(dashPath)) { console.error('Arquivo dashboard não encontrado:', dashPath); process.exit(2); }
  const dash = parseCSV(fs.readFileSync(dashPath, 'utf8'));

  let src = [];
  if (args.source === 'db' || args.source === 'database') {
    console.log('Buscando dados do banco via variáveis de ambiente (PGHOST/PGUSER/PGPASSWORD/PGDATABASE) ...');
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
      });
      await client.connect();
      const q = `SELECT * FROM fat_faturamentos WHERE date_part('year', DataCompetencia) = $1 AND date_part('month', DataCompetencia) = $2`;
      const res = await client.query(q, [year, month]);
      src = res.rows.map(r => {
        const out = {};
        for (const k of Object.keys(r)) {
          out[k] = r[k] === null ? '' : String(r[k]);
        }
        return out;
      });
      await client.end();
    } catch (e) {
      console.error('Erro ao conectar/consultar banco:', e.message || e);
      process.exit(3);
    }
  } else {
    const srcPath = path.resolve(args.source);
    if (!fs.existsSync(srcPath)) { console.error('Arquivo source não encontrado:', srcPath); process.exit(2); }
    src = parseCSV(fs.readFileSync(srcPath, 'utf8'));
  }

  const aggSrc = aggregate(src, year, month);
  const aggDash = aggregate(dash, year, month);

  console.log('\n=== Resumo de comparação ===');
  console.log('Período:', year || 'qualquer ano', month ? `mês ${month}` : 'todos os meses');
  console.log('Linhas source:', src.length, 'linhas dashboard:', dash.length);
  console.log('Total source:', fmtBRL(aggSrc.total), ' | Total dashboard:', fmtBRL(aggDash.total));
  const diff = aggSrc.total - aggDash.total;
  console.log('Diferença (source - dashboard):', fmtBRL(diff), `(${(diff / (aggDash.total || 1) * 100).toFixed(2)}%)`);

  if (expected) {
    console.log('Valor esperado informado:', fmtBRL(expected));
    const diffE = aggSrc.total - expected;
    console.log('Diferença (source - esperado):', fmtBRL(diffE));
  }

  console.log('\nPor Tipo (source):');
  for (const t of Object.keys(aggSrc.byTipo)) console.log('-', t, fmtBRL(aggSrc.byTipo[t].total), `(${aggSrc.byTipo[t].rows.length} rows)`);

  const mapDashRows = {};
  for (const tKey of Object.keys(aggDash.byTipo)) {
    for (const r of aggDash.byTipo[tKey].rows) {
      const id = r.Id || r.IdNota || r.Chave || r.Nome || JSON.stringify(r);
      mapDashRows[id] = r.__valor || getValorByTipo(r);
    }
  }
  const diffs = [];
  for (const tKey of Object.keys(aggSrc.byTipo)) {
    for (const r of aggSrc.byTipo[tKey].rows) {
      const id = r.Id || r.IdNota || r.Chave || r.Nome || JSON.stringify(r);
      const dashVal = mapDashRows[id] || 0;
      const d = r.__valor - dashVal;
      diffs.push({ id, tipo: tKey, valor_src: r.__valor, valor_dash: dashVal, delta: d });
    }
  }
  diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  console.log('\nTop 10 diferenças por documento (abs delta):');
  diffs.slice(0, 10).forEach((d, i) => {
    console.log(`${i + 1}. Tipo=${d.tipo} id=${d.id} src=${fmtBRL(d.valor_src)} dash=${fmtBRL(d.valor_dash)} delta=${fmtBRL(d.delta)}`);
  });

  console.log('\nDetalhes: se precisar, salve um CSV de saída para investigação adicional.');
})();
