// Edge Function: sync-dw-to-storage
// Recebe dados via POST (do pipeline Python/Node externo) e salva no Storage
// Não conecta diretamente ao SQL Server - essa conexão é feita externamente
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Aceita POST com JSON contendo { fileName, data }
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST with { fileName, data }' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { fileName, data } = body;

    if (!fileName || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing fileName or data in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar nome do arquivo
    if (!fileName.endsWith('.json')) {
      return new Response(
        JSON.stringify({ error: 'fileName must end with .json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar payload com metadados
    const payload = {
      generated_at: new Date().toISOString(),
      source: 'external_sync',
      record_count: Array.isArray(data) ? data.length : 1,
      data: data,
    };

    const jsonString = JSON.stringify(payload);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Upload para o bucket 'bi-reports' com upsert
    const { data: uploadData, error } = await supabaseAdmin.storage
      .from('bi-reports')
      .upload(fileName, blob, { upsert: true, contentType: 'application/json' });

    if (error) {
      console.error('Upload failed:', error.message || error);
      return new Response(
        JSON.stringify({ error: error.message || 'Upload failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully uploaded ${fileName} with ${Array.isArray(data) ? data.length : 1} records`);

    return new Response(
      JSON.stringify({
        ok: true,
        path: uploadData?.path ?? `bi-reports/${fileName}`,
        recordCount: Array.isArray(data) ? data.length : 1,
        generatedAt: payload.generated_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Function error:', err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

Deno.serve(handler);
