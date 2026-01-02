# Manual de Controle de Acesso e Permissões

> **Documento Oficial** - Última atualização: Janeiro 2026  
> Este é o documento único e oficial sobre o sistema de controle de acesso da empresa.

---

## 1. Visão Geral

O sistema de controle de acesso define **quem pode ver e fazer o quê** dentro da plataforma. Ele foi projetado para:

- Proteger informações sensíveis de clientes e da empresa
- Garantir que cada colaborador veja apenas o que precisa para trabalhar
- Permitir que gestores acompanhem suas equipes
- Escalar facilmente conforme a empresa cresce

---

## 2. Níveis de Acesso (Perfis)

Existem **4 níveis de acesso** no sistema, do mais restrito ao mais amplo:

### 2.1. Usuário (Nível Básico)
**Quem são:** Colaboradores operacionais, analistas, assistentes.

**O que podem fazer:**
- Ver e editar suas próprias tarefas
- Ver projetos onde foram adicionados como membros
- Ver atendimentos atribuídos a eles
- Criar novas tarefas e registros

**O que NÃO podem fazer:**
- Ver tarefas de outros colegas
- Ver atendimentos de outras pessoas
- Alterar configurações do sistema

---

### 2.2. Supervisão (Coordenadores)
**Quem são:** Coordenadores, líderes de equipe.

**O que podem fazer:**
- Tudo que o Usuário pode
- Ver tarefas dos seus subordinados **diretos** (apenas um nível abaixo)
- Ver projetos dos seus subordinados diretos
- Ver atendimentos dos seus subordinados diretos

**Exemplo prático:**  
Se João é Supervisor de Maria e Pedro, ele vê as tarefas de Maria e Pedro, mas NÃO vê as tarefas dos subordinados de Maria.

---

### 2.3. Gestão (Gerentes/Diretores)
**Quem são:** Gerentes de área, diretores, coordenadores gerais.

**O que podem fazer:**
- Tudo que a Supervisão pode
- Ver tarefas de **toda a sua cadeia hierárquica** (subordinados dos subordinados)
- Ver projetos de toda sua equipe
- Ver atendimentos de toda sua equipe

**Exemplo prático:**  
Se Carlos é Gestor de João (Supervisor), e João supervisiona Maria e Pedro, Carlos vê as tarefas de João, Maria e Pedro.

---

### 2.4. Administrador (Admin)
**Quem são:** TI, diretoria geral, administradores do sistema.

**O que podem fazer:**
- Ver e editar **tudo** no sistema
- Criar e excluir usuários
- Configurar equipes e hierarquias
- Gerenciar módulos e permissões
- Acessar configurações do sistema

---

## 3. Estrutura de Equipes

### 3.1. O que é uma Equipe?
Uma equipe é um grupo de pessoas que trabalham juntas em um departamento ou área específica.

**Exemplos:** Comercial, Pós-Venda, Qualidade, Operação.

### 3.2. Como funciona a Hierarquia?
Cada pessoa pode ter um **supervisor direto**. Isso cria uma árvore hierárquica:

```
Diretoria (Admin)
    └── Gerente Comercial (Gestão)
            ├── Coordenador Vendas (Supervisão)
            │       ├── Vendedor 1 (Usuário)
            │       └── Vendedor 2 (Usuário)
            └── Coordenador Pós-Venda (Supervisão)
                    ├── Atendente 1 (Usuário)
                    └── Atendente 2 (Usuário)
```

### 3.3. Regra de Ouro
> **Um gestor sempre vê o que seus subordinados veem, mas o contrário não é verdade.**

---

## 4. Visibilidade por Tipo de Dado

| Tipo de Dado | Usuário | Supervisão | Gestão | Admin |
|--------------|---------|------------|--------|-------|
| Suas tarefas | ✅ | ✅ | ✅ | ✅ |
| Tarefas subordinados diretos | ❌ | ✅ | ✅ | ✅ |
| Tarefas toda equipe | ❌ | ❌ | ✅ | ✅ |
| Seus atendimentos | ✅ | ✅ | ✅ | ✅ |
| Atendimentos subordinados | ❌ | ✅ (diretos) | ✅ (todos) | ✅ |
| Projetos (membro) | ✅ | ✅ | ✅ | ✅ |
| Projetos (organização) | ✅ | ✅ | ✅ | ✅ |
| Configurações sistema | ❌ | ❌ | ❌ | ✅ |
| Gestão de usuários | ❌ | ❌ | ❌ | ✅ |

---

## 5. Módulos do Sistema

O acesso a diferentes áreas do sistema é controlado por **módulos**. Cada módulo pode ser liberado por grupo ou individualmente.

