# CRM 360 - Implantacao Fase 0 Semana 1

## Escopo implementado

Esta entrega cobre a base tecnica de tickets configuraveis para suportar evolucao sem deploy, conforme plano CRM 360.

### 1) Catalogos configuraveis e customizacao no banco
Arquivo: `supabase/migrations/20260320162000_ticket_configuracoes_e_campos_customizados.sql`

Implementado:
1. `ticket_departamento_opcoes` para departamentos configuraveis.
2. `ticket_peps_etapas` para etapas PEPS por fluxo (`padrao`, `comercial`, `pos_vendas`).
3. `ticket_custom_field_definitions` para campos customizados de ticket.
4. Coluna `tickets.custom_fields` (JSONB) para persistencia de valores dinamicos.
5. Indices, triggers de `updated_at` e policies RLS.
6. Seed inicial com classificacoes do negocio (origem, motivo, departamento e PEPS).

### 2) Hooks de configuracao
Arquivo: `src/hooks/useTicketOptions.ts`

Implementado:
1. CRUD de departamentos configuraveis.
2. CRUD de definicoes de campos customizados.
3. Queries para consumo das opcoes ativas no frontend.

### 3) Tela de configuracoes de tickets
Arquivo: `src/pages/TicketOptionsPage.tsx`

Implementado:
1. Novas abas: `Departamentos` e `Campos Customizados`.
2. Cadastro, ativacao/inativacao e exclusao de opcoes.
3. Mantida compatibilidade com abas ja existentes (origens, motivos, analise final).

### 4) Integracao na criacao e edicao de tickets (Etapa 2)
Arquivos:
1. `src/components/tickets/CreateTicketDialog.tsx`
2. `src/components/tickets/EditTicketDialog.tsx`

Implementado:
1. Consumo dinamico de departamentos configuraveis.
2. Renderizacao de campos customizados baseada em `ticket_custom_field_definitions`.
3. Persistencia em `custom_fields` no create/update.
4. Validacao de obrigatoriedade para custom fields marcados como obrigatorios.

## Status do plano (Fase 0 Semana 1)

Concluido nesta etapa:
1. Base de modelagem para classificacoes configuraveis de tickets.
2. Base de administracao para alteracao/adicao de classificacoes.
3. Capacidade de extensao futura via custom fields sem alteracao estrutural no frontend.
4. Aplicacao de `custom_fields` nos fluxos de criacao rapida da triagem.
5. Aplicacao de `custom_fields` nos fluxos de criacao rapida do atendimento WhatsApp.
6. Persistencia de `custom_fields` no hook de criacao de ticket da triagem.
7. Trilha tecnica de auditoria para alteracoes de configuracoes de ticket.

### 5) Integracao de custom fields na triagem e atendimento rapido
Arquivos:
1. `src/pages/FilaTriagem.tsx`
2. `src/components/atendimento/AtendimentoActions.tsx`
3. `src/hooks/useTriagemRealtime.ts`

Implementado:
1. Renderizacao dinamica de campos customizados nos dialogs de criacao rapida.
2. Validacao de obrigatoriedade para campos marcados como obrigatorios.
3. Persistencia de `custom_fields` no insert de tickets nestes fluxos.

### 6) Auditoria tecnica de configuracoes
Arquivo: `supabase/migrations/20260320174000_ticket_configuracoes_auditoria.sql`

Implementado:
1. Tabela `ticket_config_audit_log` para trilha de alteracoes.
2. Trigger function `log_ticket_config_changes()` para registrar `INSERT`, `UPDATE` e `DELETE`.
3. Triggers nos catalogos de configuracao de ticket (`ticket_origens`, `ticket_motivos`, `ticket_departamento_opcoes`, `ticket_custom_field_definitions`).
4. RLS para leitura por usuarios autenticados.

### 7) Visualizacao operacional da auditoria no painel
Arquivos:
1. `src/hooks/useTicketOptions.ts`
2. `src/pages/TicketOptionsPage.tsx`
3. `src/types/ticket-options.ts`

Implementado:
1. Hook `useTicketConfigAuditLogs` com filtros por acao e tabela.
2. Nova aba `Auditoria` no painel de configuracoes de tickets.
3. Listagem dos eventos com data/hora, acao, tabela, registro e campos alterados.

Pendente para proximos ciclos:
1. Ajustar geracao de tipos Supabase para refletir nova coluna `tickets.custom_fields` tipada nativamente.
2. Normalizar definitivamente o legado de migration `2025` no historico remoto/local para eliminar mismatch residual do CLI.

## Observacoes tecnicas

