require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || '200.219.192.34',
    port: 3494,
    database: process.env.SQL_DATABASE || 'blufleet-dw',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 0
};

async function run() {
    const pool = await sql.connect(sqlConfig);
    console.log('Iniciando COUNT(*) com JOINs (fato_financeiro_dre)');
    const start = Date.now();
    const res = await pool.request().query(`
        SELECT COUNT(*) as cnt
                FROM LancamentosComNaturezas ln WITH (NOLOCK, INDEX(0))
                OUTER APPLY (
                        SELECT TOP 1 os.Placa, os.Cliente, os.IdCliente, os.ContratoComercial, os.ContratoLocacao
                        FROM OrdensServico os WITH (NOLOCK)
                        WHERE ln.OrdemCompra IS NOT NULL AND LEN(LTRIM(RTRIM(ln.OrdemCompra))) > 0
                            AND ln.OrdemCompra = os.OrdemCompra
                            AND os.SituacaoOrdemServico <> 'Cancelada'
                        ORDER BY os.DataInicioServico DESC
                ) os
                LEFT JOIN Clientes cli WITH (NOLOCK) ON os.IdCliente = cli.IdCliente
    `);
    const duration = (Date.now() - start) / 1000;
    console.log('COUNT result:', res.recordset[0].cnt, 'duration(s):', duration);
    await pool.close();
}

run().catch(e=>{ console.error('Erro:', e.message); process.exit(1)});
