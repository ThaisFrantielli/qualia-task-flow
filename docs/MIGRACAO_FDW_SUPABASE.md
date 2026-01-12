# 🔗 Migração para Arquitetura Híbrida com FDW

> **Status:** EM EXECUÇÃO  
> **Data Início:** 12/01/2026  
> **Versão:** 1.1

## ✅ Progresso da Execução

| Fase | Item | Status |
|------|------|--------|
| **Código** | Edge Function `fdw-health-check` | ✅ Criada |
| **Código** | Edge Function `fdw-query` | ✅ Criada |
| **Código** | Hook `useBIDataFDW.ts` | ✅ Criado |
| **Código** | Config `supabase/config.toml` | ✅ Atualizado |
| **SQL** | Script PostgreSQL local | ✅ `scripts/sql/setup-postgresql-local-fdw.sql` |
| **SQL** | Script Supabase FDW | ✅ `scripts/sql/setup-fdw-supabase.sql` |
| **Infra** | Configurar postgresql.conf | ⏳ Manual |
| **Infra** | Configurar pg_hba.conf | ⏳ Manual |
| **Infra** | Firewall/NAT | ⏳ Manual |
| **Supabase** | Executar SQL FDW | ⏳ Manual |
| **Teste** | Validar conexão | ⏳ Pendente |

Este documento descreve a migração da arquitetura atual (ETL → JSONs no Storage) para uma arquitetura híbrida usando **Foreign Data Wrapper (FDW)**, permitindo que o Supabase acesse diretamente o PostgreSQL local sem duplicar dados.

### Benefícios Esperados
- ✅ Redução de ~80% no uso do Supabase
- ✅ Dados sempre atualizados em tempo real
- ✅ Elimina sincronização duplicada
- ✅ Custo zero adicional (PostgreSQL local já existe)
- ✅ Fallback para JSONs se FDW falhar

---

## 🏗️ Arquitetura Atual vs. Nova

### Arquitetura Atual
```
SQL Server DW → ETL (Node.js) → PostgreSQL Local → JSONs → Supabase Storage → Frontend
```

### Nova Arquitetura (FDW)
```
SQL Server DW → ETL (Node.js) → PostgreSQL Local ←─ FDW ─→ Supabase → Frontend
                                                           ↓
                                               Storage JSONs (fallback)
```

---

## 📊 Classificação de Tabelas

### Manter no Supabase (Dados Operacionais + RLS)
| Tabela | Motivo |
|--------|--------|
| `profiles` | Auth, RLS, user data |
| `tasks`, `subtasks` | Gestão de tarefas |
| `tickets` | Atendimento |
| `whatsapp_*` | Integração WhatsApp |
| `notifications` | Real-time |
| `email_accounts` | Integração email |
| `atendimentos` | CRM operacional |
| `oportunidades` | Pipeline de vendas |

### Migrar para Foreign Table (FDW)
| Tabela | Tamanho Estimado | Motivo |
|--------|------------------|--------|
| `dim_clientes` | ~4.4 MB | Alto volume, apenas leitura |
| `dim_frota` | ~2 MB | Dados de veículos |
| `dim_contratos_locacao` | ~1 MB | Contratos |
| `fat_faturamentos` | ~5 MB | Faturamento |
| `agg_dre_mensal` | ~500 KB | DRE consolidado |
| `fat_manutencao_*` | ~3 MB | Manutenção |

### Remover do Supabase
| Tabela | Motivo |
|--------|--------|
| `clientes` (sincronizada) | Duplicação com dim_clientes |

---

## 🔧 Fase 1: Preparar PostgreSQL Local

### 1.1 Configurar PostgreSQL para Conexões Externas

**Editar `postgresql.conf`:**
```conf
# Localização típica: C:\Program Files\PostgreSQL\16\data\postgresql.conf
listen_addresses = '*'
port = 5432
```

