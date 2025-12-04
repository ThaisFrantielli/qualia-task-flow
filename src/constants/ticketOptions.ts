export const TICKET_ORIGEM_OPTIONS = [
    { value: 'Whatsapp', label: 'Whatsapp' },
    { value: 'Site', label: 'Site' },
    { value: 'Ligação', label: 'Ligação' },
    { value: 'Redes Sociais', label: 'Redes Sociais' },
    { value: 'E-mail', label: 'E-mail' },
] as const;

export const TICKET_MOTIVO_OPTIONS = [
    { value: 'Contestação cobrança', label: 'Contestação cobrança' },
    { value: 'Demora na aprovação do orçamento', label: 'Demora na aprovação do orçamento' },
    { value: 'Agendamento errôneo', label: 'Agendamento errôneo' },
    { value: 'Má qualidade do serviço', label: 'Má qualidade do serviço' },
    { value: 'Problema com fornecedor', label: 'Problema com fornecedor' },
    { value: 'Demora no atendimento', label: 'Demora no atendimento' },
    { value: 'Multas e notificações', label: 'Multas e notificações' },
    { value: 'Problemas na entrega do veículo', label: 'Problemas na entrega do veículo' },
    { value: 'Problemas com o veículo', label: 'Problemas com o veículo' },
    { value: 'Atendimento Comercial', label: 'Atendimento Comercial' },
    { value: 'Oportunidade aberta erroneamente', label: 'Oportunidade aberta erroneamente' },
    { value: 'Problemas de acesso', label: 'Problemas de acesso' },
    { value: 'Problemas com terceiro', label: 'Problemas com terceiro' },
    { value: 'Dúvida', label: 'Dúvida' },
    { value: 'Outros', label: 'Outros' },
] as const;

export const TICKET_DEPARTAMENTO_OPTIONS = [
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Central de atendimento', label: 'Central de atendimento' },
    { value: 'Documentação', label: 'Documentação' },
    { value: 'Operação', label: 'Operação' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Financeiro', label: 'Financeiro' },
    { value: 'Operação SP', label: 'Operação SP' },
    { value: 'Não se aplica', label: 'Não se aplica' },
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
