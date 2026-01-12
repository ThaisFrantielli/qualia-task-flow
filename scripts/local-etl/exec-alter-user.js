require('dotenv').config();
const { Client } = require('pg');

const SUPER_USER = process.env.PG_SUPER_USER || 'postgres';
const SUPER_PASS = process.env.PG_SUPER_PASSWORD;
const HOST = process.env.PG_HOST || 'localhost';
const PORT = process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432;
const TARGET_DB = process.env.PG_DATABASE || 'postgres';
const TARGET_USER = 'quality_etl_user';
const NEW_PASS = process.env.PG_PASSWORD || 'F4tu5xy3';

if (!SUPER_PASS) {
  console.error('Erro: defina PG_SUPER_PASSWORD no seu .env com a senha do superuser (postgres).');
  process.exit(1);
}

const client = new Client({ host: HOST, port: PORT, user: SUPER_USER, password: SUPER_PASS, database: TARGET_DB });

(async () => {
  try {
    console.log('Conectando como superuser:', SUPER_USER, '@', HOST + ':' + PORT, 'database:', TARGET_DB);
    await client.connect();
    const sql = `ALTER USER ${TARGET_USER} WITH PASSWORD '${NEW_PASS}';`;
    console.log('Executando:', sql);
    await client.query(sql);
    console.log('Senha alterada com sucesso para usuário', TARGET_USER);
    await client.end();
  } catch (err) {
    console.error('Erro ao executar ALTER USER:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
})();
