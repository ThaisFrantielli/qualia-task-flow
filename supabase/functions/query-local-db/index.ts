// supabase/functions/query-local-db/index.ts
// Edge Function que serve como ponte segura para o banco de dados Neon

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
  // Histórico - DESABILITADO (muito grande)
  // "hist_vida_veiculo_timeline",
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

// Limites específicos por tabela (registros máximos)
const TABLE_LIMITS: Record<string, number> = {
  "fat_manutencao_unificado": 15000,
  "fat_movimentacao_ocorrencias": 15000,
  "fat_multas": 15000,
  "fat_sinistros": 10000,
  "dim_frota": 10000,
  "dim_contratos_locacao": 10000,
};

// Cache em memória simples (por instância)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

// Pool de conexões - será inicializado sob demanda
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = Deno.env.get("LOCAL_DB_URL");
    if (!connectionString) {
      throw new Error("LOCAL_DB_URL não configurada");
    }
    pool = new Pool(connectionString, 2, true); // Reduzido para 2 conexões
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
      throw new Error(`Tabela '${tableName}' não permitida`);
    }

    // Verificar cache
    const cacheKey = `${normalizedTable}_${JSON.stringify(filters || {})}`;
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`[query-local-db] Cache HIT para '${normalizedTable}'`);
      return new Response(
        JSON.stringify(cached.data),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Cache": "HIT",
          } 
        }
      );
    }

    // Determinar limite para esta tabela
    const tableLimit = TABLE_LIMITS[normalizedTable] || 10000;
    const maxLimit = 15000;
    const effectiveLimit = Math.min(limit || tableLimit, maxLimit);

    // Construir query com paginação
    let query = `SELECT * FROM ${normalizedTable}`;
    
    // Adicionar filtros básicos se fornecidos
    if (filters && typeof filters === "object" && Object.keys(filters).length > 0) {
      const conditions = Object.entries(filters)
        .map(([key], idx) => {
          const safeKey = key.replace(/[^a-zA-Z0-9_]/g, "");
          return `${safeKey} = $${idx + 1}`;
        });
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY 1 LIMIT ${effectiveLimit}`;
    
    if (offset && Number.isInteger(offset) && offset >= 0) {
      query += ` OFFSET ${offset}`;
    }

    console.log(`[query-local-db] Executando: ${query}`);

    // Obter conexão do pool
    const dbPool = getPool();
    const connection = await dbPool.connect();

    try {
      const filterValues = filters ? Object.values(filters) : [];
      const result = await connection.queryObject(query, filterValues);
      
      console.log(`[query-local-db] ${result.rows.length} registros de '${normalizedTable}'`);

      const responseData = {
        success: true,
        data: result.rows,
        count: result.rows.length,
        table: normalizedTable,
        timestamp: new Date().toISOString(),
        limited: result.rows.length >= effectiveLimit,
      };

      // Salvar no cache
      cache.set(cacheKey, { data: responseData, timestamp: Date.now() });

      return new Response(
        JSON.stringify(responseData),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "X-Cache": "MISS",
          } 
        }
      );
    } finally {
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
          ? "Verifique se o banco Neon está acessível"
          : undefined,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: isConnectionError ? 503 : 400,
      }
    );
  }
});