### Módulos Disponíveis:
- **Dashboard** - Visão geral e indicadores
- **Tarefas** - Gerenciamento de atividades
- **Projetos** - Gestão de projetos
- **CRM** - Gestão de clientes e oportunidades
- **Atendimentos** - Central de atendimento
- **Analytics** - Relatórios e análises
- **Configurações** - Administração do sistema

### Como liberar acesso a um módulo:
1. Acesse **Configurações > Usuários & Acessos**
2. Vá na aba **Módulos e Grupos**
3. Selecione o grupo ou usuário
4. Marque os módulos desejados

---

## 6. Boas Práticas

### Para Administradores:
1. **Sempre defina o supervisor** ao criar um novo usuário
2. **Use grupos** para facilitar a gestão de permissões
3. **Revise periodicamente** as permissões de ex-funcionários
4. **Documente mudanças** significativas na estrutura

### Para Gestores:
1. **Mantenha a hierarquia atualizada** - informe ao RH mudanças na equipe
2. **Não compartilhe credenciais** - cada pessoa deve ter seu acesso
3. **Comunique à TI** quando alguém mudar de área

### Para Todos:
1. **Use senhas fortes** e não as compartilhe
2. **Reporte acessos indevidos** imediatamente
3. **Faça logout** ao sair do computador

---

## 7. Perguntas Frequentes

### "Não consigo ver as tarefas do meu colega"
Isso é esperado. Você só vê tarefas de pessoas que estão abaixo de você na hierarquia, ou projetos onde foi adicionado como membro.

### "Preciso ver dados de outra área"
Solicite ao administrador que:
- Adicione você como membro do projeto específico, ou
- Altere temporariamente sua posição hierárquica

### "Meu subordinado não aparece na minha visão"
Verifique com o RH/TI se a hierarquia está configurada corretamente no sistema.

### "Como adiciono alguém na minha equipe?"
Apenas administradores podem alterar a estrutura hierárquica. Solicite ao setor de TI.

---

## 8. Contato para Suporte

Para dúvidas ou problemas com acesso:
- **TI/Suporte:** Abra um chamado no sistema de tickets
- **RH:** Para questões de hierarquia organizacional

---

## 9. Referência Técnica (Para TI)

Esta seção contém informações técnicas para a equipe de TI.

### 9.1. Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do perfil do usuário (nome, email, cargo) |
| `user_roles` | **Fonte autoritativa de roles** (admin, gestao, supervisor, user) |
| `user_hierarchy` | Relacionamento supervisor-subordinado |
| `teams` | Equipes/departamentos |
| `team_members` | Membros de cada equipe |

### 9.2. Funções de Verificação (SQL)

| Função | Descrição |
|--------|-----------|
| `is_admin_user(uuid)` | Retorna true se o usuário é Admin |
| `is_gestao_or_above(uuid)` | Retorna true se é Gestão ou Admin |
| `is_supervisor_or_above(uuid)` | Retorna true se é Supervisão, Gestão ou Admin |
| `get_direct_subordinates(uuid)` | Retorna IDs dos subordinados diretos |
| `get_all_subordinates(uuid)` | Retorna IDs de todos os subordinados (recursivo) |
| `has_role(uuid, app_role)` | Verifica se usuário tem uma role específica |

### 9.3. Como Adicionar um Novo Usuário

1. Criar o usuário no Supabase Auth
2. O perfil é criado automaticamente via trigger `handle_new_user`
3. Inserir a role na tabela `user_roles`:
   ```sql
   INSERT INTO user_roles (user_id, role) VALUES ('uuid-do-usuario', 'user');
   ```
4. Definir o supervisor na tabela `user_hierarchy`:
   ```sql
   INSERT INTO user_hierarchy (user_id, supervisor_id) 
   VALUES ('uuid-do-usuario', 'uuid-do-supervisor');
   ```
5. Adicionar à equipe na tabela `team_members`:
   ```sql
   INSERT INTO team_members (team_id, user_id) 
   VALUES ('uuid-da-equipe', 'uuid-do-usuario');
   ```

### 9.4. Políticas de Segurança (RLS)

Todas as tabelas sensíveis possuem Row Level Security (RLS) habilitado. As políticas garantem:

- **Usuários** só veem seus próprios dados
- **Supervisores** veem dados dos subordinados diretos
- **Gestores** veem dados de toda a cadeia hierárquica
- **Admins** têm acesso total

### 9.5. Checklist de Segurança

- [ ] Toda nova tabela deve ter RLS habilitado
- [ ] Nunca usar `USING (true)` em policies de dados sensíveis
- [ ] Funções SECURITY DEFINER devem ter `SET search_path = public`
- [ ] Roles devem estar apenas na tabela `user_roles` (não em `profiles`)
- [ ] Testar policies com diferentes níveis de usuário

---

*Este documento substitui todas as versões anteriores sobre controle de acesso e permissões.*
*Última atualização: Janeiro 2026*
