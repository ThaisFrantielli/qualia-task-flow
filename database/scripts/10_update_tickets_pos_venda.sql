-- 1. Criação dos Tipos (Enums) para padronização dos campos
-- Verifica se os tipos já existem antes de criar para evitar erros

DO $$ BEGIN
    CREATE TYPE public.ticket_origem_enum AS ENUM (
        'Whatsapp', 
        'Site', 
        'Ligação', 
        'Redes Sociais', 
        'E-mail'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_motivo_enum AS ENUM (
        'Contestação cobrança',
        'Demora na aprovação do orçamento',
        'Agendamento errôneo',
        'Má qualidade do serviço',
        'Problema com fornecedor',
        'Demora no atendimento',
        'Multas e notificações',
        'Problemas na entrega do veículo',
        'Problemas com o veículo',
        'Atendimento Comercial',
        'Oportunidade aberta erroneamente',
        'Problemas de acesso',
        'Problemas com terceiro',
        'Dúvida',
        'Outros'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.ticket_departamento_enum AS ENUM (
        'Manutenção',
        'Central de atendimento',
        'Documentação',
        'Operação',
        'Comercial',
        'Financeiro',
        'Operação SP',
        'Não se aplica'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Alteração da Tabela tickets para incluir os novos campos
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS origem ticket_origem_enum,
ADD COLUMN IF NOT EXISTS motivo ticket_motivo_enum,
ADD COLUMN IF NOT EXISTS departamento ticket_departamento_enum,
ADD COLUMN IF NOT EXISTS placa text,
ADD COLUMN IF NOT EXISTS sintese text,
ADD COLUMN IF NOT EXISTS resolucao text,
ADD COLUMN IF NOT EXISTS fase text; -- Campo para armazenar a etapa do fluxo (ex: "Análise do caso", "Aguardando departamento")

-- 3. Comentários para documentação
COMMENT ON COLUMN public.tickets.sintese IS 'Resumo do problema relatado (Síntese)';
COMMENT ON COLUMN public.tickets.resolucao IS 'Detalhes da resolução do caso';
COMMENT ON COLUMN public.tickets.fase IS 'Etapa atual do fluxo de atendimento (PEPS)';
