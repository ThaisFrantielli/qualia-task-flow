import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Imap from "npm:imap@0.8.19";
import { simpleParser } from "npm:mailparser@3.6.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReadRequest {
  accountId: string;
  messageId: string;
  folder?: string;
  markAsRead?: boolean;
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

// Map folder names to IMAP folder names
function getImapFolderName(folder: string, provider: string): string {
  const folderMap: Record<string, Record<string, string>> = {
    'office365': {
      'inbox': 'INBOX',
      'sent': 'Sent Items',
      'drafts': 'Drafts',
      'trash': 'Deleted Items',
      'spam': 'Junk Email'
    },
    'gmail': {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'drafts': '[Gmail]/Drafts',
      'trash': '[Gmail]/Trash',
      'spam': '[Gmail]/Spam'
    },
    'default': {
      'inbox': 'INBOX',
      'sent': 'Sent',
      'drafts': 'Drafts',
      'trash': 'Trash',
      'spam': 'Spam'
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
  cc?: { name: string; email: string }[];
  subject: string;
  body: string;
  bodyHtml?: string;
  snippet: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: { filename: string; contentType: string; size: number }[];
}

// Fetch single email via IMAP
async function fetchEmailViaIMAP(
  account: { email: string; encrypted_password: string; imap_host: string; imap_port: number; provider: string },
  messageUid: number,
  folder: string,
  markAsRead: boolean
): Promise<EmailMessage | null> {
  return new Promise((resolve, reject) => {
    const password = decryptPassword(account.encrypted_password);
    const imapFolder = getImapFolderName(folder, account.provider || 'default');

    console.log(`[email-read] Connecting to IMAP: ${account.imap_host}:${account.imap_port}`);
    console.log(`[email-read] Fetching message UID: ${messageUid} from folder: ${imapFolder}`);

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

    let email: EmailMessage | null = null;

    imap.once('ready', () => {
      console.log('[email-read] IMAP connected');
      
      // Open mailbox in read-write mode to mark as read
      imap.openBox(imapFolder, !markAsRead, (err: Error | null) => {
        if (err) {
          console.error('[email-read] Error opening mailbox:', err);
          imap.end();
          reject(new Error(`Erro ao abrir pasta: ${err.message}`));
          return;
        }

        const fetch = imap.fetch(messageUid, {
          bodies: '',
          struct: true,
          markSeen: markAsRead
        });

        fetch.on('message', (msg: { on: (event: string, handler: (data: unknown, info?: unknown) => void) => void }) => {
          let rawEmail = '';
          let flags: string[] = [];
          let uid = messageUid;

          msg.on('body', (stream: { on: (event: string, handler: (chunk: Buffer) => void) => void }) => {
            stream.on('data', (chunk: Buffer) => {
              rawEmail += chunk.toString('utf8');
            });
          });

          msg.on('attributes', (attrs: { flags: string[], uid: number }) => {
            flags = attrs.flags || [];
            uid = attrs.uid;
          });

          msg.on('end', async () => {
            try {
              const parsed = await simpleParser(rawEmail);

              const fromAddr = parsed.from?.value?.[0] || { name: '', address: '' };
              const toAddrs = parsed.to?.value || [];
              const ccAddrs = parsed.cc?.value || [];

              // Get attachments info
              const attachments = parsed.attachments?.map(att => ({
                filename: att.filename || 'attachment',
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0
              })) || [];

              email = {
                id: String(uid),
                uid: uid,
                from: {
                  name: fromAddr.name || '',
                  email: fromAddr.address || ''
                },
                to: toAddrs.map((addr: { name?: string; address?: string }) => ({
                  name: addr.name || '',
                  email: addr.address || ''
                })),
                cc: ccAddrs.length > 0 ? ccAddrs.map((addr: { name?: string; address?: string }) => ({
                  name: addr.name || '',
                  email: addr.address || ''
                })) : undefined,
                subject: parsed.subject || '(Sem assunto)',
                body: parsed.text || '',
                bodyHtml: parsed.html || undefined,
                snippet: (parsed.text || '').substring(0, 200),
                date: parsed.date?.toISOString() || new Date().toISOString(),
                isRead: flags.includes('\\Seen') || markAsRead,
                isStarred: flags.includes('\\Flagged'),
                hasAttachments: attachments.length > 0,
                attachments: attachments.length > 0 ? attachments : undefined
              };

              console.log(`[email-read] Email parsed: ${email.subject}`);
            } catch (parseErr) {
              console.error('[email-read] Parse error:', parseErr);
            }
          });
        });

        fetch.once('error', (fetchErr: Error) => {
          console.error('[email-read] Fetch error:', fetchErr);
          imap.end();
          reject(fetchErr);
        });

        fetch.once('end', () => {
          console.log('[email-read] Fetch complete');
          imap.end();
          resolve(email);
        });
      });
    });

    imap.once('error', (err: Error) => {
      console.error('[email-read] IMAP error:', err);
      reject(new Error(`Erro de conexão IMAP: ${err.message}`));
    });

    imap.connect();
  });
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

    const body: ReadRequest = await req.json();
    const { accountId, messageId, folder = 'inbox', markAsRead = true } = body;

    console.log(`[email-read] Reading email ${messageId} from account ${accountId}`);

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
        JSON.stringify({ success: false, error: "Credenciais não encontradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = await fetchEmailViaIMAP(
      {
        email: account.email,
        encrypted_password: account.encrypted_password,
        imap_host: account.imap_host || 'outlook.office365.com',
        imap_port: account.imap_port || 993,
        provider: account.provider || 'imap'
      },
      parseInt(messageId),
      folder,
      markAsRead
    );

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[email-read] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao ler email";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
