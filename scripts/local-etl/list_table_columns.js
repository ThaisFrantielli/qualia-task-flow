require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const sql = require('mssql');
const sqlConfig = { user: process.env.SQL_USER, password: process.env.SQL_PASSWORD, server: process.env.SQL_SERVER || '200.219.192.34', port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT,10) : 3494, database: process.env.SQL_DATABASE || 'blufleet-dw', options: { encrypt: false, trustServerCertificate: true }, requestTimeout: 120000 };
(async()=>{
  const pool = await sql.connect(sqlConfig);
  const tables = ['VeiculosComprados','VeiculosVendidos','OrdensServico','ContratosLocacao','Veiculos','Faturamentos','FaturamentoItems','ContratosComerciais','Clientes','NotasFiscais'];
  for(const t of tables){
    const q = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${t}' ORDER BY ORDINAL_POSITION`;
    try{
      const r = await pool.request().query(q);
      console.log('---', t, '---');
      console.log(r.recordset.map(x=>x.COLUMN_NAME).join(', '));
    }catch(e){
      console.log('Erro listando', t, e.message);
    }
  }
  await pool.close();
})().catch(e=>{console.error('Erro geral', e.message); process.exit(1)});
