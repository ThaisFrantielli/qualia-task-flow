# 📊 Plano de Análise: Workflow de Manutenção
**Data:** 07/01/2026  
**Fonte:** `MovimentacaoOcorrencias` (SQL Server DW)  
**Objetivo:** Análise detalhada do fluxo de etapas das Ordens de Serviço

---

## 🎯 1. ANÁLISES POSSÍVEIS

### 1.1 **Lead Time por Etapa** ⏱️
**Descrição:** Tempo médio que cada OS passa em cada etapa do processo.

**Etapas Identificadas:**
1. **Pré-Agendamento** → Solicitar agendamento
2. **Confirmação de Agenda** → Confirmar data/hora
3. **Aguardando Chegada** → Veículo a caminho da oficina
4. **Aguardando Orçamento** → Oficina preparando orçamento
5. **Orçamento em Análise** → Análise interna do orçamento
6. **Aguardando Aprovação** → Cliente/gestor aprovando
7. **Serviço em Execução** → Manutenção sendo realizada
8. **Aguardando Retirada do Veículo** → Serviço concluído
9. **Aguardando Nota Fiscal** → Processamento financeiro
10. **Ocorrência Finalizada** → OS concluída

**KPIs:**
- Tempo médio por etapa (dias/horas)
- Tempo total do processo (Criação → Finalização)
- Etapas mais demoradas (gargalos)
- Variação de tempo (desvio padrão)

**Visualizações:**
- Gráfico de funil com tempo em cada etapa
- Timeline horizontal mostrando duração
- Heatmap: Etapa × Tempo médio

---

### 1.2 **Funil de Conversão** 🔄
**Descrição:** Quantas OS passam por cada etapa e onde há maiores perdas.

**Métricas:**
- % de OS que chegam em cada etapa
- Taxa de conclusão por etapa
- Taxa de cancelamento por etapa
- Motivos de cancelamento mais comuns

**Exemplo:**
```
100 OS criadas
 ↓ 95% → Pré-Agendamento
 ↓ 90% → Confirmação de Agenda
 ↓ 85% → Aguardando Chegada
 ↓ 80% → Aguardando Orçamento
 ↓ 75% → Orçamento em Análise
 ↓ 70% → Aguardando Aprovação (GARGALO!)
 ↓ 65% → Serviço em Execução
 ↓ 60% → Concluídas
```

**Visualizações:**
- Funil interativo (Sankey diagram)
- Gráfico de barras horizontais com % conversão
- Taxa de drop-off por etapa

---

### 1.3 **Análise de Gargalos** 🚧
**Descrição:** Identificar onde o processo trava mais.

**Indicadores:**
- Etapa com maior tempo médio
- Etapa com maior variação de tempo
- Etapa com maior taxa de cancelamento
- Horários/dias da semana com mais gargalos

**Alertas Automáticos:**
- 🔴 OS parada > 5 dias em uma etapa
- 🟡 OS com tempo acima de 2× a média
- 🟢 OS fluindo normalmente

**Visualizações:**
- Boxplot: Tempo por etapa (mostrar outliers)
- Scatter plot: Tempo × Volume de OS
- Ranking de etapas mais problemáticas

---

### 1.4 **Performance por Usuário** 👤
**Descrição:** Quem resolve mais rápido? Quem tem mais retrabalho?

**Métricas por Usuário:**
- Quantidade de OS processadas
- Tempo médio de processamento
- Taxa de conclusão vs cancelamento
- Etapas em que atua
- Horário de pico de atividade

**Rankings:**
- 🏆 Top 10 usuários mais rápidos
- 🐢 Top 10 usuários mais lentos
- 🎯 Usuários com maior taxa de conclusão

**Visualizações:**
- Tabela ranking com métricas
- Gráfico de bolhas: Volume × Tempo × Taxa Sucesso
- Timeline de atividade por usuário

---

### 1.5 **Análise de Retrabalho** 🔁
**Descrição:** OS que voltam para etapas anteriores.

**Identificação:**
```sql
-- Exemplo: OS que voltou de "Serviço em Execução" 
-- para "Aguardando Orçamento"
```

**Métricas:**
- % de OS com retrabalho
- Etapas que mais causam retrabalho
- Custo estimado do retrabalho
- Motivos principais

**Visualizações:**
- Matriz de transição de etapas
- Gráfico Sankey com loops
- Taxa de retrabalho por tipo de manutenção

