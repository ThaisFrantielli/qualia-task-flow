-- Habilita a extensão pg_cron no banco Supabase
-- Execute isso no SQL Editor do Supabase (ou via psql como um superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Nota: Em algumas instâncias gerenciadas você pode não ter permissão para criar extensões.
-- Se receber erro, faça pelo painel do provedor ou peça ao admin do projeto.
