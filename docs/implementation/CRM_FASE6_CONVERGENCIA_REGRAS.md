# Plano de Convergência de Regras Duplicadas — Fase 6

Status: publicado
Ultima atualizacao: 20/03/2026

## Objetivo

Eliminar a duplicidade de regras de negócio distribuídas entre API (Supabase RLS/Functions)
e UI (hooks/componentes React), estabelecendo fronteiras claras entre a camada operacional
(transacional, tempo-real) e a camada analítica (dashboards, BI, ETL).

---

## 1. Fronteiras: Operacional x Analítico

| Domínio | Responsável | Tecnologia | Exemplo |
|---|---|---|---|
| Transacional / OLTP | Supabase (RLS + triggers) | PostgreSQL + realtime | Criar ticket, mover oportunidade, fechar caso |
| Regras de negócio críticas | Supabase Functions (SECURITY DEFINER) | plpgsql | Motivo de perda obrigatório, CSAT ao fechar ticket |
| Validação de formulário | UI (React) | Zod + hook-form | Campos required, formato de CPF/CNPJ |
| Cálculos derivados (read-only) | Views + hook frontend | SQL VIEW + useQuery | vw_forecast_pipeline, vw_dashboard_manutencao |
| Analítico / OLAP | ETL + JSON estático | GitHub Actions + public/data | analytics JSON, DRE, faturamento |
| Instrumentação de UX | Frontend (observers) | Custom hooks + localStorage | time-to-task, abandono, erros de formulário |

**Regra de ouro:** Se uma regra de negócio pode causar inconsistência de dados se violada,
ela DEVE ser implementada em banco (trigger ou RPC). A UI implementa APENAS validação
de feedback, nunca de consistência.

---

## 2. Regras Duplicadas Mapeadas

### 2.1 Validação de Motivo de Perda
- **Status:** Resolvido - Fase 4
- **Antes:** Regra só existia na UI (OportunidadesPage).
- **Depois:** Trigger `trg_check_motivo_perda` em banco + validação UI no ModalPerdida.

### 2.2 Status de Oportunidade
- **Status:** Em convergência
- **Antes:** Lógica de transição de status espalhada em múltiplos componentes.
- **Depois:** Enum de status documentado; transitions válidas apenas via mutation controlada
  em `usePipeline.ts`.
- **Plano:** Adicionar RLS check de transição de estado em trigger futuro (Fase 7).

### 2.3 CSAT / Fechamento de Ticket
- **Status:** Resolvido - Fase 5
- **Antes:** CSAT criado manualmente pela UI.
- **Depois:** Trigger `trg_create_csat_on_ticket_close` em banco.

### 2.4 Contagem de mensagens / produtos em oportunidades
- **Status:** Desvio identificado
- **Situação atual:** `useOportunidades.ts` usa `count` agregado na query do Supabase.
  Não há trigger; a contagem é calculada em runtime.
- **Plano:** Manter como está (sem persistência — computed on read). Documentado como
  padrão aceito para dados derivados não críticos.

### 2.5 Deduplicação de clientes
- **Status:** Resolvido - Fases 3 e 5
- **Antes:** Lógica de merge implementada em frontend (CustomerHubPage).
- **Depois:** Função `public.merge_clientes()` em banco; UI apenas chama RPC.

### 2.6 Saneamento de dados de clientes
- **Status:** Resolvido - Fase 5
- **Antes:** Rotina manual.
- **Depois:** pg_cron: `schedule_clientes_saneamento` (diário 03:00 UTC).

---

## 3. Regras que permanecem intencionalmente na UI

Estas regras SÃO adequadas apenas na UI porque afetam apenas feedback visual, não consistência:

- Formatação de valores monetários (`BRL(v)`)
- Coloração de badges por status
- Ordenação local de listas
- Paginação de tabelas
- Validação de formato de campos de texto (CPF, CNPJ, placa) — banco faz normalização POST-INSERT

---

## 4. Plano de Eliminação de Desvios Remanescentes

| # | Desvio | Ação | Sprint alvo |
|---|---|---|---|
| 1 | Transições de status de oportunidade sem guard em banco | Criar trigger de validação de transição | Semana 9 |
| 2 | Criação de ticket sem validação de custom_fields obrigatórios em banco | Trigger ou check constraint em `tickets.custom_fields` | Semana 10 |
| 3 | `useTicketOptions` re-implementa lógica de auditoria presente em `ticket_configuracoes_auditoria` | Refatorar hook para consumir view de auditoria existente | Semana 10 |
| 4 | KPIs de SLA calculados 100% no frontend | View SQL `vw_sla_operacional` a ser criada e consumida | Semana 11 |

---

## 5. Padrão de decisão: onde implementar?

```
Nova regra de negócio
        │
        ▼
Pode causar inconsistência de dados se violada?
    ├─ SIM → Implementar em banco (trigger/RPC/check constraint)
    │        + espelhar validação na UI para feedback imediato
    └─ NÃO → Implementar apenas na UI
              (formatação, ordenação, feedback visual)
```
