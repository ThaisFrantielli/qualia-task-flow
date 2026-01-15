#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Uso: node scripts/split-json.js <input.json> [--maxMB=90]');
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.length < 1) usage();

const inputPath = argv[0];
let maxMB = 90;
for (const a of argv.slice(1)) {
  if (a.startsWith('--maxMB=')) maxMB = Number(a.split('=')[1]) || maxMB;
}

if (!fs.existsSync(inputPath)) {
  console.error('Arquivo não encontrado:', inputPath);
  process.exit(2);
}

const raw = fs.readFileSync(inputPath, 'utf8');
let data;
try { data = JSON.parse(raw); } catch (err) {
  console.error('Falha ao parsear JSON:', err.message);
  process.exit(3);
}

const maxBytes = Math.max(1, Math.floor(maxMB * 1024 * 1024));
const dir = path.dirname(inputPath);
const base = path.basename(inputPath, path.extname(inputPath));

function writeChunk(items, idx) {
  const outName = path.join(dir, `${base}.part${idx}${path.extname(inputPath)}`);
  fs.writeFileSync(outName, JSON.stringify(items), 'utf8');
  console.log('Escrito:', outName, '->', `${(fs.statSync(outName).size/1024/1024).toFixed(2)} MB`);
}

if (Array.isArray(data)) {
  let chunk = [];
  let chunkBytes = 2; // for brackets []
  let idx = 1;
  for (const item of data) {
    const s = JSON.stringify(item);
    const itemBytes = Buffer.byteLength(s, 'utf8') + (chunk.length ? 1 : 0); // comma
    if (chunkBytes + itemBytes > maxBytes && chunk.length > 0) {
      writeChunk(chunk, idx);
      idx++;
      chunk = [];
      chunkBytes = 2;
    }
    chunk.push(item);
    chunkBytes += itemBytes;
  }
  if (chunk.length) writeChunk(chunk, idx);
  console.log('Concluído. Partes criadas na mesma pasta do arquivo original.');
} else if (typeof data === 'object' && data !== null) {
  // split object by keys
  const entries = Object.entries(data);
  let chunk = {};
  let chunkBytes = 2; // braces
  let idx = 1;
  for (const [k,v] of entries) {
    const pair = JSON.stringify({[k]: v}).slice(1, -1); // "k":value
    const itemBytes = Buffer.byteLength(pair, 'utf8') + (Object.keys(chunk).length ? 1 : 0);
    if (chunkBytes + itemBytes > maxBytes && Object.keys(chunk).length > 0) {
      writeChunk(chunk, idx);
      idx++;
      chunk = {};
      chunkBytes = 2;
    }
    chunk[k] = v;
    chunkBytes += itemBytes;
  }
  if (Object.keys(chunk).length) writeChunk(chunk, idx);
  console.log('Concluído. Objetos-partes criados na mesma pasta do arquivo original.');
} else {
  console.error('Formato JSON não suportado para fatiamento:', typeof data);
  process.exit(4);
}
