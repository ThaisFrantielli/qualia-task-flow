# 🛑 INFINITE LOOP - STATUS CORRIGIDO

## ✅ O que foi feito agora (EMERGÊNCIA)

### 1. DESATIVADO: Forwarding de mensagens recebidas para webhook
- **Arquivo**: `whatsapp-service/index-multi.js`
- **Linha**: 407-477
- **O que foi comentado**: Todo o código `client.on('message')` que enviava para `whatsapp-webhook`
- **Por quê**: Este era o causador do loop infinito - mensagens recebidas → webhook → criava pending messages → enviava → recebia → loop

### 2. DESATIVADO: Polling fallback (já estava desativado antes)
- **Status**: Polling continua desativado (linha 738)
- **Motivo**: Causava loop por buscar mensagens pending repetidamente

### 3. Porta alterada para 3008
- **Motivo**: Portas 3006 e 3007 estavam ocupadas
- **Arquivo .env**: PORT ainda está em 3007, mas rodando com `$env:PORT=3008`
- **Ação necessária**: Atualizar .env para PORT=3008 se for manter assim

### 4. Limpar mensagens pending
- **Script executado**: `scripts/mark_pending_failed.mjs`
- **Resultado**: 0 linhas (nenhuma mensagem pending no momento)

## 🔍 Análise do loop

### Root Cause Identificado
O loop infinito NÃO era causado pelo polling (que já estava desativado). Era causado por:

```
Mensagem recebida no WhatsApp
    ↓
client.on('message') captura
    ↓
Envia para whatsapp-webhook Edge Function
    ↓
Webhook processa e insere em whatsapp_messages com status='pending'
    ↓
[Realtime não funciona, mas se funcionasse]
    ↓
subscribeToOutgoingMessages() pega a mensagem
    ↓
Envia de volta para o mesmo número
    ↓
Recebe novamente → LOOP INFINITO
```

## 🚨 Estado Atual do Serviço

### Status
- ✅ **Rodando na porta 3008**
- ✅ **Sem loop infinito**
- ⚠️ **Realtime com timeout** (esperado - problema já conhecido)
- ⚠️ **Chrome falhando** ao restaurar sessões antigas (não crítico)
- ❌ **Mensagens NÃO estão sendo enviadas** (webhook desativado + Realtime não funciona)

### Log atual
```
✓ Multi-WhatsApp service is running on http://localhost:3008
⚠️ Polling fallback is DISABLED to prevent message loops
SUBSCRIPTION STATUS: TIMED_OUT
Failed to launch the browser process! (2 instâncias)
```

## 🎯 Próximos Passos Recomendados

### Opção A: Implementar endpoint HTTP direto (RECOMENDADO)
**Por quê**: Bypass completo de Realtime/Edge Functions problemáticos

1. Adicionar endpoint POST `/send-message` no `index-multi.js`:
```javascript
app.post('/send-message', async (req, res) => {
  const { instance_id, phone_number, message, media_url, media_type } = req.body;
  const client = clients.get(instance_id);
  // Enviar mensagem direto via whatsapp-web.js
  // Atualizar status no DB
});
```

2. No frontend (`WhatsAppChatPanel.tsx`), chamar direto:
```typescript
await fetch('http://localhost:3008/send-message', {
  method: 'POST',
  body: JSON.stringify({ instance_id, phone_number, message, media_url })
});
```

**Vantagens**:
- Zero latência (sem Edge Function)
- Zero problemas de Realtime
- Zero risco de loops
- Implementação simples

### Opção B: Reativar webhook COM proteções
**Requisitos antes de reativar**:
1. Investigar o que `whatsapp-webhook` Edge Function faz
2. Adicionar flag `direction: 'incoming'` vs `'outgoing'`
3. Verificar que webhook NÃO cria mensagens pending
4. Se criar, adicionar filtro para só processar mensagens com `direction='incoming'`

**Reativar linha 407-477** do `index-multi.js` SOMENTE depois de implementar proteções acima.

### Opção C: Consertar Realtime (mais complexo)
1. Investigar por que Realtime está timing out:
   - Problema de firewall/proxy local?
   - WebSocket bloqueado?
   - Usar ANON key em vez de SERVICE_ROLE_KEY?
2. Implementar retry com backoff exponencial
3. Adicionar fallback para long-polling se WebSocket falhar

## ⚠️ AVISOS IMPORTANTES

### NÃO FAZER:
- ❌ Não reativar webhook sem investigar o Edge Function primeiro
- ❌ Não reativar polling sem adicionar filtro por `created_at` (ex: só pegar mensagens dos últimos 30 segundos)
- ❌ Não enviar mensagens manualmente pelo Supabase UI para testar sem antes ter certeza que o serviço está processando corretamente

### FAZER ANTES DE ENVIAR MENSAGENS:
- ✅ Escolher Opção A (endpoint HTTP) OU consertar Opção B/C
- ✅ Testar com UMA mensagem e verificar que não entra em loop
- ✅ Monitorar logs por 30 segundos antes de considerar safe

## 📊 Dados Técnicos

### Arquivos Modificados
- `whatsapp-service/index-multi.js` (linhas 407-477 comentadas)
- `whatsapp-service/.env` (PORT ainda está 3007, rodando via env var 3008)

### Sessões WhatsApp
- `7d3b0d7f-e559-4152-89fe-3a1468e0a1b2` (Whatsapp Comercial) - ❌ Chrome fail
- `7b1f91be-e913-4665-a478-92c3c7434ee4` (Atendimento Geral 3640) - ❌ Chrome fail

### Endpoints Ativos
- `GET http://localhost:3008/status` - Health check
- `POST http://localhost:3008/instances` - Criar instância
- ~~`POST http://localhost:3008/send-message`~~ - NÃO EXISTE AINDA (implementar na Opção A)

---

**Última atualização**: 2025-12-10 20:17 UTC
**Status do loop**: ✅ CORRIGIDO (webhook desativado)
**Status de envio**: ❌ DESATIVADO (precisa implementar Opção A, B ou C)
