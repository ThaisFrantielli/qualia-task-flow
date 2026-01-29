

# Plano de Acao - Revisao Completa do CRM

## Resumo Executivo

Apos investigacao detalhada do codigo-fonte e estrutura do banco de dados, identifiquei **12 inconsistencias criticas** que afetam a Central de Tickets, Central de Atendimento, WhatsApp, Hub de Clientes e Sistema de Pesquisas. Este plano apresenta as correcoes necessarias e melhorias propostas.

---

## 1. Problemas Identificados

### 1.1 ERRO CRITICO: Criacao de Ticket Falhando

**Causa Raiz Identificada:**
O formulario de criacao de ticket (`CreateTicketDialog.tsx`) envia o campo `origem` como string livre (ex: "Whatsapp"), mas a tabela `tickets` no banco de dados possui um campo `origem` do tipo VARCHAR que aceita qualquer valor, enquanto o sistema tambem possui uma tabela separada `ticket_origens` com UUIDs.

**Problema Especifico:**
- Linha 97-98: `origem: values.origem` esta enviando o UUID do motivo para `motivo_id`, correto.
- Porem, `values.origem` vem do select que busca de `ticket_origens.value`, que e uma string (ex: "whatsapp", "telefone").
- O banco aceita essa string, mas a inconsistencia esta na **ausencia de tratamento de erros robustos** - quando o banco rejeita dados invalidos, o erro nao e capturado corretamente.

**Problema de Build Atual:**
Existem **17 erros de TypeScript** de variaveis nao utilizadas em:
- `AtendimentoActions.tsx` (linha 90)
- `TicketDetail.tsx` (linhas 8, 9, 10, 13, 52, 139, 144)
- `WhatsAppQuickActions.tsx` (linha 68)
- `AtendimentoCentralPage.tsx` (linhas 23-33, 67, 238)

### 1.2 Incompatibilidade de Enums - TICKET_MOTIVO_OPTIONS

**Problema Critico:**
O arquivo `src/constants/ticketOptions.ts` define valores de motivo que **NAO correspondem** aos enums do banco de dados:

| Arquivo ticketOptions.ts | Enum ticket_motivo_enum (Banco) |
|--------------------------|----------------------------------|
| "Contestacao de Cobranca" | "Contestacao cobranca" |
| "Demora na Aprovacao do Orcamento" | "Demora na aprovacao do orcamento" |
| "Ma Qualidade de Servico" | "Ma qualidade do servico" |
| "Problemas Com Fornecedor" | "Problema com fornecedor" |

Esta incompatibilidade pode causar erros ao inserir tickets com esses motivos.

**Solucao:** O sistema agora usa a tabela `ticket_motivos` (criada recentemente) em vez do enum. O hook `useTicketMotivos()` ja busca os valores corretos. O arquivo `ticketOptions.ts` esta desatualizado e deve ser removido ou sincronizado.

### 1.3 Duplicidade de Clientes

**Situacao Atual:**
- O hook `useAutoMergeClients.ts` foi criado para detectar duplicatas baseado nos ultimos 9 digitos do telefone.
- A funcao `findAllDuplicates()` busca corretamente os clientes e agrupa por telefone normalizado.
- O botao "Unificar Duplicados" foi adicionado ao `CustomerHubPage.tsx`.

**Problema Identificado:**
A query de teste retornou array vazio, indicando que os dados atuais podem nao ter duplicatas reais no momento, OU a logica de normalizacao precisa ser ajustada para casos como:
- Telefones com DDI (55)
- Telefones com e sem DDD
- Campos `telefone` vs `whatsapp_number` inconsistentes

### 1.4 Erros de Build (TypeScript)

Existem **17 variaveis declaradas mas nao utilizadas** que quebram o build:

```text
AtendimentoActions.tsx:90 - numeroTicket
AtendimentoCentralPage.tsx:23-33 - MessageSquare, Users, Clock, Inbox, Bell, UserCheck
AtendimentoCentralPage.tsx:67 - statsLoading
AtendimentoCentralPage.tsx:238 - onlineAgentsCount
TicketDetail.tsx:8-10 - Dialog, Select, Label
TicketDetail.tsx:13 - Plus
TicketDetail.tsx:52 - isAddDeptOpen
TicketDetail.tsx:139 - handleAddDepartamento
TicketDetail.tsx:144 - dept
WhatsAppQuickActions.tsx:68 - numeroTicket
```

### 1.5 Seguranca - Linter do Supabase

O linter identificou **76 problemas**:
- 5 ERRORS: Views com SECURITY DEFINER
- 71 WARNINGS: Funcoes sem `search_path` definido

---

## 2. Arquitetura Atual vs Esperada

### 2.1 Fluxo de Criacao de Ticket

```text
ATUAL:
Usuario -> CreateTicketDialog -> useCreateTicket -> Supabase INSERT
                                     |
                                     v
                              [FALHA] Se valores nao correspondem aos enums

CORRIGIDO:
Usuario -> CreateTicketDialog -> Validacao Frontend -> useCreateTicket -> Supabase INSERT
                                     |                       |
                                     v                       v
                              [OK] Valores validados    [Fallback] try/catch robusto
```

### 2.2 Relacionamento de Entidades

```text
clientes (1) ---> (*) tickets
    |                   |
    v                   v
cliente_contatos   ticket_interacoes
                        |
                        v
                   ticket_departamentos
```

---

## 3. Plano de Correcoes

### Fase 1: Correcoes Criticas (Build e Erros)

