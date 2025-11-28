import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TicketSLAIndicatorProps {
    slaTimestamp: string | null;
    isCumprido: boolean;
    label: string;
    compact?: boolean;
}

export function TicketSLAIndicator({ slaTimestamp, isCumprido, label, compact = false }: TicketSLAIndicatorProps) {
    if (!slaTimestamp) return null;

    const slaDate = new Date(slaTimestamp);
    const now = new Date();
    const isVencido = !isCumprido && slaDate < now;
    const isProximo = !isCumprido && !isVencido && (slaDate.getTime() - now.getTime()) < 2 * 60 * 60 * 1000; // Próximo de vencer (< 2h)

    const getVariant = () => {
        if (isCumprido) return "default";
        if (isVencido) return "destructive";
        if (isProximo) return "secondary";
        return "outline";
    };

    const getIcon = () => {
        if (isCumprido) return <CheckCircle className="w-3 h-3" />;
        if (isVencido) return <AlertTriangle className="w-3 h-3" />;
        return <Clock className="w-3 h-3" />;
    };

    const getColor = () => {
        if (isCumprido) return "text-green-600 dark:text-green-400";
        if (isVencido) return "text-red-600 dark:text-red-400";
        if (isProximo) return "text-yellow-600 dark:text-yellow-400";
        return "text-blue-600 dark:text-blue-400";
    };

    const timeRemaining = isCumprido
        ? "Cumprido"
        : isVencido
            ? `Vencido ${formatDistanceToNow(slaDate, { addSuffix: true, locale: ptBR })}`
            : `Vence ${formatDistanceToNow(slaDate, { addSuffix: true, locale: ptBR })}`;

    if (compact) {
        return (
            <Badge variant={getVariant()} className={`flex items-center gap-1 ${getColor()}`}>
                {getIcon()}
                <span className="text-xs">{timeRemaining}</span>
            </Badge>
        );
    }

    return (
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${isCumprido ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' :
                isVencido ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                    isProximo ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                        'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
            }`}>
            <div className={getColor()}>
                {getIcon()}
            </div>
            <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className={`text-sm font-semibold ${getColor()}`}>
                    {timeRemaining}
                </p>
            </div>
        </div>
    );
}
