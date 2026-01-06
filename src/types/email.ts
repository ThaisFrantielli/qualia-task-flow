// Tipos TypeScript para o sistema de email

export type EmailProvider = 'imap' | 'microsoft' | 'google';

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email: string;
  display_name?: string;
  imap_host?: string;
  imap_port?: number;
  smtp_host?: string;
  smtp_port?: number;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface EmailMessage {
  id: string;
  accountId: string;
  folder: EmailFolder;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string;
  snippet: string;
  isRead: boolean;
  isStarred?: boolean;
  hasAttachments: boolean;
  body?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
}

export interface TaskEmailLink {
  id: string;
  task_id: string;
  email_account_id?: string;
  email_message_id: string;
  email_subject?: string;
  email_from?: string;
  email_date?: string;
  created_at: string;
}

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'starred' | 'archive';

export interface EmailFolderInfo {
  key: EmailFolder;
  label: string;
  icon: string;
  unreadCount?: number;
}

// Configurações IMAP conhecidas por domínio
export interface ImapConfig {
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
}

// Para conexão de email
export interface EmailConnectRequest {
  provider: EmailProvider;
  email: string;
  password?: string;
  imap_host?: string;
  imap_port?: number;
  smtp_host?: string;
  smtp_port?: number;
  display_name?: string;
}

export interface EmailConnectResponse {
  success: boolean;
  account?: EmailAccount;
  error?: string;
}

// Para listar emails
export interface EmailListRequest {
  accountId: string;
  folder?: EmailFolder;
  page?: number;
  limit?: number;
  search?: string;
  unreadOnly?: boolean;
}

export interface EmailListResponse {
  emails: EmailMessage[];
  total: number;
  hasMore: boolean;
  page: number;
}

// Para ler email específico
export interface EmailReadRequest {
  accountId: string;
  messageId: string;
  markAsRead?: boolean;
}

// Para enviar email
export interface EmailSendRequest {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyToMessageId?: string;
  attachments?: File[];
}

export interface EmailSendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Mapa de configurações IMAP conhecidas
export const KNOWN_IMAP_CONFIGS: Record<string, ImapConfig> = {
  'outlook.com': {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587
  },
  'hotmail.com': {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587
  },
  'live.com': {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587
  },
  'gmail.com': {
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587
  },
  'googlemail.com': {
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587
  },
  'yahoo.com': {
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: 587
  },
  'yahoo.com.br': {
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: 587
  },
  'icloud.com': {
    imap_host: 'imap.mail.me.com',
    imap_port: 993,
    smtp_host: 'smtp.mail.me.com',
    smtp_port: 587
  },
  'me.com': {
    imap_host: 'imap.mail.me.com',
    imap_port: 993,
    smtp_host: 'smtp.mail.me.com',
    smtp_port: 587
  },
  'uol.com.br': {
    imap_host: 'imap.uol.com.br',
    imap_port: 993,
    smtp_host: 'smtps.uol.com.br',
    smtp_port: 587
  },
  'bol.com.br': {
    imap_host: 'imap.bol.com.br',
    imap_port: 993,
    smtp_host: 'smtps.bol.com.br',
    smtp_port: 587
  },
  'terra.com.br': {
    imap_host: 'imap.terra.com.br',
    imap_port: 993,
    smtp_host: 'smtp.terra.com.br',
    smtp_port: 587
  },
  'globo.com': {
    imap_host: 'imap.globo.com',
    imap_port: 993,
    smtp_host: 'smtp.globo.com',
    smtp_port: 587
  },
  'ig.com.br': {
    imap_host: 'imap.ig.com.br',
    imap_port: 993,
    smtp_host: 'smtp.ig.com.br',
    smtp_port: 587
  },
  'zoho.com': {
    imap_host: 'imap.zoho.com',
    imap_port: 993,
    smtp_host: 'smtp.zoho.com',
    smtp_port: 587
  },
  'aol.com': {
    imap_host: 'imap.aol.com',
    imap_port: 993,
    smtp_host: 'smtp.aol.com',
    smtp_port: 587
  },
  'protonmail.com': {
    imap_host: 'imap.protonmail.ch',
    imap_port: 993,
    smtp_host: 'smtp.protonmail.ch',
    smtp_port: 587
  }
};

// Função helper para obter configuração IMAP pelo email
export function getImapConfigByEmail(email: string): ImapConfig | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  return KNOWN_IMAP_CONFIGS[domain] || null;
}

// Folders padrão com labels e ícones
export const EMAIL_FOLDERS: EmailFolderInfo[] = [
  { key: 'inbox', label: 'Caixa de Entrada', icon: 'Inbox' },
  { key: 'sent', label: 'Enviados', icon: 'Send' },
  { key: 'drafts', label: 'Rascunhos', icon: 'FileEdit' },
  { key: 'starred', label: 'Com Estrela', icon: 'Star' },
  { key: 'archive', label: 'Arquivo', icon: 'Archive' },
  { key: 'spam', label: 'Spam', icon: 'AlertTriangle' },
  { key: 'trash', label: 'Lixeira', icon: 'Trash2' }
];
