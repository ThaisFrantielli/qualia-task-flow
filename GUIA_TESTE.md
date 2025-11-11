# 🧪 Guia de Teste - Funcionalidades Implementadas

## ⚡ Teste Rápido (5 minutos)

### 1. Testar Criação de Projeto

1. Acesse: http://localhost:8080
2. Faça login
3. Clique em **"Novo Projeto"**
4. Abra o Console do navegador (F12)
5. Preencha o formulário:
   - **Nome:** Teste de Projeto
   - **Descrição:** Teste de funcionalidade
   - **Equipe:** (deixe vazio ou selecione uma)
   - **Privacidade:** Organização
6. Clique em **"Criar Projeto"**

**✅ Esperado:**
- Toast de sucesso: "Projeto 'Teste de Projeto' criado"
- Modal fecha automaticamente
- Projeto aparece na lista

**❌ Se der erro:**
- Veja a mensagem no toast (agora mostra erro específico)
- Veja o console (F12) para detalhes
- Se aparecer "RLS policy" ou "permission denied":
  ```sql
  -- Execute no Supabase SQL Editor:
  -- Copie e cole todo o conteúdo de: SQL_TUDO_EM_UM_FINAL.sql
  ```

---

### 2. Testar Ajuda de Papéis de Membros

1. Clique em **"Novo Projeto"**
2. Role até **"Membros do Projeto"**
3. Você verá 2 ícones de ajuda (?):
   - Primeiro (?): Tooltip explicando o campo
   - Segundo (?): Dialog detalhado sobre papéis

4. Clique no **segundo (?)** (mais à direita)

**✅ Esperado:**
- Abre modal grande com explicações detalhadas
- Mostra hierarquia: Owner > Aprovador > Colaborador > Leitor
- Tem FAQ e recomendações
- Cada papel tem cores e ícones

**Teste a funcionalidade:**
5. Adicione um membro como **Colaborador**
6. Adicione outro como **Aprovador**
7. Crie o projeto
8. Entre no projeto e veja os membros listados

---

### 3. Testar Melhorias do Calendário

1. Acesse: **Calendário** (menu lateral)

**✅ Verifique:**
- [ ] Legenda de cores aparece no topo (azul, verde, amarelo, vermelho)
- [ ] Dia atual está destacado com borda azul grossa
- [ ] Dias com tarefas mostram badge com número (ex: "3")
- [ ] Hover nos dias muda a borda para azul
- [ ] Dias de outros meses estão mais claros/transparentes

**Teste a interação:**
2. Crie uma tarefa com data
3. Volte ao calendário
4. **Clique na tarefa** no calendário

**✅ Esperado:**
- Navega para a página de detalhes da tarefa

---

## 🔍 Testes Detalhados (15 minutos)

### 4. Testar Diferentes Privacidades

**Teste 1 - Organização:**
1. Crie projeto com privacidade "Organização"
2. Faça login com outro usuário
3. Veja se ele consegue ver o projeto

**Teste 2 - Equipe:**
1. Crie projeto com privacidade "Equipe"
2. Selecione uma equipe
3. Adicione o criador à mesma equipe (se não estiver)
4. Faça login com usuário de outra equipe
5. Veja se ele NÃO consegue ver o projeto
6. Faça login com usuário da mesma equipe
7. Veja se ele consegue ver o projeto

**Teste 3 - Privado:**
1. Crie projeto com privacidade "Privado"
2. Adicione apenas 1 membro específico
3. Faça login com outro usuário (não adicionado)
4. Veja se ele NÃO consegue ver o projeto
5. Faça login com o membro adicionado
6. Veja se ele consegue ver o projeto

---

### 5. Testar Permissões de Papéis

**Setup:**
1. Crie um projeto
2. Adicione 3 usuários diferentes:
   - Usuário A: Aprovador
   - Usuário B: Colaborador
   - Usuário C: Leitor

**Teste com Leitor (Usuário C):**
1. Faça login como Usuário C
2. Entre no projeto
3. **Deve conseguir:**
   - Ver o projeto
   - Ver todas as tarefas
4. **NÃO deve conseguir:**
   - Criar tarefa (botão desabilitado/ausente)
   - Editar tarefa existente
   - Mudar status

**Teste com Colaborador (Usuário B):**
1. Faça login como Usuário B
2. Entre no projeto
3. **Deve conseguir:**
   - Criar tarefa
   - Editar tarefa
   - Atualizar status
   - Comentar
4. **NÃO deve conseguir:**
   - Deletar o projeto
   - Remover o owner
   - Aprovar formalmente (se houver fluxo de aprovação)

**Teste com Aprovador (Usuário A):**
1. Faça login como Usuário A
2. Entre no projeto
3. **Deve conseguir:**
   - Tudo que Colaborador faz
   - Aprovar conclusões
   - Validar entregas

---

### 6. Testar Criação de Tarefas

