-- Tabela para armazenar contas de email conectadas
CREATE TABLE public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('imap', 'microsoft', 'google')),
  email TEXT NOT NULL,
  display_name TEXT,
  -- IMAP/SMTP configuration
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  encrypted_password TEXT,
  -- OAuth tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_accounts
CREATE POLICY "Users can view their own email accounts"
  ON public.email_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email accounts"
  ON public.email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts"
  ON public.email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts"
  ON public.email_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em email_accounts
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX idx_email_accounts_email ON public.email_accounts(email);

-- Tabela para vincular tarefas a emails
CREATE TABLE public.task_email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE SET NULL,
  email_message_id TEXT NOT NULL,
  email_subject TEXT,
  email_from TEXT,
  email_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_email_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_email_links (based on task ownership via user_id)
CREATE POLICY "Users can view their own task email links"
  ON public.task_email_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task email links for their tasks"
  ON public.task_email_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task email links"
  ON public.task_email_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id AND t.user_id = auth.uid()
    )
  );

-- Índices para performance
CREATE INDEX idx_task_email_links_task_id ON public.task_email_links(task_id);
CREATE INDEX idx_task_email_links_email_message_id ON public.task_email_links(email_message_id);