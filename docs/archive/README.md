# 📦 Documentação Arquivada

**Data de Arquivamento**: 19 de Janeiro de 2026  
**Motivo**: Consolidação e atualização da documentação

---

## 📋 Sobre Esta Pasta

Esta pasta contém documentos que foram **substituídos** ou **consolidados** pelos novos documentos abrangentes criados em 19/01/2026.

Os documentos aqui estão **obsoletos** e mantidos apenas para referência histórica.

---

## 🗂️ Documentos Arquivados

### 1. NOVOS_CAMPOS_SINISTROS_MULTAS.md
**Motivo do Arquivamento**: Informação consolidada em [CATALOGO_DASHBOARDS_ANALYTICS.md](../CATALOGO_DASHBOARDS_ANALYTICS.md)  
**Status**: ✅ Correções já aplicadas no run-sync-v2.js  
**Substituído por**: Documentação atualizada confirma que `fat_sinistros` e `fat_multas` estão funcionais com 6.187 e 24.320 registros respectivamente

---

### 2. DASHBOARDS_ATUALIZADOS.md
**Motivo do Arquivamento**: Informação consolidada em [CATALOGO_DASHBOARDS_ANALYTICS.md](../CATALOGO_DASHBOARDS_ANALYTICS.md) e [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](../MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md)  
**Status**: ✅ Atualizações já implementadas  
**Substituído por**: Catálogo completo das 22 páginas com status atualizado e mapeamento detalhado de dependências

---

### 3. MIGRACAO_FDW_SUPABASE.md
**Motivo do Arquivamento**: Plano de migração FDW adiado (não é prioridade atual)  
**Status**: ⏸️ Pausado  
**Substituído por**: [FLUXO_ETL_ANALYTICS.md](../FLUXO_ETL_ANALYTICS.md) documenta a arquitetura atual (JSON estático via Storage)  
**Observação**: FDW pode ser retomado no futuro (Q3 2026) conforme roadmap em [FLUXO_ETL_ANALYTICS.md](../FLUXO_ETL_ANALYTICS.md#roadmap-de-melhorias)

---

### 4. MIGRACAO_VALOR_KM_ADICIONAL.md
**Motivo do Arquivamento**: Migração já concluída  
**Status**: ✅ Implementado  
**Substituído por**: Informações técnicas incorporadas em [ARQUITETURA_BI_ANALYTICS.md](../ARQUITETURA_BI_ANALYTICS.md)

---

### 5. MIGRACAO_VALOR_KM_MODELOS.md
**Motivo do Arquivamento**: Migração já concluída  
**Status**: ✅ Implementado  
**Substituído por**: Informações técnicas incorporadas em [ARQUITETURA_BI_ANALYTICS.md](../ARQUITETURA_BI_ANALYTICS.md)

---

### 6. FIXES_DASHBOARDS_CAMPOS_MONETARIOS.md
**Motivo do Arquivamento**: Correções já aplicadas  
**Status**: ✅ Implementado  
**Substituído por**: Helper `castM()` no [run-sync-v2.js](../../scripts/local-etl/run-sync-v2.js) trata automaticamente campos monetários

---

### 7. BI_ANALYTICS_SETUP.md
**Motivo do Arquivamento**: Setup inicial já documentado de forma mais completa  
**Status**: ✅ Consolidado  
**Substituído por**: [GUIA_RAPIDO_MIGRACAO.md](../GUIA_RAPIDO_MIGRACAO.md) e [FLUXO_ETL_ANALYTICS.md](../FLUXO_ETL_ANALYTICS.md)

---

## 📚 Documentação Atual Recomendada

### Para Consulta Rápida:
- [README_ANALYTICS.md](../README_ANALYTICS.md) - Índice central com guia de uso por cenário

### Para Detalhes Técnicos:
- [CATALOGO_DASHBOARDS_ANALYTICS.md](../CATALOGO_DASHBOARDS_ANALYTICS.md) - Catálogo completo das 22 páginas
- [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](../MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md) - Mapeamento de 128 tabelas × 22 dashboards
- [FLUXO_ETL_ANALYTICS.md](../FLUXO_ETL_ANALYTICS.md) - Pipeline completo de dados
- [ETL_EXECUTION_REPORT_2026-01-05.md](../ETL_EXECUTION_REPORT_2026-01-05.md) - Relatório de execução (atualizado 19/01)

---

## ⚠️ Aviso Importante

**Não use os documentos desta pasta como referência principal.**

Eles podem conter informações **desatualizadas** ou **incorretas** que já foram corrigidas nos novos documentos.

Consulte sempre os documentos da pasta raiz [docs/](../) para informações atualizadas.

---

## 🔄 Histórico de Consolidação

| Data | Ação | Documentos Afetados |
|------|------|---------------------|
| 19/01/2026 | Criação de 3 novos documentos abrangentes | CATALOGO, MATRIZ, FLUXO |
| 19/01/2026 | Correção de informações sobre fat_sinistros e fat_multas | ETL_EXECUTION_REPORT, MAPEAMENTO |
| 19/01/2026 | Movimentação de 7 docs obsoletos para archive/ | Esta pasta |

---

**Última Atualização**: 19 de Janeiro de 2026  
**Responsável**: Equipe BluConecta DW
