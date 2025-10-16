# Como Iniciar o Serviço WhatsApp Automaticamente

## Opção 1: Iniciar Manualmente (Recomendado para desenvolvimento)

```bash
cd whatsapp-service
npm install
npm start
```

O serviço ficará rodando em `http://localhost:3005` e o QR Code aparecerá **automaticamente** na página de configuração em alguns segundos.

---

## Opção 2: Iniciar Automaticamente com PM2 (Produção)

### 1. Instalar PM2 globalmente
```bash
npm install -g pm2
```

### 2. Iniciar o serviço com PM2
```bash
cd whatsapp-service
npm install
pm2 start index.js --name "whatsapp-service"
```

### 3. Salvar a configuração do PM2
```bash
pm2 save
pm2 startup
```

### 4. Comandos úteis do PM2
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs whatsapp-service

# Reiniciar
pm2 restart whatsapp-service

# Parar
pm2 stop whatsapp-service

# Remover
pm2 delete whatsapp-service
```

---

## Opção 3: Rodar como Serviço no Windows (usando NSSM)

### 1. Baixar NSSM
- Acesse: https://nssm.cc/download
- Extraia o arquivo

### 2. Instalar o serviço
```cmd
nssm install WhatsAppService
```

### 3. Configurar:
- **Path**: Caminho completo para `node.exe` (ex: `C:\Program Files\nodejs\node.exe`)
- **Startup directory**: Caminho completo para `whatsapp-service` (ex: `C:\projetos\quality\whatsapp-service`)
- **Arguments**: `index.js`

### 4. Iniciar o serviço
```cmd
nssm start WhatsAppService
```

---

## Opção 4: Rodar como Serviço no Linux (systemd)

### 1. Criar arquivo de serviço
```bash
sudo nano /etc/systemd/system/whatsapp.service
```

### 2. Adicionar conteúdo:
```ini
[Unit]
Description=WhatsApp Service
After=network.target

[Service]
Type=simple
User=seuusuario
WorkingDirectory=/caminho/completo/para/whatsapp-service
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Ativar e iniciar
```bash
sudo systemctl enable whatsapp.service
sudo systemctl start whatsapp.service
sudo systemctl status whatsapp.service
```

### 4. Ver logs
```bash
sudo journalctl -u whatsapp.service -f
```

---

## Como Funciona o QR Code Automático

1. **Ao iniciar o serviço**, o WhatsApp-Web.js automaticamente:
   - Gera um QR Code
   - Salva no Supabase
   - Exibe no terminal

2. **A página de configuração**:
   - Faz polling a cada 3 segundos (nos primeiros 2 minutos)
   - Busca o QR Code do serviço
   - Exibe automaticamente quando disponível
   - Após conexão bem-sucedida, reduz a frequência de polling

3. **Sem necessidade de intervenção manual!** 🎉

---

## Troubleshooting

### QR Code não aparece?
1. Certifique-se que o serviço está rodando: `curl http://localhost:3005/status`
2. Verifique os logs do serviço
3. Tente resetar a sessão na página de configuração
4. Se necessário, delete a pasta `whatsapp-session-default` e reinicie

### Serviço não inicia?
1. Verifique se a porta 3005 está disponível
2. Instale as dependências: `npm install`
3. Verifique se o Node.js está instalado: `node -v` (mínimo v14)

### Conexão cai frequentemente?
1. Mantenha o celular conectado à internet
2. Não faça logout do WhatsApp Web em outros dispositivos
3. Use PM2 para reiniciar automaticamente em caso de falhas
