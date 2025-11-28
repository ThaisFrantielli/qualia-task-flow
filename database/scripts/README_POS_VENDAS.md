# Scripts SQL - Sistema de Pós-Vendas

Execute os scripts **NA ORDEM** abaixo no SQL Editor do Supabase:

## 📝 Ordem de Execução

### 1️⃣ `05_tickets_pos_vendas.sql`
Adiciona campos de classificação, SLA e métricas à tabela `tickets`.
- Tipo de reclamação
- Procedência
- Solução aplicada
- SLAs automáticos
- Feedback do cliente

### 2️⃣ `06_ticket_departamentos.sql`
Cria tabela para rastrear departamentos envolvidos.
- Comercial, Técnico, Logística, Financeiro, Qualidade
- Status da solicitação
- Vinculação com Tasks

### 3️⃣ `07_ticket_anexos.sql`
Cria tabela para anexos de tickets.
- Imagens, documentos, vídeos
- Storage no Supabase

### 4️⃣ `08_ticket_interacoes_sla_view.sql`
Atualiza `ticket_interacoes` e cria view de SLA.
- Monitoramento em tempo real
- Cálculos automáticos

### 5️⃣ `09_renomear_suporte_pos_venda.sql`
Renomeia "Suporte" para "Pós-Venda" em todo o sistema.

## ✅ Verificação

Após executar todos os scripts, execute:

```sql
-- Verificar novas colunas em tickets
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tickets' 
AND column_name IN ('tipo_reclamacao', 'procedencia', 'sla_primeira_resposta');

-- Verificar novas tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('ticket_departamentos', 'ticket_anexos');

-- Verificar view de SLA
SELECT * FROM tickets_sla LIMIT 5;

-- Verificar funil renomeado
SELECT nome, tipo FROM funis WHERE tipo = 'pos_venda';
```

Todos devem retornar resultados!
