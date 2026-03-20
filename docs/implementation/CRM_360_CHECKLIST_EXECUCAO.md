# CRM 360 - Checklist de Execucao Completa

Status geral: em andamento
Ultima atualizacao: 20/03/2026

## Fase 0 - Baseline e governanca (Semana 1)
- [x] Baseline tecnico inicial documentado
- [x] Backlog consolidado e priorizado para semanas seguintes
- [x] Documento de implantacao semana 1 criado
- [x] Matriz RACI formal publicada no repositorio
- [x] Go/no-go por fase documentado

## Fase 1 - Estabilizacao WhatsApp e atendimento (Semanas 1-3)
- [x] Correcoes de loop/realtime registradas e estabilizadas
- [x] Typecheck global estabilizado para continuidade de entrega
- [x] Painel com SLO de entrega >= 98% consolidado
- [x] Alertas operacionais de fila/pending padronizados

## Fase 2 - Dominio CRM unificado (Semanas 2-4)
- [x] Catalogos configuraveis de tickets implantados (origens/motivos/departamentos)
- [x] Campos customizados de ticket com persistencia JSONB implantados
- [x] Auditoria tecnica de configuracoes de ticket implantada
- [x] UI operacional de auditoria no painel de configuracoes
- [x] Integracao de custom fields em triagem, atendimento rapido, criacao e edicao
- [ ] Normalizacao final de legado de migration 2025 concluida

## Fase 3 - Workspace unificado de operacao (Semanas 4-7)
- [x] Hub de clientes com acao de unificacao automatica de duplicados
- [x] Remocao da sincronizacao de clientes via BI no Hub
- [x] Importacao manual CSV/Excel para clientes/contatos no Hub
- [x] Padrao unico de codigo_cliente (CLI-*) aplicado em frontend e banco
- [x] Revisao humana de sugestoes de merge por similaridade nominal no Hub
- [x] Workspace unico de atendimento (fila + meus casos + SLA) concluido
- [x] Handoff comercial/pos-venda com contexto completo validado

## Fase 4 - Pipeline comercial (Semanas 4-8)
- [ ] Estagios maduros de pipeline revisados e publicados
- [ ] Probabilidade de ganho por oportunidade calibrada
- [ ] Forecast operacional por etapa/equipe em dashboard
- [ ] Motivo de perda padronizado e obrigatorio

## Fase 5 - Pos-venda, SLA e Voz do Cliente (Semanas 6-9)
- [x] Mitigacao de duplicidade de clientes e contatos (frontend + banco)
- [x] Migration de deduplicacao aplicada no remoto (clientes/contatos)
- [x] SLA operacional com painel de gargalos por prioridade/departamento
- [x] CSAT transacional em fechamento de caso
- [x] NPS relacional em cadencia definida
- [x] CES em pontos de friccao e loop fechado para detratores

## Fase 6 - Convergencia de arquitetura e regras (Semanas 7-10)
- [x] Hardening incremental de hooks criticos (BI cache e requests in-flight)
- [x] Reducao de uso local de client untyped em dominio de tickets
- [ ] Plano de convergencia de regras duplicadas (API/UI) consolidado
- [ ] Fronteiras operacionais x analiticas formalizadas

## Fase 7 - Instrumentacao e melhoria continua (Semanas 8-12)
- [ ] Telemetria de UX (time-to-task, abandono, retrabalho)
- [ ] Rotina de experimento A/B para pontos criticos
- [ ] Review semanal de KPI com plano quinzenal

## Fase 8 - Rollout e adocao (Semanas 10-12)
- [ ] Plano de rollout em ondas publicado
- [ ] Treinamento por perfil concluido
- [ ] Plano de contingencia de go-live validado
- [ ] Indicadores sem regressao no periodo pos-go-live

## Itens tecnicos transversais
- [x] Typecheck global sem erros
- [x] Deteccao e merge de duplicidade no Hub de Clientes
- [x] Checklist executivo centralizado para acompanhamento continuo
- [x] Testes automatizados de fluxo de importacao CSV/Excel
- [x] Rotina de saneamento de dados agendada (clientes/contatos)
