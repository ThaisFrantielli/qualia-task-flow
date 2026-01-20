# 🚗 Migração: Campo Valor KM Adicional para Modelos de Veículos

## 📋 Resumo das Mudanças

Este documento descreve as mudanças realizadas para mover o campo **Valor KM Adicional** da tabela de **Pacotes de KM** para a tabela de **Modelos de Veículos**, conforme solicitado.

---

## ✅ Alterações Implementadas

### 1. **Banco de Dados** 

#### Migration: `20250102_add_valor_km_adicional_to_modelos.sql`

- ✅ Adicionado campo `valor_km_adicional` à tabela `modelos_veiculos`
- ✅ Criado índice único para campo `codigo` (evita duplicação de modelos)
- ✅ Índice para modelos ativos
- ✅ Valores padrão baseados na categoria do veículo:
  - Hatch/Compacto: R$ 0,80/km
  - Sedan/SUV: R$ 0,70/km
  - Pickup/Van/Utilitário: R$ 0,60/km
  - Executivo: R$ 0,50/km

### 2. **Types TypeScript**

#### Arquivo: `src/types/modelos.ts`

- ✅ Adicionado campo `valor_km_adicional?: number` à interface `ModeloVeiculo`

### 3. **Componentes React**

#### A. Formulário de Modelo (`src/components/modelos/ModeloVeiculoForm.tsx`)

- ✅ Adicionado campo no schema Zod
- ✅ Campo no formulário para editar valor KM adicional
- ✅ Valor padrão: R$ 0,75/km
- ✅ Persistência no banco ao salvar modelo

#### B. Tabela de Modelos (`src/components/modelos/ModeloVeiculoTable.tsx`)

- ✅ Nova coluna "R$/km Adicional" na tabela
- ✅ Exibição formatada do valor

#### C. Step de Veículos em Propostas (`src/components/proposta/steps/VeiculosStep.tsx`)

- ✅ Ao selecionar um modelo, o sistema agora usa automaticamente o `valor_km_adicional` do modelo
- ✅ Fallback para R$ 0,75/km se o modelo não tiver valor definido

---

## 🔄 Script de Sincronização

### Arquivo: `scripts/sync-modelos-from-analiticos.js`

Este script automatiza a **sincronização de modelos** a partir do sistema analítico (arquivo `dim_frota.json`).

#### **Funcionalidades:**

1. ✅ Carrega veículos do storage Supabase (`bi-data/dim_frota.json`)
2. ✅ Filtra apenas veículos com status válido:
   - LOCADO
   - DISPONÍVEL
   - EM MOBILIZAÇÃO
3. ✅ Gera código único para cada modelo: `{MONTADORA}-{MODELO}-{ANO}`
   - Exemplo: `VOLK-GOL-2024`
4. ✅ Detecta categoria automaticamente baseado no nome do modelo
5. ✅ Define valor KM adicional baseado na categoria
6. ✅ **Não duplica** modelos já existentes no banco
7. ✅ Insere novos modelos em lotes de 50

#### **Como Executar:**

```powershell
# 1. Instalar dependências (se necessário)
npm install @supabase/supabase-js

# 2. Executar o script
node scripts/sync-modelos-from-analiticos.js
```

#### **Pré-requisitos:**

- ✅ Arquivo `.env` com variáveis configuradas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- ✅ Arquivo `dim_frota.json` disponível no Supabase Storage (bucket `bi-data`)

#### **Exemplo de Saída:**

```
🚀 Iniciando sincronização de modelos de veículos
============================================================
📊 Carregando veículos do sistema analítico...

✅ Carregados 450 veículos do sistema analítico

🔍 Filtrados 280 veículos com status válido (LOCADO, DISPONÍVEL, EM MOBILIZAÇÃO)

📦 Identificados 45 modelos únicos

💾 Encontrados 20 modelos já cadastrados no banco

➕ Inserindo 25 novos modelos...

✅ Lote 1: 25 modelos inseridos

============================================================
📊 RESUMO DA SINCRONIZAÇÃO

   Total de veículos analisados: 450
   Veículos filtrados (status válido): 280
   Modelos únicos identificados: 45
   Modelos já existentes: 20
   ✅ Novos modelos inseridos: 25
============================================================

✅ Sincronização concluída com sucesso!
```

---

## 🎯 Detecção Automática de Categoria

O script usa palavras-chave no nome do modelo para detectar a categoria:

