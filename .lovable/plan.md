
# Plano: Melhorias no Sistema de Tickets (Campos, Vinculações e SLA)

## Visão Geral

Este plano aborda múltiplas melhorias no sistema de tickets para torná-lo mais completo e alinhado com o fluxo real de pós-venda. As mudanças incluem gerenciamento dinâmico de opções, vinculação com cliente e veículo, campos adicionais para contratos/OS/faturas, e controle de tempo para SLA.

---

## 1. Tabelas de Configuração Dinâmica

Criar tabelas para permitir adicionar/excluir opções sem alterar código.

### 1.1 Tabela `ticket_origens` (Nova)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| value | TEXT | Valor técnico (ex: "whatsapp") |
| label | TEXT | Exibição (ex: "WhatsApp") |
| is_active | BOOLEAN | Se está ativo |
| sort_order | INTEGER | Ordem de exibição |

### 1.2 Tabela `ticket_analises_finais` (Nova)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| value | TEXT | procedente, improcedente, duvida |
| label | TEXT | Procedente, Improcedente, Dúvida |
| icon | TEXT | Nome do ícone Lucide |
| color | TEXT | Classe de cor CSS |
| is_active | BOOLEAN | Se está ativo |
| sort_order | INTEGER | Ordem |

### 1.3 Expandir Tabela `ticket_motivos` (Existente)

Adicionar campo `is_active` se não existir para permitir desativar sem excluir.

---

## 2. Novos Campos na Tabela `tickets`

### Colunas a Adicionar

| Campo | Tipo | Descrição |
|-------|------|-----------|
| contrato_comercial | VARCHAR(50) | Número do contrato comercial |
| contrato_locacao | VARCHAR(50) | Número do contrato de locação |
| veiculo_modelo | VARCHAR(100) | Modelo do veículo (auto-preenchido) |
| veiculo_ano | VARCHAR(10) | Ano do veículo |
| veiculo_cliente | VARCHAR(100) | Cliente vinculado ao veículo |
| veiculo_km | INTEGER | KM atual do veículo |
| analise_final | VARCHAR(50) | Procedente/Improcedente/Dúvida |
| tempo_total_segundos | BIGINT | Contador de tempo em segundos |
| data_primeira_interacao | TIMESTAMP | Para SLA de primeira resposta |
| data_conclusao | TIMESTAMP | Para calcular tempo total |

---

## 3. Tabela de Vínculos Múltiplos (OS/Faturas/Ocorrências)

### 3.1 Tabela `ticket_vinculos` (Nova)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| ticket_id | UUID | FK para tickets |
| tipo | VARCHAR(50) | 'ordem_servico', 'fatura', 'ocorrencia' |
| numero | VARCHAR(50) | Número do documento |
| descricao | TEXT | Descrição opcional |
| valor | DECIMAL | Valor (se aplicável) |
| data_documento | DATE | Data do documento |
| created_at | TIMESTAMP | |

Isso permite vincular múltiplas OS, faturas ou ocorrências ao mesmo ticket.

---

## 4. Vinculação de Cliente

### Alterações

1. **CreateTicketDialog**: Substituir o Select simples pelo `ClienteCombobox` existente
2. **TicketDetail**: Exibir dados completos do cliente vinculado (nome, CNPJ, telefone, email)
3. Manter a relação existente `cliente_id` FK para tabela `clientes`

---

## 5. Busca de Veículo por Placa

### Fluxo

1. Usuário digita a placa no campo
2. Sistema busca no JSON `dim_frota.json` (dados BI)
3. Auto-preenche: Modelo, Ano, Cliente, KM, Contrato

### Campos do dim_frota disponíveis

- `Placa`
- `Modelo`
- `AnoModelo` / `AnoFabricacao`
- `Cliente`
- `KmAtual`
- `ContratoLocacao`
- `ContratoComercial`

### Componente a Criar

