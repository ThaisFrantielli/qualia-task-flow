
# Plano: Sistema de Personalização e Geração de Propostas PDF

## Resumo Executivo

Implementar um sistema completo para personalizar e gerar propostas comerciais em PDF, inspirado no modelo da Unidas Livre. O sistema permitira editar templates visuais, incluir imagens de veiculos, condicoes contratuais e beneficios, gerando um documento profissional para envio ao cliente.

## Analise do Modelo de Referencia (Unidas Livre)

O PDF de referencia possui 7 paginas com a seguinte estrutura:

| Pagina | Conteudo |
|--------|----------|
| 1 | Capa institucional com logo e slogan |
| 2 | Dados do cliente + cards de veiculos com precos e cenarios |
| 3 | Beneficios e condicoes contratuais (protecao, carro reserva, revisoes) |
| 4 | FAQ com informacoes detalhadas |
| 5-6 | Comparativo tecnico dos veiculos |
| 7 | Rodape/encerramento |

## Arquitetura da Solucao

```text
+---------------------------+
|    PropostaWizard         |
|    (Step: Revisao)        |
+-----------+---------------+
            |
            v
+---------------------------+
|  PropostaPreviewEditor    |
|  (Visualizacao/Edicao)    |
+-----------+---------------+
            |
            v
+---------------------------+
|  PropostaPDFGenerator     |
|  (Geracao do PDF)         |
+---------------------------+
```

## Componentes e Funcionalidades

### 1. Novo Step no Wizard: "Personalizar Proposta"

Adicionar um passo entre "Revisao" e a finalizacao para permitir personalizacao visual.

### 2. Editor de Template da Proposta

**Secoes editaveis:**

- **Capa**
  - Logo da empresa (upload ou URL)
  - Titulo/slogan personalizavel
  - Imagem de fundo (opcional)

- **Dados do Cliente**
  - Nome do cliente (destaque)
  - Contato do vendedor
  - Numero da proposta
  - Datas (envio e validade)

- **Cards de Veiculos**
  - Imagem do veiculo (do cadastro ou upload)
  - Nome do modelo e versao
  - Preco mensal em destaque
  - Franquia de KM
  - Prazo do contrato
  - Valor do KM excedente
  - Opcao "Melhor Escolha" destacada

- **Tabela de Cenarios**
  - Comparativo de prazos (12, 24, 36, 48 meses)
  - Valores mensais por prazo

- **Beneficios e Condicoes**
  - Protecoes incluidas
  - Carro reserva/substituto
  - Manutencao e revisoes
  - IPVA e documentacao
  - Assistencia 24h

- **Comparativo Tecnico**
  - Especificacoes dos veiculos lado a lado
  - Motor, cambio, combustivel, etc.

- **FAQ Personalizavel**
  - Perguntas e respostas editaveis
  - Banco de perguntas pre-configuradas

### 3. Banco de Dados - Novas Tabelas

**proposta_templates**
```text
- id (uuid)
- nome (text)
- descricao (text)
- is_padrao (boolean)
- logo_url (text)
- cor_primaria (text)
- cor_secundaria (text)
- slogan (text)
- imagem_capa_url (text)
- secoes_config (jsonb)
- created_by (uuid)
- created_at, updated_at
```

**proposta_template_faq**
```text
- id (uuid)
- template_id (uuid FK)
- pergunta (text)
- resposta (text)
- ordem (integer)
```

**proposta_template_beneficios**
```text
- id (uuid)
- template_id (uuid FK)
- titulo (text)
- descricao (text)
- icone (text)
- ordem (integer)
```

**proposta_arquivos_gerados**
```text
- id (uuid)
- proposta_id (uuid FK)
- template_id (uuid FK)
- arquivo_url (text)
- versao (integer)
- created_at
```

### 4. Componentes React a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/proposta/steps/PersonalizarStep.tsx` | Step de personalizacao no wizard |
| `src/components/proposta/template/PropostaTemplateEditor.tsx` | Editor visual do template |
| `src/components/proposta/template/CapaSection.tsx` | Edicao da capa |
| `src/components/proposta/template/VeiculosSection.tsx` | Cards de veiculos |
| `src/components/proposta/template/BeneficiosSection.tsx` | Beneficios e condicoes |
| `src/components/proposta/template/ComparativoSection.tsx` | Comparativo tecnico |
| `src/components/proposta/template/FAQSection.tsx` | Perguntas frequentes |
| `src/components/proposta/preview/PropostaPreview.tsx` | Preview em tempo real |
| `src/components/proposta/pdf/PropostaPDFDocument.tsx` | Componente para geracao PDF |
| `src/hooks/usePropostaTemplates.ts` | Hook para CRUD de templates |
| `src/lib/proposta-pdf-generator.ts` | Funcoes de geracao de PDF |

### 5. Geracao de PDF

**Biblioteca:** @react-pdf/renderer (ja disponivel no ecossistema React, melhor para documentos complexos)

