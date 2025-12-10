# WhatsApp Service - Deployment Guide

## Deploy Local com Docker

```bash
# Build e start do serviço
docker-compose up -d --build

# Verificar logs
docker-compose logs -f whatsapp-service

# Parar serviço
docker-compose down

# Parar e limpar volumes (apaga sessões)
docker-compose down -v
```

## Deploy no Railway

1. Instalar Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login e deploy:
```bash
cd whatsapp-service
railway login
railway init
railway up
```

3. Configurar variáveis de ambiente no dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT=3005`

4. Configurar volume persistente para `/app/.wwebjs_auth`

## Deploy no Render

1. Criar novo Web Service no Render dashboard

2. Conectar repositório GitHub

3. Configurar:
   - **Build Command:** `cd whatsapp-service && npm install`
   - **Start Command:** `cd whatsapp-service && node simple-whatsapp-service.js`
   - **Dockerfile:** selecionar `whatsapp-service/Dockerfile`

4. Adicionar variáveis de ambiente

5. Adicionar Disk para persistência:
   - Mount Path: `/app/.wwebjs_auth`
   - Size: 1GB

## Configuração do Frontend

Atualizar `.env`:
```bash
# Local
VITE_WHATSAPP_SERVICE_URL=http://localhost:3005

# Produção Railway
VITE_WHATSAPP_SERVICE_URL=https://seu-servico.railway.app

# Produção Render
VITE_WHATSAPP_SERVICE_URL=https://seu-servico.onrender.com
```

## Health Checks

O serviço expõe endpoint de status:
```bash
curl http://localhost:3005/status
```

Resposta esperada:
```json
{
  "status": "ok",
  "instances": 3,
  "connected": 2
}
```

## Troubleshooting

### Chromium não inicia
- Verificar se a imagem Alpine tem todas as dependências
- Aumentar memória do container

### Sessões não persistem
- Verificar volumes do Docker
- No Railway/Render, confirmar disco persistente configurado

### QR Code expira muito rápido
- Normal - reescanear quando expirar
- Implementar notificação ao usuário quando QR expirar
