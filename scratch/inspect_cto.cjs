const fs = require('fs');
const frotaData = JSON.parse(fs.readFileSync('public/data/dim_frota.json', 'utf8'));
const rows = Array.isArray(frotaData) ? frotaData : frotaData.data;

if (rows && rows.length > 0) {
  console.log('Frota sample Contratos:');
  console.log(rows.slice(0, 5).map(r => ({ Placa: r.Placa, ContratoComercial: r.ContratoComercial, Contrato: r.Contrato })));
}

const ctoData = JSON.parse(fs.readFileSync('public/data/dim_contratos_locacao.json', 'utf8'));
const ctoRows = Array.isArray(ctoData) ? ctoData : (ctoData.data || []);
if (ctoRows && ctoRows.length > 0) {
  console.log('CTO sample Contratos:');
  console.log(ctoRows.slice(0, 5).map(r => ({ ContratoComercial: r.ContratoComercial, IdContratoLocacao: r.IdContratoLocacao })));
}
