# 🎓 EXEMPLOS PRÁTICOS - SISTEMA DE PERMISSÕES HIERÁRQUICAS

## 📖 Cenários de Uso Real

### Cenário 1: Empresa de TI com 3 níveis hierárquicos

**Estrutura:**
```
Admin: CEO (João Silva)
  └── Gestor: Diretor de TI (Maria Santos)
      ├── Supervisor: Tech Lead Frontend (Pedro Costa)
      │   ├── Usuário: Dev Frontend Júnior (Ana Oliveira)
      │   └── Usuário: Dev Frontend Pleno (Carlos Souza)
      └── Supervisor: Tech Lead Backend (Júlia Ferreira)
          └── Usuário: Dev Backend Júnior (Fernando Lima)
```

**SQL para criar esta hierarquia:**

```sql
-- Primeiro, veja os IDs dos usuários (substitua pelos seus)
SELECT id, full_name, email, nivelAcesso FROM profiles 
WHERE email IN (
  'joao@empresa.com',
  'maria@empresa.com',
  'pedro@empresa.com',
  'ana@empresa.com',
  'carlos@empresa.com',
  'julia@empresa.com',
  'fernando@empresa.com'
);

-- Depois, crie as relações (substitua pelos IDs reais)
-- Maria reporta para João
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_MARIA', 'ID_JOAO');

-- Pedro reporta para Maria
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_PEDRO', 'ID_MARIA');

-- Júlia reporta para Maria
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_JULIA', 'ID_MARIA');

-- Ana reporta para Pedro
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_ANA', 'ID_PEDRO');

-- Carlos reporta para Pedro
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_CARLOS', 'ID_PEDRO');

-- Fernando reporta para Júlia
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_FERNANDO', 'ID_JULIA');
```

**O que cada pessoa vê:**

| Pessoa | Tarefas Visíveis | Projetos Visíveis |
|--------|------------------|-------------------|
| **Ana** | Apenas suas tarefas + projetos que participa | Apenas seus projetos + onde é membro |
| **Pedro** | Suas + Ana + Carlos + projetos | Seus + Ana + Carlos + onde é membro |
| **Maria** | Suas + Pedro + Ana + Carlos + Júlia + Fernando + projetos | Seus + de toda equipe + onde é membro |
| **João (CEO/Admin)** | **TODAS** do sistema | **TODOS** do sistema |

---

### Cenário 2: Criar um Projeto Colaborativo

**Passo a passo:**

1. **Ana cria um projeto:**
```typescript
// No frontend, Ana clica em "Novo Projeto"
// Preenche: Nome = "Sistema de Login"
// Adiciona membros: Carlos (colaborador), Pedro (aprovador)
```

2. **SQL gerado automaticamente:**
```sql
-- Criar projeto
INSERT INTO projects (name, description, user_id)
VALUES ('Sistema de Login', 'Implementar autenticação JWT', 'ID_ANA');

-- Adicionar membros
INSERT INTO project_members (project_id, user_id, role)
VALUES 
  ('PROJECT_ID', 'ID_ANA', 'owner'),
  ('PROJECT_ID', 'ID_CARLOS', 'colaborador'),
  ('PROJECT_ID', 'ID_PEDRO', 'aprovador');
```

3. **Quem vê este projeto:**
- ✅ Ana (owner)
- ✅ Carlos (membro colaborador)
- ✅ Pedro (membro aprovador + supervisor de Ana e Carlos)
- ✅ Maria (gestora de Pedro)
- ✅ João (admin)
- ❌ Júlia (não está na equipe deste projeto)
- ❌ Fernando (não está na equipe deste projeto)

4. **Ana cria uma tarefa no projeto:**
```typescript
// Ana cria: "Criar endpoint /login"
// Atribui para: Carlos
```

5. **Quem vê esta tarefa:**
- ✅ Ana (criadora)
- ✅ Carlos (assignee)
- ✅ Pedro (supervisor + membro do projeto)
- ✅ Maria (gestora)
- ✅ João (admin)
- ❌ Júlia (não relacionada)
- ❌ Fernando (não relacionado)

---

### Cenário 3: Tarefa Pessoal (sem projeto)

