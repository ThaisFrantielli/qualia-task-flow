import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tabelas permitidas para query via FDW (whitelist de segurança)
const ALLOWED_TABLES = new Set([
  "dim_clientes",
  "dim_frota",
  "dim_condutores",
  "dim_fornecedores",
  "dim_contratos_locacao",
  "dim_itens_contrato",
  "dim_regras_contrato",
  "dim_veiculos_acessorios",
  "fat_faturamentos",
  "fat_detalhe_itens_os",
  "fat_ocorrencias_master",
  "fat_financeiro_universal",
  "agg_dre_mensal",
  "fat_churn",
  "fat_inadimplencia",
  "fat_manutencao_unificado",
  "fat_manutencao_completa",
  "hist_vida_veiculo_timeline",
]);

interface QueryRequest {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  order?: { column: string; ascending?: boolean };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const body: QueryRequest = await req.json();
    const { table, select = "*", filters, limit = 1000, offset = 0, order } = body;

    // Validar tabela (whitelist)
    if (!table || !ALLOWED_TABLES.has(table)) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid or unauthorized table",
          allowed_tables: Array.from(ALLOWED_TABLES)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Construir query
    let query = supabase
      .from(table)
      .select(select, { count: "exact" })
      .range(offset, offset + limit - 1);

    // Aplicar filtros (apenas filtros simples por segurança)
    if (filters && typeof filters === "object") {
      for (const [key, value] of Object.entries(filters)) {
        // Sanitizar key - apenas letras, números e underscore
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");
        if (sanitizedKey && value !== undefined && value !== null) {
          query = query.eq(sanitizedKey, value);
        }
      }
    }

    // Aplicar ordenação
    if (order?.column) {
      const sanitizedColumn = order.column.replace(/[^a-zA-Z0-9_]/g, "");
      if (sanitizedColumn) {
        query = query.order(sanitizedColumn, { ascending: order.ascending ?? true });
      }
    }

    const startTime = Date.now();
    const { data, error, count } = await query;
    const latency = Date.now() - startTime;

    if (error) {
      // Se FDW falhar, retornar erro com sugestão de fallback
      return new Response(
        JSON.stringify({ 
          error: error.message,
          fallback_hint: `Use Storage: bi-reports/${table}.json`,
          fdw_available: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        data,
        count,
        latency_ms: latency,
        source: "fdw",
        table,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
