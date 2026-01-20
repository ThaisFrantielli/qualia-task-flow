# Aprimoramento de fat_sinistros e fat_multas - Novos Campos

**Data**: 5 de Janeiro de 2026  
**Status**: ✅ CORRIGIDO E APRIMORADO

---

## 🔧 Problemas Corrigidos

### ❌ Campos que NÃO EXISTEM nas tabelas:
1. **`ResponsavelSinistro`** em OcorrenciasSinistro → Substituído por `NomeCondutor`
2. **`ResponsavelMulta`** em OcorrenciasInfracoes → Substituído por `NomeCondutor`

---

## ✨ Novos Campos Adicionados

### fat_sinistros (17 campos novos!)

#### 💰 Campos Financeiros:
- ✅ `IndenizacaoSeguradora` (FLOAT) - Valor recebido da seguradora
- ✅ `ReembolsoTerceiro` (FLOAT) - Valor reembolsado por terceiros

#### 📋 Documentação:
- ✅ `BoletimOcorrencia` - Número do BO
- ✅ `ApoliceSeguro` - Número da apólice

#### 👤 Responsável:
- ✅ `Condutor` (NomeCondutor) - Nome do motorista
- ✅ `EmailRequisitante` - Email do solicitante
- ✅ `TelefoneRequisitante` - Telefone do solicitante
- ✅ `MotoristaCulpado` - Se motorista foi culpado (Sim/Não)
- ✅ `ResponsavelCulpado` - Se empresa foi responsável

#### 🔨 Danos Detalhados:
- ✅ `DanosLataria` - Descrição danos de lataria
- ✅ `DanosMotor` - Descrição danos no motor
- ✅ `DanosAcessorios` - Descrição danos em acessórios
- ✅ `DanosOutros` - Outros danos

#### 📍 Geolocalização:
- ✅ `Latitude` - Coordenada GPS
- ✅ `Longitude` - Coordenada GPS
- ✅ `Cidade` - Cidade do sinistro
- ✅ `Estado` - Estado do sinistro

### fat_multas (11 campos novos!)

#### 💰 Campos Financeiros:
- ✅ `ValorDesconto` (ValorInfracaoDesconto) - Valor com desconto para pagamento antecipado

#### 📋 Documentação:
- ✅ `AutoInfracao` - Número do auto de infração
- ✅ `CodigoInfracao` - Código da infração (ex: 75870, 74550)
- ✅ `EstadoOrgaoAutuador` - UF do órgão (SP, DF, etc)

#### ⏰ Prazos Legais:
- ✅ `DataLimiteRecurso` - Data limite para recurso
- ✅ `DataLimitePagamento` - Data limite para pagamento

#### 🔄 Recursos:
- ✅ `EmRecurso` - Se está em recurso (Sim/Não)
- ✅ `MotivoRecurso` - Justificativa do recurso

#### 📍 Geolocalização:
- ✅ `Latitude` - Coordenada GPS
- ✅ `Longitude` - Coordenada GPS
- ✅ `Cidade` - Cidade da infração
- ✅ `Estado` - Estado da infração

---

## 📊 Comparação: ANTES vs DEPOIS

### fat_sinistros

**ANTES** (12 campos):
```sql
IdOcorrencia, Ocorrencia, IdVeiculo, Placa, Modelo, DataSinistro, 
Descricao, TipoSinistro, ValorOrcado, ValorTotal, ValorFranquia, 
SeguradoraResponsavel, NumeroSinistro, Status, ResponsavelSinistro ❌, 
ContratoLocacao, Cliente
```

**DEPOIS** (29 campos):
```sql
IdOcorrencia, Ocorrencia, IdVeiculo, Placa, Modelo, DataSinistro,
Descricao, TipoSinistro, Status, 
-- Valores
ValorOrcado, ValorTotal, ValorFranquia, IndenizacaoSeguradora, ReembolsoTerceiro,
-- Seguro/Docs
SeguradoraResponsavel, NumeroSinistro, BoletimOcorrencia, ApoliceSeguro,
-- Responsável
Condutor, EmailRequisitante, TelefoneRequisitante, MotoristaCulpado, ResponsavelCulpado,
-- Danos
DanosLataria, DanosMotor, DanosAcessorios, DanosOutros,
-- Contexto
ContratoLocacao, Cliente, Latitude, Longitude, Cidade, Estado
```

### fat_multas

**ANTES** (14 campos):
```sql
IdOcorrencia, Ocorrencia, IdVeiculo, Placa, Modelo, DataInfracao,
DescricaoInfracao, OrgaoAutuador, ValorMulta, ValorTotal, Pontuacao,
Status, Enquadramento, ResponsavelMulta ❌, ContratoLocacao, Cliente, Condutor
```

**DEPOIS** (25 campos):
```sql
IdOcorrencia, Ocorrencia, IdVeiculo, Placa, Modelo, DataInfracao,
-- Infração
DescricaoInfracao, CodigoInfracao, AutoInfracao, OrgaoAutuador, EstadoOrgaoAutuador,
-- Valores
ValorMulta, ValorTotal, ValorDesconto, Pontuacao,
-- Status
Status, Enquadramento, Condutor, ContratoLocacao, Cliente,
-- Prazos
DataLimiteRecurso, DataLimitePagamento, EmRecurso, MotivoRecurso,
-- Localização
Latitude, Longitude, Cidade, Estado
```

