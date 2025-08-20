-- 1. Tabela de equipes
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Adicionar team_id e privacy em projects
alter table public.projects add column if not exists team_id uuid references public.teams(id);
alter table public.projects add column if not exists privacy text check (privacy in ('organization', 'team', 'private')) default 'team';

-- 3. Tabela de membros do projeto
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text, -- função customizada livre
  created_at timestamp with time zone default now(),
  unique (project_id, user_id)
);

-- 4. Índices
create index if not exists idx_projects_team_id on public.projects(team_id);
create index if not exists idx_projects_privacy on public.projects(privacy);
create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id on public.project_members(user_id);
