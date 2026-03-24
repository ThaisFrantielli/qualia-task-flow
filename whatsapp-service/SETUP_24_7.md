# WhatsApp Service 24/7 Setup Guide

## Visão Geral
Este guia configurará o serviço WhatsApp para rodar 24/7 com reconexão automática, sem necessidade de intervenção manual.

## Componentes

### 1. **index-auto-reconnect.js**
Versão melhorada do serviço com:
- ✅ **Auto-reconexão**: Tenta reconectar automaticamente quando desconectar
- ✅ **Health Check**: Verifica a saúde das instâncias a cada 5 minutos
- ✅ **Exponential Backoff**: Aumenta o intervalo entre tentativas gradualmente
- ✅ **Estado persistente**: Rastreia número de tentativas e desconexões
- ✅ **Logging detalhado**: Facilita debug de problemas

### 2. **ecosystem.config.js**
Configuração PM2 para manter o processo rodando:
- ✅ **Auto-restart**: Reinicia automaticamente se o processo cair
- ✅ **Memory Management**: Limita uso de memória
- ✅ **Graceful Shutdown**: Encerra com elegância
- ✅ **Error Logging**: Registra erros em arquivos

## Setup Passo a Passo

### Opção 1: PM2 (Recomendado para Linux/Mac)

#### 1.1 Instalar PM2 globalmente
```bash
npm install -g pm2
```

#### 1.2 Instalar dependências
```bash
cd whatsapp-service
npm install
```

#### 1.3 Criar diretório de logs
```bash
mkdir -p logs
```

#### 1.4 Iniciar o serviço
```bash
pm2 start ecosystem.config.js
```

#### 1.5 Salvar a configuração PM2 (para auto-start do SO)
```bash
pm2 startup
pm2 save
```

#### 1.6 Monitorar
```bash
pm2 monit
pm2 logs whatsapp-service
```

#### 1.7 Parar/Reiniciar
```bash
pm2 stop whatsapp-service
pm2 restart whatsapp-service
pm2 delete whatsapp-service
```

### Opção 2: Windows Service com NSSM

#### 2.1 Baixar NSSM
https://nssm.cc/download

#### 2.2 Configurar serviço
```powershell
nssm install WhatsAppService "C:\Program Files\nodejs\node.exe" "C:\path\to\whatsapp-service\index-auto-reconnect.js"
nssm set WhatsAppService AppDirectory "C:\path\to\whatsapp-service"
nssm set WhatsAppService AppEnvironmentExtra "NODE_ENV=production"
```

#### 2.3 Iniciar serviço
```powershell
nssm start WhatsAppService
```

### Opção 3: Docker (Melhor para Production)

Crie um `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/status', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "index-auto-reconnect.js"]
```

Inicie com Docker Compose:
```yaml
version: '3.8'
services:
  whatsapp:
    build: ./whatsapp-service
    restart: always
    ports:
      - "3005:3005"
    volumes:
      - ./whatsapp-service:/app
      - /app/node_modules
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/status"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Inicie:
```bash
docker-compose up -d
docker-compose logs -f
```

### Opção 4: Systemd (Linux)

Crie `/etc/systemd/system/whatsapp-service.service`:
```ini
[Unit]
Description=WhatsApp Service 24/7
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/whatsapp-service
ExecStart=/usr/bin/node /opt/whatsapp-service/index-auto-reconnect.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/whatsapp-service.log
StandardError=append:/var/log/whatsapp-service.err

[Install]
WantedBy=multi-user.target
```

Ative:
```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-service
sudo systemctl start whatsapp-service
sudo systemctl status whatsapp-service
```

## APIs de Monitoramento

### Status Geral
```bash
curl http://localhost:3005/status
```

Retorna:
```json
{
  "online": true,
  "uptime": 12345,
  "activeInstances": 2,
  "autoReconnect": true,
  "instances": [
    {
      "id": "instance-1",
      "connected": true,
      "phoneNumber": "5511999999999",
      "reconnectAttempts": 0,
      "totalDisconnections": 0
    }
  ]
}
```

### Status de uma Instância
```bash
curl http://localhost:3005/instances/instance-1/status
```

### Forçar Reconexão
```bash
curl -X POST http://localhost:3005/instances/instance-1/reconnect
```

## Monitoramento com Uptime Kuma

1. Instale [Uptime Kuma](https://uptime.kuma.pet/)
2. Crie um novo monitor HTTP
3. URL: `http://seu-servidor:3005/status`
4. Intervalo: 5 minutos
5. Notificações: Configure para seu Slack/Discord/Email

## Troubleshooting

### Serviço não inicia
```bash
pm2 logs whatsapp-service
```

### Reconexão não funciona
- Verifique se `RECONNECT_CONFIG.autoReconnectEnabled = true`
- Aumente `healthCheckInterval` se necessário
- Verifique logs: `pm2 logs`

### Alto uso de memória
- Aumente `max_memory_restart` no ecosystem.config.js
- Reduza `healthCheckInterval`

### Instância fica em loop de reconexão
- Pode ser problema de autenticação
- Limpe a sessão em `whatsapp-session-*`
- Escaneie o QR code novamente

## Monitoramento em Tempo Real

Para monitorar via dashboard simples, acesse:
```
http://seu-servidor:3005/status
```

E crie um refresh automático (a cada 30s):
```html
<meta http-equiv="refresh" content="30">
```

## Alertas Recomendados

Configure alertas para:
1. **Service Down**: Quando `/status` retorna erro
2. **Instância Desconectada**: `connected === false` por >15 minutos
3. **Alto Número de Reconexões**: `reconnectAttempts > 3` em 1 hora
4. **Memory Warning**: Uso >400MB

## Performance

- **Latência**: ~200-500ms por mensagem
- **Taxa**: ~50-100 mensagens/segundo por instância
- **Memória**: ~100-200MB por instância
- **CPU**: ~5-15% em idle

## Segurança

- Proteja o serviço com firewall
- Use autenticação na API (adicionar se necessário)
- Não exponha porta 3005 publicamente
- Use HTTPS com reverse proxy (Nginx)

## Próximos Passos

1. ✅ Inicie o serviço usando uma das opções acima
2. ✅ Crie/conecte instâncias WhatsApp via dashboard
3. ✅ Configure monitoramento (Uptime Kuma ou similar)
4. ✅ Configure alertas para seu canal preferido
5. ✅ Teste reconexão desligando a internet
6. ✅ Verifique logs regularmente

## Suporte

Para problemas, verifique:
- `logs/err.log` e `logs/out.log`
- `pm2 logs whatsapp-service`
- Endpoint `/status` para diagnosticar instâncias específicas
