import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export type TicketDepartamento = {
    id: string;
    departamento: string;
    solicitado_em: string;
    respondido_em: string | null;
    resposta: string | null;
    task_id: string | null;
    solicitado_por?: {
        full_name: string;
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
    comercial: 'Comercial',
    tecnico: 'Técnico',
    logistica: 'Logística',
    financeiro: 'Financeiro',
    qualidade: 'Qualidade'
};



export function TicketDepartamentoCard({ departamento, onViewTask }: TicketDepartamentoCardProps) {
    // Calcular status baseado em respondido_em
    const status = departamento.respondido_em ? 'respondido' : 'pendente';

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'respondido':
                return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Respondido</Badge>;
            case 'pendente':
            default:
                return <Badge className="bg-gray-500/10 text-gray-700 dark:text-gray-400">Pendente</Badge>;
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
                    {getStatusBadge(departamento.status)}
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