**Editar `pg_hba.conf`:**
```conf
# Localização típica: C:\Program Files\PostgreSQL\16\data\pg_hba.conf
# Adicionar no final:

# Supabase FDW - IPs do Supabase (verificar documentação atual)
host    bluconecta_dw    supabase_fdw_reader    0.0.0.0/0    scram-sha-256

# Ou restringir para IP específico do Supabase (mais seguro)
# host    bluconecta_dw    supabase_fdw_reader    XXX.XXX.XXX.XXX/32    scram-sha-256
```

**Reiniciar PostgreSQL:**
```powershell
# Windows
net stop postgresql-x64-16
net start postgresql-x64-16

# Ou via services.msc
```

### 1.2 Criar Usuário Read-Only

```sql
-- Conectar ao PostgreSQL local como superuser
-- psql -U postgres -d bluconecta_dw

-- Criar usuário dedicado para FDW
CREATE USER supabase_fdw_reader WITH PASSWORD 'SENHA_SEGURA_AQUI';

-- Conceder permissões mínimas (read-only)
GRANT CONNECT ON DATABASE bluconecta_dw TO supabase_fdw_reader;
GRANT USAGE ON SCHEMA public TO supabase_fdw_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO supabase_fdw_reader;

-- Garantir que novas tabelas também tenham permissão
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT ON TABLES TO supabase_fdw_reader;

-- Verificar
\du supabase_fdw_reader
```

### 1.3 Expor PostgreSQL Externamente

#### Opção A: IP Público Fixo (Recomendado para Produção)
- Configurar roteador para NAT/Port Forward da porta 5432
- Atualizar firewall do Windows para permitir conexões externas

```powershell
# Verificar regra de firewall existente
netsh advfirewall firewall show rule name="PostgreSQL"

# Criar regra se não existir
netsh advfirewall firewall add rule name="PostgreSQL" dir=in action=allow protocol=TCP localport=5432
```

#### Opção B: Cloudflare Tunnel (Recomendado para Segurança)
```bash
# Instalar cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Criar túnel
cloudflared tunnel create bluconecta-postgres

# Configurar túnel para PostgreSQL
cloudflared tunnel route tcp --pool-connections 10 bluconecta-postgres
```

#### Opção C: ngrok (Para Testes)
```bash
# Apenas para testes - não recomendado para produção
ngrok tcp 5432
```

### 1.4 Testar Conectividade Externa

```bash
# De outra máquina/rede
psql -h SEU_IP_PUBLICO -p 5432 -U supabase_fdw_reader -d bluconecta_dw

# Ou via PowerShell
Test-NetConnection -ComputerName SEU_IP_PUBLICO -Port 5432
```

---

## 🔧 Fase 2: Configurar FDW no Supabase

### 2.1 Criar Extensão e Servidor FDW

**Executar no SQL Editor do Supabase:**

```sql
-- Habilitar extensão FDW
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Criar servidor remoto
CREATE SERVER bluconecta_dw_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'SEU_IP_PUBLICO_OU_TUNNEL',
    port '5432',
    dbname 'bluconecta_dw',
    fetch_size '50000'  -- Otimização para queries grandes
);

-- Mapear usuário
CREATE USER MAPPING FOR postgres
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'
);

-- Mapear também para authenticated (RLS)
CREATE USER MAPPING FOR authenticated
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'
);

-- Mapear para anon (público)
CREATE USER MAPPING FOR anon
SERVER bluconecta_dw_server
OPTIONS (
    user 'supabase_fdw_reader',
    password 'SENHA_SEGURA_AQUI'
);
```

### 2.2 Importar Tabelas como Foreign Tables

```sql
-- Importar tabelas específicas do schema public
IMPORT FOREIGN SCHEMA public
LIMIT TO (
    dim_clientes,
    dim_frota,
    dim_condutores,
    dim_fornecedores,
    dim_contratos_locacao,
    dim_itens_contrato,
    dim_regras_contrato,
    dim_veiculos_acessorios,
    fat_faturamentos,
    fat_detalhe_itens_os,
    fat_ocorrencias_master,
    fat_financeiro_universal,
    agg_dre_mensal,
    fat_churn,
    fat_inadimplencia,
    fat_manutencao_unificado,
    fat_manutencao_completa,
    hist_vida_veiculo_timeline
)
FROM SERVER bluconecta_dw_server
INTO public;

-- Verificar tabelas importadas
SELECT * FROM information_schema.foreign_tables;
```

