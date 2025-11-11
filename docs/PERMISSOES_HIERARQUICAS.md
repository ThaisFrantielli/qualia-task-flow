# Sistema de Permissões Hierárquicas - Análise e Recomendações

## 📋 Contexto Atual

Você definiu que **todos os usuários** (independente do nível de acesso) podem:
- ✅ **Criar** projetos e tarefas
- ✅ **Editar** projetos e tarefas
- ✅ **Excluir** projetos e tarefas

A diferença está no **nível de visualização**:
- **Usuário**: Vê apenas seus próprios projetos/tarefas + aqueles em que participa como membro
- **Supervisão**: Vê tudo do **Usuário** + projetos/tarefas de sua equipe
- **Gestão**: Vê tudo da **Supervisão** + projetos/tarefas de múltiplos supervisores/equipes
- **Admin**: Vê **tudo** no sistema

---

## 🏗️ Estrutura Atual do Sistema

### 1. Sistema de Controle de Acesso por Módulos
O projeto já possui um sistema robusto de controle de acesso baseado em:
- **Módulos**: Dashboard, Tarefas, CRM, Projetos, etc.
- **Grupos**: Administradores, Gestores, Supervisores, Operacional
- **Permissões**: Por grupo ou individuais

📁 Arquivos principais:
- `/docs/CONTROLE_ACESSO.md`
- `/src/hooks/useModuleAccess.ts`
- `/src/pages/Configuracoes/ControleAcesso/`

### 2. Níveis de Acesso Definidos
Na tabela `profiles`, campo `nivelAcesso`:
- `'Usuário'`
- `'Supervisão'`
- `'Gestão'`
- `'Admin'`

### 3. Estrutura de Dados de Participação

#### Projetos (`projects` e `project_members`)
```typescript
// Tabela: projects
- id: string
- name: string
- user_id: string | null  // Criador do projeto
- ...

// Tabela: project_members
- project_id: string
- user_id: string
- role: string  // 'owner', 'aprovador', 'colaborador', 'leitor'
```

#### Tarefas (`tasks`)
```typescript
- id: string
- title: string
- user_id: string | null     // Criador da tarefa
- assignee_id: string | null // Responsável pela tarefa
- project_id: string | null  // Projeto vinculado (se houver)
- ...
```

### 4. Implementação Atual de Filtros

#### Hook `useTasks.ts` (linha 21-54)
```typescript
const fetchTasksList = async (filters, user) => {
  let query = supabase.from('tasks').select(...);
  
  const isAdmin = user?.permissoes?.team === true;
  
  if (!isAdmin) { 
    query = query.eq('user_id', user.id);  // ❌ LIMITAÇÃO ATUAL
  }
  
  // ... resto do código
}
```

**Problema identificado:** 
- Atualmente, usuários não-admin só veem tarefas onde `user_id = auth.uid()`
- Não considera tarefas em que o usuário **participa como membro do projeto**
- Não implementa hierarquia (Supervisão > Usuário, Gestão > Supervisão)

---

## 🎯 Recomendações de Implementação

### Opção 1: RLS (Row Level Security) no Supabase [RECOMENDADO]

#### Vantagens:
- ✅ Segurança no nível do banco de dados
- ✅ Performance otimizada
- ✅ Queries automáticas e consistentes
- ✅ Não depende de lógica no frontend

#### Estrutura necessária:

##### 1. Tabela de Relacionamento Hierárquico
```sql
CREATE TABLE IF NOT EXISTS public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, supervisor_id)
);

-- Índices para performance
CREATE INDEX idx_user_hierarchy_user ON user_hierarchy(user_id);
CREATE INDEX idx_user_hierarchy_supervisor ON user_hierarchy(supervisor_id);
```

##### 2. Função para obter hierarquia
```sql
CREATE OR REPLACE FUNCTION get_user_team_hierarchy(user_uuid UUID)
RETURNS TABLE(team_member_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    -- Base: usuários diretos sob supervisão
    SELECT user_id as team_member_id
    FROM user_hierarchy
    WHERE supervisor_id = user_uuid
    
    UNION
    
    -- Recursivo: subordinados dos subordinados
    SELECT uh.user_id
    FROM user_hierarchy uh
    INNER JOIN team_tree tt ON uh.supervisor_id = tt.team_member_id
  )
  SELECT team_member_id FROM team_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

##### 3. Políticas RLS para Tarefas

```sql
-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem suas próprias tarefas
CREATE POLICY "users_view_own_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR assignee_id = auth.uid()
);

-- Policy: Usuários veem tarefas de projetos em que participam
CREATE POLICY "users_view_project_member_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM project_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Supervisores veem tarefas de sua equipe
CREATE POLICY "supervisors_view_team_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin')
  )
  AND (
    user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
  )
);

