-- Ajusta a escrita das regras comerciais para permitir usuários com acesso ao dashboard de análise de contrato.

alter table public.analise_contrato_regras_precificacao enable row level security;

drop policy if exists "analise_contrato_regras_precificacao_write_auth"
  on public.analise_contrato_regras_precificacao;

create policy "analise_contrato_regras_precificacao_write_auth"
  on public.analise_contrato_regras_precificacao
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'owner', 'manager', 'supervisor')
    )
    or public.has_analytics_page_access(auth.uid(), 'analise-contrato')
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'owner', 'manager', 'supervisor')
    )
    or public.has_analytics_page_access(auth.uid(), 'analise-contrato')
  );