### 2.3 Testar Conectividade

```sql
-- Teste simples
SELECT COUNT(*) FROM dim_clientes;

-- Teste com join
SELECT 
    c.razao_social,
    f.placa,
    f.modelo
FROM dim_clientes c
JOIN dim_frota f ON c.codigo_cliente = f.cliente_codigo
LIMIT 10;
```

---

## 🔧 Fase 3: Criar Views Unificadas

### 3.1 View de Clientes Completo

```sql
-- View que combina dados operacionais do Supabase com dados BI via FDW
CREATE OR REPLACE VIEW v_clientes_360 AS
SELECT 
    -- Dados do Supabase (operacionais)
    c.id AS supabase_id,
    c.stage_id,
    c.ultimo_atendente_id,
    c.ultimo_atendimento_at,
    c.status_triagem,
    c.descartado_em,
    c.descartado_motivo,
    
    -- Dados do BI via FDW
    bi.codigo_cliente,
    bi.razao_social,
    bi.nome_fantasia,
    bi.cpf_cnpj,
    bi.email,
    bi.telefone,
    bi.cidade,
    bi.estado,
    bi.segmento,
    bi.situacao,
    bi.data_criacao,
    bi.grupo_economico
    
FROM dim_clientes bi  -- Foreign table
LEFT JOIN clientes c ON c.codigo_cliente = bi.codigo_cliente::text;

-- Conceder acesso
GRANT SELECT ON v_clientes_360 TO authenticated;
GRANT SELECT ON v_clientes_360 TO anon;
```

### 3.2 View de Frota Completo

```sql
CREATE OR REPLACE VIEW v_frota_360 AS
SELECT 
    f.*,
    c.razao_social AS cliente_nome,
    c.cidade AS cliente_cidade
FROM dim_frota f
LEFT JOIN dim_clientes c ON f.cliente_codigo = c.codigo_cliente;

GRANT SELECT ON v_frota_360 TO authenticated;
```

---

## 🔧 Fase 4: Atualizar Aplicação

### 4.1 Modificar useBIData Hook

O hook `useBIData` deve tentar FDW primeiro, fallback para Storage JSON:

```typescript
// src/hooks/useBIData.ts - Adicionar suporte a FDW

export function useBIDataWithFDW<T>(tableName: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'fdw' | 'storage' | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Tentar via FDW (query direta)
        const { data: fdwData, error } = await supabase
          .from(tableName) // Foreign table
          .select('*')
          .limit(10000);

        if (!error && fdwData) {
          setData(fdwData as T);
          setSource('fdw');
          return;
        }

        // Fallback para Storage JSON
        console.warn(`FDW failed for ${tableName}, falling back to Storage`);
        const { data: storageData } = await supabase.storage
          .from('bi-reports')
          .download(`${tableName}.json`);

        if (storageData) {
          const json = await storageData.text();
          setData(JSON.parse(json));
          setSource('storage');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tableName]);

  return { data, loading, source };
}
```

### 4.2 Desabilitar Sincronização de Clientes

```typescript
// src/hooks/useSyncClientesFromBI.ts
// Adicionar flag para desabilitar sincronização após FDW ativo

const FDW_ENABLED = true; // Mudar para true após migração

export function useSyncClientesFromBI() {
  const syncClientes = async () => {
    if (FDW_ENABLED) {
      console.log('FDW habilitado - sincronização desabilitada');
      return { added: 0, skipped: 0, errors: 0, total: 0 };
    }
    // ... código existente
  };
}
```

---

## 🔧 Fase 5: Edge Function de Health Check

