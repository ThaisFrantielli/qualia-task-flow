import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDrag } from "react-dnd";

interface OportunidadeKanbanCardProps {
    id: string;
    titulo: string;
    valor_total?: number;
    cliente?: {
        nome_fantasia?: string;
        razao_social?: string;
    };
    user?: {
        full_name?: string;
    };
    created_at: string;
    prioridade?: string;
    onClick?: () => void;
}

export function OportunidadeKanbanCard({
    id,
    titulo,
    valor_total,
    cliente,
    user,
    created_at,
    prioridade,
    onClick
}: OportunidadeKanbanCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'OPORTUNIDADE',
        item: { id },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const getPrioridadeColor = (prio?: string) => {
        switch (prio) {
            case 'alta': return 'bg-red-500/10 text-red-700 dark:text-red-400';
            case 'media': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
            case 'baixa': return 'bg-green-500/10 text-green-700 dark:text-green-400';
            default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
        }
    };

    return (
        <Card
            ref={drag}
            className={`cursor-pointer hover:shadow-lg transition-all ${isDragging ? 'opacity-50' : 'opacity-100'
                }`}
            onClick={onClick}
        >
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{titulo}</h3>
                    {prioridade && (
                        <Badge className={getPrioridadeColor(prioridade)} variant="secondary">
                            {prioridade}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {valor_total !== undefined && valor_total > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(valor_total)}
                        </span>
                    </div>
                )}

                {cliente && (
                    <div className="text-xs text-muted-foreground truncate">
                        {cliente.nome_fantasia || cliente.razao_social}
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    {user && (
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{user.full_name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(created_at), 'dd/MM', { locale: ptBR })}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
