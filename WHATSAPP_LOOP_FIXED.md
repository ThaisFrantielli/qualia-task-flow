# WhatsApp Message Loop - Problema Resolvido

## O que aconteceu
O serviço WhatsApp estava reenviando mensagens infinitamente em loop.

## Causa raiz
O código tinha um **polling fallback** (`setInterval` a cada 4 segundos) que:
1. Buscava mensagens com `status='pending'`
2. Enviava pelo WhatsApp
3. Atualizava status para `'sent'`

**Porém**: O `updateMessageStatus()` não estava funcionando corretamente, deixando mensagens sempre como `pending`. Resultado: a cada 4 segundos, as mesmas mensagens eram reenviadas.

## Solução aplicada (TEMPORÁRIA)
✅ **Polling completamente DESABILITADO** em `whatsapp-service/index-multi.js`
- Removido o `setInterval(pollPendingMessages, 4000)`
- Adicionado aviso: `⚠️ Polling fallback is DISABLED to prevent message loops`

✅ **Processos Node/Chrome interrompidos** (taskkill)

✅ **Proteção anti-echo adicionada**:
- Skip de mensagens originadas pela própria instância (verifica `client.info.wid.user`)

## Como enviar mensagens AGORA
Com o polling desabilitado, existem 2 formas:

### 1. Via Supabase Realtime (automático, mas pode dar timeout)
- Edge Function `whatsapp-send` insere mensagem com `status='pending'`
- `subscribeToOutgoingMessages()` escuta via Realtime
- Envia automaticamente quando detecta INSERT

**Problema**: Realtime deu timeout no seu ambiente (firewall/rede)

### 2. Via endpoint HTTP direto (manual, sempre funciona)
POST http://localhost:3007/send-message
```json
{
  "instance_id": "7b1f91be-e913-4665-a478-92c3c7434ee4",
  "phoneNumber": "556134623640",
  "message": "Teste",
  "mediaUrl": null,
  "mediaType": null,
  "fileName": null
}
```

## Próximos passos recomendados

### Opção A: Consertar Realtime (ideal)
1. Investigar por que `subscribeToOutgoingMessages()` dá timeout
2. Possíveis causas:
   - Firewall bloqueando WebSocket outbound
   - Service Role Key incorreta
   - RLS policies bloqueando authenticated role
3. Após resolver, polling não é necessário

### Opção B: Consertar polling (fallback)
1. Corrigir `updateMessageStatus()` para garantir que atualiza `status`
2. Adicionar logs verbosos antes/depois do UPDATE
3. Adicionar check: não processar msg com `created_at` < 1 min atrás (evita loop de msgs antigas)
4. Re-habilitar setInterval com intervalo maior (ex: 10s)

### Opção C: Endpoint direto (simples, mas requer mudança no frontend)
1. Frontend chama `/send-message` diretamente em vez de Edge Function
2. Pula Supabase completamente
3. Simples mas perde log/auditoria centralizada

## Arquivo modificado
`c:\Users\frant\Quality Conecta\qualia-task-flow\whatsapp-service\index-multi.js`
- Linhas ~735-810: polling removido

## Como reiniciar o serviço (SEGURO agora)
```powershell
cd "c:\Users\frant\Quality Conecta\qualia-task-flow\whatsapp-service"
$env:PORT=3007
node index-multi.js
```

Deve aparecer:
- `✓ Multi-WhatsApp service is running on http://localhost:3007`
- `⚠️ Polling fallback is DISABLED to prevent message loops`
- `SUBSCRIPTION STATUS: TIMED_OUT` (esperado, mas não causa problemas)

## Status atual
- ✅ Loop interrompido
- ✅ Polling desabilitado
- ⚠️ Realtime não funciona (timeout)
- ⚠️ Mensagens pendentes NÃO serão enviadas automaticamente

Se quiser envio automático novamente, escolha Opção A ou B acima.
