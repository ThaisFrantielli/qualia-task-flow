# 🔧 Troubleshooting - Guia de Solução de Problemas

## ❌ Erro: WhatsApp Service não está rodando

### Sintoma:
```
GET http://localhost:3006/status net::ERR_CONNECTION_REFUSED
Error polling QR code: TypeError: Failed to fetch
```

### Causa:
O serviço Node.js do WhatsApp (`whatsapp-service`) não está em execução.

### Solução:

#### Opção 1: Script Automático (Recomendado)
```powershell
# Execute na raiz do projeto
.\scripts\check-whatsapp-service.ps1
```

#### Opção 2: Manual
```powershell
# 1. Navegue até o diretório
cd whatsapp-service

# 2. Instale as dependências (primeira vez)
npm install

# 3. Inicie o serviço
node simple-whatsapp-service.js
```

O serviço ficará rodando em: `http://localhost:3006`

---

## ❌ Erro: Botão de excluir instância não funciona

### Sintoma:
```
Error deleting instance: {code: '23503', details: 'Key is still referenced from table "whatsapp_messages"'}
```

### Causa:
Foreign key constraint - a instância possui mensagens/conversas relacionadas.

### Solução:
✅ **JÁ CORRIGIDO** - A função `handleDeleteInstance` agora:
1. Deleta `whatsapp_media` primeiro
2. Deleta `whatsapp_messages` 
3. Deleta `whatsapp_conversations`
4. Deleta `whatsapp_templates`
5. Por último, deleta a `whatsapp_instances`

Ao clicar em excluir, você verá um alerta:
> "Tem certeza que deseja remover esta conexão? Todas as conversas e mensagens associadas serão perdidas."

---

## ⚠️ Warnings do React Router

### Sintoma:
```
⚠️ React Router Future Flag Warning: v7_startTransition
⚠️ React Router Future Flag Warning: v7_relativeSplatPath
```

### Causa:
Avisos sobre mudanças futuras do React Router v7.

### Solução:
✅ **JÁ CORRIGIDO** - Adicionadas as future flags no `App.tsx`:
```tsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

Os warnings não aparecerão mais no console.

---

## 🔌 Erro: WebSocket connection failed

### Sintoma:
```
WebSocket connection to 'ws://127.0.0.1:6001/app/local-dev-key' failed
```

### Causa:
Laravel Echo Server não está rodando (necessário para real-time features).

### Solução (Opcional):
Se você não usa as features de presença/real-time:
- Este erro pode ser ignorado
- O sistema funcionará normalmente sem o WebSocket

Se você precisa de real-time:
1. Instale e configure Laravel Echo Server
2. Ou use Supabase Realtime (já configurado no projeto)

---

## 📊 Checklist de Inicialização do Projeto

Antes de começar a trabalhar, verifique:

- [ ] ✅ Vite dev server rodando (`npm run dev`)
- [ ] ✅ WhatsApp service rodando (`node whatsapp-service/simple-whatsapp-service.js`)
- [ ] ✅ Migrações do Supabase executadas (ver `SUPABASE_MIGRATIONS_MANUAL.md`)
- [ ] ✅ Bucket de storage criado (`whatsapp-media`)
- [ ] ⚠️ Laravel Echo Server (opcional)

### Comando rápido para verificar WhatsApp service:
```powershell
.\scripts\check-whatsapp-service.ps1
```

---

## 🐛 Outros Erros Comuns

### 1. Erro de autenticação no Supabase
**Solução**: Verifique se o arquivo `.env` contém as credenciais corretas:
```env
VITE_SUPABASE_URL=sua-url
VITE_SUPABASE_ANON_KEY=sua-key
```

### 2. QR Code não aparece
**Solução**: 
- Certifique-se que o WhatsApp service está rodando
- Verifique se a instância não está conectada
- Clique em "Desconectar" e tente novamente

### 3. Mensagens não aparecem
**Solução**:
- Verifique se a instância está conectada (status verde)
- Certifique-se que o número está autenticado no WhatsApp
- Verifique os logs do WhatsApp service

---

## 📞 Suporte

Se encontrar outros erros:
1. Verifique o console do navegador (F12)
2. Verifique os logs do WhatsApp service
3. Verifique os logs do Supabase
4. Documente o erro e abra uma issue

---

**Última atualização**: 09/12/2025
