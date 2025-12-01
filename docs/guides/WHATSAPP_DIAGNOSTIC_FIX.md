# 🔧 Correção do WhatsApp - Diagnóstico e Solução

## 🐛 Problema Identificado

O QR Code não estava aparecendo no frontend porque **backend e frontend estavam usando tabelas diferentes**:

- **Backend** (`index-multi.js`): Salvava QR code na tabela `whatsapp_config`
- **Frontend** (`WhatsAppConfigPage.tsx`): Lia da tabela `whatsapp_instances`

## ✅ Correções Aplicadas

### 1. Backend Sincronizado
Alterado `whatsapp-service/index-multi.js` para usar `whatsapp_instances`:

```javascript
// ANTES (❌)
.from('whatsapp_config')

// DEPOIS (✅)
.from('whatsapp_instances')
```

### 2. Campos Alinhados
Mapeamento correto dos campos:

| Campo Backend | Campo Frontend | Descrição |
|--------------|---------------|-----------|
| `status` | `status` | 'connecting', 'connected', 'disconnected' |
| `phone_number` | `phone_number` | Número conectado |
| `qr_code` | `qr_code` | Texto do QR code |
| `updated_at` | `updated_at` | Timestamp |

### 3. Instância Padrão Removida
Removida inicialização automática da instância "default" - agora todas as instâncias são criadas sob demanda via API.

## 🚀 Como Testar

### 1. Reiniciar o Serviço WhatsApp
```bash
cd whatsapp-service
npm start
```

### 2. Criar Nova Instância
1. Acesse: `http://localhost:8081/configuracoes/whatsapp`
2. Clique em **"Nova Conexão"**
3. Digite um nome (ex: "Vendas")
4. Clique em **"Criar"**

### 3. Aguardar QR Code
- O QR code deve aparecer em **~5-10 segundos**
- Se não aparecer:
  - Verifique logs do serviço no terminal
  - Confirme que a tabela `whatsapp_instances` existe no Supabase

### 4. Escanear QR Code
1. Abra WhatsApp no celular
2. Vá em **"Dispositivos vinculados"**
3. Toque em **"Vincular um dispositivo"**
4. Escaneie o QR code
5. Status mudará para **"Conectado"** ✅

## 🔍 Debug

### Verificar Logs do Serviço
```bash
# Terminal onde o serviço está rodando
# Você deve ver:
[instance-uuid] QR Code received!
[instance-uuid] QR Code saved to Supabase successfully
```

### Verificar Banco de Dados
```sql
-- Verificar instâncias criadas
SELECT id, name, status, qr_code IS NOT NULL as has_qr
FROM whatsapp_instances
ORDER BY created_at DESC;
```

### Verificar Polling Frontend
- Abra DevTools → Network
- Filtrar por: `qr`
- Deve haver requisições para: `GET http://localhost:3005/instances/{id}/qr`

## 📊 Arquitetura Corrigida

```
┌─────────────────┐
│   Frontend      │
│ (React App)     │
└────────┬────────┘
         │
         │ 1. POST /instances (criar)
         │ 2. GET /instances/:id/qr (polling)
         │
┌────────▼────────┐
│ WhatsApp        │
│ Service         │
│ (Node.js:3005)  │
└────────┬────────┘
         │
         │ Salva QR code e status
         │
┌────────▼────────┐
│   Supabase      │
│ whatsapp_       │
│ instances       │ ← Tabela única agora!
└─────────────────┘
```

## ⚠️ Pontos de Atenção

1. **Porta 3005**: O serviço DEVE estar rodando na porta 3005
2. **Supabase URL**: Hardcoded no `index-multi.js` (considerar variável de ambiente)
3. **RLS Policies**: Certifique-se que usuários autenticados podem ler/escrever na tabela
4. **QR Expiration**: QR codes expiram após ~40 segundos - nova solicitação gerará novo QR

## 🎯 Próximos Passos

Agora que o QR code funciona, você pode:

1. **Enviar mensagens** pela interface `/whatsapp`
2. **Receber mensagens** automaticamente
3. **Gerenciar múltiplas instâncias** (vários números)
4. **Monitorar status** em tempo real

---

✅ **Correção aplicada com sucesso!** O WhatsApp agora deve gerar QR codes corretamente no frontend.