`PlacaVeiculoInput.tsx` - Campo de input que ao digitar/blur busca dados do veículo.

---

## 6. Fluxo de Solicitar Apoio

### Status Atual

O fluxo atual está correto:
1. Atendente clica "Solicitar Apoio"
2. Seleciona departamento e responsável
3. Registro fica "Pendente" em `ticket_departamentos`
4. Responsável é notificado
5. Quando responde, status muda para "Respondido"

### Melhorias a Implementar

1. **Botão de Responder**: Adicionar ao `TicketDepartamentoCard` para o responsável poder responder diretamente
2. **Notificação de Retorno**: Quando respondido, notificar quem solicitou
3. **Tempo de Resposta**: Registrar tempo entre solicitação e resposta para métricas

---

## 7. Contador de Tempo / SLA

### Implementação

1. **Trigger no Banco**: Calcular `tempo_total_segundos` baseado em `created_at` e `data_conclusao`
2. **Exibição Visual**: Mostrar contador no header do ticket
3. **Histórico de Pausas**: Considerar criar tabela `ticket_tempo_pausas` para pausar SLA em certas situações

### Componente a Criar

`TicketTempoCounter.tsx` - Exibe tempo decorrido desde abertura com formatação amigável.

---

## 8. Página de Configuração Expandida

Expandir `TicketOptionsPage.tsx` para gerenciar:

- **Aba Motivos**: Já existe
- **Aba Origens**: Nova - CRUD de origens de lead
- **Aba Análise Final**: Nova - CRUD de opções de análise
- **Aba Departamentos**: Nova - Gerenciar lista de departamentos

---

## 9. Atualização do Formulário de Ticket

### CreateTicketDialog - Novos Campos

```text
┌─────────────────────────────────────────────────────────┐
│ NOVO TICKET DE PÓS-VENDA                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Assunto: ___________________________________________   │
│                                                         │
│  ┌─────────────────────┐ ┌─────────────────────┐       │
│  │ Cliente [Combobox]  │ │ Placa [Auto-busca]  │       │
│  └─────────────────────┘ └─────────────────────┘       │
│                                                         │
│  ┌ Dados do Veículo (auto-preenchidos) ─────────────┐  │
│  │ Modelo: FIAT ARGO          Ano: 2024             │  │
│  │ Cliente Frota: COMPEL      KM: 45.000            │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────┐ ┌─────────────────────┐       │
│  │ Origem [Dinâmico]   │ │ Motivo [Dinâmico]   │       │
│  └─────────────────────┘ └─────────────────────┘       │
│                                                         │
│  ┌─────────────────────┐ ┌─────────────────────┐       │
│  │ Contrato Comercial  │ │ Contrato Locação    │       │
│  └─────────────────────┘ └─────────────────────┘       │
│                                                         │
│  ┌ Vínculos ────────────────────────────────────────┐  │
│  │ Ordem de Serviço: [____] [+ Adicionar]           │  │
│  │ Fatura:           [____] [+ Adicionar]           │  │
│  │ Ocorrência:       [____] [+ Adicionar]           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Síntese: ______________________________________________│
│                                                         │
│                                    [Criar Ticket]       │
└─────────────────────────────────────────────────────────┘
```

---

## 10. Atualização da Classificação

### TicketClassificacao.tsx - Mudanças

1. Trocar "Parcialmente Procedente" por "Dúvida"
2. Buscar opções da tabela `ticket_analises_finais` em vez de hardcoded
3. Manter ícones dinâmicos baseados no campo `icon` da tabela

---

## Ordem de Implementação

### Fase 1: Banco de Dados
1. Criar tabela `ticket_origens`
2. Criar tabela `ticket_analises_finais`
3. Criar tabela `ticket_vinculos`
4. Adicionar colunas em `tickets`
5. Inserir dados iniciais nas novas tabelas

