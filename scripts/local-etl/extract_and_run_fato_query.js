const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 180000 };
(async()=>{
  const p = path.join(__dirname, 'run-sync-v2.js');
  const s = fs.readFileSync(p, 'utf8');
  const marker = "table: 'fato_financeiro_dre',";
  const idx = s.indexOf(marker);
  if(idx === -1){ console.error('marker not found'); process.exit(1); }
  const after = s.slice(idx);
  const qMarker = "query: `";
  const qi = after.indexOf(qMarker);
  if(qi === -1){ console.error('query marker not found'); process.exit(1); }
  let rest = after.slice(qi + qMarker.length);
  // find closing backtick not escaped (simple approach)
  let closing = -1;
  for(let i=0;i<rest.length;i++){
    if(rest[i] === '`'){
      closing = i; break;
    }
  }
  if(closing === -1){ console.error('closing backtick not found'); process.exit(1); }
  const query = rest.slice(0, closing);
  // Evaluate ${castM('...')} placeholders by reconstructing the SQL fragment
  function castMjs(col){
    return `(
    CASE
        WHEN CHARINDEX(',', ISNULL(CAST(${col} AS VARCHAR), '')) > 0
            THEN TRY_CAST(REPLACE(REPLACE(ISNULL(CAST(${col} AS VARCHAR), '0'), '.', ''), ',', '.') AS DECIMAL(15,2))
        ELSE TRY_CAST(ISNULL(${col}, 0) AS DECIMAL(15,2))
    END
)`;
  }
  const queryWithCast = query.replace(/\$\{castM\('([^']*)'\)\}/g, (_, g1)=> castMjs(g1));
  console.log('--- extracted query preview (first 400 chars) ---');
  console.log(query.slice(0,400));
  console.log('--- preparing cleaned query (remove trailing OPTION/ORDER BY) ---');
  let cleaned = queryWithCast.replace(/OPTION\s*\([^)]*\)\s*$/i, '');
  // remove final ORDER BY ... if present
  cleaned = cleaned.replace(/ORDER\s+BY[\s\S]*$/i, '');
  let testQ;
  // write cleaned query to temp file for inspection
  const outPath = path.join(__dirname, 'tmp_fato_query.sql');
  fs.writeFileSync(outPath, cleaned, 'utf8');
  console.log('Wrote cleaned query to', outPath);
  console.log('Preview (first 4000 chars):\n');
  console.log(cleaned.slice(0,4000));
  process.exit(0);
})();
