-- Permitir que o serviço (role anon) insira e atualize conversas e mensagens
-- Isso é necessário porque o serviço roda localmente com a chave anon

-- Permissões para whatsapp_conversations
create policy "Service can insert conversations"
on public.whatsapp_conversations
for insert
to anon
with check (true);

create policy "Service can update conversations"
on public.whatsapp_conversations
for update
to anon
using (true);

create policy "Service can select conversations"
on public.whatsapp_conversations
for select
to anon
using (true);

-- Permissões para whatsapp_messages
create policy "Service can insert messages"
on public.whatsapp_messages
for insert
to anon
with check (true);

create policy "Service can select messages"
on public.whatsapp_messages
for select
to anon
using (true);

-- Garantir que RLS está ativo mas com as políticas acima
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
