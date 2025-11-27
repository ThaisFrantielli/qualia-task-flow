# Instruções para Executar Scripts SQL

Execute os scripts **NA ORDEM ABAIXO** no SQL Editor do Supabase:

## 1️⃣ Primeiro: `01_add_status_triagem.sql`
```sql
-- Cria a coluna status_triagem
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS status_triagem VARCHAR(50) DEFAULT 'aguardando';

CREATE INDEX IF NOT EXISTS idx_clientes_status_triagem ON clientes(status_triagem);

COMMENT ON COLUMN clientes.status_triagem IS 'Status do lead na triagem: aguardando, em_atendimento, atendido, descartado, comercial, pos_venda';
```

## 2️⃣ Segundo: `02_expandir_triagem.sql`
```sql
-- Adiciona campos de rastreamento
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS ultimo_atendimento_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ultimo_atendente_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_atendimento ON clientes(ultimo_atendimento_at);
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_atendente ON clientes(ultimo_atendente_id);
```

## 3️⃣ Terceiro: `03_funis_personalizaveis.sql`
Este script é maior e cria as tabelas de funis + insere dados padrão.
Copie todo o conteúdo do arquivo e execute.

## 4️⃣ Quarto: `04_trigger_atualizar_cliente.sql`
Cria o trigger automático para atualizar status do cliente.
Copie todo o conteúdo do arquivo e execute.

---

## ✅ Verificação

Após executar todos os scripts, execute este comando para verificar:

```sql
-- Verificar se tudo foi criado
SELECT 
    'clientes.status_triagem' as item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'status_triagem'
    ) THEN '✓ OK' ELSE '✗ FALTA' END as status
UNION ALL
SELECT 
    'funis table',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funis'
    ) THEN '✓ OK' ELSE '✗ FALTA' END
UNION ALL
SELECT 
    'funil_estagios table',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funil_estagios'
    ) THEN '✓ OK' ELSE '✗ FALTA' END
UNION ALL
SELECT 
    'trigger_atualizar_cliente_ticket',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trigger_atualizar_cliente_ticket'
    ) THEN '✓ OK' ELSE '✗ FALTA' END;
```

Todos os itens devem mostrar "✓ OK".
