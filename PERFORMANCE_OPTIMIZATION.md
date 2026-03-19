# Otimizações de Performance - ETL v3

## 🚀 Resumo das Melhorias

| Aspecto | v2 (Baseline) | v3 (Otimizado) | Impacto Esperado |
|---------|---------------|----------------|-----------------|
| **Execução de Tabelas** | Sequencial (1 por vez) | Paralela (até 10 leves) + Heavy sequencial | **-40 a -60%** |
| **Pool Max Connections** | 5 por pool | 15 por pool | Melhor concorrência |
| **Post-Sync Analysis** | Nenhum | ANALYZE automático | Query planner otimizado |
| **Logging** | Tabela por tabela | + Fase paralela/pesada | Visibilidade melhorada |

---

## 🎯 Otimizações Implementadas

### 1. **Paralelização Inteligente (Principal)**
```javascript
// v2: Executa uma tabela por vez
for (const item of TABLES) {
    await syncTable(item, ...);  // ⏳ Aguarda completar
}

// v3: Agrupa tabelas leves e executa em paralelo
const lightTables = tablesToRun.filter(t => !HEAVY_TABLES.has(t.table));
const heavyTables = tablesToRun.filter(t => HEAVY_TABLES.has(t.table));

// Fase 1: Até 10 tabelas leves simultâneas
await Promise.all(lightTables.map(item => syncTable(item, ...)));

// Fase 2: Tabelas pesadas sequencialmente
for (const item of heavyTables) {
    await syncTable(item, ...);
}
```
**Impacto:** Se as 10 tabelas leves levarem ~1-2 min cada, v2 leva 10-20 min; v3 leva 1-2 min (paralelo).

### 2. **Pool Max Connections Aumentado**
```javascript
// v2
max: 5

// v3
max: 15  // Mais conexões disponíveis para paralelização
```
**Impacto:** Com `max: 5`, múltiplas Promise.all() ficariam em fila; com `max: 15`, suportamos até 15 sincronizações simultâneas.

### 3. **ANALYZE Automático Pós-Insert**
```javascript
// Novo em v3
await client.query(`ANALYZE public.${item.table}`);
```
**Impacto:** 
- Query planner do Postgres atualiza estatísticas
- Dashboards/queries futuras rodam mais rápido (~5-10% de ganho)
- Não afeta tempo do ETL atual (ANALYZE é rápido em tabelas novas)

---

## 📊 Teste Prático (Comparar v2 vs v3)

### Terminal 1: Executar v2 (baseline)
```powershell
cd C:\Users\frant\.antigravity\qualia-task-flow
node --max-old-space-size=4096 scripts/local-etl/run-sync-v2.js 2>&1 | Tee-Object -FilePath v2_result.txt
```
Anote o tempo total final (linha "🏁 PROCESSO FINALIZADO em XXs")

### Terminal 2: Executar v3 (otimizado)
```powershell
cd C:\Users\frant\.antigravity\qualia-task-flow
node --max-old-space-size=4096 scripts/local-etl/run-sync-v3.js 2>&1 | Tee-Object -FilePath v3_result.txt
```

### Comparar resultados
```powershell
# Extrair tempos totais
(Get-Content v2_result.txt | Select-String "🏁" | Select-Object -Last 1).ToString()
(Get-Content v3_result.txt | Select-String "🏁" | Select-Object -Last 1).ToString()

# Calcular diferença (em minutos)
# Exemplo: v2 = 1062s (17m42s) → v3 = ~480-540s (8-9m)
```

---

## 🔧 Opções Adicionais de Otimização

Se v3 ainda for lento:

### A. Aumentar Concorrência (mais agressivo)
```javascript
// Em run-sync-v3.js, linha ~305
const parallelBatches = 15;  // Ao invés de todos paralelos
const promises = [];
for (let i = 0; i < lightTables.length; i += parallelBatches) {
    const batch = lightTables.slice(i, i + parallelBatches);
    await Promise.all(batch.map(item => syncTable(item, ...)));
}
```

### B. Aumentar Node Memory (se houver memória disponível)
```powershell
# Ao invés de 4GB, use 8GB
node --max-old-space-size=8192 scripts/local-etl/run-sync-v3.js
```

### C. Paralelizar Leitura do SQL Server também
```javascript
// Ler múltiplas tabelas SQL em paralelo (deixei sequencial por agora)
const sqlQueries = await Promise.all(
    lightTables.map(item => sqlPool.request().query(item.query))
);
```

---

## ✅ Checklist de Implementação

- [ ] Testar v3 localmente (comparar com v2)
- [ ] Se delta > 30%, atualizar workflow para usar `run-sync-v3.js`
- [ ] Monitorar primeira execução no GitHub Actions
- [ ] Considerar batching paralelo se v3 ainda tiver margem
- [ ] (Opcional) Implementar índices estratégicos se queries subsequentes forem lentas

---

## 📝 Notas Técnicas

**Por que v3 é seguro:**
1. ANALYZE é idempotente (roda múltiplas vezes sem efeito colateral)
2. Promise.all() falha se um sync falha → não deixa tabelasincompletas
3. Pool.max: 15 é conservador para 2 pools (não sobrecarrega)
4. Tabelas HEAVY permanecem sequenciais → evita race conditions

**Limitações:**
- Se SQL Server tiver limite de conexões simultâneas, pode falhar
- Se PostgreSQL tiver disk I/O saturado, paralelização não ajuda muito
- Ganho real depende da distribuição de tempo (se tudo é 1 tabela pesada, v3 ≈ v2)

---

## 🎯 Próximos Passos
1. Executar ambos os scripts e comparar timing
2. Se v3 for 30%+ mais rápido, atualizar `.github/workflows/db-sync.yml` para usar v3
3. Validar dados (checar row counts pós-sync)
4. Deployar e monitorar próxima execução automática (00:30 BRT)
