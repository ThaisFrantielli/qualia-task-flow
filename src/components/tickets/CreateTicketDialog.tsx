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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTicket } from "@/hooks/useTickets";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
    TICKET_ORIGEM_OPTIONS,
    TICKET_MOTIVO_OPTIONS,
    TICKET_DEPARTAMENTO_OPTIONS
} from "@/constants/ticketOptions";

const formSchema = z.object({
    titulo: z.string().min(1, "Título é obrigatório"),
    sintese: z.string().optional(),
    cliente_id: z.string().min(1, "Cliente é obrigatório"),
    prioridade: z.string(),
    origem: z.string().min(1, "Origem é obrigatória"),
    motivo: z.string().min(1, "Motivo é obrigatório"),
    departamento: z.string().min(1, "Departamento é obrigatório"),
    placa: z.string().optional(),
});

export function CreateTicketDialog() {
    const [open, setOpen] = useState(false);
    const createTicket = useCreateTicket();

    const { data: clientes } = useQuery({
        queryKey: ["clientes-list"],
        queryFn: async () => {
            const { data } = await supabase
                .from("clientes")
                .select("id, nome_fantasia, razao_social")
                .order("nome_fantasia");
            return data;
        },
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            titulo: "",
            sintese: "",
            prioridade: "media",
            placa: "",
            origem: "",
            motivo: "",
            departamento: "",
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Generate ticket number (will be overwritten by trigger if set)
        const ticketNumber = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
        
        createTicket.mutate(
            {
                numero_ticket: ticketNumber,
                titulo: values.titulo,
                sintese: values.sintese,
                cliente_id: values.cliente_id,
                prioridade: values.prioridade,
                origem: values.origem,
                motivo: values.motivo as any, // Cast to enum type
                departamento: values.departamento as any, // Cast to enum type
                placa: values.placa,
                status: "aguardando_triagem",
                fase: "Análise do caso",
                tipo: "pos_venda"
            },
            {
                onSuccess: () => {
                    toast.success("Ticket criado com sucesso!");
                    setOpen(false);
                    form.reset();
                },
                onError: (error) => {
                    console.error("Create ticket error:", error);
                    toast.error("Erro ao criar ticket: " + (error?.message || String(error)));
                },
            }
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Ticket de Pós-Venda</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="titulo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assunto</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Resumo curto do problema" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cliente_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cliente</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {clientes?.map((cliente) => (
                                                    <SelectItem key={cliente.id} value={cliente.id}>
                                                        {cliente.nome_fantasia || cliente.razao_social}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="placa"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Placa do Veículo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="ABC-1234" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="origem"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Origem</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {TICKET_ORIGEM_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="departamento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Departamento</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {TICKET_DEPARTAMENTO_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="motivo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {TICKET_MOTIVO_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="prioridade"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prioridade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="baixa">Baixa</SelectItem>
                                                <SelectItem value="media">Média</SelectItem>
                                                <SelectItem value="alta">Alta</SelectItem>
                                                <SelectItem value="urgente">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="sintese"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Síntese (Detalhes do Caso)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva o problema detalhadamente..."
                                            className="resize-none min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={createTicket.isPending}>
                            Criar Ticket
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}