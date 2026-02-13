

# Plano de Otimizacao de Performance: Dashboards de Frota e Contratos

## Diagnostico dos Gargalos

### Gargalo 1: Query SQL extremamente lenta para `dim_contratos_locacao`

A query atual na API (`api/bi-data.ts`) usa `to_jsonb(c)->>` para **cada coluna individualmente**. Isso converte a linha inteira em JSON repetidamente (uma vez por coluna) -- um anti-pattern severo do PostgreSQL. Para 5.000+ contratos com 20+ colunas, sao ~100.000 chamadas a `to_jsonb()`.

```text
ATUAL (lento):
  to_jsonb(c)->>'IdContratoLocacao' AS "IdContratoLocacao",
  to_jsonb(c)->>'ContratoLocacao' AS "ContratoLocacao",
  ... (repete 22 vezes por tabela)

CORRETO (rapido):
  SELECT c."IdContratoLocacao", c."ContratoLocacao", ...
  -- Acesso direto as colunas, sem conversao JSON
```

### Gargalo 2: Requisicoes HTTP em excesso

- **FleetDashboard**: Dispara **12 chamadas HTTP paralelas** ao montar (10x `useBIData` + 2x `useTimelineData`, que internamente faz +1 fetch a `dim_frota`)
- **ContractsDashboard**: Faz 2 chamadas (`dim_contratos_locacao` + `dim_frota`), mas a API ja faz o JOIN -- o fetch de `dim_frota` separado e **redundante**
- Cada chamada tem latencia de rede (Vercel -> Oracle Cloud ~100-300ms) + cold start da serverless (~500ms na primeira)

### Gargalo 3: Transferencia de dados excessiva

- `SELECT *` retorna **todas as colunas** mesmo quando o dashboard usa apenas 5-10 campos
- `dim_frota` com 5.800+ registros inclui campos como `UltimoEnderecoTelemetria` (strings longas) que inflam o payload
- Sem compressao gzip explicita nos responses

### Gargalo 4: Processamento pesado no frontend

- `ContractsDashboard` reconstroi um `frotaMap` no cliente para fazer lookup por placa -- trabalho que a API ja faz via LEFT JOIN
- Funcoes `parseNum`, `getStr` sao chamadas milhares de vezes em loop `.map()` sem necessidade (dados ja vem tipados da API)

---

## Solucao Proposta

### Etapa 1: Otimizar a Query SQL (impacto: -70% no tempo de resposta da API)

Reescrever a query de `dim_contratos_locacao` para usar acesso direto a colunas em vez de `to_jsonb()`:

```text
ANTES: to_jsonb(c)->>'NomeCliente' AS "NomeCliente"  (converte linha inteira para JSON)
DEPOIS: c."NomeCliente"  (acesso direto, indice-friendly)
```

Tambem selecionar apenas as colunas necessarias em vez de `SELECT *` para as demais tabelas.

### Etapa 2: Criar endpoint batch (`/api/bi-data-batch`)

Novo endpoint que aceita multiplas tabelas em uma unica requisicao:

```text
GET /api/bi-data-batch?tables=dim_frota,fat_sinistros,fat_multas&fields=dim_frota:Placa,Modelo,Status,ValorCompra
```

Beneficios:
- 1 roundtrip HTTP em vez de 10+
- 1 cold start em vez de possiveis multiplos
- Conexao ao PostgreSQL reutilizada para todas as queries

### Etapa 3: Suporte a selecao de campos (`fields` parameter)

Permitir que o frontend especifique apenas os campos necessarios:

```text
GET /api/bi-data?table=dim_frota&fields=Placa,Modelo,Status,ValorCompra,ValorFipeAtual,KmInformado
```

Reduz o payload de ~2MB para ~400KB para `dim_frota`.

### Etapa 4: Eliminar fetch redundante no ContractsDashboard

O `ContractsDashboard` atualmente faz:
1. `useBIData('dim_contratos_locacao')` -- que ja faz LEFT JOIN com dim_frota na API
2. `useBIData('dim_frota')` -- busca dim_frota novamente, so para construir `frotaMap`

Solucao: Remover o segundo fetch e simplificar o `useMemo` que transforma os dados, ja que a API retorna os campos enriquecidos (Montadora, Modelo, Categoria, currentKm, etc).

### Etapa 5: Otimizar FleetDashboard com batch loading

Agrupar os 10+ fetches do FleetDashboard em 2-3 chamadas batch:

```text
Batch 1 (dados primarios): dim_frota + dim_contratos_locacao + dim_movimentacao_patios
Batch 2 (dados secundarios): fat_sinistros + fat_multas + fat_carro_reserva + fat_movimentacao_ocorrencias
Batch 3 (manutencao): fat_manutencao_unificado
```

### Etapa 6: Cache HTTP com stale-while-revalidate

Adicionar headers de cache mais agressivos para dados que mudam apenas 3x/dia:

```text
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

---

## Resumo do Impacto Esperado

```text
                         ANTES           DEPOIS
Query contratos          ~3-5s           ~0.5-1s     (remover to_jsonb)
Requisicoes HTTP Fleet   12 chamadas     2-3 batch   (batch endpoint)
Payload dim_frota        ~2MB            ~400KB      (field selection)
Fetch redundante         2x dim_frota    1x          (eliminar duplicata)
Cold start impact        12 funcoes      2-3         (menos invocacoes)
Tempo total dashboard    8-15s           2-4s
```

---

## Detalhes Tecnicos de Implementacao

### Arquivo: `api/bi-data.ts`
- Reescrever query de `dim_contratos_locacao` sem `to_jsonb()`
- Adicionar parametro `fields` para selecao de colunas
- Aumentar `s-maxage` para 300s

### Novo arquivo: `api/bi-data-batch.ts`
- Aceitar `tables` como lista separada por virgula
- Executar queries em paralelo (`Promise.all`) dentro de uma unica conexao
- Retornar objeto com resultados por tabela

### Arquivo: `src/hooks/useBIData.ts`
- Criar variante `useBIDataBatch` para carregar multiplas tabelas de uma vez
- Manter `useBIData` para compatibilidade com paginas que carregam 1-2 tabelas

### Arquivo: `src/pages/analytics/ContractsDashboard.tsx`
- Remover `useBIData('dim_frota')`
- Simplificar `useMemo` removendo construcao de `frotaMap` (dados ja vem do JOIN)

### Arquivo: `src/pages/analytics/FleetDashboard.tsx`
- Substituir 10+ `useBIData` individuais por 2-3 chamadas batch
- Manter mesma logica de processamento, apenas mudar a fonte de dados

### Arquivo: `src/hooks/useTimelineData.ts`
- Remover fetch adicional a `dim_frota` (linhas 106-138) que augmenta dados -- mover essa logica para o backend