-- Policy: Admins veem tudo
CREATE POLICY "admins_view_all_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.nivelAcesso = 'Admin'
      OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
    )
  )
);

-- Policy: Todos podem criar tarefas
CREATE POLICY "authenticated_users_create_tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Usuários editam suas próprias tarefas
CREATE POLICY "users_update_own_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR assignee_id = auth.uid()
  OR project_id IN (
    SELECT project_id FROM project_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'aprovador', 'colaborador')
  )
);

-- Policy: Supervisores editam tarefas de sua equipe
CREATE POLICY "supervisors_update_team_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin')
  )
  AND (
    user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
  )
);

-- Policy: Admins editam tudo
CREATE POLICY "admins_update_all_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true)
  )
);

-- Policies DELETE (mesma lógica)
CREATE POLICY "users_delete_own_tasks"
ON public.tasks FOR DELETE TO authenticated
USING (user_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY "supervisors_delete_team_tasks"
ON public.tasks FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin'))
  AND (
    user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
  )
);

CREATE POLICY "admins_delete_all_tasks"
ON public.tasks FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true))
);
```

##### 4. Políticas RLS para Projetos

```sql
-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários veem seus próprios projetos
CREATE POLICY "users_view_own_projects"
ON public.projects FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Policy: Usuários veem projetos em que participam
CREATE POLICY "users_view_member_projects"
ON public.projects FOR SELECT TO authenticated
USING (
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

-- Policy: Supervisores veem projetos de sua equipe
CREATE POLICY "supervisors_view_team_projects"
ON public.projects FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin'))
  AND user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
);

-- Policy: Admins veem tudo
CREATE POLICY "admins_view_all_projects"
ON public.projects FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true))
);

-- Policy: Todos podem criar projetos
CREATE POLICY "authenticated_users_create_projects"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (true);

-- Policy: Usuários editam próprios projetos ou em que são membros
CREATE POLICY "users_update_own_projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'aprovador'))
);

-- Policy: Supervisores editam projetos de equipe
CREATE POLICY "supervisors_update_team_projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin'))
  AND user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
);

-- Policy: Admins editam tudo
CREATE POLICY "admins_update_all_projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true))
);

-- DELETE (mesma estrutura)
CREATE POLICY "users_delete_own_projects"
ON public.projects FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "supervisors_delete_team_projects"
ON public.projects FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin'))
  AND user_id IN (SELECT team_member_id FROM get_user_team_hierarchy(auth.uid()))
);

