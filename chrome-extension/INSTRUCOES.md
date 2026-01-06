# 📦 Como Publicar na Chrome Web Store (Não Listado)

## 1. Preparar os Arquivos

### Criar os Ícones
Crie 3 arquivos de ícone PNG na pasta `icons/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

### Gerar o Arquivo ZIP
1. Selecione **todos os arquivos** da pasta `chrome-extension/`:
   - `manifest.json`
   - `popup.html`
   - `popup.css`
   - `popup.js`
   - pasta `icons/` (com os 3 ícones)

2. Compacte em um arquivo `.zip` (ex: `quality-frotas-extension.zip`)

> ⚠️ **Importante**: O ZIP deve conter os arquivos na raiz, não dentro de uma subpasta!

---

## 2. Criar Conta de Desenvolvedor

1. Acesse: https://chrome.google.com/webstore/devconsole
2. Faça login com uma conta Google
3. Pague a taxa única de **US$ 5** (apenas uma vez)
4. Aceite os termos de desenvolvedor

---

## 3. Enviar a Extensão

1. No Developer Dashboard, clique em **"Novo item"**
2. Faça upload do arquivo `.zip`
3. Preencha as informações:

### Informações Obrigatórias:
| Campo | Valor Sugerido |
|-------|----------------|
| Nome | Quality Frotas - Criador de Tarefas |
| Descrição | Extensão interna para criar tarefas rapidamente no sistema Quality Frotas |
| Categoria | Produtividade |
| Idioma | Português (Brasil) |

### Screenshots (Obrigatórias):
- Tire 1-2 screenshots da extensão funcionando
- Tamanho: 1280x800 ou 640x400 pixels

### Ícone Promocional:
- Tamanho: 128x128 pixels (mesmo que o icon128.png)

---

## 4. Configurar como "Não Listado"

1. Na aba **"Distribuição"**
2. Em **Visibilidade**, selecione: **"Não listado"**
   - Isso significa que a extensão só pode ser instalada por quem tem o link direto
   - Ela NÃO aparecerá nas buscas da Chrome Web Store

---

## 5. Enviar para Revisão

1. Clique em **"Enviar para revisão"**
2. Aguarde a aprovação (geralmente 1-3 dias úteis)
3. Após aprovado, você receberá um **link direto** para compartilhar com sua equipe

---

## 6. Instalar na Equipe

Compartilhe o link da Chrome Web Store com sua equipe. Eles poderão instalar diretamente clicando em "Adicionar ao Chrome".

---

## 🧪 Testar Localmente (Antes de Publicar)

1. Abra o Chrome e vá para: `chrome://extensions/`
2. Ative o **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `chrome-extension/`
5. A extensão aparecerá na barra de ferramentas do Chrome

---

## 🔧 Atualizações Futuras

Para atualizar a extensão:
1. Aumente a versão no `manifest.json` (ex: "1.0.0" → "1.0.1")
2. Gere um novo arquivo ZIP
3. No Developer Dashboard, clique em **"Enviar atualização"**
4. Faça upload do novo ZIP
5. Envie para revisão novamente

---

## ❓ Dúvidas Frequentes

**P: Quanto tempo leva a aprovação?**
R: Normalmente 1-3 dias úteis. Extensões simples são aprovadas mais rápido.

**P: Preciso pagar todo mês?**
R: Não! A taxa de US$ 5 é única e vitalícia.

**P: A equipe precisa de conta Google?**
R: Sim, precisam estar logados no Chrome com uma conta Google para instalar extensões.

**P: Posso atualizar sem nova revisão?**
R: Não, toda atualização passa por revisão (mas é mais rápida que a primeira).