### 5.1 Criar Edge Function `fdw-health-check`

```typescript
// supabase/functions/fdw-health-check/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const startTime = Date.now();

    // Testar query simples via FDW
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("count")
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return new Response(
        JSON.stringify({
          status: "error",
          fdw_available: false,
          error: error.message,
          fallback: "storage",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        status: "healthy",
        fdw_available: true,
        latency_ms: latency,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "error",
        fdw_available: false,
        error: err.message,
        fallback: "storage",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

---

## 🔧 Fase 6: Limpeza e Otimização

### 6.1 Após Validar FDW Funcionando

```sql
-- Limpar dados duplicados do Supabase
-- CUIDADO: Executar apenas após confirmar FDW estável

-- Opção 1: Truncar tabela de clientes sincronizados
-- TRUNCATE TABLE clientes;

-- Opção 2: Remover apenas registros vindos do BI
-- DELETE FROM clientes WHERE origem = 'dim_clientes_bi';

-- Verificar espaço recuperado
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### 6.2 Ajustar ETL

O ETL (`run-sync-v2.js`) deve continuar:
- ✅ Populando PostgreSQL local (fonte para FDW)
- ❌ Remover upload de JSONs para tabelas que agora são FDW
- ✅ Manter JSONs apenas para cache/fallback

---

## 📋 Checklist de Execução

### Pré-Requisitos
- [ ] IP público disponível OU túnel configurado
- [ ] Acesso ao postgresql.conf e pg_hba.conf
- [ ] Credenciais de superuser do PostgreSQL local
- [ ] Acesso ao SQL Editor do Supabase

### Fase 1: PostgreSQL Local
- [ ] Configurar `listen_addresses = '*'`
- [ ] Configurar `pg_hba.conf` com regra para Supabase
- [ ] Reiniciar PostgreSQL
- [ ] Criar usuário `supabase_fdw_reader`
- [ ] Conceder permissões SELECT
- [ ] Configurar firewall/NAT
- [ ] Testar conectividade externa

### Fase 2: Supabase FDW
- [ ] Criar extensão `postgres_fdw`
- [ ] Criar servidor FDW
- [ ] Criar user mappings (postgres, authenticated, anon)
- [ ] Importar foreign tables
- [ ] Testar queries básicas

### Fase 3: Views e Aplicação
- [ ] Criar views unificadas
- [ ] Atualizar hooks para usar FDW
- [ ] Testar dashboards com FDW
- [ ] Implementar fallback para Storage

### Fase 4: Validação
- [ ] Testar todos os 21 dashboards
- [ ] Verificar latência aceitável (<500ms)
- [ ] Testar fallback quando FDW offline
- [ ] Monitorar por 48h antes de limpeza

### Fase 5: Limpeza
- [ ] Backup dos dados do Supabase
- [ ] Remover dados duplicados
- [ ] Ajustar ETL para não duplicar
- [ ] Documentar arquitetura final

---

## 🆘 Troubleshooting

### Erro: "could not connect to server"
- Verificar firewall local
- Verificar pg_hba.conf
- Testar conectividade com `telnet IP 5432`

### Erro: "password authentication failed"
- Verificar senha do usuário FDW
- Verificar método de auth no pg_hba.conf (scram-sha-256)

### Erro: "permission denied for table"
- Executar GRANT SELECT novamente
- Verificar se usuário está conectando ao database correto

### Latência Alta (>1000ms)
- Verificar conexão de internet
- Considerar materializar views localmente
- Implementar cache no Supabase

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Meta | Status |
|---------|-------|------|--------|
| Uso Storage Supabase | ~28 MB | <10 MB | ⏳ |
| Latência queries BI | N/A | <500ms | ⏳ |
| Sincronização diária | 3x/dia | Tempo real | ⏳ |
| Fallback disponível | ❌ | ✅ | ⏳ |

---

**Última Atualização:** 12/01/2026  
**Responsável:** Equipe BluFleet  
**Status:** Planejado - Aguardando Execução
