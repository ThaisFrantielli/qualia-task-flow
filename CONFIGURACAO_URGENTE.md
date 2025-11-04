# 🚨 CONFIGURAÇÃO URGENTE - RESOLVER ERRO 404

## Problema Atual
O link de recuperação de senha está dando **erro 404 NOT_FOUND** quando o usuário clica no email.

## Causa
O Supabase não reconhece a URL de redirecionamento porque ela não está configurada nas **Redirect URLs**.

## Solução (5 minutos)

### 1️⃣ Acesse a Configuração de URLs
Abra este link no seu navegador:
```
https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/url-configuration
```

### 2️⃣ Configure o Site URL
No campo **Site URL**, coloque:
```
https://qualityconecta.vercel.app
```

### 3️⃣ Configure as Redirect URLs
No campo **Redirect URLs**, adicione TODAS estas URLs (uma por linha):

```
http://localhost:5173/**
https://qualityconecta.vercel.app/**
https://*.vercel.app/**
https://c62c972d-00bb-44a2-b847-540f233c5168.lovableproject.com/**
```

### 4️⃣ Clique em "Save"

## Teste Imediato

Após salvar as configurações:

1. Vá para: https://qualityconecta.vercel.app/login
2. Clique em "Esqueci minha senha"
3. Digite seu email
4. Abra o email recebido
5. Clique no link
6. **Agora deve funcionar!** ✅

## Visual da Configuração

A página deve ficar assim:

**Site URL:**
```
https://qualityconecta.vercel.app
```

**Redirect URLs:**
```
http://localhost:5173/**
https://qualityconecta.vercel.app/**
https://*.vercel.app/**
https://c62c972d-00bb-44a2-b847-540f233c5168.lovableproject.com/**
```

## Links Úteis

- **Configuração de URLs:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/url-configuration
- **Auth Providers:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/providers
- **Email Templates:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/templates

## Depois de Configurar

Após configurar corretamente, todos estes links funcionarão:

✅ Link de recuperação de senha
✅ Link de confirmação de email (signup)
✅ Link de convite de usuário
✅ Link de magic link (se usar)

## Próximos Passos (Opcional)

Para produção, considere:

1. Configurar provedor de email SMTP profissional (SendGrid, AWS SES, Mailgun)
2. Personalizar templates de email
3. Adicionar domínio customizado

---

**⚠️ IMPORTANTE:** Esta configuração é OBRIGATÓRIA para o funcionamento do sistema!
