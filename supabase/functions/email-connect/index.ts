import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configurações IMAP conhecidas por domínio
const KNOWN_IMAP_CONFIGS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  'outlook.com': { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  'hotmail.com': { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  'live.com': { imap_host: 'outlook.office365.com', imap_port: 993, smtp_host: 'smtp.office365.com', smtp_port: 587 },
  'gmail.com': { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587 },
  'googlemail.com': { imap_host: 'imap.gmail.com', imap_port: 993, smtp_host: 'smtp.gmail.com', smtp_port: 587 },
  'yahoo.com': { imap_host: 'imap.mail.yahoo.com', imap_port: 993, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587 },
  'yahoo.com.br': { imap_host: 'imap.mail.yahoo.com', imap_port: 993, smtp_host: 'smtp.mail.yahoo.com', smtp_port: 587 },
  'icloud.com': { imap_host: 'imap.mail.me.com', imap_port: 993, smtp_host: 'smtp.mail.me.com', smtp_port: 587 },
  'me.com': { imap_host: 'imap.mail.me.com', imap_port: 993, smtp_host: 'smtp.mail.me.com', smtp_port: 587 },
  'uol.com.br': { imap_host: 'imap.uol.com.br', imap_port: 993, smtp_host: 'smtps.uol.com.br', smtp_port: 587 },
  'bol.com.br': { imap_host: 'imap.bol.com.br', imap_port: 993, smtp_host: 'smtps.bol.com.br', smtp_port: 587 },
  'terra.com.br': { imap_host: 'imap.terra.com.br', imap_port: 993, smtp_host: 'smtp.terra.com.br', smtp_port: 587 },
  'globo.com': { imap_host: 'imap.globo.com', imap_port: 993, smtp_host: 'smtp.globo.com', smtp_port: 587 },
  'zoho.com': { imap_host: 'imap.zoho.com', imap_port: 993, smtp_host: 'smtp.zoho.com', smtp_port: 587 },
  'aol.com': { imap_host: 'imap.aol.com', imap_port: 993, smtp_host: 'smtp.aol.com', smtp_port: 587 },
};

interface ConnectRequest {
  provider: 'imap' | 'microsoft' | 'google';
  email: string;
  password?: string;
  imap_host?: string;
  imap_port?: number;
  smtp_host?: string;
  smtp_port?: number;
  display_name?: string;
}

// Criptografar senha
function encryptPassword(password: string): string {
  const encryptionKey = Deno.env.get("EMAIL_ENCRYPTION_KEY") || "lovable-email-key-2024";
  const combined = `${encryptionKey}:${password}`;
  return btoa(combined);
}

// Detectar configuração IMAP pelo domínio do email
// Para domínios desconhecidos, usa Office 365 como padrão (maioria das empresas)
function detectImapConfig(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  
  // Se encontrar configuração conhecida, usar ela
  if (KNOWN_IMAP_CONFIGS[domain]) {
    return KNOWN_IMAP_CONFIGS[domain];
  }
  
  // Para domínios corporativos desconhecidos, tentar Office 365 como padrão
  console.log(`[email-connect] Domain ${domain} not in known list, using Office 365 defaults`);
  return {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587
  };
}

// Validar formato de email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

    const body: ConnectRequest = await req.json();
    const { provider, email, password, imap_host, imap_port, smtp_host, smtp_port, display_name } = body;

    console.log(`[email-connect] Connecting account for user ${user.id}: ${email} via ${provider}`);

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For IMAP, password is required
    if (provider === 'imap' && !password) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha é obrigatória para conexão IMAP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if account already exists
    const { data: existingAccount } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single();

    if (existingAccount) {
      return new Response(
        JSON.stringify({ success: false, error: "Esta conta de email já está conectada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auto-detect IMAP config if not provided
    const detectedConfig = detectImapConfig(email);
    
    const finalImapHost = imap_host || detectedConfig?.imap_host;
    const finalImapPort = imap_port || detectedConfig?.imap_port || 993;
    const finalSmtpHost = smtp_host || detectedConfig?.smtp_host;
    const finalSmtpPort = smtp_port || detectedConfig?.smtp_port || 587;

    // Validate we have IMAP config
    if (!finalImapHost) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Não foi possível detectar as configurações IMAP para este domínio. Por favor, forneça manualmente os servidores IMAP e SMTP." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[email-connect] Using IMAP config: ${finalImapHost}:${finalImapPort}`);

    // Build account data
    const accountData = {
      user_id: user.id,
      provider,
      email,
      display_name: display_name || email.split('@')[0],
      imap_host: finalImapHost,
      imap_port: finalImapPort,
      smtp_host: finalSmtpHost,
      smtp_port: finalSmtpPort,
      encrypted_password: password ? encryptPassword(password) : null,
      is_active: true
    };

    // Save account to database
    const { data: newAccount, error: insertError } = await supabase
      .from('email_accounts')
      .insert(accountData)
      .select()
      .single();

    if (insertError) {
      console.error("[email-connect] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao salvar conta de email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[email-connect] Account created successfully: ${newAccount.id}`);

    // Remove sensitive data from response
    const safeAccount = {
      id: newAccount.id,
      user_id: newAccount.user_id,
      provider: newAccount.provider,
      email: newAccount.email,
      display_name: newAccount.display_name,
      imap_host: newAccount.imap_host,
      imap_port: newAccount.imap_port,
      smtp_host: newAccount.smtp_host,
      smtp_port: newAccount.smtp_port,
      is_active: newAccount.is_active,
      created_at: newAccount.created_at
    };

    return new Response(
      JSON.stringify({ success: true, account: safeAccount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[email-connect] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
