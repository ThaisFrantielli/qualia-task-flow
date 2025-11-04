# 🔧 Configuração do Supabase

Este documento explica todas as configurações necessárias no Supabase para que o sistema funcione corretamente em produção.

## 📧 Configuração de Email (Recuperação de Senha)

### 1. Site URL (URL Principal)
Configure a URL principal do seu aplicativo:

**Local:**
- Vá para: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/url-configuration
- Em **Site URL**, configure:
  - **Desenvolvimento:** `http://localhost:5173`
  - **Produção:** `https://seu-dominio.vercel.app` (ou sua URL de produção)

### 2. Redirect URLs (URLs de Redirecionamento)
Configure todas as URLs permitidas para redirecionamento após autenticação:

**Local:**
- Na mesma página de URL Configuration
- Em **Redirect URLs**, adicione:
  ```
  http://localhost:5173/**
  https://seu-dominio.vercel.app/**
  https://seu-dominio-preview.vercel.app/**
  ```

> **⚠️ IMPORTANTE:** O `/**` no final permite todos os paths dentro do domínio.

### 3. Email Templates
Configure os templates de email para uma melhor experiência:

**Local:**
- Vá para: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/templates

**Templates importantes:**
- **Confirm Signup:** Email de confirmação de cadastro
- **Reset Password:** Email de recuperação de senha
- **Magic Link:** Email com link mágico de login

### 4. Configuração de Provedores de Email

Por padrão, o Supabase usa um servidor SMTP básico para desenvolvimento, mas **NÃO é recomendado para produção**.

**Para produção, configure um provedor de email:**

**Local:**
- Vá para: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/settings/auth

**Opções recomendadas:**
- **SendGrid**
- **AWS SES**
- **Mailgun**
- **Postmark**
- **Resend**

**Configuração SMTP:**
```
SMTP Host: smtp.seu-provedor.com
SMTP Port: 587
SMTP User: seu-usuario
SMTP Password: sua-senha
Sender Email: noreply@seu-dominio.com
Sender Name: Seu Sistema
```

## 🔐 Configuração de Autenticação

### Desabilitar "Confirm Email" (Opcional - Apenas Desenvolvimento)

Para acelerar testes em desenvolvimento, você pode desabilitar a confirmação de email:

**Local:**
- Vá para: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/providers
- Em **Email**, desmarque **"Enable email confirmations"**

> **⚠️ ATENÇÃO:** Reative isso em produção para segurança!

## 🌐 Configuração de Domínio Personalizado (Opcional)

Se você tem um domínio personalizado:

1. Configure seu domínio no Vercel/sua hospedagem
2. Adicione o domínio nas **Redirect URLs** do Supabase
3. Atualize a **Site URL** para seu domínio personalizado

## ✅ Checklist de Verificação

Antes de colocar em produção, verifique:

- [ ] Site URL configurada para produção
- [ ] Todas as URLs de redirecionamento adicionadas (localhost, preview, produção)
- [ ] Provedor de email SMTP configurado (não usar o padrão em produção)
- [ ] Templates de email personalizados (opcional)
- [ ] Email confirmation habilitado em produção
- [ ] Teste completo do fluxo de recuperação de senha
- [ ] Teste completo do fluxo de cadastro

## 🔍 Testando a Configuração

### Teste de Recuperação de Senha:

1. Acesse a página de login: `/login`
2. Clique em "Esqueci minha senha"
3. Digite um email cadastrado
4. Verifique se o email chegou
5. Clique no link do email
6. Deve redirecionar para `/reset-password`
7. Digite a nova senha
8. Confirme que consegue fazer login com a nova senha

### Teste de Cadastro:

1. Acesse a página de cadastro: `/signup`
2. Preencha os dados
3. Se "Email Confirmation" estiver habilitado, verifique o email
4. Clique no link de confirmação
5. Faça login

## 🆘 Problemas Comuns

### Erro: "requested path is invalid"
**Solução:** Adicione a URL nas **Redirect URLs** do Supabase

### Redireciona para localhost em produção
**Solução:** Configure a **Site URL** para a URL de produção

### Email não chega
**Soluções:**
- Verifique a caixa de spam
- Configure um provedor SMTP em produção
- Verifique os logs de email no Supabase

### Link de recuperação expira muito rápido
**Solução:** Os links de recuperação são válidos por 1 hora por padrão. Isso não pode ser alterado nas configurações do Supabase.

## 📚 Links Úteis

- **URL Configuration:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/url-configuration
- **Auth Providers:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/providers
- **Email Templates:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/auth/templates
- **Auth Settings:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/settings/auth
- **Auth Logs:** https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/logs/auth-logs

## 🔒 Segurança

**NUNCA:**
- Compartilhe suas chaves de API publicamente
- Use o servidor SMTP padrão do Supabase em produção
- Desabilite a confirmação de email em produção
- Deixe URLs de redirecionamento muito abertas (sempre use domínios específicos)

**SEMPRE:**
- Use HTTPS em produção
- Configure Rate Limiting no Supabase
- Monitore os logs de autenticação
- Use senhas fortes para contas de administrador
