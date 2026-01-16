#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'public', 'data');

function safeReadJSON(p) {
  if (!fs.existsSync(p)) return null;
  try {
    const s = fs.readFileSync(p, 'utf8');
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function assembleParts(base) {
  const manifestPath = path.join(dataDir, `${base}_manifest.json`);
  let arr = [];
  if (fs.existsSync(manifestPath)) {
    const manifest = safeReadJSON(manifestPath) || {};
    const total = manifest.total_chunks || manifest.totalParts || manifest.totalParts || manifest.totalParts || manifest.total || 0;
    if (total && total > 0) {
      for (let i = 1; i <= total; i++) {
        const part = path.join(dataDir, `${base}_part${i}of${total}.json`);
        const p = safeReadJSON(part);
        if (p == null) {
          console.error('missing or invalid part', part);
          return null;
        }
        if (Array.isArray(p)) arr = arr.concat(p);
        else if (p && Array.isArray(p.data)) arr = arr.concat(p.data);
        else if (typeof p === 'object') arr.push(p);
      }
      return arr;
    }
  }

  const single = safeReadJSON(path.join(dataDir, `${base}.json`));
  if (Array.isArray(single)) return single;
  if (single && Array.isArray(single.data)) return single.data;
  return [];
}

(function main(){
  const timeline = assembleParts('hist_vida_veiculo_timeline') || [];
  const dimRaw = safeReadJSON(path.join(dataDir, 'dim_frota.json')) || [];
  const dim = Array.isArray(dimRaw) ? dimRaw : (dimRaw.data || []);

  const normalize = s => String(s || '').trim().toUpperCase();
  const present = new Set(timeline.map(it => normalize(it.Placa || it.placa)));
  const missing = dim.filter(d => d && d.Placa && !present.has(normalize(d.Placa)));
  const missingPlates = missing.map(d => normalize(d.Placa));

  console.log('dim_frota count:', dim.length);
  console.log('timeline count:', timeline.length);
  console.log('in dim but not timeline:', missingPlates.length);
  console.log(missingPlates.join(','));
  console.log('merged count (timeline + missing):', timeline.length + missingPlates.length);
})();
