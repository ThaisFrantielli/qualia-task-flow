# 📱 WhatsApp Service

Serviço Node.js para gerenciar conexão WhatsApp Web e integrar com Supabase.

## 🚀 Instalação

```bash
cd whatsapp-service
npm install
```

## ▶️ Como Usar

### 1. Iniciar o Serviço

```bash
npm start
```

O serviço rodará em `http://localhost:3005`

### 2. Conectar WhatsApp

1. Acesse: `http://localhost:8081/configuracoes/whatsapp`
2. Aguarde o QR Code aparecer
3. Abra WhatsApp no celular → "Dispositivos vinculados"
4. Escaneie o QR Code
5. ✅ Conectado!

## 🔌 Endpoints Disponíveis

### GET `/status`
Retorna status da conexão
```json
{
  "isConnected": true,
  "connectedNumber": "5511999999999",
  "hasQRCode": false
}
```

### GET `/qr-code`
Retorna QR Code atual (se houver)

### POST `/disconnect`
Desconecta WhatsApp

### POST `/send-message`
Envia mensagem
```json
{
  "phoneNumber": "5511999999999@c.us",
  "message": "Olá!"
}
```

## 🔧 Configuração

O serviço está configurado para integrar com:
- **Supabase URL**: `https://apqrjkobktjcyrxhqwtm.supabase.co`
- **Tabelas**: `whatsapp_config`, `whatsapp_conversations`, `whatsapp_messages`
- **Edge Functions**: `whatsapp-webhook`

## 📦 Dependências

- `whatsapp-web.js` - Cliente WhatsApp Web
- `@supabase/supabase-js` - Cliente Supabase
- `express` - Servidor HTTP
- `qrcode` - Geração de QR Codes
- `cors` - CORS habilitado

## 🗂️ Sessão

A sessão do WhatsApp é salva em `./whatsapp-session/` para não precisar reconectar sempre.

## ⚠️ Importante

- **Porta 3005** deve estar livre
- Certifique-se que o frontend está rodando (porta 8081)
- Edge Functions devem estar deployadas no Supabase
- Apenas um número pode estar conectado por vez

## 🐛 Debug

Os logs aparecem no console mostrando:
- 📱 QR Code gerado
- ✅ Conexão estabelecida
- 📩 Mensagens recebidas
- ⚠️ Erros e desconexões

## 🔄 Fluxo Completo

1. **Serviço inicia** → Gera QR Code → Salva no Supabase
2. **Usuário escaneia** → WhatsApp conecta → Atualiza status
3. **Mensagem chega** → Envia para webhook → Salva no banco
4. **Frontend envia** → Edge Function → Serviço → WhatsApp
