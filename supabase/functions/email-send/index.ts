import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "npm:emailjs@4.0.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendRequest {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyToMessageId?: string;
}

// Decrypt password (same logic as email-connect)
function decryptPassword(encryptedPassword: string): string {
  try {
    const key = Deno.env.get("EMAIL_ENCRYPTION_KEY") || "default-key-change-in-production";
    // Simple XOR decryption
    const encrypted = atob(encryptedPassword);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
  } catch {
    return encryptedPassword;
  }
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

    const body: SendRequest = await req.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, bodyHtml, replyToMessageId } = body;

    console.log(`[email-send] Sending email from account ${accountId} to ${to.join(', ')}`);

    // Validate required fields
    if (!to || to.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Destinatário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subject) {
      return new Response(
        JSON.stringify({ success: false, error: "Assunto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailBody) {
      return new Response(
        JSON.stringify({ success: false, error: "Corpo do email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      console.error("[email-send] Account not found or access denied:", accountError);
      return new Response(
        JSON.stringify({ success: false, error: "Conta de email não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we have credentials
    if (!account.encrypted_password) {
      return new Response(
        JSON.stringify({ success: false, error: "Credenciais não encontradas. Por favor, reconecte a conta." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const password = decryptPassword(account.encrypted_password);

    console.log(`[email-send] Connecting to SMTP: ${account.smtp_host}:${account.smtp_port}`);

    // Create SMTP client
    const client = new SMTPClient({
      user: account.email,
      password: password,
      host: account.smtp_host || 'smtp.office365.com',
      port: account.smtp_port || 587,
      tls: true,
      timeout: 30000
    });

    // Build email message
    const message = {
      from: account.display_name ? `${account.display_name} <${account.email}>` : account.email,
      to: to.join(', '),
      cc: cc?.join(', ') || undefined,
      bcc: bcc?.join(', ') || undefined,
      subject: subject,
      text: emailBody,
      attachment: bodyHtml ? [
        { data: bodyHtml, alternative: true }
      ] : undefined
    };

    // Add reply-to header if replying
    if (replyToMessageId) {
      console.log(`[email-send] Replying to message: ${replyToMessageId}`);
    }

    // Send email
    const result = await client.sendAsync(message);
    
    console.log(`[email-send] Email sent successfully`);

    // Generate message ID from result or create one
    const messageId = `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId,
        message: "Email enviado com sucesso"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[email-send] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    
    // Provide more user-friendly error messages
    let friendlyMessage = errorMessage;
    if (errorMessage.includes('authentication') || errorMessage.includes('AUTH')) {
      friendlyMessage = "Falha na autenticação. Verifique suas credenciais ou use uma senha de aplicativo.";
    } else if (errorMessage.includes('connection') || errorMessage.includes('ETIMEDOUT')) {
      friendlyMessage = "Erro de conexão com o servidor SMTP. Tente novamente.";
    } else if (errorMessage.includes('recipient')) {
      friendlyMessage = "Endereço de email do destinatário inválido.";
    }
    
    return new Response(
      JSON.stringify({ success: false, error: friendlyMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
