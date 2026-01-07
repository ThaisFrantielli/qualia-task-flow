import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ListRequest {
  accountId: string;
  folder?: string;
  page?: number;
  limit?: number;
  search?: string;
  unreadOnly?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ListRequest = await req.json();
    const { accountId, folder = 'inbox', page = 1, limit = 20 } = body;

    console.log(`[email-list] Listing emails for account ${accountId}, folder: ${folder}, page: ${page}`);

    // Get account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      console.error("[email-list] Account not found or access denied:", accountError);
      return new Response(
        JSON.stringify({ success: false, error: "Conta de email não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Note: Full IMAP implementation requires a Node.js backend or external service
    // For now, return an informative message that the account is connected
    // but email fetching requires additional infrastructure
    
    console.log(`[email-list] Account ${account.email} is connected. IMAP server: ${account.imap_host}`);

    // Return informative response
    return new Response(
      JSON.stringify({
        emails: [],
        total: 0,
        hasMore: false,
        page,
        message: `Conta ${account.email} conectada. Para buscar emails em tempo real, configure um serviço IMAP externo ou use a API do provedor (Microsoft Graph, Gmail API).`,
        accountInfo: {
          email: account.email,
          provider: account.provider,
          imap_host: account.imap_host,
          imap_port: account.imap_port,
          connected: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[email-list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao buscar emails";
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        emails: [],
        total: 0,
        hasMore: false,
        page: 1
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
