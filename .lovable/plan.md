

# Plano de Ajustes - Timeline do Dashboard de Frota Ativa

## Problemas Identificados (das screenshots e código)

### 1. Datas de Multas em formato ISO cru
Na linha 1968, `fmtDateTimeBR(dataMulta)` recebe a string raw mas `fmtDateTimeBR` espera um `Date`. O valor chega como `"2025-09-25T09:44:00.000+00:00"` e é exibido assim. Precisa passar por `parseDateAny()` antes de formatar.

### 2. Valores zerados em multas (R$ 0,00)
Multas com valor 0 devem exibir "Valor não informado" em vez de "R$ 0,00" para evitar confusão.

### 3. Informações repetidas nos cards de ocorrências
Os cards de manutenção/sinistro mostram datas duplicadas (ex: DataCriação, DataSinistro, DataAberturaOcorrencia, DataConclusão, DataAgendamento, DataRetirada, DataRetiradaVeiculo). O painel direito repete todas as datas brutas do registro. Solução: filtrar campos redundantes e mostrar apenas Abertura, Conclusão e Retirada no painel lateral.

### 4. Ícone de Sinistro igual ao de Manutenção
Na linha 2100, sinistros com manutenção correspondente usam `iconMan` (Wrench/âmbar). Trocar para ícone diferenciado: usar `ShieldAlert` ou `Car` com cor vermelha/roxa para sinistros.

### 5. Valores ausentes nos cards colapsáveis de ocorrências
O card colapsável de multas (header) não mostra o valor total. O card de sinistros também não mostra valor no header. Incluir soma de valores no badge do header.

### 6. Build error: `primaryMeta` não utilizado no FleetDashboard
Remover variável não usada na linha 76.

## Implementação

### Arquivo: `src/pages/analytics/FleetDashboard.tsx`
- Linha 76: remover `primaryMeta` ou usar `_primaryMeta`

### Arquivo: `src/components/analytics/fleet/TimelineTab.tsx`

**Correção 1 - Datas de multas** (linha ~1968):
```text
// Antes:
{fmtDateTimeBR(dataMulta)}
// Depois:
{fmtDateTimeBR(parseDateAny(dataMulta))}
```

**Correção 2 - Valores zerados em multas** (linha ~1981-1983):
```text
// Antes:
<div className="text-sm font-bold text-red-600">{fmtMoney(valor)}</div>
// Depois:
<div className={`text-sm font-bold ${Number(valor) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
  {Number(valor) > 0 ? fmtMoney(valor) : 'Valor não informado'}
</div>
```

**Correção 3 - Valor total no header de multas** (linha ~1942-1943):
Adicionar soma de valores ao lado do badge de contagem:
```text
<span className="font-bold text-sm text-slate-700">MULTAS</span>
<Badge color="red">{placaMultas.length} Multas</Badge>
{(() => {
  const totalValor = placaMultas.reduce((s, m) => s + (Number(m.ValorMulta || m.Valor || 0)), 0);
  return totalValor > 0 ? <span className="text-red-600 font-bold text-xs">{fmtMoney(totalValor)}</span> : null;
})()}
```

**Correção 4 - Ícone diferenciado para sinistros** (linha ~2009, ~2100):
Importar `ShieldAlert` do lucide-react e usar para sinistros em vez de `AlertTriangle`/`Wrench`:
```text
// No EVENT_ICONS:
'SINISTRO': <ShieldAlert size={14} className="text-rose-600" />,

// Na renderização de sinistro com manutenção (linha ~2100):
// Usar borda roxa em vez de âmbar e ícone ShieldAlert
<div className="absolute ... border-2 border-rose-300 ...">
  <ShieldAlert size={14} className="text-rose-600" />
</div>
<div className="bg-rose-50/70 rounded-lg p-3 border-2 border-rose-200 ...">
```

**Correção 5 - Informações repetidas** (painel de datas no lado direito, linhas ~2416-2425):
Filtrar campos de data para mostrar apenas os não-nulos e não-duplicados. Remover campos como DataCriacao, DataSinistro individual quando já existe DataAberturaOcorrencia. Consolidar em 3 linhas: Abertura, Conclusão, Retirada.

**Correção 6 - Valor no header de sinistros/ocorrências**:
Para ocorrências de manutenção, o valor já aparece (linha 2123-2125). Para sinistros standalone, adicionar valor no header colapsável.

## Ordem de Execução
1. Fix build error (primaryMeta)
2. Corrigir formatação de datas em multas
3. Tratar valores zerados
4. Adicionar totais nos headers colapsáveis
5. Trocar ícone de sinistro
6. Limpar informações repetidas nos cards

