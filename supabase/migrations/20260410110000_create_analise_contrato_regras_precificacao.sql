-- Regras de precificacao manual por contrato e grupo para AnaliseContrato
-- Permite sair do localStorage e persistir no banco.

create table if not exists public.analise_contrato_regras_precificacao (
  id uuid primary key default gen_random_uuid(),
  contrato text not null,
  grupo text not null,
  custo_km numeric(12,4) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid null references auth.users(id)
);

create unique index if not exists ux_analise_contrato_regras_precificacao_contrato_grupo
  on public.analise_contrato_regras_precificacao (upper(contrato), upper(grupo));

create index if not exists ix_analise_contrato_regras_precificacao_contrato
  on public.analise_contrato_regras_precificacao (upper(contrato));

create or replace function public.trg_set_timestamp_analise_contrato_regras_precificacao()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp_analise_contrato_regras_precificacao
  on public.analise_contrato_regras_precificacao;

create trigger set_timestamp_analise_contrato_regras_precificacao
before update on public.analise_contrato_regras_precificacao
for each row
execute function public.trg_set_timestamp_analise_contrato_regras_precificacao();

alter table public.analise_contrato_regras_precificacao enable row level security;

-- Leitura para usuarios autenticados
drop policy if exists "analise_contrato_regras_precificacao_select_auth"
  on public.analise_contrato_regras_precificacao;

create policy "analise_contrato_regras_precificacao_select_auth"
  on public.analise_contrato_regras_precificacao
  for select
  to authenticated
  using (true);

-- Escrita restrita a perfis com role admin/owner/manager/supervisor
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
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'owner', 'manager', 'supervisor')
    )
  );

grant select on public.analise_contrato_regras_precificacao to anon;
grant select, insert, update, delete on public.analise_contrato_regras_precificacao to authenticated;
grant all on public.analise_contrato_regras_precificacao to service_role;
