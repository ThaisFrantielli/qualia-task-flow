const fs = require('fs');
const path = require('path');
const readline = require('readline');

function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) {}
}

function listExistingParts(outDir, base) {
  const files = fs.readdirSync(outDir);
  return files.filter(f => f.startsWith(base + '_part') && f.endsWith('.json'));
}

async function run() {
  const inPath = process.argv[2];
   const base = process.argv[3] || 'fato_financeiro_dre';
  const outDir = process.argv[4] || path.join(process.cwd(), 'public', 'data');
  const chunkSize = parseInt(process.argv[5] || '10000', 10);
  if (!inPath) {
    console.error('Usage: node ndjson_to_json_parts.js <in.ndjson> [baseName] [outDir] [chunkSize]');
    process.exit(2);
  }
  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    console.error('chunkSize inválido');
    process.exit(2);
  }

  // outDir is configurable by argv[4]. Default remains public/data.
    // outDir is configurable by argv[4]. Default remains public/data.
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Clean old parts + manifest
  for (const f of listExistingParts(outDir, base)) safeUnlink(path.join(outDir, f));
  safeUnlink(path.join(outDir, `${base}_manifest.json`));

  const rs = fs.createReadStream(inPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });

  let partIdx = 1;
  let totalRecords = 0;
  let buffer = [];
  const partFiles = [];

  async function flush() {
    if (buffer.length === 0) return;
    const fileName = `${base}_part${partIdx}of__TOTAL__.json`; // placeholder
    const absPath = path.join(outDir, fileName);
    fs.writeFileSync(absPath, JSON.stringify(buffer), 'utf8');
    partFiles.push(fileName);
    partIdx++;
    buffer = [];
  }

  for await (const line of rl) {
    const l = line && line.trim();
    if (!l) continue;
    try {
      const obj = JSON.parse(l);
      buffer.push(obj);
      totalRecords++;
      if (buffer.length >= chunkSize) await flush();
    } catch (e) {
      // ignore parse errors
    }
  }
  await flush();

  const totalParts = partFiles.length;
  // rename files to include totalParts
  for (let i = 0; i < totalParts; i++) {
    const oldName = partFiles[i];
    const newName = oldName.replace('__TOTAL__', String(totalParts));
    fs.renameSync(path.join(outDir, oldName), path.join(outDir, newName));
    partFiles[i] = newName;
  }

  const manifest = {
    baseFileName: base,
    chunkSize,
    totalParts,
    total_chunks: totalParts,
    totalRecords,
    generated_at: new Date().toISOString(),
    files: partFiles
  };
  fs.writeFileSync(path.join(outDir, `${base}_manifest.json`), JSON.stringify(manifest), 'utf8');

  console.log('OK');
  console.log('in:', inPath);
  console.log('outDir:', outDir);
  console.log('totalRecords:', totalRecords);
  console.log('totalParts:', totalParts);
}

run().catch(e => {
  console.error('Erro ndjson_to_json_parts:', e && e.message ? e.message : e);
  process.exit(1);
});
