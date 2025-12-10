# 🚀 EXECUTAR AGORA - Correção de Exclusão de Instâncias

## Problema
O botão de excluir instância não funciona devido a foreign key constraints sem CASCADE.

## Solução
Execute a migration SQL abaixo no **SQL Editor do Supabase**:

### Passo 1: Acesse o Supabase
1. Abra https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)

### Passo 2: Execute este SQL

```sql
-- Migration: Add CASCADE delete to WhatsApp foreign keys
-- Description: Allow automatic deletion of related records when instance is deleted

-- Drop existing foreign key constraints
ALTER TABLE public.whatsapp_conversations 
DROP CONSTRAINT IF EXISTS whatsapp_conversations_instance_id_fkey;

ALTER TABLE public.whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_id_fkey;

-- Re-add with ON DELETE CASCADE
ALTER TABLE public.whatsapp_conversations
ADD CONSTRAINT whatsapp_conversations_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

ALTER TABLE public.whatsapp_messages
ADD CONSTRAINT whatsapp_messages_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

-- Also add CASCADE to templates if it exists
ALTER TABLE public.whatsapp_templates 
DROP CONSTRAINT IF EXISTS whatsapp_templates_instance_id_fkey;

ALTER TABLE public.whatsapp_templates
ADD CONSTRAINT whatsapp_templates_instance_id_fkey 
FOREIGN KEY (instance_id) 
REFERENCES public.whatsapp_instances(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT whatsapp_conversations_instance_id_fkey ON public.whatsapp_conversations IS 'Cascade delete conversations when instance is deleted';
COMMENT ON CONSTRAINT whatsapp_messages_instance_id_fkey ON public.whatsapp_messages IS 'Cascade delete messages when instance is deleted';
COMMENT ON CONSTRAINT whatsapp_templates_instance_id_fkey ON public.whatsapp_templates IS 'Cascade delete templates when instance is deleted';
```

### Passo 3: Clique em "Run"

### Passo 4: Verifique
Você deve ver a mensagem:
```
Success. No rows returned
```

### Passo 5: Teste
Volte para a aplicação e tente excluir uma instância novamente. Agora deve funcionar! ✅

---

## O que isso faz?

Antes:
- Quando você tentava deletar uma instância, o PostgreSQL recusava porque existiam conversas/mensagens relacionadas
- Erro: `23503 - Foreign key constraint violation`

Depois:
- Ao deletar uma instância, o PostgreSQL automaticamente deleta:
  - Todas as conversas relacionadas
  - Todas as mensagens relacionadas
  - Todos os templates relacionados
- **Comportamento em cascata** (ON DELETE CASCADE)

---

## Segurança

✅ Você ainda precisa confirmar a exclusão (há um popup de confirmação)
✅ A mensagem avisa: "Todas as conversas e mensagens associadas serão perdidas"
✅ Logs no console mostram o progresso da exclusão

---

**Tempo estimado**: 30 segundos para executar

**Após executar essa migration, o botão de excluir funcionará perfeitamente!** 🎉
