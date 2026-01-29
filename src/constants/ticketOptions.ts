// Values must match database enums exactly
export const TICKET_ORIGEM_OPTIONS = [
    { value: 'Whatsapp', label: 'WhatsApp' },
    { value: 'Site', label: 'Site' },
    { value: 'Ligação', label: 'Ligação' },
    { value: 'Redes Sociais', label: 'Redes Sociais' },
    { value: 'E-mail', label: 'E-mail' },
] as const;

// NOTA: Motivos foram migrados para tabela `ticket_motivos`
// Use o hook useTicketMotivos() em vez desta constante
// Esta lista é mantida apenas para referência/fallback
export const TICKET_MOTIVO_OPTIONS = [
    { value: 'contestacao_cobranca', label: 'Contestação de Cobrança' },
    { value: 'demora_aprovacao_orcamento', label: 'Demora na Aprovação do Orçamento' },
    { value: 'agendamento_erroneo', label: 'Agendamento Errôneo' },
    { value: 'ma_qualidade_servico', label: 'Má Qualidade do Serviço' },
    { value: 'problema_fornecedor', label: 'Problema com Fornecedor' },
    { value: 'demora_atendimento', label: 'Demora no Atendimento' },
    { value: 'multas_notificacoes', label: 'Multas e Notificações' },
    { value: 'problemas_entrega_veiculo', label: 'Problemas na Entrega do Veículo' },
    { value: 'problemas_veiculo', label: 'Problemas com o Veículo' },
    { value: 'atendimento_comercial', label: 'Atendimento Comercial' },
    { value: 'oportunidade_erronea', label: 'Oportunidade Aberta Erroneamente' },
    { value: 'problemas_acesso', label: 'Problemas de Acesso' },
    { value: 'problemas_terceiro', label: 'Problemas com Terceiro' },
    { value: 'duvida', label: 'Dúvida' },
    { value: 'outros', label: 'Outros' },
] as const;

// Departamento options - MUST match ticket_departamento_enum exactly
export const TICKET_DEPARTAMENTO_OPTIONS = [
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Central de atendimento', label: 'Central de Atendimento' },
    { value: 'Documentação', label: 'Documentação' },
    { value: 'Operação', label: 'Operação' },
    { value: 'Comercial', label: 'Comercial' },
    { value: 'Financeiro', label: 'Financeiro' },
    { value: 'Operação SP', label: 'Operação - Filial SP' },
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