---

### 1.6 **Análise de Cancelamentos** ❌
**Descrição:** Por que OS são canceladas e em que etapa?

**Motivos Identificados (amostra):**
- SOLICITAÇÃO ABERTA ERRONEAMENTE
- DUPLICIDADE
- VEÍCULO AUSENTE

**Análises:**
- Distribuição de cancelamentos por etapa
- Motivos de cancelamento mais comuns
- Quem mais cancela (usuário)
- Tipo de manutenção mais cancelada
- Custo de cancelamentos (tempo perdido)

**Visualizações:**
- PieChart: Motivos de cancelamento
- Timeline: Quando no processo as OS são canceladas
- Tabela: Motivo × Etapa × Frequência

---

### 1.7 **Análise Temporal** 📅
**Descrição:** Padrões de tempo ao longo do dia/semana/mês.

**Dimensões:**
- Hora do dia (pico de atividade)
- Dia da semana (segunda é mais lenta?)
- Mês do ano (sazonalidade)
- Feriados vs dias úteis

**Descobertas Esperadas:**
- "OS criadas na segunda levam 20% mais tempo"
- "Aprovações são mais rápidas pela manhã"
- "Dezembro tem 30% mais cancelamentos"

**Visualizações:**
- Heatmap: Dia da semana × Hora × Tempo médio
- Gráfico de linha: Tempo médio por mês
- Calendário de calor: Dias problemáticos

---

### 1.8 **Análise por Tipo de Manutenção** 🔧
**Descrição:** Comparar processos: Preventiva vs Corretiva vs Sinistro.

**Comparações:**
- Tempo total por tipo
- Etapas que cada tipo passa
- Taxa de conclusão por tipo
- Custo médio por tipo
- Qual tipo tem mais retrabalho

**Visualizações:**
- Gráfico de barras agrupadas: Tempo por etapa × Tipo
- Radar chart: Métricas comparativas
- Tabela comparativa lado a lado

---

### 1.9 **Análise de SLA** ⏰
**Descrição:** Definir e monitorar acordos de nível de serviço.

**SLAs Sugeridos:**
| Etapa | SLA (dias úteis) | Criticidade |
|-------|------------------|-------------|
| Pré-Agendamento → Confirmação | 1 dia | 🔴 Alta |
| Confirmação → Chegada | 2 dias | 🟡 Média |
| Chegada → Orçamento | 1 dia | 🔴 Alta |
| Orçamento → Análise | 4 horas | 🟡 Média |
| Análise → Aprovação | 1 dia | 🔴 Alta |
| Aprovação → Execução | 1 dia | 🟡 Média |
| Execução → Retirada | 3 dias | 🔴 Alta |
| **TOTAL** | **7 dias úteis** | 🔴 **Crítico** |

**Métricas:**
- % de OS dentro do SLA
- Tempo médio de atraso
- Etapas que mais estouraram SLA
- Custo de atrasos

**Visualizações:**
- Gauge: % dentro do SLA (verde > 90%)
- Gráfico de linha: SLA compliance ao longo do tempo
- Tabela: OS atrasadas com destaque

---

### 1.10 **Análise de Eficiência Operacional** 📈
**Descrição:** Métricas agregadas de eficiência do processo.

**KPIs de Processo:**
- **Lead Time Total:** Criação → Finalização (meta: < 7 dias)
- **Cycle Time:** Chegada na oficina → Retirada (meta: < 5 dias)
- **Touch Time:** Tempo em execução real (meta: < 2 dias)
- **Wait Time:** Tempo de espera total (meta: < 3 dias)
- **Taxa de Primeiro Sucesso:** OS concluídas sem retrabalho (meta: > 85%)
- **Taxa de Utilização:** Tempo produtivo / Tempo total (meta: > 60%)

**Fórmulas:**
```
Lead Time = DataFinalização - DataCriação
Cycle Time = DataRetirada - DataChegada
Touch Time = Soma(Tempo em "Serviço em Execução")
Wait Time = Lead Time - Touch Time
```

**Visualizações:**
- Dashboard executivo com KPIs principais
- Gráfico de tendência: KPIs ao longo do tempo
- Comparação: Preventiva vs Corretiva

---

## 🗂️ 2. ESTRUTURA DE DADOS NO ETL

