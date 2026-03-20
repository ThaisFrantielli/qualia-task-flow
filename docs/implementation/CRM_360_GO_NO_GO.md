# CRM 360 - Criterios Go/No-Go por Fase

Status: vigente
Ultima atualizacao: 20/03/2026

## Objetivo
Definir criterio objetivo para liberar cada fase do plano CRM 360 sem regressao operacional.

## Regras gerais
- Go exige 100% dos criterios obrigatorios da fase.
- No-Go e automatico se houver incidente critico aberto (P0/P1) relacionado ao escopo da fase.
- Toda decisao Go/No-Go deve ser registrada em ata curta com data, responsavel e evidencias.

## Gate por fase

### Fase 0 - Baseline e governanca
Obrigatorios:
- Checklist executivo criado e atualizado.
- Matriz RACI publicada.
- Dono de cada macro-entrega definido.
Decisao:
- Go: Product Owner CRM.
- Consultados: Tech Lead, Sponsor Executivo.

### Fase 1 - Estabilizacao WhatsApp e atendimento
Obrigatorios:
- Typecheck global sem erros bloqueantes.
- Fluxo realtime sem loop regressivo em ambiente alvo.
- SLO de entrega monitoravel com metrica minima definida.
Decisao:
- Go: Product Owner CRM.
- Consultados: Tech Lead, Operacoes Atendimento.

### Fase 2 - Dominio CRM unificado
Obrigatorios:
- Catalogos dinamicos e custom fields persistindo corretamente.
- Auditoria de configuracoes operacional.
- Sem regressao funcional nos fluxos de criacao/edicao de tickets.
Decisao:
- Go: Product Owner CRM.
- Consultados: Tech Lead, QA.

### Fase 3 - Workspace unificado de operacao
Obrigatorios:
- Fila + meus casos + SLA no mesmo workspace.
- Fluxo de handoff comercial/pos-venda validado com usuarios-chave.
- Trecho critico coberto por teste automatizado ou roteiro de regressao formal.
Decisao:
- Go: Product Owner CRM.
- Consultados: Operacoes Atendimento, Comercial, Pos-venda/CS.

### Fase 4 - Pipeline comercial
Obrigatorios:
- Etapas e probabilidades calibradas e publicadas.
- Forecast por etapa/equipe disponivel no dashboard.
- Motivo de perda obrigatorio no fluxo.
Decisao:
- Go: Product Owner CRM.
- Consultados: Comercial, DBA/Analytics.

### Fase 5 - Pos-venda, SLA e Voz do Cliente
Obrigatorios:
- Painel SLA por prioridade/departamento operacional.
- Coleta CSAT/NPS/CES em pontos definidos.
- Processo de tratamento de detratores ativo.
Decisao:
- Go: Product Owner CRM.
- Consultados: Pos-venda/CS, QA.

### Fase 6 - Convergencia de arquitetura e regras
Obrigatorios:
- Fronteiras API/UI documentadas.
- Regras duplicadas mapeadas com plano de eliminacao.
- Nenhum desvio critico de consistencia entre camadas.
Decisao:
- Go: Tech Lead.
- Consultados: Product Owner CRM, Eng Backend, Eng Frontend.

### Fase 7 - Instrumentacao e melhoria continua
Obrigatorios:
- Telemetria de UX ativa para fluxos chave.
- Rotina de review de KPI estabelecida.
- Hipoteses e backlog de experimentos priorizados.
Decisao:
- Go: Product Owner CRM.
- Consultados: DBA/Analytics, QA.

### Fase 8 - Rollout e adocao
Obrigatorios:
- Plano de rollout em ondas publicado.
- Treinamento por perfil concluido.
- Plano de contingencia e rollback testado.
Decisao:
- Go: Sponsor Executivo.
- Consultados: Product Owner CRM, Tech Lead, Operacoes Atendimento.

## Modelo minimo de registro de decisao
- Fase:
- Data:
- Decisao: Go ou No-Go
- Responsavel pela decisao:
- Evidencias anexadas:
- Riscos residuais:
- Plano de mitigacao:
