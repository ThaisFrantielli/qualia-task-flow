const fs = require('fs');
const p = require('path').join(__dirname, 'run-sync-v2.js');
const s = fs.readFileSync(p, 'utf8');
const bt = s.match(/`/g) || [];
console.log('total_backticks =', bt.length);
const lines = s.split('\n');
const hits = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('`')) hits.push({ line: i + 1, text: lines[i].trim() });
}
console.log('lines_with_backtick =', hits.length);
console.log(hits.slice(0, 80));
