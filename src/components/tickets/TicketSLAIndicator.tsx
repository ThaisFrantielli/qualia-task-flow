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

    // getVariant kept for non-compact mode compatibility if needed in future
    const getVariant = () => {
        if (isCumprido) return "default" as const;
        if (isVencido) return "destructive" as const;
        if (isProximo) return "secondary" as const;
        return "outline" as const;
    };
    // Keeping getVariant for potential future use
    void getVariant;

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
        // Use proper background colors with contrasting text for visibility
        const getBgClass = () => {
            if (isCumprido) return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300";
            if (isVencido) return "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300";
            if (isProximo) return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300";
            return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300";
        };

        return (
            <Badge variant="outline" className={`flex items-center gap-1 ${getBgClass()}`}>
                {getIcon()}
                <span className="text-xs font-medium">{timeRemaining}</span>
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
