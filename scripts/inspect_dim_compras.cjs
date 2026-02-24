const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'local-etl', 'public', 'data', 'dim_compras.json');
try {
  const raw = fs.readFileSync(file, 'utf8');
  const obj = JSON.parse(raw);
  const rows = Array.isArray(obj) ? obj : (obj.data || []);
  const max = Math.min(rows.length, 20000);
  const samples = [];
  const stats = Object.create(null);
  const trackCols = ['Chassi','chassi','AnoModelo','ano_modelo','AnoFabricacao','ano_fabricacao','ValorAcessorios','valor_acessorios','Tipo','tipo','Instituicao','banco','NomeFornecedorNotaFiscal','NomeFornecedor','fornecedor'];
  for (let i = 0; i < max; i++) {
    const r = rows[i] || {};
    const keys = Object.keys(r);
    // initialize stats for keys
    for (const k of keys) {
      if (!stats[k]) stats[k] = {present: 0, empty: 0, dash: 0};
    }
    for (const k of keys) {
      const v = r[k];
      if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) {
        stats[k].empty++;
      } else {
        stats[k].present++;
      }
      if (v === '-' || (typeof v === 'string' && v.trim() === '-')) stats[k].dash++;
    }
    // collect sample rows where any tracked col is empty
    const hasEmptyTracked = trackCols.some(tc => {
      const val = r[tc];
      return val === null || val === undefined || (typeof val === 'string' && val.trim() === '');
    });
    if (hasEmptyTracked && samples.length < 50) samples.push({index: i, pick: {Placa: r.Placa||r.placa, Chassi: r.Chassi||r.chassi, AnoModelo: r.AnoModelo||r.ano_modelo, AnoFabricacao: r.AnoFabricacao||r.ano_fabricacao, ValorAcessorios: r.ValorAcessorios||r.valor_acessorios, Tipo: r.Tipo||r.tipo, Banco: r.Instituicao||r.banco||r.NomeFornecedorNotaFiscal||r.fornecedor}});
  }
  const counts = Object.keys(stats).map(k => ({col: k, present: stats[k].present, empty: stats[k].empty, dash: stats[k].dash})).sort((a,b)=>b.empty - a.empty);
  const out = {file, total_rows: rows.length, scanned: max, columns_with_most_empty: counts.slice(0,40), samples};
  const outPath = path.join(__dirname, '_dim_compras_dash_checks.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
} catch (e) {
  console.error('ERR', e && e.message || e);
  process.exit(2);
}