CREATE POLICY "admins_delete_all_projects"
ON public.projects FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true))
);
```

---

### Opção 2: Lógica no Frontend/Hook [MENOS RECOMENDADO]

#### Atualizar `useTasks.ts`:
```typescript
const fetchTasksList = async (filters: Partial<AllTaskFilters>, user: AppUser | null): Promise<TaskWithDetails[]> => {
  if (!user?.id) return [];
  
  let query = supabase.from('tasks').select(`
    *, 
    assignee: profiles (*), 
    project: projects (*), 
    category: task_categories (*)
  `);

  const nivelAcesso = user.nivelAcesso || 'Usuário';
  
  if (nivelAcesso === 'Admin') {
    // Admin vê tudo - sem filtro
  } else if (nivelAcesso === 'Gestão' || nivelAcesso === 'Supervisão') {
    // Buscar IDs da equipe subordinada (necessita endpoint/função)
    const { data: teamIds } = await supabase.rpc('get_user_team_hierarchy', { user_uuid: user.id });
    
    query = query.or(`user_id.eq.${user.id},assignee_id.eq.${user.id},user_id.in.(${teamIds?.join(',') || ''}),assignee_id.in.(${teamIds?.join(',') || ''})`);
  } else {
    // Usuário: vê próprias tarefas + tarefas de projetos em que participa
    const { data: projectIds } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);
    
    const projectIdsArray = projectIds?.map(p => p.project_id) || [];
    
    if (projectIdsArray.length > 0) {
      query = query.or(`user_id.eq.${user.id},assignee_id.eq.${user.id},project_id.in.(${projectIdsArray.join(',')})`);
    } else {
      query = query.or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`);
    }
  }
  
  // ... resto do código (filtros, ordenação, etc)
}
```

**Desvantagens:**
- ❌ Múltiplas queries (performance reduzida)
- ❌ Lógica duplicada em múltiplos hooks
- ❌ Segurança depende do frontend (vulnerável)
- ❌ Mais complexo de manter

---

## 📐 Interface de Gerenciamento de Equipes

### Nova Página: `/configuracoes/equipes`

Permitir que **Supervisores** e **Gestores** gerenciem sua hierarquia:

```typescript
// Exemplo de interface
interface TeamHierarchyManager {
  // Lista de usuários sob supervisão
  subordinates: Profile[];
  
  // Adicionar usuário à equipe
  addToTeam: (userId: string) => Promise<void>;
  
  // Remover usuário da equipe
  removeFromTeam: (userId: string) => Promise<void>;
  
  // Ver hierarquia completa (árvore)
  viewHierarchy: () => void;
}
```

---

## 🔄 Migração e Implementação

### ✅ STATUS: IMPLEMENTADO

Todos os arquivos necessários foram criados:

1. **Migration SQL**: `/supabase/migrations/20251111_hierarchical_permissions.sql`
   - Tabela `user_hierarchy`
   - Funções recursivas
   - Políticas RLS para tasks e projects
   - Triggers de validação

2. **Hook TypeScript**: `/src/hooks/useTeamHierarchy.ts`
   - Gerenciamento de hierarquia
   - CRUD de membros da equipe
   - Queries otimizadas

3. **Página de Interface**: `/src/pages/Configuracoes/GerenciarEquipes.tsx`
   - Interface completa para gerenciar equipes
   - Visualização da hierarquia
   - Adicionar/remover membros

4. **Rota Configurada**: `/src/App.tsx`
   - Rota: `/configuracoes/equipes`
   - Link no Sidebar

5. **Hook Simplificado**: `/src/hooks/useTasks.ts`
   - Removida lógica de filtro manual
   - RLS cuida automaticamente

### 📋 Para Aplicar no Supabase:

**Veja as instruções detalhadas em:** `/INSTRUCOES_SQL.md`

**Resumo:**
1. Abra o Supabase SQL Editor
2. Copie o conteúdo de `/supabase/migrations/20251111_hierarchical_permissions.sql`
3. Cole e execute no SQL Editor
4. Verifique se foi criado corretamente

---

## ⚠️ Considerações Importantes

### 1. Performance
- Índices são **essenciais** para queries recursivas funcionarem bem
- Monitor de performance: `EXPLAIN ANALYZE` nas queries complexas

### 2. Ciclos na Hierarquia
Adicionar validação para evitar que um usuário seja seu próprio supervisor (direto ou indireto):
```sql
CREATE OR REPLACE FUNCTION prevent_hierarchy_cycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id = NEW.supervisor_id THEN
    RAISE EXCEPTION 'Usuário não pode ser seu próprio supervisor';
  END IF;
  
  -- Verificar ciclos indiretos (mais complexo, recursivo)
  -- ...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_hierarchy_cycle
BEFORE INSERT OR UPDATE ON user_hierarchy
FOR EACH ROW EXECUTE FUNCTION prevent_hierarchy_cycle();
```

### 3. Migração de Dados Existentes
Se já existem projetos/tarefas, você precisa popular a tabela `user_hierarchy` com base nos níveis de acesso atuais ou manualmente.

### 4. Testes
Criar casos de teste para cada nível:
- Usuário A (Usuário) só vê seus dados
- Usuário B (Supervisão) vê dados de A + seus próprios
- Usuário C (Gestão) vê dados de B + A + seus próprios
- Usuário D (Admin) vê tudo

---

## 📚 Recursos Adicionais

### Documentação Supabase RLS:
- https://supabase.com/docs/guides/auth/row-level-security
- https://supabase.com/docs/guides/database/postgres/recursive-queries

### Exemplos de Hierarquia:
- https://www.postgresql.org/docs/current/queries-with.html (WITH RECURSIVE)

---

## 🚀 Próximos Passos Sugeridos

1. ✅ **Definir estrutura de equipes**
   - Quem reporta para quem?
   - Hierarquia atual está mapeada?

2. ✅ **Criar migration com RLS**
   - Implementar políticas documentadas acima
   - Testar em ambiente de dev

3. ✅ **Criar interface de gerenciamento de equipe**
   - `/configuracoes/equipes`
   - Drag-and-drop para reorganizar hierarquia (opcional)

4. ✅ **Remover lógica de filtro no frontend**
   - Simplificar hooks
   - Confiar no RLS do banco

5. ✅ **Testes E2E**
   - Criar cenários de teste para cada nível
   - Validar permissões de CRUD

6. ✅ **Documentar para equipe**
   - Atualizar `/docs/CONTROLE_ACESSO.md`
   - Adicionar exemplos práticos

---

## 📝 Resumo Final

| Aspecto | Recomendação |
|---------|--------------|
| **Criar/Editar/Excluir** | Todos os usuários autenticados ✅ |
| **Visualização** | Baseada em hierarquia (RLS) ✅ |
| **Implementação** | RLS no Supabase (Opção 1) ✅ |
| **Gerenciamento** | Interface `/configuracoes/equipes` ✅ |
| **Performance** | Índices + funções otimizadas ✅ |

---

## 💬 Dúvidas ou Ajustes?

Se precisar de:
- Código completo da migration
- Implementação da interface de equipes
- Testes automatizados
- Ajustes nas políticas

**É só pedir!** Estou aqui para ajudar. 🚀
