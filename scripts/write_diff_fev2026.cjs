const fs = require('fs');

function normalizeNumber(v) {
  if (v === undefined || v === null) return 0;
  let s = String(v).trim();
  s = s.replace(/\s/g, '').replace(/R\$/g, '').replace(/\u00A0/g, '');
  if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(s) || 0;
  }
  if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
    s = s.replace(/,/g, '.');
    return parseFloat(s) || 0;
  }
  if (s.indexOf('.') !== -1 && s.indexOf(',') === -1) {
    if (/\.\d{1,2}$/.test(s)) return parseFloat(s) || 0;
    s = s.replace(/\./g, '');
    return parseFloat(s) || 0;
  }
  return parseFloat(s) || 0;
}

function parseCSV(path) {
  const txt = fs.readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean);
  const hdr = txt[0].split(';').map(h => h.trim());
  const arr = [];
  for (let i = 1; i < txt.length; i++) {
    const cols = txt[i].split(';');
    const obj = {};
    for (let j = 0; j < hdr.length; j++) obj[hdr[j]] = cols[j] || '';
    arr.push(obj);
  }
  return arr;
}

const src = parseCSV('scripts/temp_src_2026_mapped.csv');
const dash = parseCSV('C:/Users/frant/Downloads/fevereiro.csv');

const srcSet = new Set();
for (const r of src) {
  const dc = (r.DataCompetencia || r.Competencia || '');
  if (dc.includes('2026-02') || dc.includes('/02/2026')) {
    srcSet.add((r.IdNota || r.Id || r.NumeroNota || '').toString());
  }
}

const missing = [];
for (const r of dash) {
  const dc = (r.DataCompetencia || r.Competencia || '');
  if (dc.includes('2026-02') || dc.includes('/02/2026')) {
    const id = (r.IdNota || r.Id || r['Nota'] || r['NumeroNota'] || '').toString();
    if (!srcSet.has(id)) {
      const v = normalizeNumber(r['Valor Faturado'] || r['ValorFaturado'] || r['Valor']);
      missing.push({ id, valor: v, row: r });
    }
  }
}

missing.sort((a, b) => b.valor - a.valor);
const out = ['IdNota;ValorFaturado;RawRow'];
for (const m of missing) {
  out.push(m.id + ';' + m.valor.toFixed(2) + ';"' + JSON.stringify(m.row).replace(/"/g, '""') + '"');
}
fs.writeFileSync('scripts/diff_fev2026.csv', out.join('\n'), 'utf8');
console.log('Escrito scripts/diff_fev2026.csv linhas', missing.length);