---

## 🎯 Oportunidades nos Dashboards

### ClaimsDashboard (Sinistros)

#### ✅ Análises Possíveis AGORA:

1. **Mapa de Sinistros**
   ```tsx
   // Usar Latitude/Longitude para plotar sinistros no mapa
   const sinistrosComLocalizacao = sinistros.filter(s => s.Latitude && s.Longitude);
   ```

2. **Análise de Culpa**
   ```tsx
   const culpaMotorista = sinistros.filter(s => s.MotoristaCulpado === 'Sim').length;
   const culpaEmpresa = sinistros.filter(s => s.ResponsavelCulpado === 'Sim').length;
   const percentualCulpaMotorista = (culpaMotorista / total) * 100;
   ```

3. **Análise Financeira Completa**
   ```tsx
   const totalSinistros = sinistros.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
   const totalIndenizacao = sinistros.reduce((s, r) => s + parseCurrency(r.IndenizacaoSeguradora), 0);
   const totalReembolso = sinistros.reduce((s, r) => s + parseCurrency(r.ReembolsoTerceiro), 0);
   const custoLiquidoEmpresa = totalSinistros - totalIndenizacao - totalReembolso;
   ```

4. **Análise de Danos**
   ```tsx
   const comDanosMotor = sinistros.filter(s => s.DanosMotor).length;
   const comDanosLataria = sinistros.filter(s => s.DanosLataria).length;
   const percentualDanosGraves = (comDanosMotor / total) * 100;
   ```

5. **BI Sinistros com BO**
   ```tsx
   const comBO = sinistros.filter(s => s.BoletimOcorrencia).length;
   const percentualComBO = (comBO / total) * 100;
   ```

---

### InfractionsDashboard (Multas)

#### ✅ Análises Possíveis AGORA:

1. **Mapa de Infrações (Heatmap)**
   ```tsx
   // Usar Latitude/Longitude para heatmap de áreas com mais multas
   const multasComLocalizacao = multas.filter(m => m.Latitude && m.Longitude);
   ```

2. **Análise de Descontos**
   ```tsx
   const totalSemDesconto = multas.reduce((s, m) => s + parseCurrency(m.ValorMulta), 0);
   const totalComDesconto = multas.reduce((s, m) => s + parseCurrency(m.ValorDesconto), 0);
   const economiaDesconto = totalSemDesconto - totalComDesconto;
   ```

3. **Análise de Recursos**
   ```tsx
   const emRecurso = multas.filter(m => m.EmRecurso === 'Sim').length;
   const percentualRecursos = (emRecurso / total) * 100;
   ```

4. **Análise de Prazos**
   ```tsx
   const hoje = new Date();
   const proximasVencer = multas.filter(m => {
     const prazo = new Date(m.DataLimitePagamento);
     const diasRestantes = (prazo - hoje) / (1000 * 60 * 60 * 24);
     return diasRestantes > 0 && diasRestantes <= 7;
   }).length;
   ```

5. **Top Infrações por Código**
   ```tsx
   const infracoesPorCodigo = multas.reduce((map, m) => {
     const desc = `${m.CodigoInfracao} - ${m.DescricaoInfracao}`;
     map[desc] = (map[desc] || 0) + 1;
     return map;
   }, {});
   ```

6. **Análise por Órgão Autuador**
   ```tsx
   const porOrgao = multas.reduce((map, m) => {
     const key = `${m.OrgaoAutuador} (${m.EstadoOrgaoAutuador})`;
     map[key] = (map[key] || 0) + 1;
     return map;
   }, {});
   ```

---

### CustomerAnalytics (360° Cliente)

#### ✅ Análises Possíveis AGORA:

1. **Perfil de Risco por Cliente**
   ```tsx
   const riscoCulpa = (sinistrosCliente.filter(s => s.MotoristaCulpado === 'Sim').length / sinistrosCliente.length) * 100;
   const riscoMultas = (multasCliente.length / veiculosLocados) * 100;
   const scoreRisco = (riscoCulpa * 0.6 + riscoMultas * 0.4).toFixed(1);
   ```

2. **Mapa de Ocorrências do Cliente**
   ```tsx
   const localizacoes = [
     ...sinistrosCliente.filter(s => s.Latitude).map(s => ({ lat: s.Latitude, lng: s.Longitude, tipo: 'Sinistro' })),
     ...multasCliente.filter(m => m.Latitude).map(m => ({ lat: m.Latitude, lng: m.Longitude, tipo: 'Multa' }))
   ];
   ```

3. **Análise de Recuperação de Custos**
   ```tsx
   const custoSinistros = sinistrosCliente.reduce((s, si) => s + parseCurrency(si.ValorTotal), 0);
   const indenizacoes = sinistrosCliente.reduce((s, si) => s + parseCurrency(si.IndenizacaoSeguradora), 0);
   const taxaRecuperacao = custoSinistros > 0 ? (indenizacoes / custoSinistros) * 100 : 0;
   ```

