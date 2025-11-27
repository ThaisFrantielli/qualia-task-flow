# 📱 **GUIA DE CONFIGURAÇÃO - WhatsApp Integration**

## ✅ **STATUS ATUAL**

### Banco de Dados
- ✅ Tabelas `whatsapp_config`, `whatsapp_conversations`, `whatsapp_messages` criadas
- ✅ Campos corrigidos e alinhados com o código
- ✅ Real-time habilitado
- ✅ Índices de performance criados

### Backend
- ✅ Edge Functions `whatsapp-webhook` e `whatsapp-send` prontas
- ✅ Serviço WhatsApp local configurado (`whatsapp-service/`)

### Frontend
- ✅ Página de configuração `/configuracoes/whatsapp`
- ✅ Página de chat `/whatsapp`
- ✅ Componente WhatsAppChat com real-time
- ✅ Hooks `useWhatsAppConversations` e `useWhatsAppMessages`

---

## 🚀 **COMO INICIAR**

### **1. Instalar Dependências do Serviço WhatsApp**

```bash
cd whatsapp-service
npm install
```

### **2. Iniciar o Serviço WhatsApp**

```bash
npm start
```

O serviço rodará em: `http://localhost:3005`

### **3. Conectar WhatsApp**

1. Com o serviço rodando, acesse: `http://localhost:8081/configuracoes/whatsapp`
2. Aguarde o QR Code aparecer (pode levar ~10 segundos)
3. Abra WhatsApp no seu celular
4. Vá em **"Dispositivos vinculados"**
5. Toque em **"Vincular um dispositivo"**
6. Escaneie o QR Code na tela
7. ✅ Status mudará para **"Conectado"**!

### **4. Testar o Chat**

1. Acesse: `http://localhost:8081/whatsapp`
2. Envie uma mensagem do seu celular para qualquer número
3. A conversa aparecerá automaticamente na interface
4. Responda pela interface
5. 🎉 Mensagens em tempo real funcionando!

---

## 📋 **ESTRUTURA DO PROJETO**

```
projeto/
├── whatsapp-service/          # Serviço Node.js local
│   ├── index.js              # Servidor principal
│   ├── package.json          # Dependências
│   ├── README.md             # Documentação do serviço
│   └── whatsapp-session/     # Sessão salva (criada automaticamente)
│
├── src/
│   ├── pages/
│   │   ├── WhatsAppConfigPage.tsx    # Página de configuração
│   │   └── WhatsAppChatPage.tsx      # Página do chat
│   ├── components/
│   │   └── WhatsAppChat.tsx          # Componente principal do chat
│   └── hooks/
│       └── useWhatsAppConversations.ts  # Hooks real-time
│
└── supabase/
    └── functions/
        ├── whatsapp-webhook/     # Receber mensagens
        └── whatsapp-send/        # Enviar mensagens
```

---

## 🔌 **ENDPOINTS DO SERVIÇO**

### **GET** `/status`
Retorna status da conexão
```json
{
  "isConnected": true,
  "connectedNumber": "5511999999999",
  "clientState": "CONNECTED"
}
```

### **GET** `/qr-code`
Retorna QR Code atual
```json
{
  "qrCode": "2@abc123...",
  "isConnected": false
}
```

### **POST** `/disconnect`
Desconecta WhatsApp
```json
{
  "success": true,
  "message": "WhatsApp disconnected successfully"
}
```

### **POST** `/send-message`
Envia mensagem
```json
{
  "phoneNumber": "5511999999999@c.us",
  "message": "Olá!"
}
```

### **POST** `/reset-session`
Força novo QR Code
```json
{
  "success": true,
  "message": "Session reset, new QR code will be generated"
}
```

---

## 🗄️ **ESTRUTURA DAS TABELAS**

### **whatsapp_config**
```sql
- id: TEXT (PK) = 'default'
- qr_code: TEXT
- is_connected: BOOLEAN
- connected_number: TEXT
- last_connection_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### **whatsapp_conversations**
```sql
- id: UUID (PK)
- cliente_id: UUID (FK → clientes)
- whatsapp_number: TEXT
- customer_phone: TEXT  ← NOVO
- customer_name: TEXT   ← NOVO
- last_message: TEXT    ← NOVO
- last_message_at: TIMESTAMPTZ  ← NOVO
- unread_count: INTEGER ← NOVO
- is_online: BOOLEAN    ← NOVO
- status: TEXT ('active' | 'archived')
- atendimento_id: BIGINT (FK → atendimentos)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### **whatsapp_messages**
```sql
- id: UUID (PK)
- conversation_id: UUID (FK → whatsapp_conversations)
- sender_type: TEXT ('customer' | 'user')
- sender_phone: TEXT    ← NOVO
- sender_name: TEXT     ← NOVO
- sender_id: UUID
- content: TEXT
- message_type: TEXT ('text' | 'image' | 'audio' | etc)
- status: TEXT ('sent' | 'delivered' | 'read')
- whatsapp_message_id: TEXT
- metadata: JSONB
- read_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ  ← NOVO
```

