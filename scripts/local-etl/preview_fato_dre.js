const fs = require('fs');
const path = 'c:/Users/frant/Documents/public/data/fato_financeiro_dre_part1of19.json';
try {
  const raw = fs.readFileSync(path, 'utf8').trim();
  if (!raw) return console.log('Arquivo vazio');
  const js = JSON.parse(raw);
  console.log('Total registros neste arquivo:', Array.isArray(js)?js.length: 'not array');
  const first = Array.isArray(js)? js[0] : (js[0] || js);
  console.log('Chaves do primeiro registro:');
  console.log(Object.keys(first));
} catch (e) {
  console.error('Erro lendo arquivo:', e.message);
}
