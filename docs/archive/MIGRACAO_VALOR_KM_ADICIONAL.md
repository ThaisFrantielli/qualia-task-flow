# Migração: Valor KM Adicional - Pacotes → Modelos

## 📋 Resumo das Alterações

O campo **Valor KM Adicional** foi movido de `km_packages` para `modelos_veiculos`, pois cada modelo de veículo deve ter seu próprio valor de KM adicional, independente do pacote escolhido.

## 🎯 Objetivo

- ✅ Mover campo `valor_km_adicional` de Pacotes de KM para Modelos de Veículos
- ✅ Criar integração com DW BluFleet para popular automaticamente os modelos
- ✅ Garantir IDs únicos para evitar duplicação de modelos

---

## 📁 Arquivos Alterados

### 1. **Migração SQL**
📄 `supabase/migrations/20250102_move_valor_km_adicional_to_modelos.sql`
- Adiciona coluna `valor_km_adicional` em `modelos_veiculos` (padrão: R$ 0,70)
- Remove coluna `valor_km_adicional` de `km_packages`

### 2. **Script de Importação**
📄 `scripts/populate-modelos-from-dw.js`
- Conecta no DW BluFleet (SQL Server)
- Busca veículos com status `Disponível` ou `Em Andamento`
- Extrai modelos únicos (Montadora + Modelo + Ano)
- Insere automaticamente na tabela `modelos_veiculos`
- **Evita duplicação** verificando modelos já existentes

### 3. **Tipos TypeScript**
📄 `src/types/modelos.ts`
- Atualizado comentário do campo `valor_km_adicional`

📄 `src/hooks/useKmPackages.ts`
- Removido campo `valor_km_adicional` da interface `KmPackage`

### 4. **Componentes React**
📄 `src/components/precificacao/PacotesKmTab.tsx`
- ❌ Removido campo "Valor KM Adicional" do formulário
- ❌ Removida coluna da tabela
- Ajustado `colspan` para 6 colunas

📄 `src/components/precificacao/ModelosVeiculosTab.tsx`
- ✅ Adicionado campo "Valor KM Adicional (R$/km)" no formulário
- ✅ Adicionada coluna "R$/KM Adic." na tabela
- ✅ Adicionado botão "Importar do DW" para popular modelos
- Ajustado `colspan` para 10 colunas
- Valor padrão: **R$ 0,70/km**

---

## 🚀 Como Usar

### 1️⃣ Executar Migração SQL
```bash
# A migração será aplicada automaticamente na próxima sincronização do Supabase
# Ou execute manualmente:
psql -h <host> -U <user> -d <database> -f supabase/migrations/20250102_move_valor_km_adicional_to_modelos.sql
```

### 2️⃣ Importar Modelos do DW
```bash
# Certifique-se de que as credenciais do DW estão no .env
cd scripts
node populate-modelos-from-dw.js
```

**Dependências necessárias:**
```bash
npm install mssql @supabase/supabase-js
```

### 3️⃣ Usar a Interface

#### **Cadastro de Pacotes de KM**
- Apenas define: **Nome**, **Descrição**, **KM Mensal**, **Ordem**
- ❌ Não tem mais "Valor KM Adicional"

#### **Cadastro de Modelos de Veículos**
- Agora inclui: **Valor KM Adicional (R$/km)**
- Cada modelo pode ter um valor diferente
- Exemplo: 
  - VW Gol → R$ 0,65/km
  - Toyota Corolla → R$ 0,85/km
  - Ford Ranger → R$ 1,20/km

---

## 🔍 Lógica de IDs Únicos

O script usa hash SHA-256 para gerar IDs únicos:
```javascript
function generateUniqueModelId(montadora, modelo, ano) {
  const input = `${montadora.toLowerCase().trim()}-${modelo.toLowerCase().trim()}-${ano}`;
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 32);
}
```

**Exemplo:**
- `volkswagen-gol-2024` → `a3f8c9e1...` (32 caracteres)
- Mesmo modelo não será duplicado

---

## 📊 Estrutura do DW

O script busca dados da tabela `dbo.Veiculos`:
```sql
SELECT DISTINCT
  MARCA as montadora,
  MODELO as modelo,
  ANO_MODELO as ano_modelo,
  TIPO as tipo,
  COUNT(*) as quantidade
FROM dbo.Veiculos
WHERE STATUS IN ('Disponível', 'Em Andamento')
  AND MARCA IS NOT NULL
  AND MODELO IS NOT NULL
  AND ANO_MODELO IS NOT NULL
GROUP BY MARCA, MODELO, ANO_MODELO, TIPO
```

---

## ⚠️ Observações Importantes

1. **Valores padrão**: Modelos importados do DW terão:
   - `preco_publico = 0` (deve ser preenchido manualmente)
   - `valor_km_adicional = 0.70` (pode ser ajustado)
   - `consumo_medio = 12.0` (pode ser ajustado)

2. **Categorização automática**: O script tenta categorizar veículos:
   - Pickup, SUV, Van, Utilitário, Sedan, Hatch (padrão)

3. **Normalização de montadoras**:
   - VW → Volkswagen
   - GM → Chevrolet
   - FIAT → Fiat

4. **Duplicação**: O script verifica modelos existentes e pula duplicatas

---

## 🎨 Interface Atualizada

### Pacotes de KM
| Ordem | Nome | Descrição | KM/Mês | Status | Ações |
|-------|------|-----------|--------|--------|-------|
| 1 | 3.000 KM/mês | Econômico | 3.000 | Ativo | ✏️ 🗑️ |

### Modelos de Veículos
| Montadora | Modelo | Ano | Categoria | Preço | Desconto | Valor Final | **R$/KM Adic.** | Status | Ações |
|-----------|--------|-----|-----------|-------|----------|-------------|----------------|--------|-------|
| Volkswagen | Gol | 2024 | Hatch | R$ 75.000 | 5% | R$ 71.250 | **R$ 0,65** | Ativo | ✏️ 🗑️ |

---

## ✅ Checklist de Validação

- [x] Migração SQL criada
- [x] Script de importação do DW criado
- [x] Tipos TypeScript atualizados
- [x] Componente PacotesKmTab atualizado (campo removido)
- [x] Componente ModelosVeiculosTab atualizado (campo adicionado)
- [x] Botão "Importar do DW" implementado
- [x] Lógica de ID único implementada
- [x] Validação contra duplicatas
- [x] Documentação completa

---

## 🐛 Troubleshooting

### Script de importação falha
```bash
# Verifique as credenciais no .env
SQL_SERVER=200.219.192.34
SQL_USER=qualidade
SQL_PASSWORD=AWJ5A95cD5fW
SQL_DATABASE=blufleet-dw
```

### Modelos duplicados
O script automaticamente pula duplicatas. Se precisar reprocessar:
```sql
-- Limpar tabela (cuidado!)
DELETE FROM public.modelos_veiculos WHERE preco_publico = 0;
```

---

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- Logs do script: `node scripts/populate-modelos-from-dw.js`
- Erros SQL: Verifique migrations no Supabase
- Console do navegador: F12 → Console

---

**Data da mudança:** 02/01/2025  
**Autor:** Sistema de BI Conecta
