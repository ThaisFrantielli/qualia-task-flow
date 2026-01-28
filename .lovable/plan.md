
# Plano: Corrigir Vinculação de Dados do Cliente e Modernizar UI do Wizard de Propostas

## Problema Identificado

Ao selecionar um cliente existente (ex: "COMPEL"), os dados não são populados corretamente nos campos do formulário. A causa raiz é:

1. **Campos errados no código**: O `ClienteStep.tsx` está tentando ler campos que não existem na tabela `clientes`:
   - `cliente.cnpj` → deveria ser `cliente.cpf_cnpj`
   - `cliente.email_principal` → deveria ser `cliente.email`
   - `cliente.telefone_principal` → deveria ser `cliente.telefone`
   - `cliente.endereco_completo` → deveria ser construído a partir de: `endereco`, `numero`, `bairro`, `cidade`, `estado`, `cep`

2. **Layout desatualizado**: O wizard não utiliza bem o espaço disponível na página

## Estrutura Atual da Tabela `clientes`

| Campo BD          | Campo Proposta      |
|-------------------|---------------------|
| `cpf_cnpj`        | `cliente_cnpj`      |
| `email`           | `cliente_email`     |
| `telefone`        | `cliente_telefone`  |
| `endereco + numero + bairro + cidade/estado + cep` | `cliente_endereco` |

---

## Etapas de Implementação

### 1. Corrigir Mapeamento de Campos em `ClienteStep.tsx`

Atualizar o `useEffect` que busca dados do cliente:

```text
// ANTES (incorreto):
cliente_cnpj: cliente.cnpj,
cliente_email: cliente.email_principal,
cliente_telefone: cliente.telefone_principal,
cliente_endereco: cliente.endereco_completo

// DEPOIS (correto):
cliente_cnpj: cliente.cpf_cnpj,
cliente_email: cliente.email || '',
cliente_telefone: cliente.telefone || cliente.whatsapp_number || '',
cliente_endereco: buildEnderecoCompleto(cliente) 
// Função que monta: endereco, numero - bairro, cidade/estado - cep
```

### 2. Criar Função de Montagem do Endereço

```typescript
const buildEnderecoCompleto = (cliente: any): string => {
  const parts = [];
  if (cliente.endereco) {
    let linha = cliente.endereco;
    if (cliente.numero) linha += `, ${cliente.numero}`;
    parts.push(linha);
  }
  if (cliente.bairro) parts.push(cliente.bairro);
  if (cliente.cidade || cliente.estado) {
    parts.push(`${cliente.cidade || ''}${cliente.estado ? '/' + cliente.estado : ''}`);
  }
  if (cliente.cep) parts.push(`CEP: ${cliente.cep}`);
  return parts.join(' - ');
};
```

### 3. Modernizar UI do Wizard

**Mudanças na página `/propostas/nova`:**

- Remover padding excessivo e usar largura total
- Stepper horizontal mais compacto e moderno
- Cards com bordas mais sutis e sombras suaves
- Layout responsivo otimizado
- Melhorar separação visual entre seções

**PropostaWizard.tsx:**
- Usar `max-w-4xl mx-auto` para centralizar conteúdo
- Stepper com linha conectora visual entre etapas
- Badges de status com cores mais modernas
- Bordas arredondadas maiores nos cards

**ClienteStep.tsx:**
- Layout em grid mais compacto
- Usar `grid-cols-1 md:grid-cols-2` para melhor responsividade
- Separar visualmente a área de busca do formulário
- Ícones inline nos labels

### 4. Melhorar ClienteCombobox

Garantir que ao buscar o cliente, todos os campos necessários sejam retornados:

```typescript
// Buscar mais campos além do básico
.select(`
  id, razao_social, nome_fantasia, cpf_cnpj,
  email, telefone, whatsapp_number,
  endereco, numero, bairro, cidade, estado, cep
`)
```

### 5. Fallback para Contatos Secundários

Se `email` ou `telefone` estiverem vazios no cliente, buscar da tabela `cliente_contatos`:

```typescript
// Se não tiver telefone/email no cliente principal,
// buscar do primeiro contato (gestor preferencial)
if (!cliente.email || !cliente.telefone) {
  const { data: contatos } = await supabase
    .from('cliente_contatos')
    .select('*')
    .eq('cliente_id', cliente.id)
    .order('is_gestor', { ascending: false })
    .limit(1);
    
  if (contatos?.length) {
    cliente_email = contatos[0].email_contato;
    cliente_telefone = contatos[0].telefone_contato;
  }
}
```

---

## Detalhes Técnicos

### Arquivos a Modificar

1. **`src/components/proposta/steps/ClienteStep.tsx`**
   - Corrigir mapeamento de campos
   - Adicionar função `buildEnderecoCompleto`
   - Buscar dados de contatos como fallback
   - Modernizar layout com grid responsivo

2. **`src/components/common/ClienteCombobox.tsx`**
   - Expandir campos retornados na query
   - (Opcional) Passar cliente completo para componente pai

3. **`src/components/proposta/PropostaWizard.tsx`**
   - Modernizar stepper visual
   - Ajustar padding e espaçamento
   - Melhorar uso do espaço da página

4. **`src/pages/PropostasFormPage.tsx`**
   - Remover container estreito
   - Usar largura total com padding adequado

---

## Resumo Visual das Melhorias

```text
ANTES:
┌─────────────────────────────────────────┐
│  [Container estreito centralizado]       │
│  ┌─────────────────────────────────┐    │
│  │ Wizard com muito espaço vazio   │    │
│  │ Campos não preenchidos          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────────────────────┐
│ ● Cliente → ○ Veículos → ○ Condições → ○ Proteções  │
├─────────────────────────────────────────────────────┤
│ ╔═════════════════════════════════════════════════╗ │
│ ║  🏢 Dados do Cliente                            ║ │
│ ╠═════════════════════════════════════════════════╣ │
│ ║  [Buscar Cliente]  ✓ COMPEL vinculado           ║ │
│ ╠════════════════════╦════════════════════════════╣ │
│ ║  Razão Social      ║  CNPJ                      ║ │
│ ║  COMPEL           ║  01.229.251/0001-05        ║ │
│ ╠════════════════════╬════════════════════════════╣ │
│ ║  Email             ║  Telefone                  ║ │
│ ║  contato@compel... ║  (62) 99999-9999           ║ │
│ ╠════════════════════╩════════════════════════════╣ │
│ ║  Endereço Completo                              ║ │
│ ║  Rua X, 123 - Centro - Goiânia/GO - 74000-000  ║ │
│ ╚═════════════════════════════════════════════════╝ │
│                                                     │
│ [← Voltar]              [Salvar Rascunho] [Próximo→]│
└─────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

- Ao selecionar um cliente, todos os campos serão automaticamente preenchidos com os dados corretos
- O CNPJ aparecerá formatado (01.229.251/0001-05)
- Email e telefone serão buscados do cliente ou dos contatos secundários
- Endereço será montado corretamente a partir dos campos separados
- Interface mais moderna, limpa e com melhor aproveitamento do espaço
