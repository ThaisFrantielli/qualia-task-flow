# Instruções para Simplificação do ETL (run-sync-v2.js)

## ⚠️ Importante
Um backup completo foi criado em: `scripts/local-etl/run-sync-v2.js.backup`

---

## 📋 Modificações Necessárias no ETL

### 1. DIMENSÕES (Linha ~105-440)

**MANTER apenas estas 4:**
```javascript
- dim_frota (linha ~210-340)
- dim_movimentacao_patios (linha ~412)
- dim_movimentacao_veiculos (linha ~422)
- dim_contratos_locacao (linha ~364)
```

**REMOVER (8 dimensões):**
```javascript
- dim_alienacoes (linha ~107)
- dim_clientes (linha ~148)
- dim_condutores (linha ~202)
- dim_fornecedores (linha ~206)
- dim_veiculos_acessorios (linha ~341)
- dim_itens_contrato (linha ~404)
- dim_regras_contrato (linha ~408)
- dim_compras (linha ~738)
```

---

### 2. CONSOLIDADOS (Linha ~440-1290)

**MANTER apenas estes 3:**
```javascript
- hist_vida_veiculo_timeline (linha ~458)
- fat_carro_reserva (linha ~776)
- fat_manutencao_unificado (linha ~859)
- fat_movimentacao_ocorrencias (linha ~1022)
```

**REMOVER (12 consolidados):**
```javascript
- fat_historico_mobilizacao (linha ~444)
- rentabilidade_360_geral (linha ~448)
- fat_churn (linha ~641)
- fat_inadimplencia (linha ~703)agg_dre_mensal (linha ~707)
- fato_financeiro_dre (linha ~710)
- auditoria_consolidada (linha ~760)
- agg_kpis_manutencao_mensal (linha ~963)
- agg_lead_time_etapas (linha ~1068)
- agg_funil_conversao (linha ~1118)
- agg_performance_usuarios (linha ~1141)
- agg_rentabilidade_contratos_mensal (linha ~1173)
- agg_custos_detalhados (linha ~1269)
```

---

### 3. FATOS ANUAIS (Linha ~1615-1850)

Dentro da função `runMasterETL()`, na seção que define `factDefs`:

**MANTER apenas estes 2:**
```javascript
{table: 'fat_sinistros', queryGen: (year) => ...} (linha ~1657)
{table: 'fat_multas', queryGen: (year) => ...} (linha ~1777)
```

**REMOVER (5 fatos anuais):**
```javascript
{table: 'fat_faturamentos', ...} (linha ~1618)
{table: 'fat_detalhe_itens_os', ...} (linha ~1622)
{table: 'fat_ocorrencias_master', ...} (linha ~1626)
{table: 'fat_propostas_blufleet', ...} (linha ~1803)
{table: 'fat_vendas', ...} (linha ~1850)
```

---

### 4. FACTS MENSAIS (Linha ~1877-1888)

**REMOVER COMPLETAMENTE**:
```javascript
- Função buildFinanceUniversalQuery() (linha ~1556-1592)
- Todo o bloco FASE 3 que processa fat_financeiro_universal (linha ~1977-2000)
- Variável runFinance (mudar para sempre false ou remover)
```

---

## 🔧 Como Aplicar as Modificações

### Opção 1: Manual (Recomendado para entender as mudanças)
1. Abra `scripts/local-etl/run-sync-v2.js`
2. Remova cada seção listada acima seguindo os números de linha
3. Teste o ETL: `node scripts/local-etl/run-sync-v2.js --only=dim_frota`
4. Se funcionar, execute completo: `node scripts/local-etl/run-sync-v2.js`

### Opção 2: Comentar ao invés de Remover (Mais Seguro)
1. Envolva cada tabela removível com comentários:
```javascript
/*
{
    table: 'dim_alienacoes',
    query: `...`
},
*/
```

2. Teste progressivamente habilitando/desabilitando

---

## ✅ Validação Pós-Modificação

Execute estes comandos para validar:

```powershell
# 1. Verificar sintaxe do arquivo
node --check scripts/local-etl/run-sync-v2.js# 2. Executar apenas uma tabela para teste
node scripts/local-etl/run-sync-v2.js --only=dim_frota

# 3. Verificar se não há erros
# Esperado: "✅ PROCESSO CONCLUÍDO COM SUCESSO!"

# 4. Executar ETL completo simplificado
node scripts/local-etl/run-sync-v2.js

# 5. Verificar arquivos gerados
Get-ChildItem "scripts/local-etl/public/data" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-10) }
```

---

## 📊 Resultado Esperado

### Antes
- Tempo de execução: ~97 segundos
- Tabelas processadas: ~128
- Uploads Supabase: 129 arquivos JSON

### Depois
- Tempo de execução: ~15-20 segundos (-80%)
- Tabelas processadas: ~17 (-87%)
- Uploads Supabase: 17 arquivos JSON (-87%)

---

## 🚨 Troubleshooting

### Erro: "Column not found"
→ Verifique se alguma tabela mantida depende de tabelas removidas via JOINs

### Erro: "Table already exists"
→ Limpe o PostgreSQL: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`

### Erro: "Upload failed"
→ Verifique se a Edge Function `sync-dw-to-storage` está ativa no Supabase

---

## 🔄 Rollback

Para voltar ao estado original:
```powershell
Copy-Item "scripts\local-etl\run-sync-v2.js.backup" "scripts\local-etl\run-sync-v2.js" -Force
```

---

**Criado em**: 10 de Fevereiro de 2026  
**Status**: Documentação completa | Aguardando aplicação manual das modificações
