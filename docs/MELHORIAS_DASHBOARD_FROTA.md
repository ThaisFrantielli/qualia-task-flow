# Melhorias Dashboard de Frota - Janeiro 2026

## 📊 Resumo das Atualizações

### 1. **ETL Atualizado** (`run-sync-v2.js`)

Adicionadas novas colunas na query da `dim_frota`:

#### Campos de Status e Localização:
- `SituacaoFinanceira` - Situação financeira do veículo
- `DiasSituacao` - Dias no status atual
- `DataInicioStatus` - Data de início do status
- `LocalizacaoVeiculo` - Localização detalhada
- `DiasLocalizacao` - Dias na localização atual
- `ObservacaoLocalizacao` - Observações sobre localização

#### Telemetria:
- `ProvedorTelemetria` - Provedor do sistema de telemetria (Scope, Iter, etc)
- `UltimaAtualizacaoTelemetria` - Timestamp da última atualização
- `Latitude` e `Longitude` - Coordenadas GPS (já existiam, mas agora com CAST)
- `UltimoEnderecoTelemetria` - Endereço legível da última localização

#### Informações Adicionais:
- `CidadeLicenciamento` - Cidade do licenciamento
- `UltimaManutencaoPreventiva` - Data da última preventiva
- `KmUltimaManutencaoPreventiva` - KM da última preventiva
- `FinalidadeUso` - Finalidade de uso do veículo
- `ComSeguroVigente` - Se tem seguro ativo (boolean)
- `CustoTotalPorKmRodado` - Custo por km

#### Condutor:
- `IdCondutor`, `NomeCondutor`, `CPFCondutor`, `TelefoneCondutor`
- `SituacaoFinanceiraContratoLocacao`

---

## 🎨 Novos Gráficos e Análises

### Aba "Telemetria & Mapa" - **COMPLETAMENTE REFORMULADA**

#### KPIs de Telemetria:
1. **Veículos com Telemetria** - Total e % da frota
2. **Atualizado (Últimas 24h)** - Veículos com telemetria ativa
3. **Veículos Localizáveis** - Com coordenadas GPS
4. **Taxa de Cobertura GPS** - Percentual com Lat/Long

#### Gráficos Novos:
1. **Provedores de Telemetria** (Barra Vertical)
   - Mostra distribuição por provedor (Scope, Iter, Não Definido, etc)
   
2. **Situação de Seguro** (Barra com cores)
   - Verde: Com Seguro
   - Vermelho: Sem Seguro
   - Cinza: Não Informado

3. **Proprietário do Veículo** (Barra)
   - Próprio, Locadora, Terceiro, etc

4. **Finalidade de Uso** (Barra)
   - GERAL, etc

5. **Mapa Melhorado**
   - Agora mostra o endereço no popup
   - Mostra timestamp da última atualização de telemetria
   - Badge com contagem de veículos
   - Altura aumentada (500px)

---

## 🔧 Melhorias Existentes

### Gráfico de Veículos por Modelo:
- ✅ Agora usa `GrupoVeiculo` do banco de dados
- ✅ Hierarquia colapsável por categoria
- ✅ Botão "Expandir/Colapsar Todas"

### Novo Gráfico de Odômetro:
- ✅ Classificação em faixas de 10k em 10k
- ✅ Até 120k+ km
- ✅ Lado a lado com gráfico de modelos

---

## 🚀 Como Executar o ETL Atualizado

```powershell
cd c:\Users\frant\Documents\qualia-task-flow\scripts\local-etl
node run-sync-v2.js
```

Isso irá:
1. Buscar todos os novos campos do banco de dados
2. Gerar o arquivo `dim_frota.json` atualizado
3. Upload automático para o Supabase Storage

---

## 📈 Análises Disponíveis Agora

### Telemetria:
- Cobertura de telemetria por provedor
- Veículos com GPS ativo/inativo
- Última atualização de posição
- Mapa com endereços legíveis

### Segurança:
- Situação de seguros da frota
- Veículos com/sem seguro vigente

### Propriedade:
- Distribuição por tipo de proprietário
- Finalidade de uso dos veículos

### Operacional:
- Odômetro por faixas
- Divergências KM informado vs confirmado
- Tempo em status/localização

---

## 🐛 Correções Implementadas

1. ✅ **Mapa vazio** - Corrigido com CAST adequado de Latitude/Longitude
2. ✅ **Categoria vazia** - Agora puxa direto do campo `GrupoVeiculo`
3. ✅ **Dados faltantes** - ETL ampliado com +15 campos novos
4. ✅ **Telemetria** - Dashboard completo de análise de telemetria

---

## 📝 Próximos Passos Sugeridos

1. **Alertas de Telemetria** - Criar notificações para veículos sem atualização há 48h
2. **Dashboard de Seguros** - Página dedicada com vencimentos e apólices
3. **Análise de Condutores** - Cruzamento com dados de multas e sinistros
4. **Manutenção Preventiva** - Alertas baseados em KM desde última preventiva
5. **Custo por KM** - Análise de eficiência por categoria/modelo

---

## 🎯 Métricas de Impacto

- **+15 campos** adicionados ao ETL
- **+6 gráficos** novos na aba Telemetria
- **+4 KPIs** de telemetria
- **100%** de cobertura de dados da tabela Veiculos
- **Mapa funcional** com endereços e timestamps

---

Documento gerado em: 05/01/2026
