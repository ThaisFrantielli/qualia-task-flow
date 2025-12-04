import { useTicketDetail, useUpdateTicket, useAddTicketInteracao, useAddTicketDepartamento } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, User, Plus, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, MessageSquare, ListTodo, FileText, Paperclip, CheckSquare, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TicketSLAIndicator } from "./TicketSLAIndicator";
import { TicketDepartamentoCard } from "./TicketDepartamentoCard";
import { TicketAnexos } from "./TicketAnexos";
import { TicketClassificacao, ClassificacaoData } from "./TicketClassificacao";
import { TicketWhatsAppViewer } from "./TicketWhatsAppViewer";
import { TicketTasks } from "./TicketTasks";
import { TICKET_FASES, TICKET_DEPARTAMENTO_OPTIONS } from "@/constants/ticketOptions";

interface TicketDetailProps {
    ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
    const { user } = useAuth();
    const { data: ticketData, isLoading, refetch } = useTicketDetail(ticketId);
    const ticket = ticketData as any; // Cast to any to support new fields
    const updateTicket = useUpdateTicket();
    const addInteracao = useAddTicketInteracao();
    const addDepartamento = useAddTicketDepartamento();

    const [comment, setComment] = useState("");
    const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState("");

    const handleFaseChange = async (newFase: string) => {
        if (!user?.id) return;
        try {
            await updateTicket.mutateAsync({
                ticketId,
                updates: { fase: newFase },
                userId: user.id
            });

            // Log interaction
            await addInteracao.mutateAsync({
                ticket_id: ticketId,
                tipo: "mudanca_status",
                mensagem: `Fase alterada para: ${newFase}`,
                status_anterior: ticket.fase || "N/A",
                status_novo: newFase,
                user_id: user.id
            });

            toast.success(`Fase atualizada para: ${newFase}`);
        } catch (error) {
            toast.error("Erro ao atualizar fase");
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim() || !user?.id) return;
        try {
            await addInteracao.mutateAsync({
                ticket_id: ticketId,
                tipo: "comentario",
                mensagem: comment,
                user_id: user.id
            });
            setComment("");
            toast.success("Comentário adicionado!");
        } catch (error) {
            toast.error("Erro ao adicionar comentário");
        }
    };

    const handleAddDepartamento = async () => {
        if (!selectedDept || !user?.id) return;
        try {
            await addDepartamento.mutateAsync({
                ticket_id: ticketId,
                departamento: selectedDept,
                solicitado_por: user.id,
                status: 'pendente'
            });
            setIsAddDeptOpen(false);
            setSelectedDept("");
            toast.success("Departamento solicitado!");
        } catch (error) {
            toast.error("Erro ao solicitar departamento");
        }
    };

    const handleSaveClassificacao = async (data: ClassificacaoData) => {
        if (!user?.id) return;
        try {
            await updateTicket.mutateAsync({
                ticketId,
                updates: {
                    ...data,
                    status: 'resolvido',
                    fase: 'Concluída',
                    tempo_total_resolucao: new Date().toISOString()
                },
                userId: user.id
            });
            toast.success("Classificação salva e ticket resolvido!");
        } catch (error) {
            toast.error("Erro ao salvar classificação");
        }
    };

    if (isLoading) return <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin" /></div>;
    if (!ticket) return <div className="flex justify-center h-full items-center">Ticket não encontrado</div>;

