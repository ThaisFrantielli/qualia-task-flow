# 📊 Arquitetura BI Analytics - Documentação Consolidada

> **Última Atualização:** 12/01/2026  
> **Versão:** 2.0

---

## 🎯 Visão Geral

O sistema de Business Intelligence da BluFleet é uma **Plataforma de Inteligência Centralizada (Nexus)** que serve como o "cérebro" da operação, conectando dados de finanças, operação, manutenção e comercial.

### Filosofia de Design: "Glass & Neon"
- Interface moderna, dark mode
- Glassmorphism com elementos translúcidos
- Acentos vibrantes para indicar saúde e alertas
- Experiência imersiva de cockpit de controle

---

## 🏗️ Arquitetura de Dados

### Pipeline ETL (v170.9-Consolidado)

```
SQL Server (DW BluFleet)
         ↓
   Node.js ETL (run-sync-v2.js)
         ↓
   PostgreSQL (Local)
         ↓
   Supabase Storage (bi-reports bucket)
         ↓
   Frontend (useBIData hook)
```

**Características:**
- Timeout de 12 minutos por request
- Particionamento mensal para tabelas de alto volume
- Execução 3x ao dia via cron

### Arquivos Gerados (~128 arquivos)

#### Dimensões (8 tabelas)
| Arquivo | Descrição | Status |
|---------|-----------|--------|
| `dim_clientes.json` | Dados cadastrais de clientes | ✅ Ativo |
| `dim_frota.json` | Veículos com +40 campos (telemetria, GPS, seguro) | ✅ Ativo |
| `dim_condutores.json` | Motoristas vinculados | ✅ Ativo |
| `dim_fornecedores.json` | Oficinas e fornecedores | ✅ Ativo |
| `dim_contratos.json` | Contratos de locação | ✅ Ativo |
| `dim_compras.json` | Aquisições de veículos | ✅ Ativo |
| `dim_alienacoes.json` | Vendas/baixas de veículos | ✅ Ativo |
| `dim_regras_contrato.json` | Regras contratuais | ✅ Ativo |

#### Fatos Anuais (sharding por ano)
| Padrão | Descrição | Anos |
|--------|-----------|------|
| `fat_faturamentos_YYYY.json` | Faturamento mensal | 2020-2026 |
| `fat_manutencao_completa_YYYY.json` | OS detalhadas | 2020-2026 |
| `fat_financeiro_universal_YYYY_MM.json` | Financeiro (mensal) | 2020-2026 |

#### Fatos Consolidados (10 tabelas)
| Arquivo | Descrição |
|---------|-----------|
| `fat_churn.json` | Análise de cancelamentos |
| `fat_inadimplencia.json` | Contas em atraso |
| `fat_carro_reserva.json` | Veículos reserva |
| `fat_manutencao_unificado.json` | OS unificadas (Chegada/Conclusao) |
| `hist_vida_veiculo_timeline.json` | Timeline completa por veículo |
| `agg_dre_mensal.json` | DRE consolidado |
| `auditoria_consolidada.json` | Dados para auditoria |

---

## 🧩 Estrutura de Componentes

### Hook Principal: `useBIData`
Localização: `src/hooks/useBIData.ts`

```typescript
// Uso típico
const { data, loading, error } = useBIData('dim_frota');

// Com sharding automático (combina anos)
const { data } = useBIData('fat_faturamentos', { years: [2024, 2025] });
```

### Helpers de Timeline: `fleetTimeline.ts`
Localização: `src/lib/analytics/fleetTimeline.ts`

Funções exportadas:
- `parseDateAny(raw)` - Parse de datas BR e ISO
- `normalizePlacaKey(raw)` - Normaliza placas
- `normalizeEventName(raw)` - Remove acentos e normaliza
- `getEventDate(e)` - Extrai data de evento
- `eventToState(e)` - Classifica estado (LOCACAO/MANUTENCAO/SINISTRO)
- `calcStateDurationsDays(events)` - Calcula duração por estado
- `calcDiasLocadoFromContratos(contratos)` - Dias efetivamente locados
- `calcDiasManutencaoFromOS(osRecords)` - Dias em manutenção
- `aggregateFleetMetrics(frota, contratos, manutencao)` - Métricas agregadas
- `formatDurationDays(days)` - Formata "X a Y m Z d"

---

## 📈 Hubs de Inteligência

### 🏛️ Hub 1: Diretoria & Estratégia (C-Level)
- **Cockpit Executivo**: Visão unificada
- **Financial Analytics**: Fluxo de caixa, EBITDA
- **Revenue Gap**: Metas vs. realizado

### 🚗 Hub 2: Operações & Frota (COO)
- **Fleet Command**: Status da frota, idade média, giro
- **Manutenção**: MTBF, MTTR, custo por KM
- **Compras & Desmobilização**: Pipeline de aquisição/venda

