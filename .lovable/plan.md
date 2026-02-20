

# Plano de Otimizacao - Velocidade das Paginas de Analytics

## Problema
As paginas de analytics (Frota, Contratos, Frota Improdutiva) demoram muito para abrir porque fazem multiplas chamadas HTTP pesadas em sequencia, cada uma passando por 3 saltos de rede (Lovable -> Vercel -> Oracle PostgreSQL), e o usuario so ve um spinner ate que TODOS os dados cheguem.

## Diagnostico

| Pagina | Chamadas HTTP | Tabelas | Problema Principal |
|--------|--------------|---------|-------------------|
| Frota | 4 chamadas | 9 tabelas + 2 timelines | Volume massivo de dados sem filtro de colunas |
| Contratos | 1 chamada | 1 tabela (JOIN pesado) | Query SQL com 3 JOINs, retorna todas as colunas |
| Frota Improdutiva | 3 chamadas | 3 tabelas + historico | Carrega historico completo de todos os veiculos |

## Solucoes Propostas (em ordem de impacto)

### 1. Skeleton Loading Progressivo (impacto visual imediato)
Em vez de mostrar um spinner vazio ate todos os dados chegarem, exibir a estrutura da pagina com skeletons animados nos cards/tabelas. Assim o usuario ve a pagina "montar" progressivamente conforme os dados chegam.

- Renderizar o layout dos KPIs e tabs imediatamente
- Mostrar skeletons nos valores numericos enquanto carregam
- Carregar e mostrar cada secao independentemente (KPIs primeiro, tabela depois)

### 2. Reducao do Payload com Selecao de Campos
Usar o parametro `fields` ja suportado pelo `useBIDataBatch` para trazer apenas as colunas necessarias em vez de `SELECT *`. Isso pode reduzir o payload de cada tabela em 50-80%.

Exemplo para FleetDashboard:
- `dim_frota`: apenas Placa, Modelo, Status, ValorCompra, ValorFipeAtual, KmInformado, IdadeVeiculo, Categoria, Filial (em vez de todas as 30+ colunas)
- `fat_sinistros`: apenas Placa, DataSinistro, ValorTotal
- `fat_multas`: apenas Placa, DataMulta, Valor

### 3. Carregamento Priorizado (dados criticos primeiro)
Separar os dados em "essenciais" (mostrados nos KPIs no topo) e "secundarios" (tabelas detalhadas, graficos). Carregar os essenciais primeiro e os secundarios sob demanda (quando o usuario clicar na aba).

- **Frota**: Carregar `dim_frota` primeiro (KPIs), depois as tabelas de fato por aba
- **Contratos**: Carregar lista basica primeiro, detalhes sob scroll

### 4. Lazy Loading por Aba
No FleetDashboard (que tem 5+ abas), carregar os dados secundarios apenas quando o usuario navegar para a aba correspondente, em vez de tudo no mount.

- Aba "Visao Geral": carregar `dim_frota` + `dim_contratos_locacao`
- Aba "Timeline": carregar timeline somente ao clicar
- Aba "Sinistros/Multas": carregar sob demanda

### 5. Correcao do Erro de Build
Remover o import nao utilizado de `CashFlowProjectionPage` no `App.tsx`.

---

## Detalhes Tecnicos

### Skeleton Loading
Substituir o bloco de loading atual (spinner centralizado) por um layout com componentes `<Skeleton />` ja existentes no projeto (`src/components/ui/skeleton.tsx`), mostrando a estrutura da pagina enquanto os dados carregam.

### Selecao de Campos no Batch
```text
// Antes (carrega TUDO)
useBIDataBatch(['dim_frota', 'fat_sinistros', ...])

// Depois (carrega so o necessario)
useBIDataBatch(
  ['dim_frota', 'fat_sinistros'],
  {
    dim_frota: ['Placa','Modelo','Status','ValorCompra','ValorFipeAtual','KmInformado','IdadeVeiculo','Categoria','Filial'],
    fat_sinistros: ['Placa','DataSinistro','ValorTotal']
  }
)
```

### Lazy Loading por Aba
Usar `enabled: false` no hook ate que a aba seja selecionada:
```text
const [activeTab, setActiveTab] = useState('overview');
const { results } = useBIDataBatch(
  ['fat_sinistros', 'fat_multas'],
  undefined,
  { enabled: activeTab === 'sinistros' }
);
```

## Ordem de Implementacao
1. Corrigir erro de build (CashFlowProjectionPage)
2. Skeleton loading progressivo (melhoria visual imediata)
3. Selecao de campos nas queries batch (reducao de payload)
4. Lazy loading por aba no FleetDashboard (reducao de chamadas iniciais)
5. Carregamento priorizado no ContractsDashboard

## Resultado Esperado
- Tempo percebido de carregamento reduzido de ~10s para ~2-3s (skeleton aparece imediatamente)
- Payload total reduzido em 50-70% com selecao de campos
- Menos chamadas HTTP no carregamento inicial com lazy loading por aba

