# Funcionalidade de Exclusão de Tickets com Justificativa

## 📋 Resumo

Foi implementada a funcionalidade de **exclusão de tickets com justificativa obrigatória**. O sistema utiliza um modelo de **Soft Delete** para manter o histórico e auditoria completa de todos os tickets excluídos.

## 🔧 Mudanças Implementadas

### 1. **Alterações no Banco de Dados** (`database/scripts/15_add_ticket_deletion.sql` / Migração Supabase)

**Novas Colunas na Tabela `tickets`:**
- `is_deleted` (BOOLEAN): Marca se o ticket foi deletado (padrão: FALSE)
- `deleted_at` (TIMESTAMP): Data e hora da exclusão
- `deleted_by` (UUID): Referência ao usuário que excluiu
- `deleted_reason` (TEXT): Justificativa da exclusão

**Nova Tabela `ticket_deletions_log`:**
Registro de auditoria com histórico completo de exclusões:
- `id`, `ticket_id`, `numero_ticket`, `titulo`, `cliente_id`
- `deleted_by`, `deleted_at`, `deleted_reason`, `deleted_by_name`
- `ticket_data` (JSON com dados completos do ticket no momento da exclusão)

**Índices para Performance:**
- `idx_tickets_is_deleted`: Para filtrar tickets não-deletados rapidamente
- `idx_tickets_deleted_at`: Para ordenação por data de exclusão
- `idx_deletions_*`: Índices no log de auditoria

**Funções PL/pgSQL:**
- `log_ticket_deletion()`: Registra exclusão automaticamente (trigger)
- `delete_ticket_soft()`: Executa exclusão lógica (soft delete)
- `restore_ticket()`: Restaura ticket excluído (se necessário)

**Views:**
- `tickets_active`: Todos os tickets não-deletados
- `tickets_deleted`: Todos os tickets deletados

### 2. **Atualizações no Frontend**

#### Hooks (`src/hooks/useTickets.ts`)
- ✅ `useDeleteTicket()`: Mutation para excluir ticket com justificativa
- ✅ `useRestoreTicket()`: Mutation para restaurar ticket (se necessário)
- ✅ `useDeletedTickets()`: Query para listar tickets deletados (auditoria)
- ✅ `useTicketDeletionLog()`: Query para detalhes de um ticket deletado
- ✅ `useTickets()`: Atualizado com filtro `is_deleted = false`

#### Componentes UI

**DeleteTicketDialog** (`src/components/tickets/DeleteTicketDialog.tsx`)
- Modal com confirmação de dois passos
- Campos obrigatórios:
  - Motivo pré-definido (com opção "Outro")
  - Campo de texto customizado (se "Outro" selecionado)
  - Confirmação digitando o número do ticket
- Validações completas antes de permitir exclusão
- Toast notifications para feedback

**TicketDeletionAudit** (`src/components/tickets/TicketDeletionAudit.tsx`)
- Componente de auditoria reutilizável
- Exibe tabela com todos os tickets deletados
- Filtros por cliente e usuário
- Busca por número, título ou motivo
- Informações de quem deletou, quando e por quê

**TicketDetail** (`src/components/tickets/TicketDetail.tsx`)
- ✅ Novo botão "Excluir" (ícone de lixo) no header
- ✅ Integração com DeleteTicketDialog
- ✅ Redireciona para /tickets após exclusão bem-sucedida

### 3. **Migração Supabase**

Arquivo criado: `supabase/migrations/20260330000000_add_ticket_deletion.sql`

Aplique a migração com:
```bash
cd c:\Users\frant\.antigravity\qualia-task-flow
supabase db push
```

## 🎯 Como Usar

### Para Excluir um Ticket

1. Abra a página de detalhes do ticket
2. Clique no botão **"Lixo"** (🗑️) no canto superior direito
3. **Modal de Exclusão** abrirá com:
   - Confirmação do ticket a ser excluído (número + título)
   - Selector de **"Motivo da exclusão"** com opções pré-definidas:
     - ❌ Ticket duplicado
     - ❌ Erro na criação
     - ❌ Dados incorretos
     - ❌ Cliente cancelou
     - ❌ Sem solução identificada
     - ❌ Outro motivo
   - Se selecionar "Outro", preencha: **"Descreva o motivo da exclusão"**
4. Digite o **número do ticket** (ex: TKT-2025-001) para confirmar
5. Clique **"Excluir Permanentemente"**
6. Será redirecionado para a listagem de tickets

### Para Visualizar Auditoria de Exclusões

```tsx
import { TicketDeletionAudit } from "@/components/tickets/TicketDeletionAudit";

// Em qualquer página:
export function AdminSection() {
  return (
    <TicketDeletionAudit 
      cliente_id={optionalClienteId}
      deleted_by={optionalUserId}
    />
  );
}
```

## 📊 Motivos de Exclusão Pré-Definidos

| Código | Rótulo |
|--------|---------|
| `duplicado` | Ticket duplicado |
| `erro_criacao` | Erro na criação |
| `dados_incorretos` | Dados incorretos |
| `cliente_cancelou` | Cliente cancelou |
| `sem_solucao` | Sem solução identificada |
| `outro` | Outro motivo (customizável) |

## 🔐 Segurança & Auditoria

### Rastreabilidade Completa
- ✅ Quem: `deleted_by` (ID do usuário + nome)
- ✅ Quando: `deleted_at` (timestamp exato)
- ✅ Por quê: `deleted_reason` (justificativa obrigatória)
- ✅ O quê: `ticket_data` (snapshot JSON dos dados)

### Histórico Imutável
- Tickets excluídos são registrados em `ticket_deletions_log` via TRIGGER
- Dados completos do ticket são salvos em JSON
- Impossível deletar registro de auditoria (sem acesso direto DB)

### Interações Registradas
Quando um ticket é excluído, é criada uma interação automática:
- Tipo: `exclusao`
- Mensagem: "Ticket excluído - Justificativa: [motivo]"
- Visível no histórico do ticket (se precisar restaurar)

## 🔄 Filtros Automáticos

Todas as queries de tickets agora filtram automaticamente:
```sql
WHERE is_deleted = FALSE
```

Isso garante que tickets excluídos não apareçam em:
- ✅ Listagem de tickets
- ✅ Dashboards de BI
- ✅ Relatórios
- ✅ Buscas

## 🚀 Próximas Melhorias (Opcionais)

1. **Restauração de Tickets**: Adicionar botão "Restaurar" na auditoria
2. **Bulk Delete**: Excluir múltiplos tickets com justificativa única
3. **Permissões**: Restringir quem pode deletar (ex: apenas gerentes)
4. **Notificações**: Alertar sobre exclusões em tempo real
5. **Relatórios**: Dashboard de análise de exclusões
6. **Retenção**: Política de limpeza de registros antigos (após X meses)

## 📝 Notas

- **Soft Delete**: Tickets não são fisicamente deletados do banco
- **Performance**: Índices otimizam queries de tickets ativos
- **Compatibilidade**: Não afeta código legado (usa filtro automático)
- **Reversibilidade**: Tickets podem ser restaurados via função `restore_ticket()`

## ⚠️ Importante

Antes de usar, execute a migração SQL:

```bash
# Via Supabase CLI
cd c:\Users\frant\.antigravity\qualia-task-flow
supabase db push

# Ou execute manualmente o arquivo de migração no Supabase SQL Editor
```

---

**Data de Criação**: 30 de Março de 2026  
**Versão**: 1.0  
**Status**: 🟢 Pronto para Uso
