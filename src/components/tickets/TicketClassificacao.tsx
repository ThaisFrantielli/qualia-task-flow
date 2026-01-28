import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { useTicketAnalises } from "@/hooks/useTicketOptions";

interface TicketClassificacaoProps {
    ticketId: string;
    onSave: (data: ClassificacaoData) => Promise<void>;
    initialData?: Partial<ClassificacaoData>;
}

export type ClassificacaoData = {
    procedencia: string;
    solucao_aplicada: string;
    acoes_corretivas: string;
    feedback_cliente?: string;
    nota_cliente?: number;
};

const getIconComponent = (iconName: string) => {
    switch (iconName) {
        case "CheckCircle": return CheckCircle;
        case "XCircle": return XCircle;
        default: return HelpCircle;
    }
};

export function TicketClassificacao({ onSave, initialData }: TicketClassificacaoProps) {
    const { data: analises, isLoading: loadingAnalises } = useTicketAnalises();
    
    const [formData, setFormData] = useState<ClassificacaoData>({
        procedencia: initialData?.procedencia || '',
        solucao_aplicada: initialData?.solucao_aplicada || '',
        acoes_corretivas: initialData?.acoes_corretivas || '',
        feedback_cliente: initialData?.feedback_cliente || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Mapear opções do banco para o select
    const procedenciaOptions = useMemo(() => {
        if (!analises) return [];
        return analises.map(a => ({
            value: a.value,
            label: a.label,
            icon: getIconComponent(a.icon),
            color: a.color
        }));
    }, [analises]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAnalises) {
        return (
            <Card>
                <CardContent className="flex justify-center py-12">
                    <Loader2 className="animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Classificação Final do Ticket</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Procedência (Análise Final) */}
                    <div className="space-y-2">
                        <Label htmlFor="procedencia">Análise Final *</Label>
                        <Select
                            value={formData.procedencia}
                            onValueChange={(value) => setFormData({ ...formData, procedencia: value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a análise final..." />
                            </SelectTrigger>
                            <SelectContent>
                                {procedenciaOptions.map(opt => {
                                    const Icon = opt.icon;
                                    return (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${opt.color}`} />
                                                <span>{opt.label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Solução Aplicada */}
                    <div className="space-y-2">
                        <Label htmlFor="solucao">Solução Aplicada *</Label>
                        <Textarea
                            id="solucao"
                            value={formData.solucao_aplicada}
                            onChange={(e) => setFormData({ ...formData, solucao_aplicada: e.target.value })}
                            placeholder="Descreva a solução que foi aplicada para resolver o problema..."
                            rows={4}
                            required
                        />
                    </div>

                    {/* Ações Corretivas */}
                    <div className="space-y-2">
                        <Label htmlFor="acoes">Ações Corretivas / Preventivas</Label>
                        <Textarea
                            id="acoes"
                            value={formData.acoes_corretivas}
                            onChange={(e) => setFormData({ ...formData, acoes_corretivas: e.target.value })}
                            placeholder="Liste as ações corretivas ou preventivas implementadas..."
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            Estas ações podem ser convertidas em Tasks para acompanhamento
                        </p>
                    </div>

                    {/* Feedback do Cliente */}
                    <div className="space-y-2">
                        <Label htmlFor="feedback">Feedback do Cliente</Label>
                        <Textarea
                            id="feedback"
                            value={formData.feedback_cliente}
                            onChange={(e) => setFormData({ ...formData, feedback_cliente: e.target.value })}
                            placeholder="Comentários ou feedback fornecido pelo cliente..."
                            rows={2}
                        />
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSaving || !formData.solucao_aplicada || !formData.procedencia}>
                            {isSaving ? 'Salvando...' : 'Salvar Classificação e Concluir'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
