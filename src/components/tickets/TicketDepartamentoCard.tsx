import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Clock, CheckCircle, ExternalLink, MessageSquare, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

export function TicketDepartamentoCard({ departamento, onViewTask }: TicketDepartamentoCardProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isResponding, setIsResponding] = useState(false);
    const [resposta, setResposta] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const status = departamento.respondido_em ? 'respondido' : 'pendente';

    // Calcular tempo de resposta
    const tempoResposta = departamento.respondido_em && departamento.solicitado_em
        ? Math.round((new Date(departamento.respondido_em).getTime() - new Date(departamento.solicitado_em).getTime()) / 1000 / 60)
        : null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'respondido':
                return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Respondido</Badge>;
            case 'pendente':
            default:
                return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Pendente</Badge>;
        }
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

            if (error) throw error;

            // Notificar quem solicitou
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
            
            // Invalidar cache para atualizar
            queryClient.invalidateQueries({ queryKey: ['ticket', departamento.ticket_id] });
        } catch (error) {
            console.error("Erro ao responder:", error);
            toast.error("Erro ao enviar resposta");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-base">
                            {DEPARTAMENTO_LABELS[departamento.departamento] || departamento.departamento}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        {tempoResposta !== null && (
                            <Badge variant="outline" className="text-xs">
                                {tempoResposta < 60 
                                    ? `${tempoResposta}min` 
                                    : `${Math.round(tempoResposta / 60)}h`}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Informações de Solicitação */}
                <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>
                            Solicitado {formatDistanceToNow(new Date(departamento.solicitado_em), {
                                addSuffix: true,
                                locale: ptBR
                            })}
                        </span>
                    </div>
                    {departamento.solicitado_por && (
                        <p className="text-xs text-muted-foreground">
                            por {departamento.solicitado_por.full_name}
                        </p>
                    )}
                </div>

                {/* Resposta */}
                {departamento.respondido_em && (
                    <div className="border-t pt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>
                                Respondido {formatDistanceToNow(new Date(departamento.respondido_em), {
                                    addSuffix: true,
                                    locale: ptBR
                                })}
                            </span>
                        </div>
                        {departamento.respondido_por && (
                            <p className="text-xs text-muted-foreground">
                                por {departamento.respondido_por.full_name}
                            </p>
                        )}
                        {departamento.resposta && (
                            <p className="text-sm bg-muted p-2 rounded">
                                {departamento.resposta}
                            </p>
                        )}
                    </div>
                )}

                {/* Formulário de resposta (se pendente) */}
                {!departamento.respondido_em && (
                    <div className="border-t pt-3 space-y-2">
                        {isResponding ? (
                            <div className="space-y-2">
                                <Textarea
                                    placeholder="Digite sua resposta..."
                                    value={resposta}
                                    onChange={(e) => setResposta(e.target.value)}
                                    className="min-h-[80px]"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => {
                                            setIsResponding(false);
                                            setResposta("");
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        onClick={handleResponder}
                                        disabled={!resposta.trim() || isSaving}
                                    >
                                        {isSaving ? "Enviando..." : (
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
                                className="w-full"
                                onClick={() => setIsResponding(true)}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Responder
                            </Button>
                        )}
                    </div>
                )}

                {/* Link para Task */}
                {departamento.task_id && onViewTask && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onViewTask(departamento.task_id!)}
                    >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver Task Vinculada
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
