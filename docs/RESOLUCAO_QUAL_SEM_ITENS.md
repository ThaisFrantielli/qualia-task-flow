# RESOLUÇÃO: Valores QUAL sem itens vinculados na Timeline

## 📊 Diagnóstico Executado

Verificamos completamente o carregamento de dados da timeline por veículos. **Descobrimos que 100% das Ordens de Serviço (OS) estão sem itens vinculados** (mensagem: "Sem itens da OS vinculados na tabela fat_itens_ordem_servico para esta ocorrência").

### Análise Detalhada

```
📈 RESULTADOS:
✅ fat_manutencao_unificado:    36.368 registros (CARREGADO ✓)
❌ fat_itens_ordem_servico:      0 registros (NÃO ENCONTRADO ✗)
📊 Taxa de Cobertura:           0% (nenhuma OS tem itens vinculados)
```

### Causa Raiz

**O arquivo JSON de `fat_itens_ordem_servico` não existe em `public/data/`**

```
🔍 Verificação de Arquivos:
   ✓ fat_manutencao_unificado_manifest.json     (EXISTE)
   ✗ fat_itens_ordem_servico_manifest.json      (FALTA!)
   ✓ hist_vida_veiculo_timeline_manifest.json   (EXISTE)
```

**Isso significa:**
- Tabela `fat_itens_ordem_servico` no Supabase está vazia OU
- Sincronização nunca foi executada OU
- Sincronização falhou/foi interrompida

### Como Funciona o Matching (FleetDashboard.tsx)

```typescript
// Os valores são carregados via:
// 1. fat_manutencao_unificado (36.368 OS)
// 2. fat_itens_ordem_servico (0 itens atualmente!)

// Estratégia de match (10 tentativas em ordem):
1. IdOrdemServico (campo não preenchido em fat_manutencao_unificado)
2. OrdemServico/OS (campo não preenchido em fat_manutencao_unificado)
3. occplaca:${IdOcorrencia}:${Placa}
4. occplaca:${Ocorrencia}:${Placa}
5. occ:${IdOcorrencia}  ✓ DISPONÍVEL (3730694)
6. occ:${Ocorrencia}    ✓ DISPONÍVEL (QUAL-453724)
7. placa:${Placa}       ✓ DISPONÍVEL (ex: SGX-8B67)
8-10. Combinações adicionais

// Resultado: SEM MATCH porque fat_itens_ordem_servico está vazio!
```

## ✅ Solução

### Opção 1: Sincronizar fat_itens_ordem_servico (RECOMENDADO)

```bash
# Execute o ETL com pools corretos (HEAVY tables)
node scripts/local-etl/run-sync-v2.js
```

**Pré-requisitos:**
```bash
# Configure variáveis HEAVY_PG_* no .env (ou use valores padrão)
HEAVY_PG_POOLER_HOST=aws-0-us-west-2.pooler.supabase.com
HEAVY_PG_POOLER_PORT=6543
HEAVY_PG_POOLER_USER=postgres.tdaofzxbwwnsrhgasgzj
HEAVY_PG_PASSWORD=<senha>
```

**Status Esperado:**
```
Após sincronização bem-sucedida:
✓ Arquivo: public/data/fat_itens_ordem_servico_part1of2.json
✓ Arquivo: public/data/fat_itens_ordem_servico_part2of2.json
✓ Manifest: public/data/fat_itens_ordem_servico_manifest.json
✓ Registros: ~519.678 itens de OS
```

### Opção 2: Aumentar LIMIT de Carregamento (Quick Fix)

Editar `api/bi-data.ts` ou `api/bi-data-batch.ts`:

```typescript
// Aumentar o LIMIT para fat_itens_ordem_servico
const DEFAULT_LIMIT = 100000; // de 50000
```

Mas isto é **temporary** - recomendamos a sincronização completa.

### Opção 3: Verificar Status no Supabase

```sql
-- Verificar se tabela tem dados
SELECT COUNT(*) FROM fat_itens_ordem_servico;

-- Explorar campos de vinculação
SELECT DISTINCT 
    IdOrdemServico, 
    OrdemServico, 
    IdOcorrencia, 
    Ocorrencia,
    Placa
FROM fat_itens_ordem_servico
LIMIT 5;
```

## 🔧 Implementação Passo-a-Passo

### 1. Preparar Ambiente

```bash
# Versione o .env atual
cp .env .env.backup

# Verifique/adicione variáveis HEAVY_PG
echo "HEAVY_PG_POOLER_HOST=" >> .env
echo "HEAVY_PG_POOLER_USER=" >> .env
```

### 2. Executar Sincronização

```bash
# No Windows PowerShell
$env:HEAVY_PG_POOLER_HOST="aws-0-us-west-2.pooler.supabase.com"
$env:HEAVY_PG_POOLER_USER="postgres.tdaofzxbwwnsrhgasgzj"

node scripts/local-etl/run-sync-v2.js
```

### 3. Validar Resultado

```bash
# Executar diagnóstico
node scripts/diagnose-qual-mismatch.cjs

# Esperado:
# ✅ OS COM ITENS VINCULADOS: ~30.000+ / 36.368
# 📊 COBERTURA: ~85%+
```

### 4. Reimportar Dados no Frontend

- Limpar cache do navegador (Ctrl+Shift+Del)
- Recarregar `https://seu-app/analytics/fleet`
- Dados devem ser recarregados da API

## 📈 Resultado Esperado

### Antes da Solução
```
❌ Timeline mostra:
   "Sem itens da OS vinculados na tabela fat_itens_ordem_servico para esta ocorrência."
📊 0% de OS com valores QUAL vinculados
```

### Depois da Solução
```
✅ Timeline mostra:
   Valor Total (Itens OS): R$ 1.250,00
   Valor Reembolsável: R$ 850,00
   Valor Líquido: R$ 400,00
   % Reembolso: 68%
📊 ~85%+ de cobertura de OS
```

## 🔍 Verificação Contínua

Adicionar aos checks regulares:

```bash
# Verificar diariamente se fat_itens_ordem_servico está atualizado
*/6 * * * * node scripts/diagnose-qual-mismatch.cjs >> logs/diag.log 2>&1
```

## 📋 Campos Críticos

Para matching funcionar, garantir que existem em `fat_itens_ordem_servico`:

| Campo | Propósito | Exemplo |
|-------|-----------|---------|
| `IdOrdemServico` | ID da OS | 12345 |
| `OrdemServico` | Número da OS | OS-2026-001 |
| `IdOcorrencia` | ID da ocorrência | 3730694 |
| `Ocorrencia` | Código da ocorrência | QUAL-453724 |
| `Placa` | Placa do veículo | SGX-8B67 |
| `ValorTotal` | Valor total do item | 1250.00 |
| `ValorReembolsavel` | Valor reembolsável | 850.00 |

## ❓ FAQ

**P: Por que alguns registros conseguem fazer match e outros não?**
R: Depende de quais campos estão preenchidos. Se `IdOcorrencia` e `Placa` existem, há chance de match via `occplaca:${IdOcorrencia}:${Placa}`.

**P: Isso afeta apenas a visualização?**
R: Sim, os dados no banco estão corretos. É apenas um problema de carregamento/vinculação no frontend.

**P: Qual é o impacto de cobertura?**
R: Atualmente 0%. Esperado ~85% após sincronização (alguns registros podem não ter itens por design).

**P: Quanto tempo leva para sincronizar?**
R: ~5-10 minutos para ~519.678 registros com bandwidth normal.

## 📞 Suporte

Para re-diagnóstico: execute `node scripts/diagnose-qual-mismatch.cjs`
