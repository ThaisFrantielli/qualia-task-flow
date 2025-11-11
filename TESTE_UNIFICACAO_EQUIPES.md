# 🧪 Guia de Teste - Configurações de Equipes Unificadas

## Como Testar a Nova Interface

### 1️⃣ Acesso à Nova Página

1. Faça login no sistema
2. No menu lateral (Sidebar), procure por **"Equipes & Hierarquia"** na seção Configurações
3. Clique no item do menu

**Resultado esperado**: Você deve ver uma página com duas abas: "Departamentos" e "Hierarquia"

---

## 2️⃣ Testando a Aba "Departamentos"

### Teste 1: Visualizar Departamentos
- **Quem pode**: Todos os usuários
- **Ação**: Abra a aba "Departamentos"
- **Esperado**: 
  - Lista de todas as equipes/departamentos cadastrados
  - Card informativo azul explicando o conceito
  - Estatística com total de equipes

### Teste 2: Criar Departamento (Admin apenas)
- **Quem pode**: Apenas Admin
- **Ação**: 
  1. Clique em "Nova Equipe"
  2. Preencha nome (ex: "Marketing")
  3. Adicione descrição (opcional)
  4. Clique em "Criar Equipe"
- **Esperado**: 
  - Toast de sucesso
  - Nova equipe aparece na lista
  - Contador de equipes atualizado

### Teste 3: Editar Departamento (Admin apenas)
- **Quem pode**: Apenas Admin
- **Ação**: 
  1. Clique no ícone de lápis em uma equipe
  2. Modifique nome ou descrição
  3. Clique em "Salvar Alterações"
- **Esperado**: 
  - Toast de sucesso
  - Mudanças refletidas na lista

### Teste 4: Deletar Departamento (Admin apenas)
- **Quem pode**: Apenas Admin
- **Ação**: 
  1. Clique no ícone de lixeira em uma equipe
  2. Confirme a exclusão
- **Esperado**: 
  - Alerta de confirmação
  - Toast de sucesso
  - Equipe removida da lista

---

## 3️⃣ Testando a Aba "Hierarquia"

### Teste 5: Visualizar Supervisor (Usuário Comum)
- **Quem pode**: Todos os usuários
- **Ação**: Abra a aba "Hierarquia"
- **Esperado** (Usuário Comum): 
  - Card mostrando "Meu Supervisor"
  - Nome, email e nível do supervisor
  - NÃO deve ver opção de adicionar membros

### Teste 6: Ver Equipe (Gestor/Supervisor/Admin)
- **Quem pode**: Admin, Gestão, Supervisão
- **Ação**: Abra a aba "Hierarquia"
- **Esperado**: 
  - 3 cards de estatísticas (Equipe Direta, Equipe Total, Seu Nível)
  - Card "Meu Supervisor" (se houver)
  - Card "Membros Diretos da Equipe"
  - Card "Equipe Completa (Hierarquia)" (se houver subordinados)
  - Botão "Adicionar Membro" no topo

### Teste 7: Adicionar Membro à Equipe
- **Quem pode**: Admin, Gestão, Supervisão
- **Ação**: 
  1. Clique em "Adicionar Membro"
  2. Selecione um usuário no dropdown
  3. Clique em "Adicionar"
- **Esperado**: 
  - Modal de confirmação
  - Usuário adicionado à lista de membros diretos
  - Contador de "Equipe Direta" atualizado
  - Você se torna supervisor do usuário adicionado

### Teste 8: Remover Membro da Equipe
- **Quem pode**: Admin, Gestão, Supervisão
- **Ação**: 
  1. Clique no ícone de lixeira ao lado de um membro
  2. Confirme a remoção
- **Esperado**: 
  - Alerta de confirmação
  - Membro removido da lista
  - Contador de "Equipe Direta" atualizado

---

## 4️⃣ Testes de Permissões

### Cenário A: Login como Admin
✅ Deve ver e poder usar:
- Aba Departamentos (criar/editar/deletar)
- Aba Hierarquia (adicionar/remover membros)
- Todos os botões e ações visíveis

### Cenário B: Login como Gestão/Supervisão
✅ Deve ver e poder usar:
- Aba Departamentos (apenas visualizar, sem criar/editar/deletar)
- Aba Hierarquia (adicionar/remover membros)

