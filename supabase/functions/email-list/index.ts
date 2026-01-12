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

// Decrypt password
function decryptPassword(encryptedPassword: string): string {
  try {
    const key = Deno.env.get("EMAIL_ENCRYPTION_KEY") || "default-key-change-in-production";
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

// Map folder names to EWS/Graph folder names
function getGraphFolderName(folder: string): string {
  const folderMap: Record<string, string> = {
    'inbox': 'inbox',
    'sent': 'sentitems',
    'drafts': 'drafts',
    'trash': 'deleteditems',
    'spam': 'junkemail',
    'archive': 'archive',
    'starred': 'inbox' // Will filter by importance
  };
  return folderMap[folder] || 'inbox';
}

interface EmailMessage {
  id: string;
  uid: number;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

// Fetch emails via EWS Basic Auth (for Office 365 with basic auth enabled)
async function fetchEmailsViaEWS(
  email: string,
  password: string,
  folder: string,
  limit: number
): Promise<{ emails: EmailMessage[]; total: number; error?: string }> {
  try {
    // EWS endpoint for Office 365
    const ewsUrl = 'https://outlook.office365.com/EWS/Exchange.asmx';
    
    // Build SOAP request for FindItem
    const folderName = folder === 'inbox' ? 'inbox' : 
                       folder === 'sent' ? 'sentitems' :
                       folder === 'drafts' ? 'drafts' :
                       folder === 'trash' ? 'deleteditems' :
                       folder === 'spam' ? 'junkemail' : 'inbox';
    
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Header>
    <t:RequestServerVersion Version="Exchange2016"/>
  </soap:Header>
  <soap:Body>
    <m:FindItem Traversal="Shallow">
      <m:ItemShape>
        <t:BaseShape>Default</t:BaseShape>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="item:Subject"/>
          <t:FieldURI FieldURI="item:DateTimeReceived"/>
          <t:FieldURI FieldURI="message:From"/>
          <t:FieldURI FieldURI="message:IsRead"/>
          <t:FieldURI FieldURI="item:HasAttachments"/>
          <t:FieldURI FieldURI="item:Importance"/>
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:IndexedPageItemView MaxEntriesReturned="${limit}" Offset="0" BasePoint="Beginning"/>
      <m:SortOrder>
        <t:FieldOrder Order="Descending">
          <t:FieldURI FieldURI="item:DateTimeReceived"/>
        </t:FieldOrder>
      </m:SortOrder>
      <m:ParentFolderIds>
        <t:DistinguishedFolderId Id="${folderName}"/>
      </m:ParentFolderIds>
    </m:FindItem>
  </soap:Body>
</soap:Envelope>`;

    const authHeader = 'Basic ' + btoa(`${email}:${password}`);
    
    console.log(`[email-list] Fetching from EWS: ${ewsUrl}`);
    
    const response = await fetch(ewsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Authorization': authHeader,
      },
      body: soapRequest,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[email-list] EWS error response:', response.status, errorText.substring(0, 500));
      
      if (response.status === 401) {
        return { 
          emails: [], 
          total: 0, 
          error: "Autenticação falhou. Para contas Microsoft 365 corporativas, pode ser necessário usar OAuth ou habilitar autenticação básica." 
        };
      }
      
      return { emails: [], total: 0, error: `Erro ao conectar: ${response.status}` };
    }

    const xmlResponse = await response.text();
    console.log('[email-list] EWS response received, parsing...');
    
    // Parse XML response
    const emails = parseEWSResponse(xmlResponse);
    
    return { emails, total: emails.length };
  } catch (error) {
    console.error('[email-list] EWS fetch error:', error);
    return { 
      emails: [], 
      total: 0, 
      error: error instanceof Error ? error.message : 'Erro ao buscar emails' 
    };
  }
}

// Parse EWS XML response
function parseEWSResponse(xml: string): EmailMessage[] {
  const emails: EmailMessage[] = [];
  
  try {
    // Extract messages using regex (simple XML parsing)
    const messageRegex = /<t:Message[^>]*>([\s\S]*?)<\/t:Message>/g;
    let match;
    let index = 0;
    
    while ((match = messageRegex.exec(xml)) !== null) {
      const messageXml = match[1];
      
      // Extract fields
      const itemIdMatch = messageXml.match(/<t:ItemId Id="([^"]+)"/);
      const subjectMatch = messageXml.match(/<t:Subject>([^<]*)<\/t:Subject>/);
      const dateMatch = messageXml.match(/<t:DateTimeReceived>([^<]+)<\/t:DateTimeReceived>/);
      const isReadMatch = messageXml.match(/<t:IsRead>([^<]+)<\/t:IsRead>/);
      const hasAttachMatch = messageXml.match(/<t:HasAttachments>([^<]+)<\/t:HasAttachments>/);
      const importanceMatch = messageXml.match(/<t:Importance>([^<]+)<\/t:Importance>/);
      
      // Extract sender
      const fromNameMatch = messageXml.match(/<t:Mailbox>[\s\S]*?<t:Name>([^<]*)<\/t:Name>/);
      const fromEmailMatch = messageXml.match(/<t:Mailbox>[\s\S]*?<t:EmailAddress>([^<]+)<\/t:EmailAddress>/);
      
      const email: EmailMessage = {
        id: itemIdMatch?.[1] || `msg-${index}`,
        uid: index + 1,
        from: {
          name: fromNameMatch?.[1] || '',
          email: fromEmailMatch?.[1] || ''
        },
        to: [],
        subject: subjectMatch?.[1] || '(Sem assunto)',
        snippet: '',
        date: dateMatch?.[1] || new Date().toISOString(),
        isRead: isReadMatch?.[1] === 'true',
        isStarred: importanceMatch?.[1] === 'High',
        hasAttachments: hasAttachMatch?.[1] === 'true'
      };
      
      emails.push(email);
      index++;
    }
    
    console.log(`[email-list] Parsed ${emails.length} emails from EWS response`);
  } catch (error) {
    console.error('[email-list] XML parsing error:', error);
  }
  
  return emails;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ListRequest = await req.json();
    const { accountId, folder = 'inbox', page = 1, limit = 20, unreadOnly = false } = body;

    console.log(`[email-list] Listing emails for account ${accountId}, folder: ${folder}`);

    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ success: false, error: "Conta de email não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!account.encrypted_password) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Credenciais não encontradas. Por favor, reconecte a conta.",
          emails: [],
          total: 0,
          hasMore: false,
          page
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const password = decryptPassword(account.encrypted_password);
    
    // Try EWS for Office 365 accounts
    const isOffice365 = account.imap_host?.includes('office365') || 
                        account.imap_host?.includes('outlook') ||
                        account.email?.includes('@outlook') ||
                        account.email?.includes('@hotmail');
    
    if (isOffice365) {
      console.log('[email-list] Using EWS for Office 365 account');
      const result = await fetchEmailsViaEWS(account.email, password, folder, limit);
      
      if (result.error) {
        // Return a friendly error with instructions
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
            emails: [],
            total: 0,
            hasMore: false,
            page,
            requiresOAuth: true,
            instructions: "Para acessar emails do Microsoft 365 corporativo, é necessário configurar o Microsoft Graph API com OAuth. Entre em contato com o administrador de TI para habilitar o acesso."
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update last sync
      await supabase
        .from('email_accounts')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', accountId);

      return new Response(
        JSON.stringify({
          success: true,
          emails: result.emails,
          total: result.total,
          hasMore: result.emails.length >= limit,
          page
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other providers, return informative message
    return new Response(
      JSON.stringify({
        success: false,
        error: "Provedor de email requer configuração adicional. Use Microsoft Graph API para Office 365 ou Gmail API para Google.",
        emails: [],
        total: 0,
        hasMore: false,
        page,
        accountInfo: {
          email: account.email,
          provider: account.provider,
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