### 2.1 **Tabela Principal: `fat_movimentacao_ocorrencias`**
```sql
SELECT 
    -- Identificação
    Ocorrencia,
    Tipo,
    Motivo,
    Placa,
    ModeloVeiculo,
    IdCliente,
    
    -- Situação
    Situacao,
    
    -- Cancelamento
    CanceladoPor,
    FORMAT(CanceladoEm, 'yyyy-MM-dd HH:mm:ss') as DataCancelamento,
    MotivoCancelamento,
    
    -- Criação
    CriadoPor,
    FORMAT(CriadoEm, 'yyyy-MM-dd HH:mm:ss') as DataCriacao,
    
    -- Etapa
    Etapa,
    EtapaAtual,
    FORMAT(DataDeConfirmacao, 'yyyy-MM-dd HH:mm:ss') as DataEtapa,
    Usuario as UsuarioEtapa,
    
    -- Metadata
    FORMAT(DataAtualizacaoDados, 'yyyy-MM-dd HH:mm:ss') as DataAtualizacao
    
FROM MovimentacaoOcorrencias
WHERE Etapa IS NOT NULL 
  AND DataDeConfirmacao IS NOT NULL
ORDER BY Ocorrencia, DataDeConfirmacao
```

### 2.2 **Tabela Agregada: `agg_lead_time_etapas`**
Pré-calcular tempo entre etapas para performance.

```sql
WITH EtapasOrdenadas AS (
    SELECT 
        Ocorrencia,
        Etapa,
        DataDeConfirmacao,
        LAG(DataDeConfirmacao) OVER (PARTITION BY Ocorrencia ORDER BY DataDeConfirmacao) as DataEtapaAnterior,
        LAG(Etapa) OVER (PARTITION BY Ocorrencia ORDER BY DataDeConfirmacao) as EtapaAnterior
    FROM MovimentacaoOcorrencias
    WHERE Etapa IS NOT NULL
)
SELECT 
    Ocorrencia,
    EtapaAnterior,
    Etapa as EtapaAtual,
    DataEtapaAnterior,
    DataDeConfirmacao,
    DATEDIFF(HOUR, DataEtapaAnterior, DataDeConfirmacao) as TempoEntreEtapas_Horas,
    DATEDIFF(DAY, DataEtapaAnterior, DataDeConfirmacao) as TempoEntreEtapas_Dias
FROM EtapasOrdenadas
WHERE EtapaAnterior IS NOT NULL
```

### 2.3 **Tabela Agregada: `agg_funil_conversao`**
```sql
SELECT 
    Etapa,
    Tipo,
    COUNT(*) as TotalOS,
    COUNT(DISTINCT Ocorrencia) as TotalOcorrencias,
    SUM(CASE WHEN Situacao = 'Concluída' THEN 1 ELSE 0 END) as TotalConcluidas,
    SUM(CASE WHEN Situacao = 'Cancelada' THEN 1 ELSE 0 END) as TotalCanceladas,
    AVG(DATEDIFF(HOUR, CriadoEm, DataDeConfirmacao)) as TempoMedioAteEtapa_Horas
FROM MovimentacaoOcorrencias
WHERE Etapa IS NOT NULL
GROUP BY Etapa, Tipo
ORDER BY Etapa
```

---

## 🎨 3. DASHBOARDS E VISUALIZAÇÕES

### 3.1 **Dashboard: Análise de Workflow** (Nova aba)
**Componentes:**
1. KPI Cards (topo):
   - Lead Time Total Médio
   - Taxa de Conclusão
   - Taxa de Cancelamento
   - Etapa com Maior Gargalo

2. Funil de Conversão (esquerda):
   - Sankey diagram interativo
   - Click → filtra por etapa

3. Lead Time por Etapa (direita):
   - BarChart horizontal
   - Tempo médio em horas/dias
   - Cor: verde (< SLA), amarelo (≈ SLA), vermelho (> SLA)

4. Timeline de Processo (meio):
   - Gráfico Gantt
   - Cada linha = 1 OS
   - Cores por etapa

5. Análise de Gargalos (baixo):
   - Tabela ranking etapas
   - Boxplot de tempos
   - Alertas de OS atrasadas

### 3.2 **Dashboard: Performance de Usuários** (Nova aba)
**Componentes:**
1. Ranking de Usuários:
   - Top 10 mais rápidos
   - Top 10 mais lentos
   - Tabela interativa

