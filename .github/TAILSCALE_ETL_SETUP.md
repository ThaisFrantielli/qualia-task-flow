# ETL Sem PC Ligado com GitHub Actions + Tailscale (Sem Custo)

Este guia configura o ETL para rodar em `ubuntu-latest` no GitHub Actions sem expor o SQL Server publicamente.

## Arquitetura

1. GitHub Actions agenda o workflow com `cron`.
2. O job sobe um nó efêmero no Tailscale.
3. O job acessa o SQL Server pelo IP privado Tailnet.
4. ETL executa `scripts/local-etl/run-sync-v3.js`.

Sem VM cloud dedicada e sem depender do seu computador pessoal.

## Pré-requisito essencial

Precisa existir **um nó sempre ligado** dentro da rede do SQL Server para rotear/acessar o banco.

Opções sem custo:
- Instalar Tailscale no próprio servidor do SQL Server (melhor opção).
- Instalar em outro host sempre ligado da empresa (mini PC/NAS/servidor).

## Passo 1 - Instalar Tailscale no host do SQL Server

No host que enxerga o SQL Server:

- Instale Tailscale.
- Faça login na Tailnet.
- Garanta acesso à porta SQL (`1433` ou a porta real).

## Passo 2 - Criar credenciais OAuth para GitHub Action

No painel do Tailscale:

1. Crie OAuth Client para CI.
2. Permita criação de nós com tag `tag:ci`.
3. Salve `client id` e `client secret`.

## Passo 3 - ACL mínima recomendada

Exemplo de política (ajuste IP/porta):

```json
{
  "tagOwners": {
    "tag:ci": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:ci"],
      "dst": ["100.64.0.10:1433"]
    }
  ]
}
```

## Passo 4 - Configurar GitHub Secrets

Em `Settings > Secrets and variables > Actions`:

- `TS_OAUTH_CLIENT_ID`
- `TS_OAUTH_SECRET`
- `SQL_SERVER` (IP da Tailnet, exemplo `100.x.y.z`)
- `SQL_PORT`
- `SQL_USER`
- `SQL_PASSWORD`
- `SQL_DATABASE`
- `PG_POOLER_HOST`
- `PG_POOLER_PORT`
- `PG_POOLER_USER`
- `PG_PASSWORD`
- `PG_DATABASE`
- `HEAVY_PG_POOLER_HOST`
- `HEAVY_PG_POOLER_PORT`
- `HEAVY_PG_POOLER_USER`
- `HEAVY_PG_PASSWORD`
- `HEAVY_PG_DATABASE`

## Passo 5 - Validar

1. Rode `Run workflow` manualmente em `.github/workflows/db-sync.yml`.
2. Confirme etapa `Conectar ao Tailscale` com sucesso.
3. Confirme etapa `Validar acesso ao SQL Server pela Tailnet` com sucesso.
4. Confirme execução completa do ETL v3.

## Segurança

- Não exponha SQL Server em IP público.
- Restrinja ACL por `tag:ci` e destino exato (`IP:porta`).
- Rotacione OAuth secret e senha do SQL periodicamente.
