// Values must match database enums exactly
export const TICKET_ORIGEM_OPTIONS = [
    { value: 'Whatsapp', label: 'Whatsapp' },
    { value: 'Site', label: 'Site' },
    { value: 'Ligação', label: 'Ligação' },
    { value: 'Redes Sociais', label: 'Redes Sociais' },
    { value: 'E-mail', label: 'E-mail' },
] as const;

// Motivo options matching ticket_motivo_enum
export const TICKET_MOTIVO_OPTIONS = [
    { value: 'Contestação de Cobrança', label: 'Contestação de Cobrança' },
    { value: 'Demora na Aprovação do Orçamento', label: 'Demora na Aprovação do Orçamento' },
    { value: 'Agendamento Errôneo', label: 'Agendamento Errôneo' },
    { value: 'Má Qualidade de Serviço', label: 'Má Qualidade de Serviço' },
    { value: 'Problemas Com Fornecedor', label: 'Problemas Com Fornecedor' },
    { value: 'Demora em atendimento', label: 'Demora em atendimento' },
    { value: 'Atendimento Ineficaz', label: 'Atendimento Ineficaz' },
    { value: 'Multas e Notificações', label: 'Multas e Notificações' },
    { value: 'Problemas na Entrega', label: 'Problemas na Entrega' },
    { value: 'Problemas Com Veículo Reserva', label: 'Problemas Com Veículo Reserva' },
    { value: 'Atendimento Comercial', label: 'Atendimento Comercial' },
    { value: 'Oportunidade Aberta Erroneamente', label: 'Oportunidade Aberta Erroneamente' },
    { value: 'Cobrança Indevida', label: 'Cobrança Indevida' },
    { value: 'Dúvida', label: 'Dúvida' },
    { value: 'Erro de processo interno', label: 'Erro de processo interno' },
    { value: 'Troca definitiva de veículo', label: 'Troca definitiva de veículo' },
    { value: 'Problema recorrente', label: 'Problema recorrente' },
    { value: 'Solicitação de Reembolso', label: 'Solicitação de Reembolso' },
    { value: 'Problemas com Terceiro', label: 'Problemas com Terceiro' },
] as const;

// Departamento options matching ticket_departamento_enum
export const TICKET_DEPARTAMENTO_OPTIONS = [
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Central de Atendimento', label: 'Central de Atendimento' },
    { value: 'Documentação', label: 'Documentação' },
    { value: 'Operação', label: 'Operação' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Financeiro', label: 'Financeiro' },
    { value: 'Departamento Pessoal', label: 'Departamento Pessoal' },
    { value: 'Aberto Erroneamente', label: 'Aberto Erroneamente' },
    { value: 'Dúvida', label: 'Dúvida' },
    { value: 'Operação - Filial SP', label: 'Operação - Filial SP' },
] as const;

export const TICKET_FASES = {
    PADRAO: [
        'Lead inicial',
        'Análise do caso',
        'Aguardando cliente',
        'Envio de proposta'
    ],
    POS_VENDAS: [
        'Análise do caso',
        'Aguardando departamento',
        'Aberta erroneamente',
        'Concluída',
        'Dúvida'
    ]
} as const;
