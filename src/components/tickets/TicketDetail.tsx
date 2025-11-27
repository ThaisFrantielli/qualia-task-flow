import { useTicketDetail, useUpdateTicket, useAddTicketInteracao } from "@/hooks/useTickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TicketDetailProps {
    ticketId: string;
}

export function TicketDetail({ ticketId }: TicketDetailProps) {
    const { user } = useAuth();
    const { data: ticket, isLoading } = useTicketDetail(ticketId);
    const updateTicket = useUpdateTicket();
    const addInteracao = useAddTicketInteracao();
    const [comment, setComment] = useState("");

    const handleStatusChange = async (newStatus: string) => {
        if (!user?.id) return;

        try {
            await updateTicket.mutateAsync({
                ticketId,
                updates: { status: newStatus },
                userId: user.id
            });
            toast.success("Status atualizado com sucesso!");
        } catch (error) {
            toast.error("Erro ao atualizar status");
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Ticket não encontrado</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold">{ticket.titulo}</h2>
                    <p className="text-sm text-muted-foreground">
                        #{ticket.numero_ticket} • {ticket.clientes?.nome_fantasia}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge>{ticket.status}</Badge>
                    <Badge variant="outline">{ticket.prioridade}</Badge>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 h-full">
                <div className="col-span-2 flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Descrição</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="whitespace-pre-wrap">{ticket.descricao}</p>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 flex flex-col">
                        <CardHeader>
                            <CardTitle>Histórico</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            <ScrollArea className="flex-1 h-[400px] pr-4">
                                <div className="space-y-4">
                                    {ticket.ticket_interacoes?.map((interacao: any) => (
                                        <div key={interacao.id} className="flex gap-3">
                                            <div className="mt-1">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">
                                                        {interacao.profiles?.full_name || "Sistema"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(interacao.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div className="text-sm mt-1">
                                                    {interacao.tipo === "comentario" && <p>{interacao.mensagem}</p>}
                                                    {interacao.tipo === "mudanca_status" && (
                                                        <p className="italic text-muted-foreground">
                                                            Alterou status de {interacao.status_anterior} para {interacao.status_novo}
                                                        </p>
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
                                    placeholder="Adicionar comentário..."
                                    className="min-h-[80px]"
                                />
                                <Button className="self-end" onClick={handleAddComment}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ações</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                            <Button variant="outline" onClick={() => handleStatusChange("em_atendimento")}>
                                Iniciar Atendimento
                            </Button>
                            <Button variant="outline" onClick={() => handleStatusChange("resolvido")}>
                                Marcar como Resolvido
                            </Button>
                            <Button variant="destructive" onClick={() => handleStatusChange("fechado")}>
                                Fechar Ticket
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div>
                                <span className="font-semibold">Criado em:</span>
                                <p>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <div>
                                <span className="font-semibold">Atendente:</span>
                                <p>{ticket.profiles?.full_name || "Não atribuído"}</p>
                            </div>
                            <div>
                                <span className="font-semibold">Setor:</span>
                                <p>{ticket.setor_responsavel || "Não definido"}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