    const fases = TICKET_FASES.POS_VENDAS;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start bg-card p-4 rounded-lg border shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{ticket.origem || "Origem N/A"}</Badge>
                        <Badge variant="secondary" className="text-xs">{ticket.departamento || "Depto N/A"}</Badge>
                        {ticket.placa && <Badge className="bg-slate-800 text-white text-xs">Placa: {ticket.placa}</Badge>}
                    </div>
                    <h2 className="text-2xl font-bold text-primary">{ticket.titulo}</h2>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-muted-foreground">
                            #{ticket.numero_ticket} • <span className="font-medium text-foreground">{ticket.clientes?.nome_fantasia}</span>
                        </p>
                        {ticket.clientes?.nome_contratante && (
                            <p className="text-xs text-muted-foreground">
                                Contratante: <span className="font-medium">{ticket.clientes.nome_contratante}</span>
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Motivo: {ticket.motivo || "Sem motivo especificado"}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                        <Badge className={ticket.status === 'resolvido' ? 'bg-green-600' : 'bg-blue-600'}>
                            {ticket.status?.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                            {ticket.prioridade}
                        </Badge>
                    </div>
                    <div className="flex gap-2">
                        <TicketSLAIndicator
                            label="1ª Resposta"
                            slaTimestamp={ticket.sla_primeira_resposta}
                            isCumprido={!!ticket.tempo_primeira_resposta}
                            compact
                        />
                        <TicketSLAIndicator
                            label="Resolução"
                            slaTimestamp={ticket.sla_resolucao}
                            isCumprido={ticket.status === 'resolvido' || ticket.status === 'fechado'}
                            compact
                        />
                    </div>
                </div>
            </div>

            {/* Fase / Pipeline */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">Fase Atual:</span>
                            <Badge variant="default" className="text-sm px-3 py-1 bg-slate-700">
                                {ticket.fase || "Não iniciada"}
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            {fases.map((fase) => (
                                <Button
                                    key={fase}
                                    variant={ticket.fase === fase ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleFaseChange(fase)}
                                    className={`text-xs ${ticket.fase === fase ? 'bg-slate-800' : 'text-slate-600'}`}
                                >
                                    {fase}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="interacoes" className="flex-1 flex flex-col">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 overflow-x-auto">
                    <TabsTrigger value="interacoes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <MessageSquare className="w-4 h-4" /> Interações
                    </TabsTrigger>
                    <TabsTrigger value="plano_acao" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <ListTodo className="w-4 h-4" /> Plano de Ação
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </TabsTrigger>
                    <TabsTrigger value="detalhes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <FileText className="w-4 h-4" /> Detalhes
                    </TabsTrigger>
                    <TabsTrigger value="anexos" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <Paperclip className="w-4 h-4" /> Anexos ({ticket.ticket_anexos?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="classificacao" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 gap-2">
                        <CheckSquare className="w-4 h-4" /> Classificação
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 mt-4 grid grid-cols-3 gap-4">
                    <div className="col-span-2 flex flex-col h-full gap-4">

                        {/* Interações Tab */}
                        <TabsContent value="interacoes" className="flex-1 flex flex-col gap-4 mt-0">
                            <Card className="flex-1 flex flex-col min-h-[400px]">
                                <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de Interações</CardTitle></CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <ScrollArea className="flex-1 h-[300px] pr-4">
                                        <div className="space-y-6">
                                            {ticket.ticket_interacoes?.map((interacao: any) => (
                                                <div key={interacao.id} className="flex gap-3 group">
                                                    <div className="mt-1">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-semibold text-sm text-slate-900">{interacao.profiles?.full_name || "Sistema"}</span>
                                                            <span className="text-xs text-muted-foreground">{format(new Date(interacao.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                                                        </div>
                                                        <div className="text-sm text-slate-700">
                                                            {interacao.tipo === "comentario" && <p className="whitespace-pre-wrap">{interacao.mensagem}</p>}
                                                            {interacao.tipo === "mudanca_status" && (
                                                                <div className="flex items-center gap-2 text-slate-500 italic">
                                                                    <ArrowRight className="w-3 h-3" />
                                                                    <span>{interacao.mensagem}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                    <div className="mt-4 flex gap-2">
                                        <Textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Adicionar comentário ou atualização..."
                                            className="min-h-[80px] bg-slate-50"
                                        />
                                        <Button className="self-end" onClick={handleAddComment} disabled={!comment.trim()}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Plano de Ação Tab */}
                        <TabsContent value="plano_acao" className="mt-0">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-base">Tarefas e Subtarefas</CardTitle></CardHeader>
                                <CardContent>
                                    <TicketTasks ticketId={ticketId} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* WhatsApp Tab */}
                        <TabsContent value="whatsapp" className="mt-0">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-base">Histórico do WhatsApp</CardTitle></CardHeader>
                                <CardContent>
                                    <TicketWhatsAppViewer
                                        clienteId={ticket.cliente_id}
                                        whatsappNumber={ticket.clientes?.whatsapp_number}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Detalhes Tab */}
                        <TabsContent value="detalhes" className="mt-0 space-y-4">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-base">Síntese do Caso</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                                        {ticket.sintese || ticket.descricao || "Nenhuma descrição fornecida."}
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="flex justify-between items-center mt-6">
                                <h3 className="text-lg font-semibold">Departamentos Envolvidos</h3>
                                <Dialog open={isAddDeptOpen} onOpenChange={setIsAddDeptOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Solicitar Apoio</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Solicitar Apoio de Departamento</DialogTitle></DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Departamento</Label>
                                                <Select value={selectedDept} onValueChange={setSelectedDept}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {TICKET_DEPARTAMENTO_OPTIONS.map(dept => (
                                                            <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <Button onClick={handleAddDepartamento} disabled={!selectedDept} className="w-full">Solicitar</Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="grid gap-4">
                                {ticket.ticket_departamentos?.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum departamento envolvido.</p>}
                                {ticket.ticket_departamentos?.map((dept: any) => (
                                    <TicketDepartamentoCard key={dept.id} departamento={dept} />
                                ))}
                            </div>
                        </TabsContent>

                        {/* Anexos Tab */}
                        <TabsContent value="anexos" className="mt-0">
                            <TicketAnexos
                                ticketId={ticketId}
                                anexos={ticket.ticket_anexos || []}
                                onUploadComplete={refetch}
                                onDeleteComplete={refetch}
                            />
                        </TabsContent>

                        {/* Classificação Tab */}
                        <TabsContent value="classificacao" className="mt-0">
                            <TicketClassificacao
                                ticketId={ticketId}
                                onSave={handleSaveClassificacao}
                                initialData={{
                                    procedencia: ticket.procedencia,
                                    solucao_aplicada: ticket.solucao_aplicada,
                                    acoes_corretivas: ticket.acoes_corretivas,
                                    feedback_cliente: ticket.feedback_cliente,
                                    nota_cliente: ticket.nota_cliente
                                }}
                            />
                        </TabsContent>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase text-muted-foreground">Ações Rápidas</CardTitle></CardHeader>
                            <CardContent className="flex flex-col gap-2">
                                <Button variant="outline" className="justify-start" onClick={() => handleFaseChange("Concluída")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                    Concluir Ticket
                                </Button>
                                <Button variant="outline" className="justify-start" onClick={() => handleFaseChange("Aberta erroneamente")}>
                                    <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                                    Marcar como Erro
                                </Button>
                                <Button variant="outline" className="justify-start" onClick={() => handleFaseChange("Dúvida")}>
                                    <HelpCircle className="w-4 h-4 mr-2 text-yellow-600" />
                                    Marcar como Dúvida
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium uppercase text-muted-foreground">Detalhes Técnicos</CardTitle></CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div><span className="font-semibold block text-xs text-muted-foreground">CRIADO EM</span><p>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</p></div>
                                <div><span className="font-semibold block text-xs text-muted-foreground">ATENDENTE</span><p>{ticket.profiles?.full_name || "Não atribuído"}</p></div>
                                <div><span className="font-semibold block text-xs text-muted-foreground">SETOR RESPONSÁVEL</span><p>{ticket.departamento || "Não definido"}</p></div>
                                <div><span className="font-semibold block text-xs text-muted-foreground">MOTIVO</span><p>{ticket.motivo || "Não classificado"}</p></div>
                                {ticket.resolucao && (
                                    <div className="pt-2 border-t mt-2">
                                        <span className="font-semibold block text-xs text-muted-foreground">RESOLUÇÃO</span>
                                        <p className="text-green-700">{ticket.resolucao}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
