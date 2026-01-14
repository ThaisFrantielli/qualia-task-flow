// supabase/functions/query-timeline-aggregated/index.ts
// Edge Function que retorna timeline agregada por veículo (evita 106k registros)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Cache em memória
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = Deno.env.get("LOCAL_DB_URL");
    if (!connectionString) {
      throw new Error("LOCAL_DB_URL não configurada");
    }
    pool = new Pool(connectionString, 2, true);
  }
  return pool;
}

// Converte BigInt para Number para serialização JSON
function serializableData(rows: unknown[]): unknown[] {
  return rows.map(row => {
    if (typeof row !== 'object' || row === null) return row;
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      newRow[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return newRow;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { placa, mode = 'aggregated' } = body;

    // Verificar cache
    const cacheKey = `timeline_${mode}_${placa || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`[query-timeline-aggregated] Cache HIT`);
      return new Response(
        JSON.stringify(cached.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" } }
      );
    }

    const dbPool = getPool();
    const connection = await dbPool.connect();

    try {
      let result;

      if (mode === 'aggregated') {
        // Modo agregado: retorna KPIs por veículo
        // Colunas corretas do ETL: TipoEvento, DataEvento (sem aliases)
        const query = `
          WITH timeline_stats AS (
            SELECT 
              "Placa",
              MIN(CASE WHEN "TipoEvento" IN ('COMPRA', 'Compra') THEN "DataEvento" END) as data_compra,
              MAX(CASE WHEN "TipoEvento" IN ('VENDA', 'Venda') THEN "DataEvento" END) as data_venda,
              COUNT(CASE WHEN "TipoEvento" IN ('LOCACAO', 'Locação', 'Início Locação', 'InicioLocacao') THEN 1 END) as qtd_locacoes,
              COUNT(CASE WHEN "TipoEvento" IN ('MANUTENCAO', 'Manutenção', 'Entrada Manutenção', 'EntradaManutencao') THEN 1 END) as qtd_manutencoes,
              COUNT(CASE WHEN "TipoEvento" IN ('SINISTRO', 'Sinistro', 'Acidente') THEN 1 END) as qtd_sinistros,
              COUNT(*) as total_eventos,
              MIN("DataEvento") as primeiro_evento,
              MAX("DataEvento") as ultimo_evento
            FROM hist_vida_veiculo_timeline
            ${placa ? `WHERE "Placa" = $1` : ''}
            GROUP BY "Placa"
          )
          SELECT 
            ts.*,
            EXTRACT(DAY FROM (COALESCE(ts.data_venda, CURRENT_DATE) - ts.data_compra)) as dias_vida,
            f."Modelo",
            f."Montadora",
            f."Status",
            f."ValorCompra" as "ValorAquisicao",
            f."KM" as "KmAtual"
          FROM timeline_stats ts
          LEFT JOIN dim_frota f ON ts."Placa" = f."Placa"
          ORDER BY ts."Placa"
          LIMIT 10000
        `;

        result = placa 
          ? await connection.queryObject(query, [placa])
          : await connection.queryObject(query);
          
      } else if (mode === 'recent') {
        // Modo recente: últimos 12 meses de eventos
        // Colunas corretas do ETL: Placa, TipoEvento, DataEvento, Modelo, Cliente, etc.
        const query = `
          SELECT 
            "Placa", 
            "TipoEvento",
            "DataEvento",
            "Modelo",
            "Cliente",
            "Situacao",
            "Observacao"
          FROM hist_vida_veiculo_timeline
          WHERE "DataEvento" >= CURRENT_DATE - INTERVAL '12 months'
          ${placa ? `AND "Placa" = $1` : ''}
          ORDER BY "DataEvento" DESC
          LIMIT 15000
        `;
        
        result = placa 
          ? await connection.queryObject(query, [placa])
          : await connection.queryObject(query);
          
      } else if (mode === 'vehicle' && placa) {
        // Modo veículo específico: todos os eventos de uma placa com todos os detalhes
        const query = `
          SELECT 
            "Placa", 
            "TipoEvento",
            "DataEvento",
            "Modelo",
            "Marca",
            "Cliente",
            "Situacao",
            "ValorMensal",
            "CustoTotal",
            "Observacao",
            "ContratoLocacao",
            "Fornecedor"
          FROM hist_vida_veiculo_timeline
          WHERE "Placa" = $1
          ORDER BY "DataEvento" DESC
          LIMIT 1000
        `;
        
        result = await connection.queryObject(query, [placa]);
      } else {
        throw new Error("Modo inválido ou placa não fornecida para modo 'vehicle'");
      }

      console.log(`[query-timeline-aggregated] ${result.rows.length} registros (mode=${mode})`);

      // Converter BigInt para Number antes de serializar
      const safeRows = serializableData(result.rows);
      
      const responseData = {
        success: true,
        data: safeRows,
        count: safeRows.length,
        mode,
        timestamp: new Date().toISOString(),
      };

      // Salvar no cache
      cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" } }
      );

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("[query-timeline-aggregated] Erro:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