### 📊 Hub 3: Comercial & Crescimento (CCO)
- **Sales Performance**: Metas por vendedor
- **Churn & Retenção**: LTV, motivos de saída
- **Oportunidades**: Funil em tempo real

### 🛡️ Hub 4: Qualidade & Auditoria
- **Data Audit**: Painel de saneamento
- **Alertas Operacionais**: Veículos parados, contratos vencidos

---

## 🎨 Design System

### Paleta de Cores (CSS Variables)
```css
/* Fundo */
--background: slate-950 (dark mode)

/* Cards */
--card: slate-900 com backdrop-blur

/* Semântica */
--success: emerald-500    /* Growth/Good */
--destructive: rose-500   /* Alert/Bad */
--info: sky-500           /* Neutral */
--warning: amber-500      /* Atenção */
```

### Componentes Base
- `CardPremium` - Card com glassmorphism
- `StatMetric` - KPI com variação
- `GlassContainer` - Container translúcido

---

## 📂 Estrutura de Arquivos

```
src/
├── components/analytics/
│   ├── fleet/
│   │   ├── EfficiencyTab.tsx      # Análise de eficiência
│   │   └── TimelineTab.tsx        # Linha do tempo
│   ├── maintenance/
│   ├── financial/
│   └── shared/
├── lib/analytics/
│   └── fleetTimeline.ts           # Helpers de timeline
├── hooks/
│   └── useBIData.ts               # Hook de dados BI
└── pages/analytics/
    ├── FleetDashboard.tsx         # Dashboard principal frota
    ├── MaintenanceDashboard.tsx   # Dashboard manutenção
    ├── FinancialDashboard.tsx     # Dashboard financeiro
    └── ...
```

---

## 🔧 Configuração do ETL

### Variáveis de Ambiente (.env)

```bash
# SQL Server (Produção)
SQL_SERVER=200.219.192.34
SQL_PORT=3494
SQL_DATABASE=BluFleet
SQL_USER=***
SQL_PASSWORD=***

# PostgreSQL (Local)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=BluConecta_Dw
PG_USER=postgres
PG_PASSWORD=***

# Supabase
SUPABASE_URL=https://apqrjkobktjcyrxhqwtm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=*** (NUNCA commitar!)
```

### Execução

```powershell
cd scripts/local-etl
npm install
node verify-config.js    # Verificar conexões
node run-sync-v2.js      # Executar ETL completo
```

---

## 📊 Estrutura de Dados: Timeline

O arquivo `hist_vida_veiculo_timeline.json` consolida eventos com estrutura padronizada:

```typescript
interface TimelineEvent {
  Placa: string;
  TipoEvento: 'LOCAÇÃO' | 'DEVOLUÇÃO' | 'MANUTENÇÃO' | 'SINISTRO' | 'MULTA' | 'COMPRA' | 'VENDA';
  DataEvento: string; // ISO date
  Modelo?: string;
  Cliente?: string;
  Fornecedor?: string;
  ValorTotal?: number;
  // ... 28 campos padronizados
}
```

### Cálculo de Métricas por Veículo

```typescript
const { totalDays, locacaoDays, manutencaoDays, sinistroDays } = calcStateDurationsDays(eventos);

// Taxa de utilização
const utilization = (locacaoDays / totalDays) * 100;

// Classificação
// Excelente: ≥80%
// Bom: 60-79%
// Regular: 40-59%
// Crítico: <40%
```

---

## 🚀 Próximos Passos

### Imediato
1. ✅ ETL v170.9 estável e funcional
2. ✅ Timeline de frota implementada
3. ✅ Aba de Eficiência funcionando

### Curto Prazo
- [ ] Alertas de Telemetria (veículos sem atualização 48h)
- [ ] Dashboard dedicado de Seguros
- [ ] Análise de Condutores (multas/sinistros)
- [ ] Alertas de Manutenção Preventiva (KM)

### Médio Prazo
- [ ] Gamificação de qualidade de dados
- [ ] Drill-down interativo em gráficos
- [ ] Exportação PDF de relatórios
- [ ] Integração com Slack/Email para alertas

---

## 🆘 Troubleshooting

### Erro: "Module does not provide export"
- Excluir arquivos `.js` duplicados em `src/lib/analytics/`
- Vite pode resolver `.js` antes de `.ts`

### Erro: "bun install timeout"
- Infraestrutura temporária - aguardar e retentar
- Ou aumentar instance size em Settings → Cloud

### Dados não aparecem no dashboard
1. Verificar se ETL executou sem erros
2. Checar bucket `bi-reports` no Supabase Storage
3. Confirmar que `useBIData` usa nome correto do arquivo

---

**Mantido por:** Equipe BluFleet  
**Versão do Documento:** 2.0
