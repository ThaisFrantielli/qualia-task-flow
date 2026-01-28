const fs = require('fs');
const IN_PATH = 'public/data/mapa_universal_sample.ndjson';
const OUT_REPORT = 'public/data/mapa_universal_sample_report.json';

if (!fs.existsSync(IN_PATH)) {
  console.error('Arquivo de amostra não encontrado:', IN_PATH);
  process.exit(2);
}

const stats = { total: 0, nonNull: { Placa:0, ContratoComercial:0, ContratoLocacao:0, Cliente:0 }, samples: [] };

const rl = require('readline').createInterface({ input: fs.createReadStream(IN_PATH), crlfDelay: Infinity });
(async ()=>{
  for await (const line of rl) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    stats.total++;
    if (r.Placa !== null && r.Placa !== undefined && String(r.Placa).trim()!=='') stats.nonNull.Placa++;
    if (r.ContratoComercial !== null && r.ContratoComercial !== undefined && String(r.ContratoComercial).trim()!=='') stats.nonNull.ContratoComercial++;
    if (r.ContratoLocacao !== null && r.ContratoLocacao !== undefined && String(r.ContratoLocacao).trim()!=='') stats.nonNull.ContratoLocacao++;
    if (r.Cliente !== null && r.Cliente !== undefined && String(r.Cliente).trim()!=='') stats.nonNull.Cliente++;
    if (stats.samples.length < 10) stats.samples.push(r);
  }

  stats.percent = {
    Placa: stats.total ? (stats.nonNull.Placa / stats.total * 100) : 0,
    ContratoComercial: stats.total ? (stats.nonNull.ContratoComercial / stats.total * 100) : 0,
    ContratoLocacao: stats.total ? (stats.nonNull.ContratoLocacao / stats.total * 100) : 0,
    Cliente: stats.total ? (stats.nonNull.Cliente / stats.total * 100) : 0
  };

  fs.writeFileSync(OUT_REPORT, JSON.stringify(stats, null, 2));
  console.log('Relatório escrito:', OUT_REPORT);
  console.log('Total:', stats.total);
  console.log('Placa non-null:', stats.nonNull.Placa, `(${stats.percent.Placa.toFixed(2)}%)`);
  console.log('ContratoComercial non-null:', stats.nonNull.ContratoComercial, `(${stats.percent.ContratoComercial.toFixed(2)}%)`);
  console.log('ContratoLocacao non-null:', stats.nonNull.ContratoLocacao, `(${stats.percent.ContratoLocacao.toFixed(2)}%)`);
  console.log('Cliente non-null:', stats.nonNull.Cliente, `(${stats.percent.Cliente.toFixed(2)}%)`);
})();
