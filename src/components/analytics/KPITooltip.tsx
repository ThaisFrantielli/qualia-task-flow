import { HelpCircle } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface KPITooltipProps {
    title: string;
    description: string;
    formula?: string;
    benchmark?: string;
}

export function KPITooltip({ title, description, formula, benchmark }: KPITooltipProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600 cursor-help ml-1 inline-block" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs p-4" side="top">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-sm">{title}</h4>
                        <p className="text-xs text-slate-600">{description}</p>
                        {formula && (
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-mono text-slate-500">{formula}</p>
                            </div>
                        )}
                        {benchmark && (
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs text-emerald-600">
                                    <strong>Benchmark:</strong> {benchmark}
                                </p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
