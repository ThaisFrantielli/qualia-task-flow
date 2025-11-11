# 🚀 INSTRUÇÕES PARA APLICAR AS PERMISSÕES HIERÁRQUICAS

## 📋 Passo a Passo

### 1️⃣ Abra o Supabase SQL Editor

1. Acesse seu projeto no Supabase: https://supabase.com/dashboard
2. No menu lateral, clique em **SQL Editor**
3. Clique em **+ New Query**

---

### 2️⃣ Copie e Cole o SQL Completo

Copie **TODO** o conteúdo do arquivo:
```
/home/codespace/qualia-task-flow-4/supabase/migrations/20251111_hierarchical_permissions.sql
```

E cole no SQL Editor do Supabase.

---

### 3️⃣ Execute a Query

1. Clique no botão **Run** (ou pressione `Ctrl + Enter` / `Cmd + Enter`)
2. Aguarde a execução (pode levar alguns segundos)
3. Verifique se apareceu **"Success. No rows returned"** ou mensagens de sucesso

---

### 4️⃣ Verifique se foi criado corretamente

Execute este SQL para verificar:

```sql
-- Verificar se a tabela foi criada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_hierarchy'
);

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_user_team_hierarchy',
  'is_user_admin',
  'is_user_supervisor',
  'get_team_count',
  'get_direct_supervisor'
);

-- Verificar políticas RLS em tasks
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'tasks';

-- Verificar políticas RLS em projects
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'projects';
```

**Resultado esperado:**
- Tabela `user_hierarchy`: TRUE
- 5 funções listadas
- Múltiplas políticas para `tasks` e `projects`

---

### 5️⃣ Atualizar Tipos TypeScript (no terminal)

No terminal do seu projeto, execute:

```bash
# Se estiver usando Supabase CLI local
supabase gen types typescript --local > src/integrations/supabase/types.ts

# OU se estiver usando o projeto na nuvem
supabase gen types typescript --project-id SEU_PROJECT_ID > src/integrations/supabase/types.ts
```

**Nota:** Se não tiver a CLI instalada, pode ignorar este passo por enquanto. Os tipos serão atualizados automaticamente.

---

## ✅ Validação Final

### Teste 1: Criar uma hierarquia

Execute no SQL Editor:

```sql
-- Supondo que você tenha 2 usuários (substitua pelos IDs reais)
-- Vamos fazer o usuário B reportar ao usuário A

-- Primeiro, veja os usuários disponíveis
SELECT id, full_name, email, nivelAcesso FROM profiles LIMIT 10;

-- Depois, crie uma relação (substitua os IDs)
INSERT INTO user_hierarchy (user_id, supervisor_id)
VALUES (
  'ID_DO_USUARIO_B',  -- subordinado
  'ID_DO_USUARIO_A'   -- supervisor
);
```

### Teste 2: Verificar a função recursiva

```sql
-- Buscar equipe de um supervisor (substitua pelo ID)
SELECT * FROM get_user_team_hierarchy('ID_DO_SUPERVISOR');
```

### Teste 3: Verificar RLS em ação

```sql
-- Ver suas próprias tarefas (executar logado como usuário)
SELECT * FROM tasks;

-- Isso agora retorna automaticamente:
-- - Suas próprias tarefas
-- - Tarefas de projetos que você participa
-- - Tarefas da sua equipe (se você for supervisor)
-- - Todas as tarefas (se você for admin)
```

---

## 🎯 Próximos Passos Após Aplicar o SQL

1. **Reiniciar os servidores** (frontend e backend) para garantir que os tipos estejam atualizados
2. **Acessar** `/configuracoes/equipes` na interface
3. **Adicionar membros** à sua equipe
4. **Testar** criando tarefas e projetos
5. **Verificar** que cada nível de acesso vê apenas o que deve ver

---

## 🔧 Se der erro

### Erro: "relation already exists"
**Causa:** A tabela já foi criada antes.
**Solução:** Está tudo certo! Pode ignorar.

### Erro: "policy already exists"
**Causa:** As políticas já foram criadas.
**Solução:** Execute este comando primeiro para remover as antigas:

```sql
-- Remover políticas antigas de tasks
DROP POLICY IF EXISTS "users_view_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_view_project_member_tasks" ON public.tasks;
DROP POLICY IF EXISTS "supervisors_view_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins_view_all_tasks" ON public.tasks;
-- ... (continue com todas as outras)

-- Remover políticas antigas de projects
DROP POLICY IF EXISTS "users_view_own_projects" ON public.projects;
-- ... (continue com todas as outras)
```

E então execute o SQL completo novamente.

### Erro: "function does not exist"
**Causa:** Alguma função não foi criada.
**Solução:** Execute o SQL completo novamente do início.

---

## 📞 Suporte

Se tiver qualquer dúvida ou erro:
1. Copie a mensagem de erro completa
2. Me envie para eu analisar
3. Podemos ajustar o SQL conforme necessário

---

## 🎉 Conclusão

Após executar o SQL com sucesso, você terá:

✅ Sistema de hierarquia organizacional funcionando
✅ Permissões baseadas em níveis (Usuário, Supervisão, Gestão, Admin)
✅ RLS automático para tasks e projects
✅ Interface de gerenciamento em `/configuracoes/equipes`
✅ Hooks simplificados (sem lógica duplicada)

**Tudo pronto para uso!** 🚀
