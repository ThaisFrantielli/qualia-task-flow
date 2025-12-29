# Análise de Contrato - Dashboard de Rentabilidade

## Visão Geral

A página **Análise de Contrato** é uma ferramenta estratégica para gestão comercial e financeira, permitindo análise de rentabilidade dos contratos e simulação de cenários de reajuste.

## Acesso

- **URL**: `/analytics/analise-contratos`
- **Menu**: Analytics > Hub Financeiro > Análise de Contrato

## Fonte de Dados

### Arquivo ETL
- **Arquivo**: `agg_rentabilidade_contratos_mensal.json`
- **Localização**: Bucket Supabase `bi-reports`
- **Atualização**: Processado pelo script ETL (`scripts/local-etl/run-sync.js`)

### Estrutura dos Dados
```json
{
  "Cliente": "Nome do Cliente",
  "IdContratoComercial": 123,
  "IdContratoLocacao": 456,
  "Grupo": "Categoria do Veículo",
  "Modelo": "Modelo do Veículo",
  "IdVeiculo": 789,
  "Placa": "ABC1234",
  "Competencia": "2024-12",
  "Faturamento": 50000.00,
  "GastoManutencao": 8000.00,
  "ReembolsoManutencao": 1000.00
}
```

## Funcionalidades

### 1. Filtros Globais

Permite filtrar todos os dados por:
- **Cliente**: Selecione um ou mais clientes
- **Contrato Comercial**: Filtre por ID do contrato comercial
- **Contrato Locação**: Filtre por ID do contrato de locação
- **Grupo**: Categoria do veículo (ex: Compacto, SUV, etc.)
- **Modelo**: Modelo específico do veículo

### 2. KPIs Principais

- **Faturamento Total**: Soma de todo faturamento no período filtrado
- **Gasto Total (Manutenção)**: Total de gastos com manutenção e sinistro
- **Gasto Líquido**: Gasto total menos reembolsos
- **% Gasto / Faturamento**: Percentual de gasto em relação ao faturamento
- **Classificação**: Status de saúde do contrato (Saudável, Alerta, Crítico)

### 3. Tabela de Análise Histórica

Apresenta dados passados agregados por ano com as seguintes linhas:
- **Faturamento**: Total de receita por ano
- **Qt Veic. Faturados**: Quantidade de veículos únicos que geraram faturamento
- **Gastos Man. Sinistro**: Total de gastos com manutenção e sinistro
- **Reembolso Man. Sinistro**: Total de reembolsos recebidos
- **Gasto Líq. Man. Sinistro**: Gasto líquido (Gastos - Reembolsos)
- **% Gasto Líq/Faturamento**: Percentual de gasto líquido sobre o faturamento

### 4. Tabela de Projeção

Projeta os próximos anos (2026, 2027, 2028) baseado em médias dos últimos 12 meses:

**Lógica de Projeção:**
- **Faturamento Projetado**: Média mensal dos últimos 12 meses × 12
- **Manutenção Projetada**: Aplicação do percentual médio de gasto sobre o faturamento projetado
- **% Líquido / Faturamento**: Percentual médio de manutenção dos últimos 12 meses

### 5. Tabela de Simulação de Reequilíbrio

Permite simular cenários de repactuação contratual com dois parâmetros ajustáveis:

**Inputs:**
- **% Proposta de Reequilíbrio (2026)**: Percentual de reajuste inicial (ex: 11%)
- **% Reajuste Anual (2027+)**: Percentual de reajuste anual para anos seguintes (ex: 4.5%)

**Cálculos:**
- **Faturamento 2026**: Faturamento projetado × (1 + % reequilíbrio)
- **Faturamento 2027**: Faturamento 2026 × (1 + % reajuste anual)
- **Faturamento 2028**: Faturamento 2027 × (1 + % reajuste anual)
- **Manutenção**: Mantida constante (projeção base)
- **% Líquido / Faturamento**: Recalculado com base nos novos valores

**Destaque Visual:**
- Linhas com % > 30% ficam em vermelho (Crítico)
- Linhas com % entre 20-30% ficam em amarelo (Alerta)
- Linhas com % ≤ 20% ficam normais (Saudável)

## Classificação de Rentabilidade

| Classificação | Critério | Cor |
|--------------|----------|-----|
| **Saudável** | % Gasto/Faturamento ≤ 20% | Verde |
| **Alerta** | % Gasto/Faturamento entre 20% e 30% | Amarelo |
| **Crítico** | % Gasto/Faturamento > 30% | Vermelho |

## Casos de Uso

### 1. Análise de Rentabilidade de Cliente
- Filtre por um cliente específico
- Analise o histórico de gastos vs. faturamento
- Identifique contratos não rentáveis

### 2. Projeção de Receita
- Visualize projeções futuras baseadas em performance histórica
- Identifique tendências de crescimento ou declínio

### 3. Simulação de Repactuação
- Teste diferentes cenários de reajuste
- Veja o impacto na rentabilidade
- Apresente propostas fundamentadas ao cliente

### 4. Análise por Categoria de Veículo
- Filtre por Grupo ou Modelo
- Identifique quais categorias são mais rentáveis
- Ajuste estratégia de frota

## Executar ETL

Para atualizar os dados, execute o script ETL:

```powershell
cd scripts/local-etl
node run-sync.js
```

O script irá:
1. Conectar ao SQL Server
2. Executar a query de rentabilidade
3. Gerar o arquivo JSON
4. Fazer upload para o Supabase Storage

## Exemplo de Workflow

1. **Análise Inicial**
   - Acesse a página sem filtros para visão geral
   - Identifique clientes com % Gasto/Faturamento alto

2. **Análise Detalhada**
   - Filtre por cliente problemático
   - Analise histórico ano a ano
   - Identifique tendências

3. **Simulação de Repactuação**
   - Configure % de reequilíbrio desejado
   - Configure % de reajuste anual
   - Observe impacto na rentabilidade

4. **Tomada de Decisão**
   - Compare cenários
   - Apresente proposta ao cliente
   - Documente decisão

## Melhorias Futuras

- [ ] Adicionar gráficos de tendência
- [ ] Exportar dados para Excel
- [ ] Drill-down por veículo individual
- [ ] Alertas automáticos para contratos críticos
- [ ] Integração com sistema de CRM
- [ ] Análise preditiva com Machine Learning
- [ ] Comparação entre clientes (benchmarking)
- [ ] Análise de sazonalidade

## Suporte

Para dúvidas ou problemas:
1. Verifique se o ETL foi executado recentemente
2. Confirme se o arquivo JSON existe no Supabase Storage
3. Verifique logs do console do navegador
4. Entre em contato com a equipe de TI
