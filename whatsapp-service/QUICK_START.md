# 🚀 Início Rápido - WhatsApp Service

## ⚡ 3 Passos para Conectar

### 1️⃣ Abra o Terminal

**Windows:**
- Pressione `Win + R`
- Digite `cmd` e pressione Enter
- Navegue até a pasta do projeto

**Mac/Linux:**
- Abra o Terminal
- Navegue até a pasta do projeto

### 2️⃣ Execute os Comandos

```bash
cd whatsapp-service
npm install
npm start
```

### 3️⃣ Abra o Navegador

Acesse: **http://localhost:8081/configuracoes/whatsapp**

---

## 📱 O Que Você Verá

### ✅ **Sucesso** - Serviço Funcionando

```
╔════════════════════════════════════════════════════╗
║   WhatsApp Multi-Session Service                  ║
╚════════════════════════════════════════════════════╝

✓ Supabase conectado
✓ Servidor rodando em http://localhost:3005
```

**No navegador:** Alerta amarelo desaparece, você pode criar conexões.

### ❌ **Erro** - Porta em Uso

```
Error: listen EADDRINUSE: address already in use :::3005
```

**Solução:**
```bash
# Encerre o processo anterior
lsof -ti:3005 | xargs kill -9  # Mac/Linux
# OU
netstat -ano | findstr :3005   # Windows (anote o PID)
taskkill /F /PID [numero_do_pid]  # Windows
```

### ❌ **Erro** - Node.js Não Instalado

```
'node' is not recognized as an internal or external command
```

**Solução:** Instale Node.js de https://nodejs.org/

---

## 🎯 Próximo Passo: Conectar WhatsApp

1. Com o serviço rodando, clique em **"Nova Conexão"**
2. Digite um nome (ex: "Atendimento")
3. Aguarde o QR Code
4. Abra WhatsApp no celular
5. Vá em **Dispositivos conectados**
6. Escaneie o código
7. **Pronto!** 🎉

---

## 🆘 Precisa de Ajuda?

Consulte o **README.md** completo para:
- Solução detalhada de problemas
- Configurações avançadas
- Explicação dos endpoints
- Integração com Supabase

---

**💡 Dica:** Mantenha o terminal aberto enquanto usa o WhatsApp!
