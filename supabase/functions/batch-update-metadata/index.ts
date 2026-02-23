import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERCEL_API = 'https://qualityconecta.vercel.app/api/save-metadata';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { items } = await req.json();

    if (!Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'items must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    // Process in parallel batches of 10
    for (let i = 0; i < items.length; i += 10) {
      const batch = items.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (item: any) => {
          try {
            const res = await fetch(VERCEL_API, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item),
            });
            const data = await res.json();
            return { id: item.id_referencia, ok: res.ok, status: res.status, data };
          } catch (e: any) {
            return { id: item.id_referencia, ok: false, error: e.message };
          }
        })
      );
      results.push(...batchResults);
    }

    const successCount = results.filter(r => r.ok).length;

    return new Response(
      JSON.stringify({
        total: items.length,
        success: successCount,
        failed: items.length - successCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
