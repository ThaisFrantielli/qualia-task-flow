const fs = require('fs');
const path = require('path');
let file = path.resolve(__dirname, 'local-etl', 'public', 'data', 'fat_sinistros.json');
// fallback to top-level public/data if file not found
if (!fs.existsSync(file)) {
  const alt = path.resolve(__dirname, '..', 'public', 'data', 'fat_sinistros.json');
  if (fs.existsSync(alt)) file = alt;
}
try {
  const raw = fs.readFileSync(file, 'utf8');
  let data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    // try to locate an array inside the object
    const arr = Object.values(data).find(v => Array.isArray(v));
    if (arr) data = arr;
  }
  const placa = process.argv[2] || 'SGN-8G42';
  const matches = data.filter(r => String(r.Placa).toUpperCase() === placa.toUpperCase());
  console.log(JSON.stringify(matches, null, 2));
} catch (err) {
  console.error('ERROR', err && err.message);
  process.exit(1);
}