**Fernando cria uma tarefa pessoal:**
```typescript
// Fernando: "Estudar Docker"
// Sem projeto vinculado
// Assignee: Fernando
```

**Quem vê:**
- ✅ Fernando (criador + assignee)
- ✅ Júlia (supervisora de Fernando)
- ✅ Maria (gestora de Júlia)
- ✅ João (admin)
- ❌ Ana, Carlos, Pedro (não relacionados)

---

### Cenário 4: Reorganização da Hierarquia

**Situação:** Pedro foi promovido e agora é Gestor ao lado de Maria

**SQL para reorganizar:**
```sql
-- 1. Atualizar nível de acesso de Pedro
UPDATE profiles 
SET nivelAcesso = 'Gestão'
WHERE id = 'ID_PEDRO';

-- 2. Mudar Pedro para reportar direto ao CEO
UPDATE user_hierarchy
SET supervisor_id = 'ID_JOAO'
WHERE user_id = 'ID_PEDRO';

-- 3. Agora Pedro vê:
-- - Suas próprias tarefas
-- - Tarefas de Ana e Carlos (continua supervisionando)
-- - Tarefas de projetos que participa
```

**Resultado:**
```
Admin: CEO (João)
  ├── Gestor: Maria
  │   └── Supervisor: Júlia
  │       └── Usuário: Fernando
  └── Gestor: Pedro (PROMOVIDO)
      ├── Usuário: Ana
      └── Usuário: Carlos
```

---

### Cenário 5: Delegação entre Equipes

**Júlia quer delegar uma tarefa para Ana (de outra equipe):**

1. **Júlia cria tarefa:**
```typescript
// Título: "Revisar código de autenticação"
// Assignee: Ana
```

2. **Quem vê:**
- ✅ Júlia (criadora)
- ✅ Ana (assignee)
- ✅ Pedro (supervisor de Ana)
- ✅ Maria (gestora de ambos)
- ✅ João (admin)
- ❌ Carlos (não relacionado diretamente)
- ❌ Fernando (não relacionado)

3. **Ana pode:**
- Ver a tarefa (assignee)
- Editar a tarefa (assignee)
- Concluir a tarefa
- Adicionar comentários

4. **Pedro pode:**
- Ver a tarefa (supervisor de Ana)
- Editar a tarefa (supervisor)
- Acompanhar progresso

---

### Cenário 6: Dashboard de Equipe

**Pedro quer ver estatísticas da sua equipe:**

```sql
-- Total de tarefas por pessoa da equipe
SELECT 
  p.full_name,
  COUNT(DISTINCT CASE WHEN t.status = 'todo' THEN t.id END) as pendentes,
  COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as em_progresso,
  COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as concluidas,
  COUNT(DISTINCT t.id) as total
FROM profiles p
LEFT JOIN tasks t ON (t.user_id = p.id OR t.assignee_id = p.id)
WHERE p.id IN (
  SELECT team_member_id FROM get_user_team_hierarchy('ID_PEDRO')
  UNION
  SELECT 'ID_PEDRO' -- incluir o próprio Pedro
)
GROUP BY p.id, p.full_name
ORDER BY total DESC;
```

**Resultado esperado:**
```
full_name       | pendentes | em_progresso | concluidas | total
----------------|-----------|--------------|------------|------
Pedro Costa     |     5     |      3       |     12     |  20
Ana Oliveira    |     3     |      2       |      8     |  13
Carlos Souza    |     2     |      1       |      5     |   8
```

---

### Cenário 7: Busca Global com Filtros Hierárquicos

**Maria quer buscar todas as tarefas com "bug" no título da sua equipe:**

```typescript
// No frontend, Maria acessa /tasks
// Digita na busca: "bug"
// RLS automaticamente filtra para mostrar apenas:
// - Suas tarefas
// - Tarefas da equipe (Pedro, Júlia, Ana, Carlos, Fernando)
```

**SQL executado automaticamente:**
```sql
SELECT * FROM tasks
WHERE title ILIKE '%bug%'
-- RLS adiciona automaticamente:
-- AND (
--   user_id = 'ID_MARIA'
--   OR assignee_id = 'ID_MARIA'
--   OR user_id IN (SELECT team_member_id FROM get_user_team_hierarchy('ID_MARIA'))
--   OR assignee_id IN (SELECT team_member_id FROM get_user_team_hierarchy('ID_MARIA'))
-- )
ORDER BY created_at DESC;
```

