#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'public', 'data');

function safeReadJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

function assembleParts(base) {
  const manifestPath = path.join(dataDir, `${base}_manifest.json`);
  let arr = [];
  if (fs.existsSync(manifestPath)) {
    const manifest = safeReadJSON(manifestPath) || {};
    const total = manifest.total_chunks || manifest.totalParts || manifest.totalParts || manifest.total || 0;
    if (total && total > 0) {
      for (let i = 1; i <= total; i++) {
        const part = path.join(dataDir, `${base}_part${i}of${total}.json`);
        const p = safeReadJSON(part);
        if (p == null) { console.error('missing part', part); return null; }
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

function normalize(s){ return String(s||'').trim().toUpperCase(); }

(function main(){
  const timeline = assembleParts('hist_vida_veiculo_timeline') || [];
  const dimRaw = safeReadJSON(path.join(dataDir, 'dim_frota.json')) || [];
  const dim = Array.isArray(dimRaw) ? dimRaw : (dimRaw.data || []);

  const dimMap = new Map();
  for (const d of dim) {
    if (!d || !d.Placa) continue;
    dimMap.set(normalize(d.Placa), { raw: d, Status: normalize(d.Status||d.status||'') });
  }

  // Unique plates in timeline
  const timelinePlates = new Map();
  for (const t of timeline) {
    if (!t) continue;
    const p = normalize(t.Placa || t.placa || t.PlacaVeiculo || '');
    if (!p) continue;
    if (!timelinePlates.has(p)) {
      timelinePlates.set(p, { sample: t, count: 1 });
    } else timelinePlates.get(p).count++;
  }

  const dimCounts = {};
  for (const [pl, info] of dimMap.entries()) {
    const s = info.Status || 'UNKNOWN';
    dimCounts[s] = (dimCounts[s] || 0) + 1;
  }

  const timelineUniqueCount = timelinePlates.size;

  // timeline status using dim_frota when available else unknown
  const timelineCounts = {};
  for (const pl of timelinePlates.keys()) {
    const dimInfo = dimMap.get(pl);
    const s = dimInfo ? (dimInfo.Status || 'UNKNOWN') : 'UNKNOWN';
    timelineCounts[s] = (timelineCounts[s] || 0) + 1;
  }

  // plates in dim but not in timeline
  const missing = [];
  for (const [pl, info] of dimMap.entries()) {
    if (!timelinePlates.has(pl)) missing.push({ Placa: pl, Status: info.Status || 'UNKNOWN' });
  }

  // plates present in both but with status mismatch? timeline status derived from dim so will match; but if timeline has its own Status field, compare
  const statusMismatch = [];
  for (const [pl, tinfo] of timelinePlates.entries()) {
    const tSample = tinfo.sample;
    const timelineStatus = normalize(tSample.Status || tSample.status || '');
    const dimInfo = dimMap.get(pl);
    const dimStatus = dimInfo ? dimInfo.Status : '';
    if (dimInfo && timelineStatus && dimStatus && timelineStatus !== dimStatus) {
      statusMismatch.push({ Placa: pl, timelineStatus, dimStatus });
    }
  }

  console.log('dim_frota total plates:', dim.length);
  console.log('unique timeline plates:', timelineUniqueCount);
  console.log('\nCounts in dim_frota by Status:');
  console.table(dimCounts);
  console.log('\nCounts in timeline (status from dim_frota when present):');
  console.table(timelineCounts);
  console.log('\nPlates in dim_frota but missing in timeline:', missing.length);
  if (missing.length) console.log(missing.map(m=>`${m.Placa} (${m.Status})`).join(', '));
  console.log('\nStatus mismatches (timeline vs dim):', statusMismatch.length);
  if (statusMismatch.length) console.log(statusMismatch.slice(0,50));

  // merged counts if we union plates and take dim status when present
  const unionMap = new Map();
  for (const [pl, info] of dimMap.entries()) unionMap.set(pl, info.Status||'UNKNOWN');
  for (const pl of timelinePlates.keys()) if (!unionMap.has(pl)) unionMap.set(pl, 'UNKNOWN');
  const unionCounts = {}; for (const s of unionMap.values()) unionCounts[s] = (unionCounts[s]||0)+1;
  console.log('\nMerged union counts (dim status preferred):'); console.table(unionCounts);
})();
