const fs = require('fs');
const path = require('path');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function safeReadJSON(file) {
  try {
    return readJSON(file);
  } catch (e) {
    console.error('Erro lendo', file, e.message);
    return null;
  }
}

function assembleParts(base) {
  const manifestFile = path.join(__dirname, '..', 'public', 'data', `${base}_manifest.json`);
  if (!fs.existsSync(manifestFile)) return null;
  const manifest = safeReadJSON(manifestFile);
  const total = manifest?.totalParts || manifest?.total_chunks || manifest?.totalChunks || manifest?.totalRecords || 0;
  if (!total) {
    console.warn('Manifest sem totalParts, tentando arquivo único...');
    const single = path.join(__dirname, '..', 'public', 'data', `${base}.json`);
    if (fs.existsSync(single)) return safeReadJSON(single);
    return null;
  }
  const parts = [];
  for (let i = 1; i <= total; i++) {
    const p = path.join(__dirname, '..', 'public', 'data', `${base}_part${i}of${total}.json`);
    if (!fs.existsSync(p)) {
      console.error('Parte ausente', p);
      return null;
    }
    const j = safeReadJSON(p);
    if (Array.isArray(j)) parts.push(...j);
    else if (j && Array.isArray(j.data)) parts.push(...j.data);
    else parts.push(j);
  }
  return parts;
}

function main() {
  const root = path.join(__dirname, '..', 'public', 'data');
  const dimFrotaFile = path.join(root, 'dim_frota.json');
  if (!fs.existsSync(dimFrotaFile)) { console.error('Arquivo dim_frota.json não encontrado'); process.exit(1); }

  let dim = safeReadJSON(dimFrotaFile) || [];
  if (dim && dim.data && Array.isArray(dim.data)) dim = dim.data;
  if (!Array.isArray(dim)) { console.error('dim_frota não é array'); process.exit(1); }

  const timeline = assembleParts('hist_vida_veiculo_timeline') || assembleParts('timeline_aggregated') || safeReadJSON(path.join(root, 'timeline_aggregated.json')) || [];
  if (!Array.isArray(timeline)) {
    console.error('timeline não é array');
    process.exit(1);
  }

  const getPlate = (r) => (r.Placa || r.placa || r.plate || r.Plate || '').toString().trim().toUpperCase();

  const setDim = new Set(dim.map(getPlate).filter(Boolean));
  const setTimeline = new Set(timeline.map(getPlate).filter(Boolean));

  const inDimNotTimeline = [...setDim].filter(x => !setTimeline.has(x));
  const inTimelineNotDim = [...setTimeline].filter(x => !setDim.has(x));

  console.log('dim_frota count:', setDim.size);
  console.log('timeline count:', setTimeline.size);
  console.log('in dim but not timeline:', inDimNotTimeline.length);
  console.log('in timeline but not dim:', inTimelineNotDim.length);

  if (inDimNotTimeline.length) console.log('Placas em dim_frota mas não no timeline (até 50):', inDimNotTimeline.slice(0,50));
  if (inTimelineNotDim.length) console.log('Placas em timeline mas não em dim_frota (até 50):', inTimelineNotDim.slice(0,50));
}

main();
