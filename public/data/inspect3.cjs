const fs = require('fs');
const txt = fs.readFileSync('dim_frota.json', 'utf8');
let j;
try { j = JSON.parse(txt); } catch(e) { console.log('parse error'); process.exit(1); }
const arr = Array.isArray(j) ? j : (j.data || []);
if (arr.length === 0) { console.log('empty'); process.exit(1); }
const s = arr[0];
for (const k of Object.keys(s)) {
  console.log(`${k}: ${JSON.stringify(s[k])}`);
}