---

### Cenário 8: Remover Membro da Equipe

**Pedro decide que Ana não reporta mais para ele:**

**Opção 1: Via Interface**
1. Pedro acessa `/configuracoes/equipes`
2. Encontra "Ana Oliveira" na lista
3. Clica no ícone de lixeira
4. Confirma remoção

**Opção 2: Via SQL**
```sql
DELETE FROM user_hierarchy
WHERE user_id = 'ID_ANA' AND supervisor_id = 'ID_PEDRO';
```

**Resultado:**
- ✅ Ana não aparece mais na equipe de Pedro
- ✅ Pedro não vê mais as tarefas pessoais de Ana
- ✅ Pedro ainda vê tarefas de projetos em que ambos participam
- ✅ Ana pode continuar trabalhando normalmente

---

### Cenário 9: Transferir Supervisor

**Ana vai mudar de equipe. Agora reportará para Júlia:**

```sql
-- Atualizar supervisor de Ana
UPDATE user_hierarchy
SET supervisor_id = 'ID_JULIA'
WHERE user_id = 'ID_ANA';
```

**Nova hierarquia:**
```
Gestor: Maria
  ├── Supervisor: Pedro
  │   └── Usuário: Carlos (sozinho agora)
  └── Supervisor: Júlia
      ├── Usuário: Fernando
      └── Usuário: Ana (TRANSFERIDA)
```

**Impactos:**
- ❌ Pedro não vê mais tarefas pessoais de Ana
- ✅ Júlia agora vê tarefas de Ana
- ✅ Maria continua vendo tudo (gestora de ambos)
- ✅ Projetos não são afetados (Ana continua como membro)

---

### Cenário 10: Validação de Ciclos

**Tentativa INCORRETA:** Pedro tenta adicionar Maria à sua equipe

```sql
-- Isso FALHARÁ! (criaria ciclo)
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('ID_MARIA', 'ID_PEDRO');
```

**Erro retornado:**
```
ERROR: Esta operação criaria um ciclo na hierarquia organizacional
```

**Por quê?**
- Maria supervisiona Pedro
- Se Pedro supervisionasse Maria, teríamos: Pedro → Maria → Pedro (ciclo infinito)
- O trigger `prevent_hierarchy_cycle()` bloqueia isso automaticamente

---

## 🧪 Casos de Teste

### Teste 1: Usuário Normal

**Configurar:**
```sql
-- Criar usuário teste
INSERT INTO profiles (id, full_name, email, nivelAcesso)
VALUES (gen_random_uuid(), 'Teste Usuário', 'teste@empresa.com', 'Usuário');
```

**Testar:**
1. Login como "teste@empresa.com"
2. Criar tarefa pessoal
3. Verificar que vê apenas esta tarefa
4. Criar projeto e adicionar outro membro
5. Verificar que ambos veem o projeto

**Resultado esperado:**
- ✅ Vê suas próprias tarefas
- ✅ Vê projetos que criou
- ✅ Vê projetos onde é membro
- ❌ NÃO vê tarefas de outros usuários
- ❌ NÃO vê projetos de outros usuários

---

### Teste 2: Supervisor

**Configurar:**
```sql
-- Criar supervisor e subordinado
INSERT INTO profiles (id, full_name, email, nivelAcesso) VALUES
  ('SUPERVISOR_ID', 'Teste Supervisor', 'supervisor@empresa.com', 'Supervisão'),
  ('SUBORDINADO_ID', 'Teste Subordinado', 'subordinado@empresa.com', 'Usuário');

-- Criar hierarquia
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES ('SUBORDINADO_ID', 'SUPERVISOR_ID');
```

**Testar:**
1. Login como "subordinado@empresa.com"
2. Criar 3 tarefas pessoais
3. Logout
4. Login como "supervisor@empresa.com"
5. Acessar `/tasks`

