require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host: process.env.PG_HOST || '127.0.0.1',
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  user: (process.env.PG_USER || '').toLowerCase().trim(),
  password: (process.env.PG_PASSWORD || '').trim(),
  database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
});

(async () => {
  try {
    console.log('Tentando conectar com:', {
      host: client.host,
      port: client.port,
      user: client.user,
      database: client.database,
    });
    await client.connect();
    const res = await client.query('SELECT version()');
    console.log('Conectado com sucesso, versão:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Erro ao conectar PostgreSQL:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
})();
