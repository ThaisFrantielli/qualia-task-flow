import { useTicketDetail, useUpdateTicket, useAddTicketInteracao } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, User, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, MessageSquare, ListTodo, FileText, Paperclip, CheckSquare, MessageCircle, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TicketSLAIndicator } from "./TicketSLAIndicator";
import { TicketDepartamentoCard } from "./TicketDepartamentoCard";
import { TicketAnexos } from "./TicketAnexos";
import { TicketClassificacao, ClassificacaoData } from "./TicketClassificacao";
import { TicketWhatsAppViewer } from "./TicketWhatsAppViewer";
import { TicketTasks } from "./TicketTasks";
import { TicketTempoCounter } from "./TicketTempoCounter";
import { TicketVinculosManager } from "./TicketVinculosManager";
import { EditTicketDialog } from "./EditTicketDialog";
import { TICKET_FASES } from "@/constants/ticketOptions";
import { supabase } from "@/integrations/supabase/client";


interface TicketDetailProps {
    ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
    const { user } = useAuth();
    const { data: ticketData, isLoading, refetch } = useTicketDetail(ticketId);
    const ticket = ticketData as any; // Cast to any to support new fields
    const updateTicket = useUpdateTicket();
    const addInteracao = useAddTicketInteracao();

    const [comment, setComment] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [mentionIndex, setMentionIndex] = useState(0);
    const [mentionUsers, setMentionUsers] = useState<Array<{ id: string; full_name: string }>>([]);