1. A migration foi criada com foco em nao quebrar fluxo atual e manter retrocompatibilidade.
2. Em alguns pontos do frontend foram usados casts controlados para permitir uso imediato das novas tabelas antes da regeneracao completa de tipos.
3. O typecheck do projeto ainda possui erros preexistentes em modulos de analytics, fora do escopo desta entrega de tickets.
4. As migrations `20260320162000` e `20260320174000` foram aplicadas no Supabase remoto via CLI com `db push --include-all`.

## Sequencia - Semana Seguinte (executada)

### 1) Tipagem Supabase regenerada
Arquivo:
1. `src/integrations/supabase/types.ts`

Implementado:
1. Regeneracao de tipos a partir do schema remoto atualizado.
2. Inclusao das novas entidades de ticket e auditoria (`ticket_config_audit_log`, `ticket_custom_field_definitions`, `ticket_departamento_opcoes`, `tickets.custom_fields`).

### 2) Estabilizacao de typecheck global
Arquivos:
1. `src/components/analytics/fleet/TimelineTab.tsx`
2. `src/pages/analytics/FleetDashboard.tsx`
3. `src/pages/analytics/FleetIdleDashboard.tsx`

Implementado:
1. Remocao de parametros/variaveis nao usados que bloqueavam compilacao.
2. Ajuste de tipagem no `Accordion` para evitar `string | null` invalido.
3. Correcao de objeto fallback com propriedade fora do tipo esperado.

Resultado:
1. `npm run typecheck` executado com sucesso (sem erros).

### 3) Hardening de cache e consistencia no consumo BI
Arquivo:
1. `src/hooks/useBIData.ts`

Implementado:
1. Correcao das dependencias do `load` para considerar `limit` e evitar reuse incorreto ao trocar filtros de volume.
2. Correcao do `clearBIDataCache(identifier)` para limpar tambem chaves derivadas por limite (`table_limitN`), evitando stale cache parcial.
3. Deduplicacao de requisicoes em voo por chave de cache para evitar chamadas concorrentes repetidas em montagens simultaneas de dashboards.

### 4) Hub de clientes sem sincronizacao BI + importacao manual
Arquivos:
1. `src/pages/CustomerHubPage.tsx`
2. `src/components/customer-management/ImportClientesButton.tsx`

Implementado:
1. Remocao da acao "Sincronizar do BI" do cabecalho do Hub de Clientes.
2. Inclusao de fluxo de importacao manual CSV/Excel com template para carga de clientes/contatos.
3. Estrategia de deduplicacao na importacao por codigo_cliente, CPF/CNPJ, telefone/email de contato e nome.
4. Protecao contra duplicacao de contatos no mesmo cliente (telefone/email ja existentes).

### 5) Mitigacao adicional de redundancia no banco
Arquivo:
1. `supabase/migrations/20260320193000_clientes_contatos_deduplicacao_e_unicidade.sql`

Implementado:
1. Deduplicacao de clientes por CPF/CNPJ normalizado com reapontamento de FKs para registro principal.
2. Deduplicacao de contatos por cliente (telefone/email normalizados).
3. Criacao de indices unicos parciais para prevenir recorrencia de duplicidade.

Status de execucao:
1. Migration aplicada no Supabase remoto via CLI (`db push`).

### 6) Padronizacao de codigo de cliente (CLI-*)
Arquivos:
1. `src/lib/clienteCodigo.ts`
2. `src/components/customer-management/ClienteFormModal.tsx`
3. `src/components/customer-management/ImportClientesButton.tsx`
4. `src/pages/CustomerHubPage.tsx`
5. `supabase/migrations/20260320201000_padroniza_codigo_cliente_cli.sql`

Implementado:
1. Definicao de padrao unico `CLI-*` com normalizacao em criacao/edicao/importacao.
2. Exibicao no Hub ja normalizada para eliminar variacao visual (`CLI` vs sem prefixo).
3. Migration aplicada no remoto para normalizar codigos legados sem quebrar unicidade.

### 7) Revisao humana por similaridade nominal + saneamento continuo
Arquivos:
1. `src/hooks/useAutoMergeClients.ts`
2. `src/pages/CustomerHubPage.tsx`
3. `supabase/migrations/20260320204500_schedule_clientes_saneamento.sql`

Implementado:
1. Deteccao de candidatos de merge por similaridade nominal com score para revisao humana.
2. Fluxo de revisao no Hub com comparacao lado a lado e acao explicita de merge manual.
3. Funcao SQL `run_clientes_saneamento()` para normalizacao de codigo ausente e limpeza de contatos duplicados.
4. Agendamento diario automatico da rotina de saneamento via `pg_cron` quando extensao estiver habilitada.
