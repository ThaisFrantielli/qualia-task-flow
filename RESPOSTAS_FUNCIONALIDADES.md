# Respostas sobre Funcionalidades

## 1. Botão "Criar Projeto" não funciona

### Análise do Problema:
O código do `CreateProjectForm.tsx` está correto com `onSubmit={handleCreateProject}` configurado. Possíveis causas:

1. **Políticas RLS não aplicadas**: O SQL `SQL_TUDO_EM_UM_FINAL.sql` precisa ser executado no Supabase
2. **Erro silencioso**: O erro pode estar sendo capturado mas não mostrado adequadamente
3. **Validação falhando**: Alguma validação está impedindo o submit

### Solução:
Execute o SQL no Supabase:
```sql
-- Executar: SQL_TUDO_EM_UM_FINAL.sql
```

Caso já tenha executado, abra o console do navegador (F12) e tente criar um projeto novamente para ver o erro exato.

---

## 2. Papéis de Membros do Projeto

### Pergunta: "Um aprovador pode ser colaborador e aprovador ao mesmo tempo?"

**Resposta: NÃO, cada membro tem apenas UM papel por projeto.**

### Estrutura Atual:
```typescript
// Na tabela project_members:
{
  user_id: string,
  project_id: string,
  role: 'owner' | 'aprovador' | 'colaborador' | 'leitor'
}
```

### Hierarquia de Permissões:

1. **👑 Owner (Proprietário)**
   - Criador do projeto
   - Pode fazer TUDO
   - Pode deletar o projeto
   - Gerencia membros

2. **✅ Aprovador**
   - **PODE:** Criar, editar E APROVAR tarefas
   - **PODE:** Ver todas as tarefas do projeto
   - **PODE:** Mudar status de tarefas para "concluído"
   - **NÃO PODE:** Deletar o projeto ou remover o owner

3. **👤 Colaborador**
   - **PODE:** Criar e editar tarefas
   - **PODE:** Ver tarefas do projeto
   - **NÃO PODE:** Aprovar conclusões formais
   - **NÃO PODE:** Gerenciar membros

4. **👁️ Leitor**
   - **PODE:** Apenas visualizar o projeto e tarefas
   - **NÃO PODE:** Criar, editar ou deletar nada

### Recomendação:
Se você quer que alguém tenha múltiplas capacidades, **escolha o papel mais alto**:
- Precisa colaborar E aprovar? → Use **Aprovador** ✅
- Precisa apenas colaborar? → Use **Colaborador** 👤
- Precisa apenas ver? → Use **Leitor** 👁️

### Alternativa (Implementação Futura):
Se precisar de papéis múltiplos, seria necessário:
1. Mudar `role` de string para array: `roles: ['colaborador', 'aprovador']`
2. Atualizar toda a lógica de permissões
3. Criar interface para selecionar múltiplos papéis

**Por enquanto, use o papel mais alto que a pessoa precisa.**

---

## 3. Verificação de Outras Funcionalidades

### ✅ Funcionando:
- Criar tarefas (após SQL aplicado)
- Gerenciar equipes
- Hierarquia de usuários
- Visualização do calendário

### ⚠️ Possíveis Problemas:

1. **Criar Projeto**
   - Status: Precisa verificar no console (F12)
   - Solução: Executar SQL_TUDO_EM_UM_FINAL.sql

2. **Adicionar Membros à Equipe**
   - Status: Funciona se RLS estiver configurado
   - Solução: Verificar políticas da tabela `user_hierarchy`

3. **Editar Tarefas/Projetos**
   - Status: Funciona se RLS estiver configurado
   - Solução: Verificar políticas UPDATE

### Como Verificar:
1. Abra o navegador (http://localhost:8080)
2. Pressione F12 (Console)
3. Tente criar um projeto
4. Veja o erro exato no console

---

## 4. Melhorias no Calendário

Ver arquivo: `MELHORIAS_CALENDARIO.md`
