require('dotenv').config();
const { Pool } = require('pg');

const pgConfig = {
    host: process.env.PG_HOST || '127.0.0.1',
    port: process.env.PG_PORT || 5432,
    user: (process.env.PG_USER || '').toLowerCase().trim(),
    password: (process.env.PG_PASSWORD || '').trim(),
    database: (process.env.PG_DATABASE || 'bluconecta_dw').toLowerCase().trim(),
};

async function fixOrphanedTypes() {
    const pool = new Pool(pgConfig);
    
    try {
        console.log('🔍 Buscando tipos órfãos no PostgreSQL...\n');
        
        // Encontrar tipos de tabela órfãos (tipos criados automaticamente para colunas array mas cujas tabelas não existem mais)
        const orphanedTypes = await pool.query(`
            SELECT 
                t.typname,
                t.typtype,
                n.nspname,
                t.oid
            FROM pg_type t
            JOIN pg_namespace n ON t.typnamespace = n.oid
            WHERE n.nspname = 'public'
            AND t.typtype IN ('c', 'e')  -- composite types and enums
            AND t.typname LIKE 'fat_%' OR t.typname LIKE 'dim_%' OR t.typname LIKE 'agg_%'
            AND NOT EXISTS (
                SELECT 1 
                FROM pg_class c 
                WHERE c.relname = t.typname 
                AND c.relnamespace = n.oid
            )
            ORDER BY t.typname;
        `);

        if (orphanedTypes.rows.length === 0) {
            console.log('✅ Nenhum tipo órfão encontrado!');
            await pool.end();
            return;
        }

        console.log(`⚠️  Encontrados ${orphanedTypes.rows.length} tipos órfãos:\n`);
        orphanedTypes.rows.forEach(row => {
            console.log(`  - ${row.nspname}.${row.typname} (tipo: ${row.typtype}, oid: ${row.oid})`);
        });

        console.log('\n🗑️  Removendo tipos órfãos...\n');

        for (const row of orphanedTypes.rows) {
            try {
                await pool.query(`DROP TYPE IF EXISTS public."${row.typname}" CASCADE`);
                console.log(`  ✅ Removido: ${row.typname}`);
            } catch (err) {
                console.log(`  ❌ Erro ao remover ${row.typname}: ${err.message}`);
            }
        }

        console.log('\n✅ Limpeza concluída!');
        await pool.end();

    } catch (err) {
        console.error('❌ Erro:', err.message);
        await pool.end();
        process.exit(1);
    }
}

fixOrphanedTypes();
