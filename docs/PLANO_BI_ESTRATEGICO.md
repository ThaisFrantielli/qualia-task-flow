# Plano Estratégico: Plataforma de Business Intelligence "Nexus"
## Locadora de Veículos - Centro de Comando Estratégico

### 1. Visão Geral e Conceito
O objetivo é transformar a atual coleção de dashboards em uma **Plataforma de Inteligência Centralizada (Nexus)**. Esta plataforma não apenas exibirá dados, mas servirá como o "cérebro" da operação, conectando pontos entre finanças, operação, manutenção e comercial.

**Filosofia de Design:** "Glass & Neon" - Uma interface moderna, escura (Dark Mode), com elementos translúcidos (Glassmorphism) e acentos vibrantes para indicar saúde e alertas. A experiência deve ser imersiva, passando a sensação de um cockpit de controle.

---

### 2. Arquitetura de Navegação: "Hubs de Inteligência"

A navegação será reestruturada em 4 Grandes Hubs, cada um respondendo a perguntas críticas de diferentes stakeholders.

#### 🏛️ Hub 1: Diretoria & Estratégia (C-Level)
*Foco: Saúde Financeira, Market Share, Macro-KPIs.*
*   **Dashboards Integrados:**
    *   **Cockpit Executivo:** Visão unificada de Faturamento, Margem Líquida, Tamanho da Frota e Taxa de Ocupação.
    *   **Financial Analytics (Existente - Aprimorado):** Aprofundamento em fluxo de caixa, EBITDA e projeções.
    *   **Revenue Gap (Existente):** Análise de metas vs. realizado.

#### 🚗 Hub 2: Operações & Frota (COO / Gerentes de Frota)
*Foco: Eficiência, Disponibilidade, Ciclo de Vida do Ativo.*
*   **Dashboards Integrados:**
    *   **Fleet Command (Baseado no FleetDashboard):** Status real da frota (Produtiva vs. Improdutiva), Idade Média, Giro.
    *   **Manutenção & Oficina (Novo/Em Breve):** Controle de Ordens de Serviço (OS), MTBF (Tempo Médio Entre Falhas), MTTR (Tempo Médio de Reparo), Custo de Manutenção por KM.
    *   **Compras & Desmobilização (PurchasesDashboard):** Pipeline de aquisição e venda de ativos (De-fleeting).

#### 📈 Hub 3: Comercial & Crescimento (CCO / Gerentes Comerciais)
*Foco: Vendas, Retenção, Performance de Equipe.*
*   **Dashboards Integrados:**
    *   **Sales Performance (Existente):** Metas por vendedor, conversão de leads, ticket médio.
    *   **Churn & Retenção (ChurnDashboard):** Análise de perda de clientes, LTV (Lifetime Value), motivos de saída.
    *   **Oportunidades:** Funil de vendas em tempo real.

#### 🛡️ Hub 4: Qualidade & Auditoria (Analistas / Data Guardians)
*Foco: Integridade de Dados, Detecção de Anomalias.*
*   **Dashboards Integrados:**
    *   **Data Audit (Existente - Aprimorado):** Painel de "Saneamento". Identifica cadastros incompletos, datas incoerentes (ex: devolução anterior à retirada), e furos de receita.
    *   **Alertas Operacionais:** Veículos parados há muito tempo sem OS, contratos vencidos, CNHs vencidas.

---

### 3. Detalhamento Tático e Melhorias Imediatas

#### A. Fleet Dashboard (Evolução para "Fleet Command")
**Estado Atual:** Mostra contagens estáticas, FIPE total e histogramas simples.
**Evolução Proposta:**
1.  **Cálculo de TCO (Total Cost of Ownership):** Cruzar dados de *Compras* (valor pago) + *Manutenção* (custo acumulado) - *Receita Gerada*.
2.  **Curva de Depreciação:** Gráfico projetando o valor futuro do carro vs. FIPE atual para decidir o momento ótimo de venda.
3.  **Taxa de Utilização Real:** `(Dias Locados / Dias Disponíveis) %`. Este é o KPI mais crítico para locadoras.

