const fs = require('fs');
const ctoData = JSON.parse(fs.readFileSync('public/data/dim_contratos_locacao.json', 'utf8'));
const ctoRows = Array.isArray(ctoData) ? ctoData : (ctoData.data || []);
if (ctoRows && ctoRows.length > 0) {
  const keys = Object.keys(ctoRows[0]);
  const franquiaKeys = keys.filter(k => k.toLowerCase().includes('franquia'));
  console.log('Franquia keys in CTO:', franquiaKeys);
}

const frotaData = JSON.parse(fs.readFileSync('public/data/dim_frota.json', 'utf8'));
const frotaRows = Array.isArray(frotaData) ? frotaData : frotaData.data;
if (frotaRows && frotaRows.length > 0) {
  const keys = Object.keys(frotaRows[0]);
  const franquiaKeys = keys.filter(k => k.toLowerCase().includes('franquia'));
  console.log('Franquia keys in Frota:', franquiaKeys);
}
