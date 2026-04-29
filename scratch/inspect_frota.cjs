const fs = require('fs');
const frotaData = JSON.parse(fs.readFileSync('public/data/dim_frota.json', 'utf8'));
const rows = Array.isArray(frotaData) ? frotaData : frotaData.data;

if (rows && rows.length > 0) {
  console.log('Frota columns:', Object.keys(rows[0]));
  const hasCto = rows.filter(r => r.ContratoComercial || r.Contrato);
  console.log('Frota rows with Cto:', hasCto.length);
  if (hasCto.length > 0) {
    console.log(hasCto.slice(0, 3).map(r => ({ Placa: r.Placa, ContratoComercial: r.ContratoComercial, Contrato: r.Contrato })));
  }
}
