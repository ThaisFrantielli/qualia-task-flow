# 📱 WhatsApp Service - Multi-Sessão

Serviço Node.js para gerenciar múltiplas conexões WhatsApp Web com integração ao Supabase.

## 🚀 Início Rápido

### Método 1: Script Automático (Recomendado)

**Linux/Mac:**
```bash
cd whatsapp-service
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
cd whatsapp-service
start.bat
```

### Método 2: Comandos Manuais

```bash
cd whatsapp-service
npm install
npm start
```

## ✅ Verificando se Funcionou

Após iniciar, você deve ver:

```
╔════════════════════════════════════════════════════╗
║   WhatsApp Multi-Session Service                  ║
╚════════════════════════════════════════════════════╝

✓ Supabase conectado
✓ Servidor rodando em http://localhost:3005

Aguardando conexões...
```

No navegador, acesse:
- **Frontend:** http://localhost:8081/configuracoes/whatsapp
- O alerta "Serviço WhatsApp Offline" deve desaparecer

## 📋 Pré-requisitos

- ✅ Node.js 16+ instalado ([Download](https://nodejs.org/))
- ✅ NPM instalado (vem com Node.js)
- ✅ Porta 3005 disponível
- ✅ Conexão com internet

## 📱 Como Conectar WhatsApp

1. **Inicie o serviço** (conforme acima)
2. **Abra o navegador:** http://localhost:8081/configuracoes/whatsapp
3. **Clique em "Nova Conexão"**
4. **Dê um nome** (ex: "Vendas", "Suporte")
5. **Aguarde o QR Code** aparecer no card
6. **Abra WhatsApp no celular:**
   - Android: Menu (3 pontos) → Dispositivos conectados → Conectar dispositivo
   - iPhone: Ajustes → Dispositivos conectados → Conectar dispositivo
7. **Escaneie o QR Code**
8. **Pronto!** ✅ O status mudará para "Conectado"

## 🔧 Solução de Problemas

### ❌ "Porta 3005 já está em uso"

**Solução 1 - Encerrar processo:**
```bash
# Linux/Mac
lsof -ti:3005 | xargs kill -9

# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3005).OwningProcess | Stop-Process -Force
```

**Solução 2 - Usar outra porta:**
Edite `index-multi.js` linha 304:
```javascript
const PORT = process.env.PORT || 3006; // mudou de 3005 para 3006
```

### ❌ QR Code não aparece

1. Verifique se o serviço está rodando (deve haver logs no terminal)
2. Recarregue a página no navegador
3. Clique no botão de "Atualizar" (ícone de refresh)
4. Verifique o console do navegador (F12) por erros

### ❌ "Puppeteer/Chromium error"

**Linux:**
```bash
sudo apt-get update
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

**Mac:**
```bash
brew install chromium
```

**Windows:**
Geralmente funciona sem configuração adicional. Se houver problemas:
```bash
npm install puppeteer --no-save
```

### ❌ Desconexão frequente

1. Não feche o terminal onde o serviço está rodando
2. Verifique sua conexão com internet
3. No WhatsApp do celular, vá em "Dispositivos conectados" e verifique se o dispositivo está ativo
4. Evite escanear o mesmo QR code em múltiplos dispositivos

## 🔌 Endpoints da API

### GET `/status`
Retorna status do serviço
```json
{
  "status": "online",
  "instances": 2,
  "version": "1.0.0"
}
```

### POST `/instances`
Cria nova instância
```json
{
  "id": "uuid",
  "name": "Nome da Conexão"
}
```

### GET `/instances/:id/qr`
Retorna QR Code da instância
```json
{
  "qrCode": "string base64",
  "expiresAt": "timestamp"
}
```

### POST `/instances/:id/disconnect`
Desconecta instância específica

### POST `/instances/:id/send`
Envia mensagem por instância
```json
{
  "to": "5511999999999",
  "message": "Olá!"
}
```

## 📁 Estrutura de Arquivos

```
whatsapp-service/
├── index-multi.js          # Servidor principal
├── package.json            # Dependências
├── README.md              # Este arquivo
├── start.sh               # Script de início (Linux/Mac)
├── start.bat              # Script de início (Windows)
└── whatsapp-session-*/    # Sessões salvas (auto-criado)
```

## 🗄️ Integração com Supabase

O serviço sincroniza automaticamente com as tabelas:

- **`whatsapp_instances`** - Lista de conexões ativas
  - `id`: UUID da instância
  - `name`: Nome da conexão
  - `status`: connected/disconnected/connecting
  - `qr_code`: QR code atual (se houver)
  - `phone_number`: Número conectado

- **`whatsapp_conversations`** - Conversas ativas
- **`whatsapp_messages`** - Histórico de mensagens

## 🔐 Segurança

- ⚠️ **NÃO compartilhe** os diretórios `whatsapp-session-*`
- ⚠️ **NÃO commite** sessões no Git (já está no .gitignore)
- ⚠️ Mantenha o `SUPABASE_ANON_KEY` seguro
- ✅ Use apenas em redes confiáveis
- ✅ Mantenha o serviço atualizado

## 📝 Logs e Debug

O serviço gera logs detalhados:

```
[INSTANCE:uuid] Cliente criado
[INSTANCE:uuid] QR Code gerado
[INSTANCE:uuid] ✓ Conectado como +5511999999999
[INSTANCE:uuid] Mensagem recebida de +5511888888888
```

Para debug adicional, defina `NODE_ENV=development`:
```bash
NODE_ENV=development npm start
```

## 🛑 Parar o Serviço

Pressione `Ctrl + C` no terminal onde o serviço está rodando.

Para garantir que parou completamente:
```bash
# Linux/Mac
lsof -ti:3005 | xargs kill -9

# Windows
taskkill /F /IM node.exe
```

## 🔄 Atualizar Dependências

```bash
cd whatsapp-service
npm update
```

## 📞 Suporte

- 📚 [Documentação WhatsApp Web.js](https://wwebjs.dev/)
- 🚀 [Documentação Supabase](https://supabase.com/docs)
- 💬 [Issues do Projeto](https://github.com/seu-repo/issues)

## ⚙️ Variáveis de Ambiente (Opcional)

Crie um arquivo `.env` na pasta `whatsapp-service`:

```env
PORT=3005
SUPABASE_URL=https://apqrjkobktjcyrxhqwtm.supabase.co
SUPABASE_ANON_KEY=sua_chave_aqui
NODE_ENV=production
```

## 🎯 Próximos Passos

Depois de conectar:

1. ✅ Teste enviar uma mensagem pela interface
2. ✅ Configure automações de atendimento
3. ✅ Integre com seu CRM
4. ✅ Configure notificações

---

**Versão:** 1.0.0  
**Última atualização:** Dezembro 2024