| Categoria | Palavras-Chave |
|-----------|----------------|
| **Hatch** | GOL, ONIX, HB20, UNO, MOBI |
| **Sedan** | COROLLA, CIVIC, JETTA, VIRTUS, LOGAN |
| **SUV** | TIGUAN, COMPASS, CRETA, T-CROSS, KICKS |
| **Pickup** | HILUX, RANGER, S10, TORO, STRADA |
| **Van** | MASTER, DUCATO, SPRINTER, BOXER |
| **Utilitário** | TRANSIT, DAILY, CARGO, FIORINO |
| **Executivo** | AZERA, EQUUS, MAYBACH |
| **Compacto** | (Padrão se não detectar nenhuma categoria) |

---

## 🔐 Geração de IDs Únicos

O sistema gera códigos únicos para cada modelo usando o formato:

```
{MONTADORA}-{MODELO}-{ANO}
```

**Exemplos:**
- `VOLK-GOL-2024`
- `FIAT-UNO-2023`
- `TOYO-COROLLA-2025`

**Regras:**
- Somente letras e números
- Montadora: máximo 4 caracteres
- Modelo: máximo 10 caracteres
- Índice único no banco previne duplicações

---

## 📊 Migração do Banco de Dados

Para aplicar as mudanças no banco de dados:

### Opção 1: Supabase CLI

```powershell
# Aplicar migration
supabase db push
```

### Opção 2: Supabase Dashboard

1. Acesse o dashboard do Supabase
2. Vá em **SQL Editor**
3. Copie e execute o conteúdo de:
   ```
   supabase/migrations/20250102_add_valor_km_adicional_to_modelos.sql
   ```

---

## 🧪 Testando as Mudanças

### 1. **Cadastrar um Novo Modelo**

1. Acesse **Configurações → Modelos de Veículos**
2. Clique em **Novo Modelo**
3. Preencha os dados
4. **Observe o campo "Valor KM Adicional (R$/km)"**
5. Salve o modelo

### 2. **Verificar na Tabela**

- A tabela de modelos agora exibe a coluna **"R$/km Adicional"**
- Verifique se os valores estão corretos

### 3. **Testar em Propostas**

1. Crie uma nova proposta
2. Na etapa de veículos, selecione um modelo
3. **Verifique se o "Valor KM Excedente" é preenchido automaticamente**
4. O valor deve vir do modelo selecionado

### 4. **Executar o Script de Sincronização**

```powershell
node scripts/sync-modelos-from-analiticos.js
```

- Verifique o resumo no console
- Confirme que novos modelos foram inseridos
- Verifique na interface se os modelos aparecem corretamente

---

## 📝 Observações Importantes

### ⚠️ Pacotes de KM

- O campo `valor_km_adicional` **ainda existe** na tabela `km_packages`
- **Motivo:** Manter retrocompatibilidade
- **Recomendação:** Em futuras versões, remover o campo da tabela de pacotes

### 🔄 Comportamento Híbrido

Atualmente, o sistema funciona assim:

1. **Se o usuário seleciona um modelo:**
   - Usa `valor_km_adicional` do modelo
   
2. **Se o usuário seleciona um pacote de KM:**
   - O valor do pacote **sobrescreve** o valor do modelo
   - Isso dá flexibilidade ao usuário

3. **Se o modelo não tem valor definido:**
   - Usa R$ 0,75/km como padrão

---

## 🎉 Benefícios

✅ **Precificação mais precisa** - Cada modelo tem seu próprio valor/km  
✅ **Sincronização automática** - Modelos populados do sistema analítico  
✅ **IDs únicos** - Evita duplicação de modelos  
✅ **Categorização inteligente** - Detecta categoria automaticamente  
✅ **Flexibilidade** - Usuário pode sobrescrever com pacotes de KM  

---

## 🐛 Troubleshooting

### Erro: "Arquivo dim_frota.json não encontrado"

**Solução:** Verifique se o arquivo está no bucket `bi-data` do Supabase Storage

### Erro: "duplicate key value violates unique constraint"

**Solução:** Já existe um modelo com o mesmo código. O script ignora automaticamente.

### Modelos não aparecem na interface

**Solução:** 
1. Verifique se o campo `ativo` está como `true`
2. Faça refresh da página
3. Verifique os logs do console do navegador

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Confirme que a migration foi aplicada
3. Teste o script de sincronização
4. Verifique permissões no Supabase

---

**Data da Migração:** 02/01/2025  
**Versão:** 1.0.0
