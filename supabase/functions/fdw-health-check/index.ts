import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthCheckResult {
  status: "healthy" | "degraded" | "error";
  fdw_available: boolean;
  latency_ms?: number;
  record_count?: number;
  error?: string;
  fallback: "none" | "storage";
  timestamp: string;
  tables_checked?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const result: HealthCheckResult = {
    status: "healthy",
    fdw_available: false,
    fallback: "storage",
    timestamp: new Date().toISOString(),
    tables_checked: [],
  };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      result.status = "error";
      result.error = "Missing Supabase configuration";
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Lista de tabelas FDW para verificar
    const fdwTables = [
      "dim_clientes",
      "dim_frota",
      "dim_contratos_locacao",
    ];

    const startTime = Date.now();
    let totalRecords = 0;
    const checkedTables: string[] = [];

    // Testar cada tabela FDW
    for (const tableName of fdwTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (!error) {
          checkedTables.push(tableName);
          totalRecords += count || 0;
        }
      } catch {
        // Tabela não existe ou FDW não configurado - ignorar
      }
    }

    const latency = Date.now() - startTime;

    if (checkedTables.length > 0) {
      result.fdw_available = true;
      result.fallback = "none";
      result.latency_ms = latency;
      result.record_count = totalRecords;
      result.tables_checked = checkedTables;

      // Verificar latência aceitável
      if (latency > 2000) {
        result.status = "degraded";
      }
    } else {
      result.status = "degraded";
      result.error = "No FDW tables available - using Storage fallback";
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    result.status = "error";
    result.error = err instanceof Error ? err.message : String(err);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
