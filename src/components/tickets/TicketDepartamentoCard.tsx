import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Clock, CheckCircle2, MessageSquare, Send, User, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export type TicketDepartamento = {
    id: string;
    ticket_id: string;
    departamento: string;
    solicitado_em: string;
    respondido_em: string | null;
    resposta: string | null;
    task_id: string | null;
    solicitado_por?: {
        full_name: string;
        id: string;
    };
    respondido_por?: {
        full_name: string;
    };
};

interface TicketDepartamentoCardProps {
    departamento: TicketDepartamento;
    onViewTask?: (taskId: string) => void;
}

const DEPARTAMENTO_LABELS: Record<string, string> = {
    'Manutenção': 'Manutenção',
    'Central de Atendimento': 'Central de Atendimento',
    'Documentação': 'Documentação',
    'Operação': 'Operação',
    'Comercial': 'Comercial',
    'Financeiro': 'Financeiro',
    'Departamento Pessoal': 'Departamento Pessoal',
    'Aberto Erroneamente': 'Aberto Erroneamente',
    'Dúvida': 'Dúvida',
    'Operação - Filial SP': 'Operação - Filial SP',
    comercial: 'Comercial',
    tecnico: 'Técnico',
    logistica: 'Logística',
    financeiro: 'Financeiro',
    qualidade: 'Qualidade'
};

export function TicketDepartamentoCard({ departamento, onViewTask: _onViewTask }: TicketDepartamentoCardProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isResponding, setIsResponding] = useState(false);
    const [resposta, setResposta] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isExpanded, setIsExpanded] = useState(!departamento.respondido_em);

    const isRespondido = !!departamento.respondido_em;

    // Calcular tempo de resposta em minutos
    const tempoResposta = departamento.respondido_em && departamento.solicitado_em
        ? Math.round((new Date(departamento.respondido_em).getTime() - new Date(departamento.solicitado_em).getTime()) / 1000 / 60)
        : null;

    const formatTempoResposta = (minutos: number) => {
        if (minutos < 60) return `${minutos}min`;
        if (minutos < 1440) return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
        return `${Math.floor(minutos / 1440)}d ${Math.floor((minutos % 1440) / 60)}h`;
    };

    const handleResponder = async () => {
        if (!resposta.trim() || !user?.id) return;

        setIsSaving(true);
        try {
            // Atualizar o departamento com a resposta
            const { error } = await supabase
                .from('ticket_departamentos')
                .update({
                    resposta: resposta.trim(),
                    respondido_em: new Date().toISOString(),
                    respondido_por: user.id
                })
                .eq('id', departamento.id);

            if (error) {
                console.error("Erro ao atualizar departamento:", error);
                throw error;
            }

            // Notificar quem solicitou (se tiver ID)
            if (departamento.solicitado_por?.id) {
                await supabase.from('notifications').insert({
                    user_id: departamento.solicitado_por.id,
                    type: 'department_response',
                    title: 'Resposta do Departamento',
                    message: `O departamento ${DEPARTAMENTO_LABELS[departamento.departamento] || departamento.departamento} respondeu à sua solicitação`,
                    data: { 
                        ticket_id: departamento.ticket_id, 
                        department: departamento.departamento,
                        resposta: resposta.trim()
                    },
                    read: false
                });
            }

            toast.success("Resposta enviada com sucesso!");
            setIsResponding(false);
            setResposta("");
            setIsExpanded(false);
            
            // Invalidar cache para atualizar a UI
            queryClient.invalidateQueries({ queryKey: ['ticket', departamento.ticket_id] });
        } catch (error: any) {
            console.error("Erro ao responder:", error);
            toast.error(error.message || "Erro ao enviar resposta");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className={cn(
            "overflow-hidden transition-all duration-200 border-l-4",
            isRespondido 
                ? "border-l-green-500 bg-green-50/30 dark:bg-green-950/10" 
                : "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/10"
        )}>
            {/* Header - sempre visível */}
            <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        isRespondido 
                            ? "bg-green-100 dark:bg-green-900/30" 
                            : "bg-amber-100 dark:bg-amber-900/30"
                    )}>
                        <Building2 className={cn(
                            "w-5 h-5",
                            isRespondido 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-amber-600 dark:text-amber-400"
                        )} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">
                            {DEPARTAMENTO_LABELS[departamento.departamento] || departamento.departamento}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Solicitado {formatDistanceToNow(new Date(departamento.solicitado_em), {
                                addSuffix: true,
                                locale: ptBR
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isRespondido ? (
                        <>
                            <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Concluído
                            </Badge>
                            {tempoResposta !== null && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {formatTempoResposta(tempoResposta)}
                                </Badge>
                            )}
                        </>
                    ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
                            <Clock className="w-3 h-3 mr-1" />
                            Aguardando
                        </Badge>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
            </div>

            {/* Content - expansível */}
            {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4 space-y-4 border-t border-border/50">
                    {/* Info do solicitante */}
                    {departamento.solicitado_por && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3">
                            <User className="w-4 h-4" />
                            <span>Solicitado por <strong>{departamento.solicitado_por.full_name}</strong></span>
                            <span className="text-xs">
                                em {format(new Date(departamento.solicitado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                    )}

                    {/* Resposta existente */}
                    {isRespondido && departamento.resposta && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Resposta do Departamento</span>
                                {departamento.respondido_por && (
                                    <span className="text-muted-foreground text-xs">
                                        por {departamento.respondido_por.full_name}
                                    </span>
                                )}
                            </div>
                            <div className="bg-background rounded-lg p-3 border border-border/50">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {departamento.resposta}
                                </p>
                            </div>
                            {departamento.respondido_em && (
                                <p className="text-xs text-muted-foreground">
                                    Respondido em {format(new Date(departamento.respondido_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Formulário de resposta (se pendente) */}
                    {!isRespondido && (
                        <div className="space-y-3 pt-2">
                            {isResponding ? (
                                <div className="space-y-3">
                                    <Textarea
                                        placeholder="Digite a resposta do departamento..."
                                        value={resposta}
                                        onChange={(e) => setResposta(e.target.value)}
                                        className="min-h-[100px] resize-none bg-background"
                                        autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => {
                                                setIsResponding(false);
                                                setResposta("");
                                            }}
                                            disabled={isSaving}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            onClick={handleResponder}
                                            disabled={!resposta.trim() || isSaving}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            {isSaving ? (
                                                "Enviando..."
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Enviar Resposta
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full border-dashed hover:border-primary hover:bg-primary/5"
                                    onClick={() => setIsResponding(true)}
                                >
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Responder como Departamento
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
