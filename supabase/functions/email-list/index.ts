import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Imap from "npm:imap@0.8.19";
import { simpleParser } from "npm:mailparser@3.6.5";

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

// Decrypt password (same logic as email-connect)
function decryptPassword(encryptedPassword: string): string {
  try {
    const key = Deno.env.get("EMAIL_ENCRYPTION_KEY") || "default-key-change-in-production";
    // Simple XOR decryption (matches email-connect encryption)
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

// Map folder names to IMAP folder names
function getImapFolderName(folder: string, provider: string): string {
  const folderMap: Record<string, Record<string, string>> = {
    'office365': {
      'inbox': 'INBOX',
      'sent': 'Sent Items',
      'drafts': 'Drafts',
      'trash': 'Deleted Items',
      'spam': 'Junk Email',
      'archive': 'Archive',
      'starred': 'INBOX' // Will filter by flagged
    },
    'gmail': {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'drafts': '[Gmail]/Drafts',
      'trash': '[Gmail]/Trash',
      'spam': '[Gmail]/Spam',
      'archive': '[Gmail]/All Mail',
      'starred': '[Gmail]/Starred'
    },
    'default': {
      'inbox': 'INBOX',
      'sent': 'Sent',
      'drafts': 'Drafts',
      'trash': 'Trash',
      'spam': 'Spam',
      'archive': 'Archive',
      'starred': 'INBOX'
    }
  };

  const providerFolders = folderMap[provider] || folderMap['default'];
  return providerFolders[folder] || folder.toUpperCase();
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

// Fetch emails via IMAP
async function fetchEmailsViaIMAP(
  account: { email: string; encrypted_password: string; imap_host: string; imap_port: number; provider: string },
  folder: string,
  page: number,
  limit: number,
  unreadOnly: boolean
): Promise<{ emails: EmailMessage[]; total: number }> {
  return new Promise((resolve, reject) => {
    const password = decryptPassword(account.encrypted_password);
    const imapFolder = getImapFolderName(folder, account.provider || 'default');
    
    console.log(`[email-list] Connecting to IMAP: ${account.imap_host}:${account.imap_port}`);
    console.log(`[email-list] Opening folder: ${imapFolder}`);

    const imap = new Imap({
      user: account.email,
      password: password,
      host: account.imap_host,
      port: account.imap_port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 15000
    });

    const emails: EmailMessage[] = [];
    let totalEmails = 0;

    imap.once('ready', () => {
      console.log('[email-list] IMAP connected, opening mailbox...');
      
      imap.openBox(imapFolder, true, (err: Error | null, box: { messages: { total: number } }) => {
        if (err) {
          console.error('[email-list] Error opening mailbox:', err);
          imap.end();
          reject(new Error(`Erro ao abrir pasta ${folder}: ${err.message}`));
          return;
        }

        totalEmails = box.messages.total;
        console.log(`[email-list] Mailbox opened, total messages: ${totalEmails}`);

        if (totalEmails === 0) {
          imap.end();
          resolve({ emails: [], total: 0 });
          return;
        }

        // Calculate range (get most recent emails first)
        const start = Math.max(1, totalEmails - (page * limit) + 1);
        const end = Math.max(1, totalEmails - ((page - 1) * limit));
        
        console.log(`[email-list] Fetching messages ${start}:${end}`);

        const searchCriteria = unreadOnly ? ['UNSEEN'] : ['ALL'];
        
        imap.search(searchCriteria, (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            console.error('[email-list] Search error:', searchErr);
            imap.end();
            reject(searchErr);
            return;
          }

          if (results.length === 0) {
            imap.end();
            resolve({ emails: [], total: 0 });
            return;
          }

          // Get most recent emails (reverse order, paginated)
          const sortedResults = results.sort((a, b) => b - a);
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const pageResults = sortedResults.slice(startIndex, endIndex);

          if (pageResults.length === 0) {
            imap.end();
            resolve({ emails: [], total: results.length });
            return;
          }

          const fetch = imap.fetch(pageResults, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true
          });

          fetch.on('message', (msg: { on: (event: string, handler: (stream: ReadableStream | { flags: string[], uid: number, struct: unknown[] }, info?: { which: string }) => void) => void }, seqno: number) => {
            let uid = 0;
            let flags: string[] = [];
            let headers = '';
            let hasAttachments = false;

            msg.on('body', (stream: { on: (event: string, handler: (chunk: Buffer) => void) => void }, info: { which: string }) => {
              let buffer = '';
              stream.on('data', (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
              });
              stream.on('end', () => {
                if (info.which.includes('HEADER')) {
                  headers = buffer;
                }
              });
            });

            msg.on('attributes', (attrs: { flags: string[], uid: number, struct?: unknown[] }) => {
              uid = attrs.uid;
              flags = attrs.flags || [];
              // Check for attachments in structure
              if (attrs.struct) {
                hasAttachments = checkForAttachments(attrs.struct);
              }
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(headers);
                
                const fromAddr = parsed.from?.value?.[0] || { name: '', address: '' };
                const toAddrs = parsed.to?.value || [];
                
                const email: EmailMessage = {
                  id: `${uid}`,
                  uid: uid,
                  from: {
                    name: fromAddr.name || '',
                    email: fromAddr.address || ''
                  },
                  to: toAddrs.map((addr: { name?: string; address?: string }) => ({
                    name: addr.name || '',
                    email: addr.address || ''
                  })),
                  subject: parsed.subject || '(Sem assunto)',
                  snippet: '',
                  date: parsed.date?.toISOString() || new Date().toISOString(),
                  isRead: flags.includes('\\Seen'),
                  isStarred: flags.includes('\\Flagged'),
                  hasAttachments: hasAttachments
                };

                emails.push(email);
              } catch (parseErr) {
                console.error('[email-list] Parse error:', parseErr);
              }
            });
          });

          fetch.once('error', (fetchErr: Error) => {
            console.error('[email-list] Fetch error:', fetchErr);
            imap.end();
            reject(fetchErr);
          });

          fetch.once('end', () => {
            console.log(`[email-list] Fetched ${emails.length} emails`);
            imap.end();
            // Sort by date descending
            emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            resolve({ emails, total: results.length });
          });
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[email-list] IMAP error:', err);
      reject(new Error(`Erro de conexão IMAP: ${err.message}`));
    });

    imap.once('end', () => {
      console.log('[email-list] IMAP connection ended');
    });

    imap.connect();
  });
}

// Check if message has attachments
function checkForAttachments(struct: unknown[]): boolean {
  if (!Array.isArray(struct)) return false;
  
  for (const part of struct) {
    if (Array.isArray(part)) {
      if (checkForAttachments(part)) return true;
    } else if (typeof part === 'object' && part !== null) {
      const p = part as { disposition?: { type?: string } };
      if (p.disposition?.type?.toLowerCase() === 'attachment') {
        return true;
      }
    }
  }
  return false;
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
    const { accountId, folder = 'inbox', page = 1, limit = 20, unreadOnly = false } = body;

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

    // Check if we have the encrypted password
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

    // Fetch emails via IMAP
    const { emails, total } = await fetchEmailsViaIMAP(
      {
        email: account.email,
        encrypted_password: account.encrypted_password,
        imap_host: account.imap_host || 'outlook.office365.com',
        imap_port: account.imap_port || 993,
        provider: account.provider || 'imap'
      },
      folder,
      page,
      limit,
      unreadOnly
    );

    // Update last sync
    await supabase
      .from('email_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({
        emails,
        total,
        hasMore: (page * limit) < total,
        page,
        success: true
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
