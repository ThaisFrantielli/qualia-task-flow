
# Plano: Correcao do Deploy Vercel e Analise da Atualizacao de Dados

## 1. Problema do Deploy no Vercel

### Causa Raiz

O `vercel.json` usa a API legada `builds` + `routes`, que conflita com a API moderna `headers`. O Vercel nao suporta misturar essas APIs corretamente. Alem disso, o `vercel.json` forca Content-Type para `application/javascript` em **todos** os arquivos dentro de `/assets/`, incluindo CSS e fontes -- isso quebra o carregamento de estilos e assets.

### Problemas Especificos

1. **API mista**: `builds` (legada) + `routes` (legada) misturado com `headers` (que funciona melhor com `rewrites` moderna)
2. **Content-Type incorreto**: A regra `source: "/assets/(.*)"` aplica `Content-Type: application/javascript` para **todos** os arquivos, incluindo `.css`, `.woff2`, `.png` -- o navegador rejeita CSS servido como JavaScript
3. **Duplicidade de regras**: Ha regras separadas para `.js`, `.css`, `.woff2`, `.png`, `.svg` que ja cobrem o que a regra `/assets/(.*)` tenta fazer

### Solucao

Reescrever o `vercel.json` usando a API moderna e corrigir os Content-Types:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!assets|data).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/:path*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/data/:path*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" },
        { "key": "Content-Type", "value": "application/json; charset=utf-8" }
      ]
    }
  ]
}
```

Mudancas-chave:
- Removida a secao `builds` (Vercel detecta automaticamente projetos Vite)
- Usar `rewrites` em vez de `routes` (API moderna)
- Remover forcamento de Content-Type em `/assets/` -- o Vercel ja detecta o MIME correto automaticamente
- Adicionar regra para `/data/` com `Content-Type: application/json` para evitar que os JSONs do BI sejam servidos como HTML
- O `rewrites` exclui `/assets/` e `/data/` do fallback para `index.html`, garantindo que arquivos estaticos sejam servidos diretamente

---

## 2. Analise da Atualizacao Automatica de Dados

### Como Funciona Hoje

```text
SQL Server (DW) --> GitHub Actions (ETL 3x/dia) --> PostgreSQL (Neon)
                                                       |
                                                       v
                                                  JSONs em public/data/
                                                       |
                                                       v
                                              Frontend (useBIData hook)
```

**Schedule**: GitHub Actions roda nos horarios UTC `03:30`, `13:30`, `18:30` (equivalente a ~00:30, 10:30, 15:30 horario de Brasilia)

**Fluxo**:
1. O script `run-sync-v2.js` conecta ao SQL Server, extrai dados, e grava no PostgreSQL (Neon)
2. Gera arquivos JSON particionados em `public/data/` (ex: `dim_frota.json`, `agg_custos_detalhados_part1of26.json`)
3. Faz commit automatico via GitHub Actions (permissions: contents: write)
4. O Vercel detecta o push e faz redeploy automatico

**Frontend**:
- O hook `useBIData` carrega JSONs via `fetch('/data/nome.json')`
- Suporta manifests + partes para arquivos grandes
- Cache de 5 minutos em memoria
- O `DataUpdateBadge` exibe metadados de atualizacao (DW timestamp, ETL timestamp, versao)

### Problemas Identificados

1. **JSONs servidos como HTML**: Sem Content-Type adequado no Vercel, quando o browser pede `/data/dim_frota.json` e o arquivo nao existe, o fallback retorna `index.html` -- o `useBIData` ja tem protecao contra isso (verifica se o body comeca com `<`), mas o Content-Type correto evita o problema na raiz.

2. **Dados desatualizados apos deploy**: O ETL faz commit no GitHub, mas se o Vercel nao redeployar (ex: branch errada, webhook desabilitado), os dados ficam desatualizados. A imagem mostra dados de 10/02/2026 (2 dias atras), o que e normal para o schedule de 3x/dia.

3. **Sem mecanismo de "force refresh"**: O botao de refetch no `useBIData` limpa o cache de memoria, mas busca os mesmos JSONs estaticos -- nao ha como forcar uma atualizacao real sem um novo deploy.

### Status Atual (Conforme Imagem)

A imagem enviada mostra:
- Ultima atualizacao DW: 10/02/2026, 07:29:14
- ETL executado em: 10/02/2026, 14:21:15
- Registros: 5.824
- Versao ETL: 2.0
- Dados atualizados ha: 1 dia

Isso indica que o ETL esta funcionando corretamente. Os dados tem 1-2 dias de atraso, o que e esperado dado o schedule de 3x/dia. O proximo ETL atualizara os dados automaticamente.

---

## 3. Sequencia de Implementacao

| Ordem | Acao | Impacto |
|-------|------|---------|
| 1 | Reescrever `vercel.json` com API moderna | Corrige deploy e Content-Types |
| 2 | Verificar build local sem erros TypeScript | Garante que o deploy no Vercel funcione |
| 3 | Testar se JSONs do `/data/` sao servidos corretamente | Valida atualizacao de dados |

---

## 4. Detalhes Tecnicos

### Dependencias Node-only no package.json

O `package.json` inclui pacotes que sao **exclusivamente para backend/ETL** (ex: `mssql`, `pg`, `express`, `body-parser`, `whatsapp-web.js`, `qrcode-terminal`). Estes nao sao importados no codigo frontend (`src/`), entao o Vite nao os inclui no bundle. Porem, o `npm install` no Vercel os instala desnecessariamente, aumentando o tempo de build. Idealmente deveriam estar em um `package.json` separado (como ja existe em `scripts/local-etl/package.json`), mas isso nao causa erro de build -- apenas lentidao.

### noUnusedLocals no tsconfig.json

O `tsconfig.json` tem `noUnusedLocals: true` e `noUnusedParameters: true`. Se houver variaveis nao utilizadas remanescentes, o `tsc` (typecheck) falhara. O `vite build` por si so nao roda `tsc`, entao isso so afeta se o Vercel tiver um step de typecheck. O script de build atual e apenas `vite build`, que deveria funcionar mesmo com warnings de TS.
