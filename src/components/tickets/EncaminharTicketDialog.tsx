import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUpdateTicket, useAddTicketInteracao } from "@/hooks/useTickets";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

const formSchema = z.object({
    setor: z.string().min(1, "Setor é obrigatório"),
    mensagem: z.string().min(1, "Mensagem é obrigatória"),
});

interface EncaminharTicketDialogProps {
    ticketId: string;
}

export function EncaminharTicketDialog({ ticketId }: EncaminharTicketDialogProps) {
    const [open, setOpen] = useState(false);
    const updateTicket = useUpdateTicket();
    const addInteracao = useAddTicketInteracao();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            setor: "",
            mensagem: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        updateTicket.mutate(
            {
                ticketId: ticketId,
                updates: {
                    setor_responsavel: values.setor,
                    status: "aguardando_setor",
                },
                userId: "", // Will be set by the backend
            },
            {
                onSuccess: () => {
                    addInteracao.mutate({
                        ticket_id: ticketId,
                        tipo: "encaminhamento",
                        mensagem: values.mensagem,
                    });
                    toast.success(`Ticket encaminhado para ${values.setor}`);
                    setOpen(false);
                    form.reset();
                },
                onError: (error) => {
                    toast.error("Erro ao encaminhar ticket: " + error.message);
                },
            }
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Encaminhar
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px]">
                <DialogHeader>
                    <DialogTitle>Encaminhar Ticket</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="setor"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Setor de Destino</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o setor" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="tecnico">Técnico</SelectItem>
                                            <SelectItem value="financeiro">Financeiro</SelectItem>
                                            <SelectItem value="comercial">Comercial</SelectItem>
                                            <SelectItem value="logistica">Logística</SelectItem>
                                            <SelectItem value="juridico">Jurídico</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="mensagem"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mensagem / Observação</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Motivo do encaminhamento..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={updateTicket.isPending}>
                            Encaminhar Ticket
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