1. Entre em um projeto
2. Clique em **"Nova Tarefa"** ou **"Criar Tarefa Rápida"**
3. Preencha:
   - Título
   - Descrição
   - Data de início e fim
   - Prioridade
4. Clique em **"Criar"**

**✅ Esperado:**
- Toast de sucesso
- Tarefa aparece na lista
- Tarefa aparece no calendário (se tiver data)

**❌ Se der erro:**
- Veja o console (F12)
- Se for RLS policy, execute o SQL

---

### 7. Testar Calendário - Eventos

1. Acesse o Calendário
2. Clique em **"Adicionar Evento/Lembrete"**
3. Preencha:
   - Título: Reunião importante
   - Data inicial: Hoje
   - Data final: Amanhã
4. Clique em **"Salvar"**

**✅ Esperado:**
- Evento aparece no calendário em verde
- Se tiver intervalo de datas, aparece linha contínua
- Badge do dia aumenta o contador

---

## 🐛 Checklist de Funcionalidades

### Projetos:
- [ ] Criar projeto (com/sem equipe)
- [ ] Criar projeto com diferentes privacidades
- [ ] Adicionar membros com diferentes papéis
- [ ] Editar projeto
- [ ] Deletar projeto (apenas owner)
- [ ] Ver lista de projetos

### Tarefas:
- [ ] Criar tarefa
- [ ] Editar tarefa
- [ ] Mudar status
- [ ] Adicionar subtarefas
- [ ] Adicionar comentários
- [ ] Deletar tarefa
- [ ] Ver tarefas no calendário

### Calendário:
- [ ] Ver tarefas agendadas
- [ ] Criar evento/lembrete
- [ ] Navegar entre meses
- [ ] Clicar em tarefa para ver detalhes
- [ ] Ver badge com contador
- [ ] Ver legenda de cores

### Equipes:
- [ ] Criar equipe (Admin)
- [ ] Adicionar membros à equipe
- [ ] Ver hierarquia de equipe
- [ ] Editar equipe

### Hierarquia:
- [ ] Definir supervisor
- [ ] Ver subordinados
- [ ] Gestão pode ver tarefas da equipe
- [ ] Admin vê tudo

---

## 📊 Matriz de Testes de Permissões

| Ação | Leitor | Colaborador | Aprovador | Owner | Admin |
|------|--------|-------------|-----------|-------|-------|
| Ver projeto | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver tarefas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar tarefa | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar tarefa | ❌ | ✅ | ✅ | ✅ | ✅ |
| Deletar tarefa | ❌ | ✅* | ✅ | ✅ | ✅ |
| Aprovar | ❌ | ❌ | ✅ | ✅ | ✅ |
| Adicionar membros | ❌ | ❌ | ❌ | ✅ | ✅ |
| Deletar projeto | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver todos projetos | ❌ | ❌ | ❌ | ❌ | ✅ |

*Apenas suas próprias tarefas

---

## 🚨 Problemas Comuns e Soluções

### Problema: "Não consigo criar projeto"
**Solução:**
1. Abra o console (F12)
2. Veja o erro exato
3. Se for RLS policy:
   ```sql
   -- Execute: SQL_TUDO_EM_UM_FINAL.sql no Supabase
   ```

### Problema: "Não vejo projetos de outros usuários"
**Solução:**
- Verifique a privacidade do projeto
- Se for "Privado", você precisa ser membro
- Se for "Equipe", você precisa estar na mesma equipe
- Execute o SQL se as políticas não estiverem aplicadas

### Problema: "Campo Equipe está vazio"
**Solução:**
1. Execute: `SQL_CRIAR_EQUIPES_PADRAO.sql` no Supabase
   OU
2. Vá em "Configurações > Gerenciar Equipes" e crie equipes manualmente
   OU
3. Deixe em branco (agora é opcional!)

### Problema: "Calendário não mostra melhorias"
**Solução:**
- Recarregue a página (Ctrl+R ou Cmd+R)
- Limpe o cache (Ctrl+Shift+R ou Cmd+Shift+R)
- Verifique se o servidor está rodando

### Problema: "Botão de ajuda (?) não aparece"
**Solução:**
- Recarregue a página
- Verifique se MemberRolesInfo.tsx foi criado
- Veja o console para erros de importação

---

## ✅ Sucesso!

Se todos os testes acima passarem:
- ✨ Sistema funcionando 100%
- 🎉 Todas as melhorias implementadas
- 📚 Documentação completa
- 🚀 Pronto para uso!

---

## 📞 Precisa de Ajuda?

Se algum teste falhar:
1. Anote qual teste falhou
2. Copie a mensagem de erro do console (F12)
3. Compartilhe para análise
4. Veja os arquivos de documentação:
   - `RESPOSTAS_FUNCIONALIDADES.md`
   - `MELHORIAS_CALENDARIO.md`
   - `RESUMO_ALTERACOES.md`