| Prioridade | Arquivo | Acao |
|------------|---------|------|
| ALTA | TicketDetail.tsx | Remover imports e variaveis nao utilizados (linhas 8-10, 13, 52, 139, 144) |
| ALTA | AtendimentoCentralPage.tsx | Remover imports nao utilizados (linhas 23-33, 67, 238) |
| ALTA | AtendimentoActions.tsx | Remover `numeroTicket` (linha 90) |
| ALTA | WhatsAppQuickActions.tsx | Remover `numeroTicket` (linha 68) |

### Fase 2: Sincronizacao de Dados

| Prioridade | Componente | Acao |
|------------|------------|------|
| ALTA | ticketOptions.ts | Atualizar TICKET_MOTIVO_OPTIONS para corresponder aos valores da tabela `ticket_motivos` ou remover em favor do hook |
| MEDIA | CreateTicketDialog.tsx | Adicionar try/catch mais robusto e validacao pre-submit |
| MEDIA | useAutoMergeClients.ts | Melhorar normalizacao de telefone para considerar DDI brasileiro |

### Fase 3: Melhorias de UX

| Prioridade | Componente | Acao |
|------------|------------|------|
| MEDIA | SurveyDashboard.tsx | Adicionar grafico de timeline por data de criacao |
| MEDIA | SurveyReportsPage.tsx | Adicionar tabela de detalhamento com filtros |
| BAIXA | DetractorAlerts.tsx | Adicionar workflow de follow-up com SLA |

---

## 4. Detalhes Tecnicos das Correcoes

### 4.1 Correcao do TicketDetail.tsx

**Remover ou comentar:**
```typescript
// Linha 8-9: Remover imports Dialog e Select (ja existem no componente EditTicketDialog)
// Linha 10: Remover Label
// Linha 13: Remover Plus
// Linha 52: Remover isAddDeptOpen ou implementar funcionalidade
// Linha 139-144: Remover handleAddDepartamento e dept
```

### 4.2 Correcao do AtendimentoCentralPage.tsx

**Remover imports nao utilizados:**
```typescript
// Linha 23-26, 29, 33: Remover MessageSquare, Users, Clock, Inbox, Bell, UserCheck
// Linha 67: Remover statsLoading da desestruturacao
// Linha 238: Remover onlineAgentsCount
```

### 4.3 Atualizacao do ticketOptions.ts

**Sincronizar com enums do banco:**
```typescript
export const TICKET_MOTIVO_OPTIONS = [
    { value: 'Contestação cobrança', label: 'Contestação de Cobrança' },
    { value: 'Demora na aprovação do orçamento', label: 'Demora na Aprovação do Orçamento' },
    { value: 'Agendamento errôneo', label: 'Agendamento Errôneo' },
    { value: 'Má qualidade do serviço', label: 'Má Qualidade do Serviço' },
    // ... demais valores conforme enum
] as const;
```

OU remover o uso do arquivo estatico e usar exclusivamente `useTicketMotivos()`.

### 4.4 Tratamento de Erros no CreateTicketDialog

**Adicionar validacao pre-submit:**
```typescript
const actionInProgressRef = useRef(false);

async function onSubmit(values: z.infer<typeof formSchema>) {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;

    try {
        // Validacao adicional
        if (!values.cliente_id || !values.motivo) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        await createTicket.mutateAsync({ ... });
        toast.success("Ticket criado com sucesso!");
        setOpen(false);
        form.reset();
    } catch (error: any) {
        console.error("Create ticket error:", error);
        const message = error?.message || "Erro desconhecido ao criar ticket";
        toast.error(message);
    } finally {
        actionInProgressRef.current = false;
    }
}
```

---

## 5. Inconsistencias Adicionais Encontradas

### 5.1 Central de Atendimento (WhatsApp)

- O componente `WhatsAppCentralPage.tsx` e `AtendimentoCentralPage.tsx` sao muito similares e podem ser unificados
- Ambos usam os mesmos hooks: `useWhatsAppConversations`, `useWhatsAppStats`, `useWhatsAppAgents`
- Recomendacao: Remover uma das paginas e redirecionar

### 5.2 Sistema de Pesquisas

- Hook `useSurveyMetrics.ts` calcula tendencia corretamente (linha 99)
- Detratores pendentes filtrados corretamente (linhas 140-148)
- Nao foram encontrados bugs criticos no modulo de pesquisas

### 5.3 Hub de Clientes

- A sincronizacao com BI funciona via `limpar_clientes_bi()` + reimport
- Clientes manuais podem coexistir com clientes BI
- A unificacao de duplicatas esta implementada mas requer teste manual

---

## 6. Sequencia de Implementacao Recomendada

| Ordem | Tarefa | Estimativa |
|-------|--------|------------|
| 1 | Corrigir erros de build (variaveis nao utilizadas) | 15 min |
| 2 | Atualizar ticketOptions.ts ou remover uso estatico | 30 min |
| 3 | Adicionar try/catch robusto no CreateTicketDialog | 20 min |
| 4 | Testar criacao de ticket end-to-end | 15 min |
| 5 | Revisar e testar unificacao de clientes duplicados | 30 min |
| 6 | Implementar melhorias no dashboard de pesquisas | 2 horas |

---

## 7. Resultado Esperado

Apos implementacao:
1. Build sem erros de TypeScript
2. Criacao de tickets funcionando sem erros de enum
3. Clientes duplicados detectados e unificados automaticamente
4. Dashboard de pesquisas com analise temporal
5. Central de Atendimento sem codigo legado duplicado