---

## 🔄 **FLUXO DE MENSAGENS**

### **Receber Mensagem (Cliente → Sistema)**
```
1. Cliente envia mensagem no WhatsApp
   ↓
2. whatsapp-service recebe via event listener
   ↓
3. POST para Edge Function /whatsapp-webhook
   ↓
4. Edge Function:
   - Busca/cria cliente
   - Busca/cria conversa
   - Salva mensagem
   - Cria atendimento (se necessário)
   ↓
5. Frontend recebe via real-time subscription
   ↓
6. Mensagem aparece na interface
```

### **Enviar Mensagem (Sistema → Cliente)**
```
1. Usuário digita no frontend
   ↓
2. POST para Edge Function /whatsapp-send
   ↓
3. Edge Function:
   - POST para whatsapp-service /send-message
   - Salva mensagem no banco
   - Atualiza conversa
   ↓
4. whatsapp-service envia via WhatsApp Web
   ↓
5. Frontend recebe confirmação via real-time
```

---

## 🎯 **FUNCIONALIDADES IMPLEMENTADAS**

### ✅ Conexão
- [x] QR Code automático
- [x] Status em tempo real
- [x] Reconexão automática
- [x] Desconectar seguro

### ✅ Chat Interface
- [x] Lista de conversas com busca
- [x] Mensagens em tempo real
- [x] Envio/recebimento instantâneo
- [x] Scroll automático
- [x] Avatars com iniciais
- [x] Timestamps formatados
- [x] Status de mensagem

### ✅ Backend
- [x] Webhook para receber
- [x] API para enviar
- [x] Auto-criação de clientes
- [x] Auto-criação de atendimentos
- [x] Real-time subscriptions

### ✅ Analytics
- [x] Cards de estatísticas
- [x] Contadores em tempo real

---

## 🐛 **TROUBLESHOOTING**

### **QR Code não aparece**
1. Verifique se o serviço está rodando: `http://localhost:3005/status`
2. Veja os logs no terminal do serviço
3. Tente: `POST http://localhost:3005/reset-session`

### **Mensagens não chegam**
1. Verifique Edge Functions no Supabase
2. Veja logs do serviço no terminal
3. Confirme que real-time está habilitado no Supabase

### **Não consegue enviar**
1. Verifique se está conectado: `/status`
2. Confirme formato do número: `5511999999999@c.us`
3. Veja logs no console do navegador

### **Erros de conexão**
1. Delete a pasta `whatsapp-session/`
2. Reinicie o serviço
3. Escaneie novo QR Code

---

## ⚡ **PRÓXIMOS PASSOS (OPCIONAL)**

### Fase 4: Recursos Avançados
- [ ] Suporte a imagens/áudios
- [ ] Respostas automáticas
- [ ] Multi-atendentes
- [ ] Push notifications
- [ ] Analytics avançado
- [ ] Templates de mensagem

---

## 🔐 **SEGURANÇA**

- ✅ RLS policies ativas
- ✅ CORS configurado
- ✅ Autenticação obrigatória
- ✅ Sessão local protegida

---

## 📞 **SUPORTE**

**Logs importantes:**
- Terminal do `whatsapp-service`: Ver conexões e mensagens
- Console do navegador: Ver requisições e real-time
- Supabase Edge Functions: Ver logs no dashboard

**Comandos úteis:**
```bash
# Ver status
curl http://localhost:3005/status

# Desconectar
curl -X POST http://localhost:3005/disconnect

# Resetar sessão
curl -X POST http://localhost:3005/reset-session
```

---

## 🎉 **IMPLEMENTAÇÃO COMPLETA!**

A interface WhatsApp está 100% funcional e pronta para uso.

**Testado e funcionando:**
- ✅ Conexão via QR Code
- ✅ Recebimento de mensagens
- ✅ Envio de mensagens
- ✅ Real-time em todas as operações
- ✅ Auto-criação de clientes/atendimentos
- ✅ Interface moderna e responsiva

---

*Desenvolvido com ❤️ usando React + TypeScript + Supabase + WhatsApp Web.js*