2. Heatmap de Atividade:
   - Eixo X: Hora do dia
   - Eixo Y: Usuário
   - Cor: Intensidade de atividade

3. Métricas por Usuário:
   - Volume processado
   - Tempo médio
   - Taxa de sucesso

### 3.3 **Dashboard: Análise de Cancelamentos** (Nova aba)
**Componentes:**
1. PieChart: Motivos de cancelamento
2. Timeline: Quando são canceladas
3. Tabela: Detalhamento com filtros

---

## 🚀 4. IMPLEMENTAÇÃO - ROADMAP

### FASE 1: ETL Básico (1-2h)
- [x] Documentar estrutura da tabela
- [ ] Criar query `fat_movimentacao_ocorrencias`
- [ ] Adicionar ao `run-sync-v2.js`
- [ ] Testar extração
- [ ] Upload para Supabase

### FASE 2: Tabelas Agregadas (2-3h)
- [ ] Criar `agg_lead_time_etapas`
- [ ] Criar `agg_funil_conversao`
- [ ] Criar `agg_performance_usuarios`
- [ ] Otimizar queries (índices)

### FASE 3: Dashboard Workflow (3-4h)
- [ ] Criar componente `WorkflowTab.tsx`
- [ ] Implementar funil de conversão
- [ ] Implementar gráfico lead time
- [ ] Implementar timeline
- [ ] Testes e ajustes

### FASE 4: Dashboard Performance (2-3h)
- [ ] Criar componente `UsuariosPerformanceTab.tsx`
- [ ] Ranking de usuários
- [ ] Heatmap de atividade
- [ ] Métricas individuais

### FASE 5: Análises Avançadas (4-6h)
- [ ] Detecção de retrabalho
- [ ] Análise de SLA
- [ ] Alertas automáticos
- [ ] Machine Learning para previsões

---

## 📊 5. EXEMPLOS DE INSIGHTS ESPERADOS

### 5.1 **Gargalos Identificados**
```
🔴 CRÍTICO: 
- Etapa "Aguardando Aprovação" demora 3.2 dias (SLA: 1 dia)
- 45% das OS ficam travadas nessa etapa
- Principalmente OS de valor > R$ 5.000

💡 AÇÃO: Criar fluxo de aprovação automática para OS < R$ 2.000
```

### 5.2 **Performance de Usuários**
```
🏆 DESTAQUE:
- Vitoria Palmira: 98% de conclusão, 1.2 dias médio
- Processa 80% das confirmações de agenda

🐢 ATENÇÃO:
- Maxwell Guimarães: 12% de cancelamento, 4.5 dias médio
- Análise de orçamento demora 2× a média

💡 AÇÃO: Treinamento para Maxwell em análise de orçamento
```

### 5.3 **Padrões Temporais**
```
📅 DESCOBERTA:
- Segunda-feira: +35% no lead time total
- Sexta-feira após 14h: +60% de cancelamentos "VEÍCULO AUSENTE"
- Dezembro: +40% de OS preventivas (final de ano)

💡 AÇÃO: Evitar agendamentos segunda de manhã e sexta tarde
```

### 5.4 **Retrabalho**
```
🔁 PROBLEMA:
- 18% das OS voltam de "Serviço em Execução" para "Aguardando Orçamento"
- Motivo: Encontrada falha adicional durante reparo
- Adiciona 2.8 dias ao lead time total

💡 AÇÃO: Melhorar inspeção inicial (etapa "Aguardando Orçamento")
```

---

## 🎯 6. MÉTRICAS DE SUCESSO

### Após Implementação (3 meses):
- ✅ Redução de 30% no lead time total
- ✅ Taxa de conclusão > 85%
- ✅ Taxa de retrabalho < 10%
- ✅ 90% das OS dentro do SLA
- ✅ Identificação de 5+ gargalos e ações corretivas

---

## 📝 7. PRÓXIMOS PASSOS

1. **Imediato:** Implementar extração ETL da `MovimentacaoOcorrencias`
2. **Curto Prazo:** Dashboard básico de workflow
3. **Médio Prazo:** Análises avançadas e alertas
4. **Longo Prazo:** Machine Learning para previsão de atrasos

---

**Autor:** Sistema de BI - Qualia Task Flow  
**Última Atualização:** 07/01/2026 10:30
