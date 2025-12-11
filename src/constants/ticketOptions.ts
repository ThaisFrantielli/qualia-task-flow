export const TICKET_ORIGEM_OPTIONS = [
    { value: 'Whatsapp', label: 'Whatsapp' },
    { value: 'Site', label: 'Site' },
    { value: 'Ligação', label: 'Ligação' },
    { value: 'Redes Sociais', label: 'Redes Sociais' },
    { value: 'E-mail', label: 'E-mail' },
    { value: 'Interno', label: 'Interno' },
    { value: 'Presencial', label: 'Presencial' },
] as const;

// Nested motivo options. Some motivos open sub-options in the form.
export const TICKET_MOTIVO_OPTIONS = [
    {
        value: 'Contestação cobrança',
        label: 'Contestação cobrança',
        children: [
            { value: 'encerramento_contrato', label: 'Encerramento de Contrato' },
            { value: 'revisao_fora_prazo', label: 'Revisão fora do prazo' },
            {
                value: 'reembolsavel',
                label: 'Reembolsável',
                children: [
                    { value: 'peca', label: 'Peça' },
                    { value: 'servico', label: 'Serviço' },
                    { value: 'outro_reembolsavel', label: 'Outro (reembolsável)' }
                ]
            },
            { value: 'multas_notificacao', label: 'Multas e Notificação' }
        ]
    },
    {
        value: 'Orçamento',
        label: 'Orçamento',
        children: [
            { value: 'demora_aprovacao', label: 'Demora na aprovação' },
            { value: 'valor_diferente', label: 'Valor diferente do informado' },
            { value: 'itens_faltando', label: 'Itens faltando no orçamento' }
        ]
    },
    {
        value: 'Agendamento',
        label: 'Agendamento',
        children: [
            { value: 'agendamento_erroneo', label: 'Agendamento errôneo' },
            { value: 'reagendar', label: 'Reagendar' },
            { value: 'cancelamento', label: 'Cancelamento' }
        ]
    },
    {
        value: 'Qualidade',
        label: 'Qualidade do serviço',
        children: [
            { value: 'ma_qualidade_servico', label: 'Má qualidade do serviço' },
            { value: 'reparo_repetido', label: 'Reparo repetido' },
            { value: 'peca_defeito', label: 'Peça com defeito' }
        ]
    },
    { value: 'Fornecedor', label: 'Problema com fornecedor' },
    { value: 'Atendimento', label: 'Demora no atendimento' },
    { value: 'Entrega', label: 'Problemas na entrega do veículo' },
    { value: 'Veículo', label: 'Problemas com o veículo' },
    { value: 'Comercial', label: 'Atendimento Comercial' },
    { value: 'OportunidadeErrada', label: 'Oportunidade aberta erroneamente' },
    { value: 'Acesso', label: 'Problemas de acesso' },
    { value: 'Terceiro', label: 'Problemas com terceiro' },
    {
        value: 'Dúvida',
        label: 'Dúvida',
        children: [
            { value: 'informacao_processo', label: 'Informação sobre processo' },
            { value: 'duvida_faturamento', label: 'Dúvida sobre faturamento' }
        ]
    },
    { value: 'Outros', label: 'Outros' }
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