#### B. Financial Dashboard (Evolução para "Financial Core")
**Estado Atual:** Faturamento por mês e Ticket Médio.
**Evolução Proposta:**
1.  **Análise de Margem de Contribuição:** Não apenas faturamento, mas `Receita - Custos Variáveis (Comissão + Lavagem + Manutenção)`.
2.  **Inadimplência:** Gráfico de *Aging* (contas a receber por idade da dívida).
3.  **Rentabilidade por Grupo de Veículo:** Qual modelo de carro é mais rentável? (Receita/Custo de Aquisição).

#### C. Manutenção (Novo - Baseado nos dados de OS)
**Dados Necessários:** Itens da OS, Mão de Obra, Peças, Data Abertura, Data Fechamento, Hodômetro.
**KPIs Sugeridos:**
1.  **Top 10 Ofensores:** Quais peças quebram mais? Quais modelos dão mais oficina?
2.  **Eficiência de Oficina:** Tempo médio que um carro fica parado (Downtime). Cada dia parado é receita perdida.
3.  **Preventiva vs. Corretiva:** A meta é ter 80% preventiva. Se a corretiva for alta, a frota está mal cuidada.
4.  **Custo por KM Rodado (CPK):** O "batimento cardíaco" da eficiência mecânica.

#### D. Data Audit (O "Guardião")
**Estado Atual:** Lista erros de vendas.
**Evolução Proposta:**
1.  **Auditoria Cruzada:**
    *   *Alerta:* Carro com status "Disponível" mas com OS de manutenção aberta.
    *   *Alerta:* Carro com status "Locado" mas sem contrato ativo no período.
    *   *Alerta:* KM atual menor que KM anterior (fraude ou erro de digitação).
2.  **Gamificação da Qualidade:** Ranking de filiais/usuários com menos erros de cadastro.

---

### 4. Design System & UX (O Fator "WOW")

Para atingir o nível "Premium" solicitado:

1.  **Paleta de Cores Semântica:**
    *   Fundo: `Slate-950` (Profundo, profissional).
    *   Cards: `Slate-900` com borda sutil `Slate-800` e leve transparência (backdrop-blur).
    *   Acentos:
        *   🟢 **Growth/Good:** Emerald-500 (Neon glow).
        *   🔴 **Alert/Bad:** Rose-500.
        *   🔵 **Info/Neutral:** Sky-500 ou Violet-500.
        *   🟠 **Warning:** Amber-500.

2.  **Interatividade:**
    *   Nenhum gráfico deve ser estático. Clique em uma barra do gráfico de "Faturamento" -> Abre detalhe ("Drill-down") daquele mês por Filial.
    *   Hover cards com detalhes contextuais.

3.  **Layout:**
    *   Sidebar retrátil minimalista.
    *   Cabeçalho com "Global Date Filter" (filtro de data que afeta a página toda).

---

### 5. Plano de Ação Imediato (Próximos Passos)

1.  **Refatoração Visual (Design System):**
    *   Criar componentes base `CardPremium`, `StatMetric`, `GlassContainer` no `index.css` e pasta `components/ui`.
    *   Aplicar o tema Dark/Glass no `FleetDashboard` como prova de conceito.

2.  **Estruturação dos Hubs:**
    *   Criar a página `AnalyticsHub.tsx` (Landing page dos dashboards).
    *   Configurar rotas para `/analytics/fleet`, `/analytics/financial`, etc.

3.  **Ingestão de Dados de Manutenção:**
    *   Criar tipagem `MaintenanceOrder` e `MaintenanceItem`.
    *   Criar `MaintenanceDashboard.tsx` (mesmo que com dados mockados inicialmente baseados na estrutura que você possui).

4.  **Auditoria Avançada:**
    *   Implementar a regra de "Auditoria Cruzada" (Status vs. OS) no `DataAudit.tsx`.

---
*Este plano posiciona a plataforma não apenas como um visualizador de dados, mas como uma ferramenta essencial para a tomada de decisão diária da locadora.*
