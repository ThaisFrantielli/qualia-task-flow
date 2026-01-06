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

// Simulated email data for development (will be replaced with actual IMAP integration)
function generateMockEmails(accountId: string, folder: string, page: number, limit: number) {
  const mockEmails = [
    {
      id: `${accountId}-msg-1`,
      accountId,
      folder,
      subject: "Reunião sobre projeto de vendas",
      from: { name: "Carlos Silva", email: "carlos.silva@empresa.com" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
      snippet: "Olá, gostaria de marcar uma reunião para discutirmos o projeto de vendas...",
      isRead: false,
      hasAttachments: true
    },
    {
      id: `${accountId}-msg-2`,
      accountId,
      folder,
      subject: "Re: Proposta comercial - Cliente ABC",
      from: { name: "Maria Santos", email: "maria.santos@clienteabc.com.br" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      snippet: "Obrigada pelo envio da proposta. Analisei os termos e gostaria de esclarecer...",
      isRead: true,
      hasAttachments: false
    },
    {
      id: `${accountId}-msg-3`,
      accountId,
      folder,
      subject: "Orçamento solicitado - Frota veicular",
      from: { name: "Fernando Costa", email: "fernando@transportes.com" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      snippet: "Conforme conversamos por telefone, segue em anexo o orçamento para locação...",
      isRead: false,
      hasAttachments: true
    },
    {
      id: `${accountId}-msg-4`,
      accountId,
      folder,
      subject: "Atualização do contrato de manutenção",
      from: { name: "Suporte Técnico", email: "suporte@sistemasltda.com" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      snippet: "Informamos que o contrato de manutenção foi renovado automaticamente...",
      isRead: true,
      hasAttachments: false
    },
    {
      id: `${accountId}-msg-5`,
      accountId,
      folder,
      subject: "Novo lead - Interessado em locação",
      from: { name: "Site Corporativo", email: "noreply@seusite.com.br" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // 26 hours ago
      snippet: "Um novo contato foi recebido pelo formulário do site. Nome: João Pedro...",
      isRead: false,
      hasAttachments: false
    },
    {
      id: `${accountId}-msg-6`,
      accountId,
      folder,
      subject: "Relatório mensal de vendas - Dezembro",
      from: { name: "Sistema CRM", email: "relatorios@crm.interno" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      snippet: "Segue o relatório consolidado de vendas referente ao mês de dezembro...",
      isRead: true,
      hasAttachments: true
    },
    {
      id: `${accountId}-msg-7`,
      accountId,
      folder,
      subject: "Confirmação de agendamento",
      from: { name: "Agenda Online", email: "agenda@calendly.com" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
      snippet: "Sua reunião com Pedro Almeida foi confirmada para quinta-feira às 14h...",
      isRead: true,
      hasAttachments: false
    },
    {
      id: `${accountId}-msg-8`,
      accountId,
      folder,
      subject: "Urgente: Revisão de contrato",
      from: { name: "Jurídico", email: "juridico@empresa.com" },
      to: [{ email: "voce@email.com" }],
      date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
      snippet: "Favor revisar e aprovar o contrato em anexo até o final do dia...",
      isRead: false,
      hasAttachments: true
    }
  ];

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmails = mockEmails.slice(startIndex, endIndex);

  return {
    emails: paginatedEmails,
    total: mockEmails.length,
    hasMore: endIndex < mockEmails.length,
    page
  };
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
    const { accountId, folder = 'inbox', page = 1, limit = 20, search, unreadOnly } = body;

    console.log(`[email-list] Listing emails for account ${accountId}, folder: ${folder}, page: ${page}`);

    // Verify user owns this account
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

    // For now, return mock data
    // TODO: Implement actual IMAP connection to fetch real emails
    const result = generateMockEmails(accountId, folder, page, limit);

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      result.emails = result.emails.filter(email => 
        email.subject.toLowerCase().includes(searchLower) ||
        email.from.name?.toLowerCase().includes(searchLower) ||
        email.from.email.toLowerCase().includes(searchLower) ||
        email.snippet.toLowerCase().includes(searchLower)
      );
      result.total = result.emails.length;
    }

    // Apply unread filter if requested
    if (unreadOnly) {
      result.emails = result.emails.filter(email => !email.isRead);
      result.total = result.emails.length;
    }

    console.log(`[email-list] Returning ${result.emails.length} emails`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[email-list] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
