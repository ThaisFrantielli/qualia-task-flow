const fs = require('fs');
const path = require('path');

const mappedPath = path.resolve(__dirname, 'temp_src_2026_mapped.csv');
const diffPath = path.resolve(__dirname, 'diff_fev2026.csv');
const outPath = path.resolve(__dirname, 'temp_src_2026_combined.csv');

function parseBRDate(ddmmyyyy) {
  if (!ddmmyyyy) return '';
  const m = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return ddmmyyyy;
  return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}

const mapped = fs.readFileSync(mappedPath, 'utf8');
const diff = fs.readFileSync(diffPath, 'utf8');

const outLines = [];
// copy header and existing mapped content
const mappedLines = mapped.split(/\r?\n/);
if (mappedLines.length === 0) throw new Error('mapped CSV empty');
outLines.push(mappedLines[0]);
for (let i=1;i<mappedLines.length;i++) {
  if (mappedLines[i].trim() !== '') outLines.push(mappedLines[i]);
}

const diffLines = diff.split(/\r?\n/);
// diff header may be first line
let start = 0;
if (diffLines[0] && diffLines[0].toLowerCase().startsWith('idnota')) start = 1;
for (let i = start; i < diffLines.length; i++) {
  const line = diffLines[i];
  if (!line || !line.trim()) continue;
  // expected: IdNota;ValorFaturado;RawRow
  const m = line.match(/^([^;]+);([^;]+);"(.*)"$/);
  if (!m) continue;
  const idNota = m[1];
  const valorF = m[2];
  let raw = m[3];
  // raw has doubled quotes for internal quotes
  raw = raw.replace(/""/g, '"');
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    // fallback: try replacing unescaped quotes
    try { obj = eval('(' + raw + ')'); } catch (e2) { continue; }
  }
  const numeroNota = obj.Nota || '';
  const nomeCliente = obj.Cliente || '';
  const dataComp = parseBRDate(obj.DataCompetencia || '');
  const dataEmissao = parseBRDate(obj.DataEmissao || '') || dataComp;
  function normalizeNumber(v) {
    if (v === undefined || v === null) return 0;
    let s = String(v).trim();
    s = s.replace(/\s/g, '').replace(/R\$/g, '').replace(/\u00A0/g, '');
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
      const n2 = parseFloat(s); return isNaN(n2) ? 0 : n2;
    }
    if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
      s = s.replace(/,/g, '.'); const n2 = parseFloat(s); return isNaN(n2) ? 0 : n2;
    }
    if (s.indexOf('.') !== -1 && s.indexOf(',') === -1) {
      // dot-only: assume decimal (e.g. 11588.01)
      const n2 = parseFloat(s); return isNaN(n2) ? 0 : n2;
    }
    const n = parseFloat(s); return isNaN(n) ? 0 : n;
  }
  const valor = normalizeNumber(valorF);

  // build line with same columns as mapped header
  // Header: IdNota;NumeroNota;TipoNota;SituacaoNota;IdCliente;NomeCliente;DataCompetencia;Vencimento;ValorLocacao;ValorReembolsaveis;ValorMultas;ValorTotal;IdVeiculo;DetalheItem;VlrItem
  const TipoNota = (numeroNota && numeroNota.startsWith('ND')) ? 'Nota de débito' : 'Fatura';
  const SituacaoNota = 'Emitido';
  const IdCliente = '';
  const IdVeiculo = '';
  const DetalheItem = '';
  const ValorLocacao = 0;
  const ValorReembolsaveis = 0;
  const ValorMultas = 0;
  const VlrItem = valor.toFixed(2);

  const out = [
    idNota,
    numeroNota,
    TipoNota,
    SituacaoNota,
    IdCliente,
    (nomeCliente || ''),
    dataComp,
    dataEmissao,
    ValorLocacao,
    ValorReembolsaveis,
    ValorMultas,
    valor.toFixed(2),
    IdVeiculo,
    DetalheItem,
    VlrItem
  ].join(';');

  outLines.push(out);
}

fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
console.log('Wrote', outPath, 'lines=', outLines.length);