**Resultado esperado:**
- ✅ Supervisor vê as 3 tarefas do subordinado
- ✅ Supervisor vê suas próprias tarefas
- ✅ Supervisor pode editar tarefas do subordinado
- ✅ Supervisor pode criar tarefas para o subordinado

---

### Teste 3: Admin

**Configurar:**
```sql
-- Garantir que existe um admin
UPDATE profiles
SET nivelAcesso = 'Admin',
    permissoes = '{"is_admin": true}'::jsonb
WHERE email = 'admin@empresa.com';
```

**Testar:**
1. Criar vários usuários e tarefas (como usuários diferentes)
2. Login como "admin@empresa.com"
3. Acessar `/tasks`
4. Acessar `/projects`

**Resultado esperado:**
- ✅ Admin vê TODAS as tarefas do sistema
- ✅ Admin vê TODOS os projetos do sistema
- ✅ Admin pode editar qualquer tarefa/projeto
- ✅ Admin pode excluir qualquer tarefa/projeto

---

## 📊 Queries Úteis para Monitoramento

### 1. Relatório de Hierarquia Completa
```sql
WITH RECURSIVE org_tree AS (
  -- Raiz: Usuários sem supervisor (geralmente admins/ceos)
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.nivelAcesso,
    NULL::UUID as supervisor_id,
    0 as nivel,
    p.full_name as caminho
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM user_hierarchy WHERE user_id = p.id
  )
  
  UNION ALL
  
  -- Recursivo: Subordinados
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.nivelAcesso,
    uh.supervisor_id,
    ot.nivel + 1,
    ot.caminho || ' → ' || p.full_name
  FROM profiles p
  JOIN user_hierarchy uh ON uh.user_id = p.id
  JOIN org_tree ot ON ot.id = uh.supervisor_id
)
SELECT 
  REPEAT('  ', nivel) || full_name as hierarquia,
  nivelAcesso,
  email,
  nivel
FROM org_tree
ORDER BY caminho;
```

### 2. Usuários sem Supervisor
```sql
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.nivelAcesso
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_hierarchy WHERE user_id = p.id
)
AND p.nivelAcesso != 'Admin'
ORDER BY p.full_name;
```

### 3. Tarefas Órfãs (sem responsável)
```sql
SELECT 
  t.id,
  t.title,
  t.status,
  t.created_at,
  p.full_name as criador
FROM tasks t
LEFT JOIN profiles p ON p.id = t.user_id
WHERE t.assignee_id IS NULL
AND t.status != 'done'
ORDER BY t.created_at DESC;
```

### 4. Distribuição de Tarefas por Equipe
```sql
SELECT 
  supervisor.full_name as supervisor,
  COUNT(DISTINCT uh.user_id) as membros_equipe,
  COUNT(t.id) as total_tarefas,
  ROUND(COUNT(t.id)::NUMERIC / NULLIF(COUNT(DISTINCT uh.user_id), 0), 2) as tarefas_por_membro
FROM profiles supervisor
LEFT JOIN user_hierarchy uh ON uh.supervisor_id = supervisor.id
LEFT JOIN tasks t ON (t.user_id = uh.user_id OR t.assignee_id = uh.user_id)
WHERE supervisor.nivelAcesso IN ('Supervisão', 'Gestão')
GROUP BY supervisor.id, supervisor.full_name
ORDER BY total_tarefas DESC;
```

---

## 🎯 Dicas de Uso

### ✅ DO (Faça)
- Configure a hierarquia logo no início do uso do sistema
- Mantenha a hierarquia atualizada quando houver mudanças organizacionais
- Use níveis de acesso corretos (Usuário, Supervisão, Gestão, Admin)
- Adicione membros a projetos para colaboração além da hierarquia
- Revise periodicamente quem tem acesso ao quê

### ❌ DON'T (Não faça)
- Não crie hierarquias muito profundas (mais de 5 níveis)
- Não deixe usuários sem supervisor (exceto admins/ceos)
- Não abuse do nível Admin (mantenha poucos admins)
- Não tente criar ciclos na hierarquia
- Não confie apenas na hierarquia para projetos colaborativos (use project_members)

---

**Estes exemplos cobrem 90% dos casos de uso reais. Para casos específicos, consulte a documentação completa em `/docs/PERMISSOES_HIERARQUICAS.md`**
