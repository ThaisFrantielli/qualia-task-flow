# 📱 WhatsApp Service 24/7 - Quick Start Guide

## 🚀 Iniciar em 2 Minutos

### Para Windows:
```batch
cd whatsapp-service
npm install
start-24-7.bat
```

### Para Linux/Mac:
```bash
cd whatsapp-service
npm install
chmod +x start-24-7.sh
./start-24-7.sh
```

### Com Docker (Recomendado):
```bash
cd whatsapp-service
docker-compose up -d
```

---

## ✨ O que está Funcionando?

✅ **Auto-Reconexão**: Se perder a conexão, reconecta automaticamente  
✅ **Health Check**: Verifica a cada 5 minutos se está tudo OK  
✅ **Auto-Restart**: Se o serviço cair, reinicia sozinho  
✅ **Logging**: Todos os eventos são registrados  
✅ **Status API**: Monitore via `http://localhost:3005/status`  

---

## 🔍 Monitorar Status

### No terminal (enquanto está rodando):
```bash
curl http://localhost:3005/status
```

### No logis (para ver o que está acontecendo):
```bash
# Windows
type whatsapp-service\logs\*.log

# Linux/Mac
tail -f whatsapp-service/logs/out.log
```

---

## 🔗 Conectar WhatsApp

1. Abra no browser: `http://localhost:3005`
2. Clique em "Nova Instância"
3. Escaneie o QR code com WhatsApp
4. Pronto! Permanecerá conectado 24/7

---

## 📊 Monitoramento Avançado

### Setup com PM2 (Linux/Mac):
```bash
npm install -g pm2
cd whatsapp-service
pm2 start ecosystem.config.js
pm2 save              # Salva para auto-start
pm2 logs              # Ver logs
pm2 monit             # Monitor em tempo real
```

### Setup com Uptime Kuma:
1. Instale [Uptime Kuma](https://uptime.kuma.pet/)
2. Novo Monitor → HTTP
3. URL: `http://seu-ip:3005/status`
4. Intervalo: 300 segundos
5. Configure alertas (Slack, Discord, Email, etc)

---

## 🚨 Troubleshooting

### Serviço não inicia?
1. Verifique Node.js: `node --version`
2. Instale dependências: `npm install`
3. Veja logs: Revise a saída do terminal

### Instância não conecta?
1. Verifique internet
2. Se estiver rodando há dias, limpe cache:
   ```bash
   rm -rf whatsapp-session-*
   ```
3. Escaneie QR novamente

### Memory leak?
1. Configure limite em `ecosystem.config.js`
2. Se usar Docker, já tem limite (500MB)
3. Reinicia automaticamente se exceder

### Logs não aparecem?
```bash
mkdir -p logs
chmod 777 logs
```

---

## 🔧 Configurações Avançadas

Edite `index-auto-reconnect.js`:

```javascript
const RECONNECT_CONFIG = {
    maxRetries: 5,              // Máx tentativas de reconexão
    initialDelay: 5000,         // Milissegundos antes da 1ª tentativa
    maxDelay: 60000,            // Máximo intervalo entre tentativas
    healthCheckInterval: 300000, // Check saúde a cada 5 min
    autoReconnectEnabled: true  // Enable/disable auto-reconnect
};
```

---

## 📈 Performance Esperado

- **Latência**: 200-500ms por mensagem
- **Taxa**: 50-100 msg/s por instância  
- **Memória**: 100-200MB por instância
- **CPU**: 5-15% em idle (por instância)

---

## 🔒 Segurança

- ⚠️ NÃO exponha porta 3005 na internet diretamente
- Use um reverse proxy (Nginx) com HTTPS
- Adicione autenticação se necessário
- Mantenha o serviço atualizado

---

## 📝 APIs Úteis

### Health Check
```bash
GET http://localhost:3005/status
```

### Status de Instância
```bash
GET http://localhost:3005/instances/instance-1/status
```

### Forçar Reconexão
```bash
POST http://localhost:3005/instances/instance-1/reconnect
```

### Obter QR Code
```bash
GET http://localhost:3005/instances/instance-1/qr
```

---

## 🎯 Próximos Passos

1. ✅ Inicie o serviço com `start-24-7.bat` ou `.sh`
2. ✅ Crieinstâncias WhatsApp via `http://localhost:3005`
3. ✅ Escaneie os QR codes
4. ✅ Configure monitoramento com Uptime Kuma
5. ✅ Configureertas para falhas

---

## 📞 Suporte

Se algo não funcionar:
1. Revise logs: `logs/out.log` e `logs/err.log`
2. Verifique endpoint `http://localhost:3005/status`
3. Teste conexão: `curl -v http://localhost:3005/status`
4. Reinicie: `Ctrl+C` e execute novamente

---

**Agora seu WhatsApp está rodando 24/7 sem interferência! 🎉**
