# CRM 360 — Fases 7 e 8: Instrumentação e Rollout

Status: publicado
Ultima atualizacao: 20/03/2026

---

## Fase 7 — Instrumentação e Melhoria Contínua (Semanas 8-12)

### 7.1 Telemetria de UX

Hook `useUXTelemetry` implementado em `src/hooks/useUXTelemetry.ts`.

**Fluxos a instrumentar (backlog):**

| Fluxo | task_name | Onde instrumentar |
|---|---|---|
| Criar ticket | `criar_ticket` | `FilaTriagem.tsx` / modal de criação |
| Triagem de lead | `triagem_lead` | `FilaTriagem.tsx` |
| Criar oportunidade | `criar_oportunidade` | `OportunidadesPage.tsx` |
| Fechar oportunidade (ganho/perda) | `fechar_oportunidade` | `ForecastDashboard.tsx` |
| Importar clientes CSV | `importar_clientes_csv` | `CustomerHubPage.tsx` |
| Merge de clientes | `merge_clientes` | `CustomerHubPage.tsx` |
| Criação de proposta | `criar_proposta` | `PropostasFormPage.tsx` |
| Resposta de survey CSAT | `resposta_csat` | `SurveyResponsePage.tsx` |

**Exemplo de instrumentação:**
```tsx
const { startTask, completeTask, abandonTask, trackError } = useUXTelemetry('criar_ticket');

// Ao abrir o modal:
startTask();

// Ao submeter com sucesso:
completeTask('ticket criado');

// Ao fechar sem submeter:
abandonTask('fechou_modal');

// Em erro de validação:
trackError('campo_titulo_vazio');
```

**Métricas geradas (via `getUXMetrics()`):**
- Time-to-task médio por fluxo
- Taxa de abandono por fluxo
- Pontos de fricção (erros de formulário frequentes)

**Armazenamento:** `localStorage` (ring buffer de 500 eventos, sem dependência externa).
**Exportação futura:** `exportUXTelemetry()` → envio para analytics backend ou Supabase.

---

### 7.2 Experimentos A/B

**Estratégia leve para o contexto atual:**

Não utilizaremos ferramenta de A/B testing externa neste momento.
Adotamos **feature flags locais** via `localStorage` + variáveis de ambiente.

**Padrão:**
```ts
// src/lib/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_TRIAGEM_LAYOUT: import.meta.env.VITE_FF_NEW_TRIAGEM === 'true',
  FORECAST_V2:         import.meta.env.VITE_FF_FORECAST_V2 === 'true',
} as const;
```

**Hipóteses priorizadas (backlog de experimentos):**

| # | Hipótese | Variante A (controle) | Variante B (teste) | Métrica de sucesso |
|---|---|---|---|---|
| 1 | Mostrar probabilidade no card kanban aumenta taxa de calibração | Card sem probabilidade | Card com % de probabilidade | % oportunidades com probabilidade > 0 |
| 2 | Motivo de perda dropdown vs campo livre reduz abandono | Campo de texto livre | Select padronizado | Taxa de preenchimento ao cancelar |
| 3 | Forecast visível na página de oportunidades aumenta uso | Aba separada | Painel lateral colapsável | Cliques em "forecast" por semana |

---

### 7.3 Review Semanal de KPI

**Cadência:** toda segunda-feira (30 min).

**KPIs a revisar:**

| KPI | Fonte | Meta |
|---|---|---|
| Oportunidades abertas (quantidade) | `vw_forecast_pipeline` | Tendência crescente |
| Forecast ponderado total | `vw_forecast_pipeline` | Meta definida pela equipe comercial |
| Taxa de abandono em criação de ticket | `useUXTelemetry` | < 15% |
| Time-to-task médio em triagem | `useUXTelemetry` | < 3 minutos |
| CSAT médio dos tickets fechados | `surveys` | >= 4.0 / 5.0 |
| % oportunidades com probabilidade calibrada | `oportunidades` | >= 80% com probabilidade != NULL |
| Motivos de perda mais frequentes | `motivos_perda_pipeline` | Identificar top 3 |

**Plano quinzenal:** a cada 2 semanas, definir 1 ação de melhoria com owner e prazo
baseada nos KPIs abaixo da meta.

---

## Fase 8 — Rollout e Adoção (Semanas 10-12)

### 8.1 Plano de Rollout em Ondas

| Onda | Semana | Público | Escopo | Critério de avanço |
|---|---|---|---|---|
| 0 — Piloto interno | 10 | Time técnico (3-5 pessoas) | Todas as funcionalidades CRM | Sem bug crítico em 48h |
| 1 — Early adopters | 11 | 2-3 usuários-chave de cada equipe (comercial, atendimento, CS) | Funcionalidades por perfil | NPS interno >= 7; sem P0/P1 aberto |
| 2 — Rollout geral | 12 | Todos os usuários | Acesso completo | Taxa de erro < 1%; suporte preparado |

**Rollback:** desabilitar feature flags, reverter rota em `App.tsx` para versão anterior.
Tempo máximo de rollback estimado: 15 minutos.

---

### 8.2 Treinamento por Perfil

| Perfil | Módulos-chave | Formato | Duração |
|---|---|---|---|
| Atendimento | Triagem, Workspace, CSAT | Vídeo curto (Loom) + guia rápido | 20 min |
| Comercial | Oportunidades, Pipeline, Propostas | Demo ao vivo + sandbox | 30 min |
| CS / Pós-venda | Hub de clientes, SLA, NPS | Vídeo + FAQ | 20 min |
| Gestores | Dashboards, Forecast, Reports | Demo ao vivo | 30 min |
| Admin | Configurações, Módulos, Usuários | Documentação técnica | Consulta |

**Materiais a criar (ação):** criar pasta `docs/treinamento/` com um arquivo por perfil.

---

### 8.3 Plano de Contingência de Go-Live

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Bug crítico em produção pós-go-live | Média | Alto | Feature flag de rollback imediato; canal de comunicação direto |
| Usuários não adotam novo fluxo | Baixa | Médio | Sessões de suporte 1:1 na semana 12; FAQ ao vivo |
| Dados incorretos visíveis no dashboard | Baixa | Alto | Smoke test automático pré-go-live via Edge Function health check |
| Sobrecarga em Supabase | Baixa | Alto | Limitar conexões `query-local-db` (já configurado: pool de 2); monitorar em dashboard Supabase |

**Checklist de go-live (Onda 1):**
- [ ] Smoke test automatizado executado sem erros
- [ ] Migrations aplicadas no remote sem rollback
- [ ] Feature flags configurados por perfil no `.env.production`
- [ ] Onboarding materials enviados para early adopters
- [ ] Canal de suporte dedicado criado (Slack/WhatsApp do time)
- [ ] Monitoramento de erros ativado (Sentry ou console Supabase)

---

### 8.4 Indicadores Pós Go-Live (sem regressão)

Monitorar por 2 semanas após o go-live:

| Indicador | Baseline (pré-go-live) | Alerta (regressão) |
|---|---|---|
| Tempo médio de resposta das queries | < 800ms | > 1500ms |
| Taxa de erro 4xx/5xx nas Edge Functions | < 2% | > 5% |
| CSAT médio dos tickets | Medido na semana 9 | Queda > 0.5 ponto |
| Ticket volume (criação/dia) | Medido na semana 9 | Queda > 30% |
| Taxa de login com sucesso | > 98% | < 95% |
