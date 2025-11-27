# 🚀 Início Rápido - Serviço WhatsApp

## Opção 1: Scripts Prontos (MAIS FÁCIL) ⚡

### Windows
1. Navegue até a pasta `whatsapp-service`
2. **Clique duas vezes** no arquivo `INICIAR_SERVICO.bat`
3. Aguarde alguns segundos
4. O QR Code aparecerá automaticamente na página web!

### Linux / Mac
1. Abra o terminal na pasta `whatsapp-service`
2. Execute:
   ```bash
   chmod +x iniciar-servico.sh
   ./iniciar-servico.sh
   ```
3. Aguarde alguns segundos
4. O QR Code aparecerá automaticamente na página web!

---

## Opção 2: Comandos Manuais

### Qualquer Sistema Operacional
```bash
cd whatsapp-service
npm install
npm start
```

---

## ✅ Como saber se funcionou?

1. **No terminal/prompt**, você verá:
   ```
   WhatsApp service is running on http://localhost:3005
   QR Code received, generating terminal output...
   ```

2. **Na página web** (http://localhost:PORTA/configuracoes/whatsapp):
   - O QR Code aparecerá automaticamente em 3-5 segundos
   - Você verá a mensagem "Escaneie este código com seu WhatsApp"

3. **No seu celular**:
   - Abra o WhatsApp
   - Vá em "Dispositivos vinculados"
   - Escaneie o QR Code
   - Pronto! ✨

---

## 🔧 Troubleshooting

### Erro: "Node.js não encontrado"
- Instale o Node.js: https://nodejs.org/
- Versão mínima: 14.x

### Erro: "Porta 3005 já está em uso"
- Feche outros programas que possam estar usando a porta
- Ou altere a porta no arquivo `index.js` (linha 290)

### QR Code não aparece na página
1. Verifique se o serviço está rodando (veja mensagem no terminal)
2. Recarregue a página (F5)
3. Aguarde até 30 segundos
4. Clique em "Atualizar" na página

### Serviço para sozinho
- Execute novamente o script
- Ou use PM2 para manter o serviço sempre ativo (veja COMO_INICIAR.md)

---

## 📞 Precisa de ajuda?

1. Verifique o arquivo `COMO_INICIAR.md` para opções avançadas
2. Veja os logs no terminal para identificar erros
3. Certifique-se de estar na pasta correta (`whatsapp-service`)

---

## 🎯 Dica PRO

Para não precisar iniciar manualmente toda vez:
- **Windows**: Use o Task Scheduler + NSSM (veja COMO_INICIAR.md)
- **Linux**: Use systemd (veja COMO_INICIAR.md)
- **Qualquer SO**: Use PM2 (veja COMO_INICIAR.md)
