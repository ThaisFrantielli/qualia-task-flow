# Hierarquia e Relações do Sistema

Este arquivo resume a hierarquia do sistema e as relações entre as tabelas/entidades chave.

---

## Diagrama (ASCII)

```
profiles (users)
  id, full_name, nivelAcesso, permissoes (json)
    │
    │  (1:N) `user_hierarchy.user_id` / `user_hierarchy.supervisor_id`
    ▼
user_hierarchy (hierarquia)
  id, user_id → profiles.id, supervisor_id → profiles.id
    ├─ função: `get_user_team_hierarchy(user_uuid)` (recursiva) — retorna todos subordinados
    └─ políticas: `users_manage_own_team`, `users_view_hierarchy`
    │
    │
teams (equipes / departments)
  id, name, ... 
    │
    │  (opcional) projetos vinculados por `projects.team_id`
    ▼
projects
  id, name, user_id (criador), team_id (opcional), privacy, ...
    │
    │  (N:M) project_members
    ▼
project_members
  project_id → projects.id, user_id → profiles.id, role ('owner','aprovador','colaborador','leitor')
    │
    │  influencia visibilidade/edição de `projects` e `tasks`
    ▼
tasks
  id, title, user_id (criador) → profiles.id, assignee_id → profiles.id, project_id → projects.id, status, ...
    ├─ RLS policies consultam:
    │    - `auth.uid()` comparado a `user_id` / `assignee_id`
    │    - `project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())`
    │    - `user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))`
    │    - admins via `profiles.nivelAcesso = 'Admin'` ou `permissoes->>'is_admin'`
    └─ Funções relevantes: `get_user_team_hierarchy`, `get_team_count`, `is_user_admin`, `get_direct_supervisor`
```

---

## Resumo das regras principais

- Níveis de acesso: `Usuário`, `Supervisão`, `Gestão`, `Admin` (campo `profiles.nivelAcesso` e/ou `profiles.permissoes`).
- Fonte autoritativa de permissões: RLS (Row Level Security) no banco de dados (funções + policies).
- Visibilidade padrão:
  - Usuário: vê suas próprias tarefas/projetos + projetos onde é `project_member`.
  - Supervisor/Gestão: vê, além do acima, tarefas/projetos dos subordinados (recursivo via `get_user_team_hierarchy`).
  - Admin: vê/edita tudo (override).
- Edição/remoção: geralmente permitido ao criador/assignee, a membros de projeto com papel adequado (`owner`, `aprovador`, etc.) e a supervisores conforme policies.
- Projetos com privacidade `Equipe` restringem visibilidade aos membros da `team` selecionada.

## Como a hierarquia é implementada (detalhes técnicos)

- Tabela `user_hierarchy` liga um `user_id` a um `supervisor_id` (1:1 por relação, 1:N no agregado).
- Função `get_user_team_hierarchy(user_uuid)` usa `WITH RECURSIVE` para retornar todos os subordinados diretos e indiretos.
- Funções auxiliares: `get_team_count`, `get_direct_supervisor`, `is_user_admin`.
- Policies RLS aplicadas em `tasks`, `projects`, `user_hierarchy` fazem checks usando `auth.uid()` e as funções acima.
- A aplicação recomenda fortemente RLS como fonte de verdade — filtros client-side existem apenas como camada adicional/UX.

## Páginas e hooks relevantes (frontend)

- `src/hooks/useTasks.ts` — busca `user_hierarchy` e `tasks`, aplica `filterTasksByHierarchy` client-side.
- `src/hooks/useModuleAccess.ts`, `src/hooks/useUserModules.ts` — controle de visibilidade por módulo/grupo.
- UI de gestão: rota `/configuracoes/equipes` e `src/pages/Configuracoes/ControleAcesso/`.

## Arquivos SQL / docs de referência

- `SQL_MINIMO_SIMPLIFICADO.sql`
- `SQL_CORRIGIDO_FINAL.sql`
- `SQL_COMPLETO_CORRECOES.sql`
- `docs/PERMISSOES_HIERARQUICAS.md`
- `docs/CONTROLE_ACESSO.md`
- `EXEMPLOS_PRATICOS.md` / `ONDE_CRIAR_EQUIPES.md`

## Recomendações rápidas

- Mantenha RLS consistente e teste as policies após mudanças.
- Evite confiar apenas em filtros client-side para autorização.
- Proteja funções `SECURITY DEFINER` e conceda `EXECUTE` apenas a roles/autenticados necessários.
- Valide (no backend/SQL) prevenção de ciclos na hierarquia ao adicionar supervisores.

---

Arquivo gerado automaticamente pelo assistente — não modifica código do projeto.