**Alternativa:** html2canvas + jspdf (mais simples, mas menos flexivel)

**Processo de Geracao:**

1. Usuario clica em "Gerar Proposta PDF"
2. Sistema monta o documento com os dados da proposta
3. Aplica o template selecionado
4. Gera o PDF em memoria
5. Faz upload para o bucket de storage
6. Salva referencia na tabela `proposta_arquivos_gerados`
7. Permite download ou envio por email/WhatsApp

### 6. Storage para Arquivos

Criar novo bucket no Supabase Storage:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas-pdf', 'propostas-pdf', false);
```

**Estrutura de pastas:**
```text
propostas-pdf/
  ├── templates/
  │   └── logos/
  │   └── capas/
  └── gerados/
      └── {ano}/
          └── {mes}/
              └── proposta-{numero}-v{versao}.pdf
```

## Fluxo de Usuario

```text
1. Criar/Editar Proposta no Wizard
          |
          v
2. [NOVO] Personalizar Template
   - Selecionar template base
   - Ajustar cores e logo
   - Editar textos de beneficios
   - Configurar FAQ
          |
          v
3. Preview da Proposta
   - Visualizar como ficara o PDF
   - Fazer ajustes finos
          |
          v
4. Gerar PDF
   - Download imediato
   - Salvar no sistema
          |
          v
5. Enviar ao Cliente
   - Email direto
   - WhatsApp
   - Link compartilhavel
```

## Secoes do PDF Gerado

### Pagina 1 - Capa
- Logo da empresa
- Slogan/titulo
- Imagem de fundo

### Pagina 2 - Proposta
- Header com dados do cliente e vendedor
- Numero da proposta, data de envio e validade
- Cards dos veiculos com precos e detalhes
- Comparativo de prazos

### Pagina 3 - Beneficios
- Grade visual com beneficios inclusos
- Icones ilustrativos
- Descricoes curtas

### Pagina 4 - FAQ
- Perguntas e respostas
- Informacoes sobre entrega, pagamento, franquia, etc.

### Pagina 5+ - Comparativo Tecnico
- Especificacoes lado a lado dos veiculos
- Imagens dos modelos
- Detalhes tecnicos

## Detalhes Tecnicos

### Instalacao de Dependencia

```bash
npm install @react-pdf/renderer
```

### Estrutura do Componente PDF

```typescript
// PropostaPDFDocument.tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const PropostaPDFDocument = ({ proposta, template, veiculos, cenarios }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Capa */}
      <CoverPage template={template} />
    </Page>
    <Page size="A4" style={styles.page}>
      {/* Proposta */}
      <ProposalPage proposta={proposta} veiculos={veiculos} cenarios={cenarios} />
    </Page>
    {/* ... outras paginas */}
  </Document>
);
```

### Hook de Templates

```typescript
// usePropostaTemplates.ts
export function usePropostaTemplates() {
  const { data: templates } = useQuery({
    queryKey: ['proposta-templates'],
    queryFn: fetchTemplates
  });

  const createTemplate = useMutation({ ... });
  const updateTemplate = useMutation({ ... });
  const deleteTemplate = useMutation({ ... });

  return { templates, createTemplate, updateTemplate, deleteTemplate };
}
```

### Integracao com Wizard Existente

Adicionar novo step no array STEPS:

```typescript
const STEPS = [
  { id: 'cliente', title: 'Cliente' },
  { id: 'veiculos', title: 'Veiculos' },
  { id: 'condicoes', title: 'Condicoes' },
  { id: 'protecoes', title: 'Protecoes' },
  { id: 'simulacao', title: 'Simulacao' },
  { id: 'personalizar', title: 'Personalizar' },  // NOVO
  { id: 'revisao', title: 'Revisao' },
];
```

## Ordem de Implementacao

1. **Fase 1: Infraestrutura** (Prioridade Alta)
   - Criar tabelas no banco de dados
   - Criar bucket de storage
   - Instalar @react-pdf/renderer
   - Criar hook usePropostaTemplates

2. **Fase 2: Templates** (Prioridade Alta)
   - Criar template padrao baseado no modelo Unidas
   - Implementar editor basico de templates
   - Permitir customizacao de cores e logo

3. **Fase 3: Personalizacao** (Prioridade Media)
   - Criar step PersonalizarStep
   - Implementar editor de secoes
   - Criar gerenciador de FAQ e beneficios

4. **Fase 4: Geracao PDF** (Prioridade Alta)
   - Implementar PropostaPDFDocument
   - Criar todas as paginas do PDF
   - Upload automatico para storage

5. **Fase 5: Integracao** (Prioridade Media)
   - Historico de versoes de propostas
   - Envio por email/WhatsApp
   - Link compartilhavel

## Resultado Esperado

O usuario podera:

1. Criar propostas comerciais completas
2. Personalizar o visual do documento
3. Gerar PDF profissional similar ao da Unidas Livre
4. Enviar diretamente ao cliente
5. Manter historico de todas as versoes geradas
