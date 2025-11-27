# Sistema de Controle de Acesso por Módulos

## 📋 Visão Geral

Sistema completo de controle de acesso baseado em módulos, permitindo gerenciar permissões de usuários através de grupos e permissões individuais.

## 🏗️ Arquitetura

### Estrutura de Dados

- **modules**: Módulos disponíveis no sistema (Dashboard, Tarefas, CRM, etc.)
- **groups**: Grupos de usuários (Administradores, Gestores, Operacional, etc.)
- **user_groups**: Relacionamento entre usuários e grupos
- **group_modules**: Permissões de acesso por grupo
- **user_modules**: Permissões individuais (sobrescreve grupo)

### Hierarquia de Permissões

1. **Permissões Individuais** (maior prioridade)
2. **Permissões de Grupo**
3. **Admin Override** (admins têm acesso total)

## 🚀 Funcionalidades

### Para Administradores

1. **Gerenciar Módulos**
   - Criar/editar/excluir módulos
   - Ativar/desativar módulos
   - Definir ordem de exibição
   - Configurar ícones e rotas

2. **Gerenciar Grupos**
   - Criar grupos de usuários
   - Atribuir usuários a grupos
   - Definir permissões de grupo

3. **Gerenciar Permissões**
   - Matriz de permissões por grupo
   - Permissões individuais por usuário
   - Visualização clara de acessos

### Para Usuários

- Acesso apenas aos módulos permitidos
- Menu lateral dinâmico
- Redirecionamento automático em caso de acesso negado

## 📦 Estrutura de Arquivos

```
src/
├── hooks/
│   ├── useModuleAccess.ts          # Verificar acesso a módulo
│   ├── useUserModules.ts           # Buscar módulos do usuário
│   ├── useModules.ts               # CRUD de módulos
│   ├── useGroups.ts                # CRUD de grupos
│   └── useModulePermissions.ts     # Gerenciar permissões
├── components/
│   └── ModuleProtectedRoute.tsx    # Componente de rota protegida
└── pages/
    └── Configuracoes/
        └── ControleAcesso/
            ├── index.tsx           # Página principal com tabs
            ├── ModulosTab.tsx      # Gerenciar módulos
            ├── GruposTab.tsx       # Gerenciar grupos
            ├── PermissoesTab.tsx   # Gerenciar permissões
            └── components/
                ├── ModuleCard.tsx
                ├── GroupCard.tsx
                ├── ModuleFormDialog.tsx
                ├── GroupFormDialog.tsx
                ├── GroupPermissionMatrix.tsx
                └── UserPermissionMatrix.tsx
```

## 🔧 Como Usar

### 1. Verificar Acesso a um Módulo

```tsx
import { useModuleAccess } from '@/hooks/useModuleAccess';

const MyComponent = () => {
  const { hasAccess, loading } = useModuleAccess('tasks');
  
  if (loading) return <Loader />;
  if (!hasAccess) return <AccessDenied />;
  
  return <div>Conteúdo do módulo</div>;
};
```

### 2. Proteger uma Rota

```tsx
import ModuleProtectedRoute from '@/components/ModuleProtectedRoute';

<Route 
  path="/tasks" 
  element={
    <ModuleProtectedRoute moduleKey="tasks">
      <TasksPage />
    </ModuleProtectedRoute>
  } 
/>
```

### 3. Buscar Módulos do Usuário

```tsx
import { useUserModules } from '@/hooks/useUserModules';

const Sidebar = () => {
  const { data: modules, isLoading } = useUserModules();
  
  return (
    <nav>
      {modules?.map(module => (
        <Link key={module.id} to={module.route}>
          {module.name}
        </Link>
      ))}
    </nav>
  );
};
```

## 🔐 Funções de Segurança

### has_module_access(user_id, module_key)

Verifica se um usuário tem acesso a um módulo específico.

```sql
SELECT has_module_access('user-uuid', 'tasks');
-- Retorna: true/false
```

### get_user_modules(user_id)

Retorna todos os módulos que o usuário pode acessar.

```sql
SELECT * FROM get_user_modules('user-uuid');
-- Retorna: lista de módulos com detalhes
```

## 📊 Políticas RLS

Todas as tabelas possuem Row Level Security habilitado:

- **Admins**: Acesso total a tudo
- **Usuários**: Podem ver seus próprios dados
- **Módulos**: Todos podem ver módulos ativos

## 🎯 Fluxo de Trabalho

### Para Configurar um Novo Usuário

1. Acesse **Configurações > Controle de Acesso**
2. Aba **Grupos**: Adicione o usuário a um grupo existente
3. Aba **Permissões**: (Opcional) Conceda permissões individuais
4. O usuário verá apenas os módulos permitidos no próximo login

### Para Criar um Novo Módulo

1. Acesse **Configurações > Controle de Acesso**
2. Aba **Módulos**: Clique em "Novo Módulo"
3. Preencha:
   - Nome do módulo
   - Chave única (ex: `meu-modulo`)
   - Ícone Lucide (ex: `Settings`)
   - Rota (ex: `/meu-modulo`)
4. Aba **Permissões**: Atribua o módulo aos grupos desejados

## 🔍 Troubleshooting

### Usuário não vê um módulo no menu

1. Verifique se o módulo está **ativo**
2. Verifique se o usuário está em um **grupo com permissão**
3. Ou se possui **permissão individual**
4. Admins sempre têm acesso total

### Erro ao acessar rota

1. Verifique se a rota está protegida com `ModuleProtectedRoute`
2. Verifique se o `moduleKey` corresponde ao cadastrado no banco
3. Verifique logs do console do navegador

## 📈 Melhorias Futuras

- [ ] Permissões granulares (read, write, delete)
- [ ] Herança de permissões entre grupos
- [ ] Permissões temporárias com expiração
- [ ] Relatório de audit log
- [ ] Notificações de alterações de acesso
- [ ] Importação/exportação de configurações

## 🛠️ Manutenção

### Adicionar Novo Módulo ao Sistema

```sql
INSERT INTO modules (name, key, icon, route, display_order, description)
VALUES ('Meu Módulo', 'meu-modulo', 'Star', '/meu-modulo', 10, 'Descrição');
```

### Dar Acesso Total a um Usuário

```sql
-- Adicionar ao grupo Administradores
INSERT INTO user_groups (user_id, group_id)
SELECT 'user-uuid', id FROM groups WHERE name = 'Administradores';
```

### Remover Acesso de um Usuário

```sql
-- Remover de todos os grupos
DELETE FROM user_groups WHERE user_id = 'user-uuid';

-- Remover permissões individuais
DELETE FROM user_modules WHERE user_id = 'user-uuid';
```

## 📝 Notas Importantes

- Sempre teste permissões após alterações
- Mantenha pelo menos um usuário admin com acesso total
- Documente grupos e suas finalidades
- Revise permissões periodicamente
- Use grupos sempre que possível (mais fácil de manter)

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique este README
2. Consulte os logs do sistema
3. Entre em contato com a equipe de TI
