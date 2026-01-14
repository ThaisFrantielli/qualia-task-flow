// supabase/functions/query-local-db/index.ts
// Edge Function que serve como ponte segura para o banco de dados local via Playit.gg

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Lista de tabelas permitidas (whitelist de segurança)
const ALLOWED_TABLES = [
  // Dimensões
  "dim_clientes",
  "dim_frota", 
  "dim_veiculos",
  "dim_motoristas",
  "dim_fornecedores",
  "dim_servicos",
  "dim_tempo",
  "dim_movimentacao_patios",
  "dim_movimentacao_veiculos",
  "dim_contratos_locacao",
  "dim_compras",
  "dim_alienacoes",
  // Fatos
  "fat_faturamentos",
  "fat_faturamento",
  "fat_financeiro",
  "fat_financeiro_universal",
  "fat_manutencoes",
  "fat_manutencao_unificado",
  "fat_abastecimentos",
  "fat_multas",
  "fat_sinistros",
  "fat_telemetria",
  "fat_os",
  "fat_carro_reserva",
  "fat_movimentacao_ocorrencias",
  "fat_churn",
  "fat_inadimplencia",
  "fat_vendas",
  "fat_lancamentos",
  "fat_propostas",
  // Histórico
  "hist_vida_veiculo_timeline",
  "historico_situacao_veiculos",
  // Outros
  "alienacoes",
  "auditoria_consolidada",
  "rentabilidade_360_geral",
  // Agregações
  "agg_dre_mensal",
  "agg_indicadores_frota",
  "agg_custos_veiculo",
  // Views
  "vw_dashboard_financeiro",
  "vw_dashboard_frota",
  "vw_dashboard_manutencao",
];

// Pool de conexões - será inicializado sob demanda
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = Deno.env.get("LOCAL_DB_URL");
    if (!connectionString) {
      throw new Error("LOCAL_DB_URL não configurada");
    }
    pool = new Pool(connectionString, 3, true);
  }
  return pool;
}

serve(async (req) => {
  // Tratamento CORS para preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tableName, limit, offset, filters } = await req.json();

    // Validação de segurança: só permitir tabelas na whitelist
    if (!tableName || typeof tableName !== "string") {
      throw new Error("tableName é obrigatório");
    }

    const normalizedTable = tableName.toLowerCase().trim();
    if (!ALLOWED_TABLES.includes(normalizedTable)) {
      throw new Error(`Tabela '${tableName}' não permitida. Tabelas disponíveis: ${ALLOWED_TABLES.join(", ")}`);
    }

    // Construir query com paginação opcional
    let query = `SELECT * FROM ${normalizedTable}`;
    
    // Adicionar filtros básicos se fornecidos (ex: { "ano": 2024 })
    if (filters && typeof filters === "object" && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters)
        .map(([key, value], idx) => {
          // Sanitizar nome da coluna (apenas letras, números e underscore)
          const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "");
          return `${safeKey} = $${idx + 1}`;
        });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Ordenação padrão se existir coluna de data
    query += ` ORDER BY 1`;

    // Paginação - aplicar limite padrão para tabelas grandes
    const defaultLimit = 25000; // Limite padrão para evitar CPU timeout
    const maxLimit = 50000;
    
    if (limit && Number.isInteger(limit) && limit > 0) {
      query += ` LIMIT ${Math.min(limit, maxLimit)}`;
    } else {
      // Aplicar limite padrão se não especificado
      query += ` LIMIT ${defaultLimit}`;
    }
    if (offset && Number.isInteger(offset) && offset >= 0) {
      query += ` OFFSET ${offset}`;
    }

    console.log(`[query-local-db] Executando: ${query}`);

    // Obter conexão do pool
    const dbPool = getPool();
    const connection = await dbPool.connect();

    try {
      // Executar query
      const filterValues = filters ? Object.values(filters) : [];
      const result = await connection.queryObject(query, filterValues);
      
      console.log(`[query-local-db] ${result.rows.length} registros retornados de '${normalizedTable}'`);

      return new Response(
        JSON.stringify({
          success: true,
          data: result.rows,
          count: result.rows.length,
          table: normalizedTable,
          timestamp: new Date().toISOString(),
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300", // Cache de 5 minutos
          } 
        }
      );
    } finally {
      // Sempre liberar a conexão de volta para o pool
      connection.release();
    }

  } catch (error) {
    console.error("[query-local-db] Erro:", error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isConnectionError = errorMessage.includes("connection") || 
                              errorMessage.includes("timeout") ||
                              errorMessage.includes("ECONNREFUSED");

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        hint: isConnectionError 
          ? "Verifique se o túnel Playit.gg está ativo e o PostgreSQL local está rodando"
          : undefined,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: isConnectionError ? 503 : 400,
      }
    );
  }
});