### Fase 2: Hooks e Serviços
1. `useTicketOrigens()` - CRUD de origens
2. `useTicketAnalises()` - CRUD de análises
3. `useTicketVinculos()` - Gerenciar vínculos
4. `useVeiculoByPlaca()` - Buscar veículo no BI

### Fase 3: Componentes
1. `PlacaVeiculoInput.tsx` - Campo de placa com auto-busca
2. `TicketVinculosManager.tsx` - Gerenciar OS/Faturas/Ocorrências
3. `TicketTempoCounter.tsx` - Contador de tempo
4. Atualizar `TicketClassificacao.tsx`

### Fase 4: Páginas
1. Expandir `TicketOptionsPage.tsx` com novas abas
2. Atualizar `CreateTicketDialog.tsx`
3. Atualizar `TicketDetail.tsx` com novos campos

### Fase 5: Melhorias de Fluxo
1. Botão de responder em `TicketDepartamentoCard`
2. Notificações de retorno
3. Métricas de tempo por departamento

---

## Detalhes Técnicos

### Migração SQL

```sql
-- Tabela de origens
CREATE TABLE public.ticket_origens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de análises finais
CREATE TABLE public.ticket_analises_finais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  icon TEXT DEFAULT 'HelpCircle',
  color TEXT DEFAULT 'text-gray-600',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de vínculos
CREATE TABLE public.ticket_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- ordem_servico, fatura, ocorrencia
  numero VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor DECIMAL(15,2),
  data_documento DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Novas colunas em tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS contrato_comercial VARCHAR(100),
ADD COLUMN IF NOT EXISTS contrato_locacao VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_modelo VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_ano VARCHAR(10),
ADD COLUMN IF NOT EXISTS veiculo_cliente VARCHAR(100),
ADD COLUMN IF NOT EXISTS veiculo_km INTEGER,
ADD COLUMN IF NOT EXISTS analise_final VARCHAR(50),
ADD COLUMN IF NOT EXISTS data_primeira_interacao TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP;

-- Dados iniciais
INSERT INTO ticket_origens (value, label, sort_order) VALUES
('whatsapp', 'WhatsApp', 1),
('site', 'Site', 2),
('ligacao', 'Ligação', 3),
('redes_sociais', 'Redes Sociais', 4),
('email', 'E-mail', 5);

INSERT INTO ticket_analises_finais (value, label, icon, color, sort_order) VALUES
('procedente', 'Procedente', 'CheckCircle', 'text-green-600', 1),
('improcedente', 'Improcedente', 'XCircle', 'text-red-600', 2),
('duvida', 'Dúvida', 'HelpCircle', 'text-yellow-600', 3);
```

### Hook de Busca de Veículo

```typescript
// useVeiculoByPlaca.ts
export function useVeiculoByPlaca(placa: string) {
  const { data: frota } = useBIData<any[]>('dim_frota');
  
  const veiculo = useMemo(() => {
    if (!placa || !frota) return null;
    const normalized = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return frota.find(v => 
      v.Placa?.toUpperCase().replace(/[^A-Z0-9]/g, '') === normalized
    );
  }, [placa, frota]);
  
  return {
    modelo: veiculo?.Modelo,
    ano: veiculo?.AnoModelo,
    cliente: veiculo?.Cliente,
    km: veiculo?.KmAtual,
    contratoLocacao: veiculo?.ContratoLocacao,
    contratoComercial: veiculo?.ContratoComercial
  };
}
```

---

## Resultado Esperado

1. Opções de origem, motivo e análise gerenciáveis via interface
2. Cliente vinculado usando componente existente `ClienteCombobox`
3. Placa busca automaticamente dados do veículo do BI
4. Múltiplas OS, faturas e ocorrências podem ser vinculadas
5. Tempo do ticket é rastreado da abertura até conclusão
6. Análise final inclui "Dúvida" em vez de "Parcialmente Procedente"
7. Fluxo de apoio a departamento com resposta integrada