    const [editingSintese, setEditingSintese] = useState(false);
    const [sinteseText, setSinteseText] = useState<string>("");
    const [sinteseExpanded, setSinteseExpanded] = useState(true);
    const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
    const [createdByName, setCreatedByName] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Normaliza strings de timestamp que podem vir sem fuso (ex: "YYYY-MM-DD HH:MM:SS")
    const toDate = (val: any) => {
        if (!val) return new Date();
        if (val instanceof Date) return val;
        if (typeof val === 'string') {
            // ISO-like with T -> let Date parse (keeps offset if present)
            if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return new Date(val);
            // Space-separated common Postgres format 'YYYY-MM-DD HH:MM:SS' -> assume UTC
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(val)) return new Date(val.replace(' ', 'T') + 'Z');
            // Fallback
            return new Date(val);
        }
        return new Date(val);
    };

    const handleFaseChange = async (newFase: string) => {
        if (!user?.id) return;
        try {
            const updates: any = { fase: newFase };

            // Coerência fase <-> status (evita divergência entre quadro/lista e detalhe)
            if (newFase === "Concluída") {
                updates.status = "resolvido";
                updates.data_conclusao = new Date().toISOString();
            } else if (ticket?.fase === "Concluída") {
                updates.status = "em_analise";
                updates.data_conclusao = null;
            }

            await updateTicket.mutateAsync({
                ticketId,
                updates,
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
            const { data: interacaoData } = await addInteracao.mutateAsync({
                ticket_id: ticketId,
                tipo: "comentario",
                mensagem: comment,
                user_id: user.id
            });
            // Create notifications for mentioned users
            for (const userId of mentionedUsers) {
                await supabase.from('notifications').insert({
                    user_id: userId,
                    type: 'ticket_mention',
                    title: 'Você foi mencionado em um ticket',
                    message: `Você foi mencionado no ticket #${ticket.numero_ticket}`,
                    data: { ticket_id: ticketId, interacao_id: interacaoData?.id },
                    read: false
                });
            }
            setComment("");
            setMentionedUsers([]);
            toast.success("Comentário adicionado!");
        } catch (error) {
            toast.error("Erro ao adicionar comentário");
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
                    data_conclusao: new Date().toISOString(),
                },
                userId: user.id
            });
            // Log interaction so it appears in the Interações history
            try {
                const inter = await addInteracao.mutateAsync({
                    ticket_id: ticketId,
                    tipo: 'mudanca_status',
                    mensagem: `Ticket concluído via classificação`,
                    status_anterior: ticket.fase || 'N/A',
                    status_novo: 'Concluída',
                    user_id: user.id
                });

                // Notify requester and attendant that ticket was concluded
                try {
                    const requesterId = (ticket as any)?.created_by || (ticket as any)?.created_by_id || null;
                    const attendantId = (ticket as any)?.atendente_id || (ticket as any)?.profiles?.id || null;
                    const baseData = {
                        ticket_id: ticketId,
                        interacao_id: (inter as any)?.id || null
                    };

                    if (requesterId) {
                        await supabase.from('notifications').insert({
                            user_id: requesterId,
                            type: 'ticket_resolved',
                            title: 'Ticket concluído',
                            message: `O ticket #${ticket.numero_ticket} foi concluído.`,
                            data: baseData,
                            read: false
                        });
                    }

                    if (attendantId && attendantId !== requesterId) {
                        await supabase.from('notifications').insert({
                            user_id: attendantId,
                            type: 'ticket_resolved',
                            title: 'Ticket concluído',
                            message: `O ticket #${ticket.numero_ticket} foi concluído.`,
                            data: baseData,
                            read: false
                        });
                    }
                } catch (err) {
                    console.error('Erro ao inserir notificações de ticket concluído:', err);
                }

            } catch (err) {
                console.error('Erro ao registrar interação de conclusão:', err);
            }

            toast.success("Classificação salva e ticket resolvido!");
        } catch (error) {
            toast.error("Erro ao salvar classificação");
        }
    };

    // All useEffect hooks must come before early returns
    useEffect(() => {
        setSinteseText(ticket?.sintese || ticket?.descricao || "");
    }, [ticket?.sintese, ticket?.descricao]);

    // Load creator name if available
    useEffect(() => {
        (async () => {
            try {
                const creatorId = (ticket as any)?.created_by || (ticket as any)?.created_by_id || null;
                if (!creatorId) { setCreatedByName(null); return; }
                const { data } = await supabase.from('profiles').select('full_name').eq('id', creatorId).single();
                setCreatedByName(data?.full_name || null);
            } catch (err) {
                setCreatedByName(null);
            }
        })();
    }, [ticket?.created_by, ticket?.created_by_id]);

    // Mentions: fetch users when query after '@' has 2+ chars
    useEffect(() => {
        let active = true;
        (async () => {
            if (mentionQuery.length < 2) {
                setMentionUsers([]); setMentionIndex(0); return;
            }
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name')
                .ilike('full_name', `%${mentionQuery}%`)
                .limit(5);
            if (!active) return;
            if (error) return;
            setMentionUsers(data || []);
            setMentionIndex(0);
        })();
        return () => { active = false; };
    }, [mentionQuery]);

    if (isLoading) return <div className="flex justify-center h-full items-center"><Loader2 className="animate-spin" /></div>;
    if (!ticket) return <div className="flex justify-center h-full items-center">Ticket não encontrado</div>;

    const fases = TICKET_FASES.POS_VENDAS;

    const handleCommentChange = (val: string) => {
        setComment(val);
        const cursorPos = textareaRef.current?.selectionStart ?? val.length;
        const textUntilCursor = val.slice(0, cursorPos);
        const match = /(^|\s)@([A-Za-z0-9_]{0,30})$/.exec(textUntilCursor);
        if (match) {
            setMentionOpen(true);
            setMentionQuery(match[2]);
        } else {
            setMentionOpen(false);
            setMentionQuery("");
        }
    };

    const insertMention = (userToInsert: { id: string; full_name: string }) => {
        const ta = textareaRef.current;
        const val = comment;
        if (!ta) return;
        const cursorPos = ta.selectionStart;
        const textUntilCursor = val.slice(0, cursorPos);
        const match = /(^|\s)@([A-Za-z0-9_]{0,30})$/.exec(textUntilCursor);
        if (!match) return;
        const start = (match.index ?? 0) + match[1].length; // after space or line start
        const replacement = `@${userToInsert.full_name}`;
        const after = val.slice(cursorPos);
        const newVal = val.slice(0, start) + replacement + after;
        setComment(newVal);
        setMentionedUsers(prev => [...prev, userToInsert.id]);
        setMentionOpen(false);
        setMentionQuery("");
        // re-focus and set caret after mention
        requestAnimationFrame(() => {
            ta.focus();
            const pos = start + replacement.length;
            ta.setSelectionRange(pos, pos);
        });
    };

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
                        {ticket.created_at && (
                            <p className="text-xs text-muted-foreground">
                                Criado em: {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                {createdByName ? ` • por ${createdByName}` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex gap-2 items-center">
                        <Badge className={ticket.status === 'resolvido' ? 'bg-green-600' : 'bg-blue-600'}>
                            {ticket.status?.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                            {ticket.prioridade}
                        </Badge>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setIsEditDialogOpen(true)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Editar ticket"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>
                    <TicketSLAIndicator
                        label="Resolução"
                        slaTimestamp={ticket.sla_resolucao}
                        isCumprido={ticket.status === 'resolvido' || ticket.status === 'fechado'}
                        compact
                    />
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
                                                            <span className="text-xs text-muted-foreground">{format(toDate(interacao.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
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
                                    <div className="mt-4 flex gap-2 relative">
                                        <Textarea
                                            ref={textareaRef}
                                            value={comment}
                                            onChange={(e) => handleCommentChange(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (mentionOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                                                    e.preventDefault();
                                                    const next = e.key === 'ArrowDown' ? mentionIndex + 1 : mentionIndex - 1;
                                                    const len = mentionUsers.length;
                                                    setMentionIndex(((next % len) + len) % len);
                                                } else if (mentionOpen && (e.key === 'Enter' || e.key === 'Tab')) {
                                                    e.preventDefault();
                                                    if (mentionUsers[mentionIndex]) insertMention(mentionUsers[mentionIndex]);
                                                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddComment();
                                                }
                                            }}
                                            placeholder="Adicionar comentário ou atualização... (use @ para mencionar alguém)"
                                            className="min-h-[80px] bg-slate-50"
                                        />
                                        {mentionOpen && mentionUsers.length > 0 && (
                                            <div className="absolute left-2 bottom-20 z-20 bg-popover border rounded-md shadow-md w-64 max-h-48 overflow-auto">
                                                {mentionUsers.map((u, idx) => (
                                                    <button
                                                        type="button"
                                                        key={u.id}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${idx === mentionIndex ? 'bg-muted' : ''}`}
                                                        onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
                                                    >
                                                        {u.full_name}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <Button className="self-end" onClick={handleAddComment} disabled={!comment.trim()}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    {/* Botão 'Solicitar Apoio' removido conforme solicitado */}
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
                            {/* Tempo Counter */}
                            <TicketTempoCounter
                                createdAt={ticket.created_at}
                                dataPrimeiraInteracao={ticket.data_primeira_interacao}
                                dataConlusao={ticket.data_conclusao}
                            />

                            {/* Dados do Veículo */}
                            {(ticket.veiculo_modelo || ticket.veiculo_placa) && (
                                <Card className="border-blue-200 bg-blue-50/50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <span className="text-blue-600">🚗</span> Dados do Veículo
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        {ticket.veiculo_placa && (
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Placa</span>
                                                <span className="font-semibold">{ticket.veiculo_placa}</span>
                                            </div>
                                        )}
                                        {ticket.veiculo_modelo && (
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Modelo</span>
                                                <span className="font-medium">{ticket.veiculo_modelo}</span>
                                            </div>
                                        )}
                                        {ticket.veiculo_ano && (
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Ano</span>
                                                <span className="font-medium">{ticket.veiculo_ano}</span>
                                            </div>
                                        )}
                                        {ticket.veiculo_km && (
                                            <div>
                                                <span className="text-muted-foreground block text-xs">KM Atual</span>
                                                <span className="font-medium">{Number(ticket.veiculo_km).toLocaleString('pt-BR')} km</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Vínculos */}
                            <TicketVinculosManager ticketId={ticketId} />

                            {/* Síntese do Caso - Colapsável */}
                            <Card className="border-slate-200">
                                <CardHeader 
                                    className="pb-2 flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => !editingSintese && setSinteseExpanded(!sinteseExpanded)}
                                >
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">Síntese do Caso</CardTitle>
                                        {!editingSintese && (
                                            sinteseExpanded ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )
                                        )}
                                    </div>
                                    {!editingSintese ? (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => { e.stopPropagation(); setEditingSintese(true); setSinteseExpanded(true); }}
                                            title="Editar síntese"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    if (!user?.id) return;
                                                    try {
                                                        await updateTicket.mutateAsync({
                                                            ticketId,
                                                            updates: { sintese: sinteseText },
                                                            userId: user.id
                                                        });
                                                        toast.success('Síntese atualizada');
                                                        setEditingSintese(false);
                                                    } catch {
                                                        toast.error('Erro ao salvar síntese');
                                                    }
                                                }}
                                            >Salvar</Button>
                                            <Button variant="outline" size="sm" onClick={() => { setEditingSintese(false); setSinteseText(ticket.sintese || ticket.descricao || ''); }}>Cancelar</Button>
                                        </div>
                                    )}
                                </CardHeader>
                                {sinteseExpanded && (
                                    <CardContent>
                                        {!editingSintese ? (
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-muted/50 p-3 rounded-md">
                                                {sinteseText || "Nenhuma descrição fornecida."}
                                            </p>
                                        ) : (
                                            <Textarea
                                                value={sinteseText}
                                                onChange={(e) => setSinteseText(e.target.value)}
                                                className="min-h-[140px]"
                                                placeholder="Descreva a síntese do caso..."
                                            />
                                        )}
                                    </CardContent>
                                )}
                            </Card>

                            <div className="flex justify-between items-center mt-6">
                                <h3 className="text-lg font-semibold">Departamentos Envolvidos</h3>
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

            {/* Edit Dialog */}
            <EditTicketDialog
                ticket={ticket}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                onSuccess={refetch}
            />
        </div>
    );
}