---

## 🚀 Componentes React para Implementar

### 1. SinistrosMapView.tsx
```tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

const sinistrosComGPS = sinistros.filter(s => s.Latitude && s.Longitude);

<MapContainer center={[-15.7975, -47.8919]} zoom={5}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {sinistrosComGPS.map(s => (
    <Marker key={s.IdOcorrencia} position={[s.Latitude, s.Longitude]}>
      <Popup>
        <strong>{s.Placa}</strong><br/>
        {s.Descricao}<br/>
        R$ {formatCurrency(s.ValorTotal)}
      </Popup>
    </Marker>
  ))}
</MapContainer>
```

### 2. MultasHeatmap.tsx
```tsx
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3';

const pontosCalor = multas
  .filter(m => m.Latitude && m.Longitude)
  .map(m => [m.Latitude, m.Longitude, m.Pontuacao / 7]); // Normalizar pontos

<HeatmapLayer points={pontosCalor} radius={20} blur={15} maxZoom={18} />
```

### 3. SinistrosCulpaChart.tsx
```tsx
const culpaData = [
  { name: 'Motorista Culpado', value: culpaMotorista, color: '#ef4444' },
  { name: 'Empresa Responsável', value: culpaEmpresa, color: '#f59e0b' },
  { name: 'Terceiros', value: total - culpaMotorista - culpaEmpresa, color: '#10b981' }
];

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie data={culpaData} dataKey="value" nameKey="name" cx="50%" cy="50%" />
  </PieChart>
</ResponsiveContainer>
```

### 4. MultasDescontoAlert.tsx
```tsx
const multasComDesconto = multas.filter(m => {
  const hoje = new Date();
  const prazo = new Date(m.DataLimitePagamento);
  const diasRestantes = (prazo - hoje) / (1000 * 60 * 60 * 24);
  return diasRestantes > 0 && diasRestantes <= 7 && m.ValorDesconto < m.ValorMulta;
});

{multasComDesconto.length > 0 && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Atenção: Descontos Expirando!</AlertTitle>
    <AlertDescription>
      {multasComDesconto.length} multas com desconto disponível por até 7 dias.
      Economia potencial: R$ {formatCurrency(multasComDesconto.reduce((s, m) => s + (m.ValorMulta - m.ValorDesconto), 0))}
    </AlertDescription>
  </Alert>
)}
```

---

## 📋 Checklist de Implementação

### Fase 1 - Re-executar ETL ✅
- [x] Corrigir queries com campos inexistentes
- [x] Adicionar novos campos úteis
- [ ] **RE-EXECUTAR: `node run-sync-v2.js`**
- [ ] Validar arquivos gerados (fat_sinistros_*.json, fat_multas_*.json)

### Fase 2 - ClaimsDashboard
- [ ] Adicionar mapa de sinistros (Leaflet/MapBox)
- [ ] Adicionar análise de culpa (PieChart)
- [ ] Adicionar análise financeira com indenizações
- [ ] Adicionar filtro por tipo de dano
- [ ] Adicionar badge "Com BO" / "Sem BO"

### Fase 3 - InfractionsDashboard
- [ ] Adicionar heatmap de infrações
- [ ] Adicionar análise de descontos
- [ ] Adicionar alerta de prazos vencendo
- [ ] Adicionar análise de recursos
- [ ] Adicionar top infrações por código
- [ ] Adicionar filtro por órgão autuador

### Fase 4 - CustomerAnalytics
- [ ] Adicionar mapa combinado (sinistros + multas)
- [ ] Adicionar score de risco por cliente
- [ ] Adicionar análise de recuperação de custos
- [ ] Adicionar timeline de ocorrências

### Fase 5 - Dependências
- [ ] Instalar `react-leaflet` para mapas
- [ ] Instalar `react-leaflet-heatmap-layer-v3` para heatmaps
- [ ] Configurar `leaflet.css` no projeto

---

## 📊 Impacto Esperado

| Dashboard | Novos Insights | Prioridade |
|-----------|----------------|------------|
| **ClaimsDashboard** | Mapas, Culpa, Custos Líquidos | 🔴 ALTA |
| **InfractionsDashboard** | Heatmap, Descontos, Prazos | 🔴 ALTA |
| **CustomerAnalytics** | Risco 360°, Mapas Combinados | 🟡 MÉDIA |
| **ExecutiveDashboard** | Métricas de Segurança | 🟢 BAIXA |

---

## ✅ Status

**Correções**: ✅ APLICADAS  
**Campos Adicionados**: ✅ 28 NOVOS CAMPOS  
**Próxima Ação**: Re-executar ETL

**Arquivos Modificados**:
- ✅ [scripts/local-etl/run-sync-v2.js](scripts/local-etl/run-sync-v2.js#L535-L560)

**Documentação**:
- ✅ docs/NOVOS_CAMPOS_SINISTROS_MULTAS.md (este arquivo)