### Cenário C: Login como Usuário Comum
✅ Deve ver e poder usar:
- Aba Departamentos (apenas visualizar)
- Aba Hierarquia (ver apenas supervisor, sem gerenciar equipe)

❌ Não deve ver:
- Botões de criar/editar/deletar departamentos
- Botão de adicionar membros
- Lista de equipe completa

---

## 5️⃣ Testes de Navegação

### Teste 9: Alternar entre abas
- **Ação**: Clique alternadamente nas abas "Departamentos" e "Hierarquia"
- **Esperado**: Conteúdo muda suavemente sem recarregar a página

### Teste 10: Links diretos (compatibilidade)
- **Ação**: Acesse manualmente as URLs antigas:
  - `/configuracoes/departamentos`
  - `/configuracoes/equipes`
- **Esperado**: Páginas antigas ainda funcionam (compatibilidade mantida)

### Teste 11: Link do Sidebar
- **Ação**: Clique em "Equipes & Hierarquia" no menu lateral
- **Esperado**: Abre `/configuracoes/equipes-hierarquia` com a aba "Departamentos" selecionada por padrão

---

## 6️⃣ Testes de UI/UX

### Teste 12: Responsividade
- **Ação**: Redimensione a janela do navegador
- **Esperado**: 
  - Tabs se ajustam em telas menores
  - Cards reorganizam em grid responsivo
  - Botões e textos permanecem legíveis

### Teste 13: Estados de Loading
- **Ação**: Recarregue a página ou faça logout/login
- **Esperado**: 
  - Skeleton loaders aparecem durante carregamento
  - Sem "flash" de conteúdo vazio

### Teste 14: Mensagens de Feedback
- **Ação**: Execute ações que geram feedback (criar, editar, deletar)
- **Esperado**: 
  - Toasts informativos aparecem
  - Mensagens claras de sucesso/erro
  - Diálogos de confirmação antes de ações destrutivas

---

## 7️⃣ Checklist de Validação

Antes de considerar o teste completo, verifique:

- [ ] Aba Departamentos renderiza corretamente
- [ ] Aba Hierarquia renderiza corretamente
- [ ] Admin consegue criar/editar/deletar equipes
- [ ] Gestor/Supervisor consegue adicionar/remover membros
- [ ] Usuário comum vê apenas informações limitadas
- [ ] Estatísticas (contadores) atualizam em tempo real
- [ ] Modais abrem e fecham corretamente
- [ ] Formulários validam campos obrigatórios
- [ ] Toasts aparecem para ações bem-sucedidas
- [ ] Confirmações aparecem para ações perigosas (deletar, remover)
- [ ] Layout responsivo funciona em mobile/tablet/desktop
- [ ] Sem erros no console do navegador
- [ ] Sidebar atualizado com novo item "Equipes & Hierarquia"
- [ ] URLs antigas ainda funcionam (compatibilidade)

---

## 🐛 Problemas Comuns e Soluções

### Problema: "Não consigo ver a nova opção no menu"
**Solução**: Faça logout e login novamente, ou limpe o cache do navegador.

### Problema: "Erro ao criar equipe"
**Solução**: 
1. Verifique se você está logado como Admin
2. Confirme que o nome não está vazio
3. Verifique as permissões no banco de dados

### Problema: "Não vejo membros na hierarquia"
**Solução**: Você precisa adicionar membros primeiro usando o botão "Adicionar Membro"

### Problema: "Contador de equipes não atualiza"
**Solução**: Recarregue a página ou navegue para outra tela e volte

---

## 📊 Relatório de Teste

Após testar, preencha:

| Teste | Status | Observações |
|-------|--------|-------------|
| Visualizar Departamentos | ⬜ | |
| Criar Departamento | ⬜ | |
| Editar Departamento | ⬜ | |
| Deletar Departamento | ⬜ | |
| Visualizar Supervisor | ⬜ | |
| Ver Equipe | ⬜ | |
| Adicionar Membro | ⬜ | |
| Remover Membro | ⬜ | |
| Permissões (Admin) | ⬜ | |
| Permissões (Gestão) | ⬜ | |
| Permissões (Usuário) | ⬜ | |
| Responsividade | ⬜ | |

Legenda: ✅ Passou | ❌ Falhou | ⚠️ Com ressalvas

---

**Última atualização**: 11/11/2025  
**Tempo estimado de teste**: 15-20 minutos
