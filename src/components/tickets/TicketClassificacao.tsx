import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { useState } from "react";

interface TicketClassificacaoProps {
    ticketId: string;
    onSave: (data: ClassificacaoData) => Promise<void>;
    initialData?: Partial<ClassificacaoData>;
}

export type ClassificacaoData = {
    procedencia: 'procedente' | 'improcedente' | 'parcial';
    solucao_aplicada: string;
    acoes_corretivas: string;
    feedback_cliente?: string;
    nota_cliente?: number;
};

const PROCEDENCIA_OPTIONS = [
    { value: 'procedente', label: 'Procedente', icon: CheckCircle, color: 'text-green-600' },
    { value: 'improcedente', label: 'Improcedente', icon: XCircle, color: 'text-red-600' },
    { value: 'parcial', label: 'Parcialmente Procedente', icon: MinusCircle, color: 'text-yellow-600' }
];

export function TicketClassificacao({ onSave, initialData }: TicketClassificacaoProps) {
    const [formData, setFormData] = useState<ClassificacaoData>({
        procedencia: initialData?.procedencia || 'procedente',
        solucao_aplicada: initialData?.solucao_aplicada || '',
        acoes_corretivas: initialData?.acoes_corretivas || '',
        feedback_cliente: initialData?.feedback_cliente || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Classificação Final do Ticket</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Procedência */}
                    <div className="space-y-2">
                        <Label htmlFor="procedencia">Procedência da Reclamação *</Label>
                        <Select
                            value={formData.procedencia}
                            onValueChange={(value: any) => setFormData({ ...formData, procedencia: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROCEDENCIA_OPTIONS.map(opt => {
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

                    {/* Avaliação removida a pedido: seção de nota do cliente foi omitida */}

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isSaving || !formData.solucao_aplicada}>
                            {isSaving ? 'Salvando...' : 'Salvar Classificação'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
