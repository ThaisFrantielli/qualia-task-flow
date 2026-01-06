import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReadRequest {
  accountId: string;
  messageId: string;
  markAsRead?: boolean;
}

// Mock email body data for development
function getMockEmailBody(messageId: string) {
  const bodies: Record<string, { body: string; bodyHtml: string; attachments?: Array<{ id: string; filename: string; mimeType: string; size: number }> }> = {
    'msg-1': {
      body: `Olá,

Gostaria de marcar uma reunião para discutirmos o projeto de vendas que mencionei na última semana.

Sugiro que nos encontremos na quarta-feira às 14h, na sala de reuniões do 3º andar.

Por favor, confirme sua disponibilidade.

Atenciosamente,
Carlos Silva
Gerente de Projetos`,
      bodyHtml: `<p>Olá,</p>
<p>Gostaria de marcar uma reunião para discutirmos o <strong>projeto de vendas</strong> que mencionei na última semana.</p>
<p>Sugiro que nos encontremos na <em>quarta-feira às 14h</em>, na sala de reuniões do 3º andar.</p>
<p>Por favor, confirme sua disponibilidade.</p>
<p>Atenciosamente,<br/>
<strong>Carlos Silva</strong><br/>
Gerente de Projetos</p>`,
      attachments: [
        { id: 'att-1', filename: 'proposta_projeto.pdf', mimeType: 'application/pdf', size: 245000 },
        { id: 'att-2', filename: 'cronograma.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 128000 }
      ]
    },
    'msg-2': {
      body: `Obrigada pelo envio da proposta. Analisei os termos e gostaria de esclarecer alguns pontos:

1. O prazo de entrega pode ser reduzido para 30 dias?
2. Há possibilidade de parcelamento em 12x?
3. O suporte técnico está incluso?

Aguardo retorno.

Maria Santos
Diretora Comercial
Cliente ABC`,
      bodyHtml: `<p>Obrigada pelo envio da proposta. Analisei os termos e gostaria de esclarecer alguns pontos:</p>
<ol>
<li>O prazo de entrega pode ser reduzido para 30 dias?</li>
<li>Há possibilidade de parcelamento em 12x?</li>
<li>O suporte técnico está incluso?</li>
</ol>
<p>Aguardo retorno.</p>
<p><strong>Maria Santos</strong><br/>
Diretora Comercial<br/>
Cliente ABC</p>`
    },
    'msg-3': {
      body: `Conforme conversamos por telefone, segue em anexo o orçamento para locação de veículos.

Detalhes da proposta:
- 10 veículos populares
- Prazo: 24 meses
- Km livre
- Manutenção inclusa

Valor mensal: R$ 35.000,00

Qualquer dúvida, estou à disposição.

Fernando Costa
Gerente Comercial`,
      bodyHtml: `<p>Conforme conversamos por telefone, segue em anexo o orçamento para locação de veículos.</p>
<p><strong>Detalhes da proposta:</strong></p>
<ul>
<li>10 veículos populares</li>
<li>Prazo: 24 meses</li>
<li>Km livre</li>
<li>Manutenção inclusa</li>
</ul>
<p><strong>Valor mensal: R$ 35.000,00</strong></p>
<p>Qualquer dúvida, estou à disposição.</p>
<p>Fernando Costa<br/>Gerente Comercial</p>`,
      attachments: [
        { id: 'att-3', filename: 'orcamento_frota.pdf', mimeType: 'application/pdf', size: 512000 }
      ]
    }
  };

  // Extract the message number from the ID
  const msgNum = messageId.split('-').pop();
  const key = `msg-${msgNum}`;
  
  return bodies[key] || {
    body: 'Conteúdo do email não disponível.',
    bodyHtml: '<p>Conteúdo do email não disponível.</p>'
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

    const body: ReadRequest = await req.json();
    const { accountId, messageId, markAsRead = true } = body;

    console.log(`[email-read] Reading email ${messageId} from account ${accountId}`);

    // Verify user owns this account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      console.error("[email-read] Account not found or access denied:", accountError);
      return new Response(
        JSON.stringify({ success: false, error: "Conta de email não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO: Implement actual IMAP connection to fetch real email content
    // For now, return mock data
    const emailBody = getMockEmailBody(messageId);

    // Build response with full email content
    const email = {
      id: messageId,
      accountId,
      ...emailBody,
      isRead: markAsRead
    };

    console.log(`[email-read] Returning email content with ${emailBody.attachments?.length || 0} attachments`);

    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[email-read] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
