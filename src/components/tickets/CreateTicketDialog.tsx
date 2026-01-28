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
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTicket } from "@/hooks/useTickets";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Car, Building2, FileText } from "lucide-react";
import { useTicketOrigens, useTicketMotivos } from "@/hooks/useTicketOptions";
import { useVeiculoByPlaca } from "@/hooks/useVeiculoByPlaca";
import { TICKET_DEPARTAMENTO_OPTIONS } from "@/constants/ticketOptions";
import { ClienteCombobox } from "@/components/common/ClienteCombobox";
import { PlacaVeiculoInput } from "./PlacaVeiculoInput";

const formSchema = z.object({
    titulo: z.string().min(1, "Título é obrigatório"),
    sintese: z.string().optional(),
    cliente_id: z.string().min(1, "Cliente é obrigatório"),
    prioridade: z.string(),
    origem: z.string().min(1, "Origem é obrigatória"),
    motivo: z.string().min(1, "Motivo é obrigatório"),
    departamento: z.string().min(1, "Departamento é obrigatório"),
    placa: z.string().optional(),
    contrato_comercial: z.string().optional(),
    contrato_locacao: z.string().optional(),
});

export function CreateTicketDialog() {
    const [open, setOpen] = useState(false);
    const [placa, setPlaca] = useState("");
    const [vinculos, setVinculos] = useState<Array<{ tipo: string; numero: string }>>([]);
    const createTicket = useCreateTicket();

    const { data: origens } = useTicketOrigens();
    const { data: motivos } = useTicketMotivos();
    const veiculoData = useVeiculoByPlaca(placa);

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
            contrato_comercial: "",
            contrato_locacao: "",
        },
    });

    // Auto-preencher campos do veículo quando encontrado
    useEffect(() => {
        if (veiculoData.found) {
            if (veiculoData.contratoComercial) {
                form.setValue("contrato_comercial", veiculoData.contratoComercial);
            }
            if (veiculoData.contratoLocacao) {
                form.setValue("contrato_locacao", veiculoData.contratoLocacao);
            }
        }
    }, [veiculoData.found, veiculoData.contratoComercial, veiculoData.contratoLocacao, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        createTicket.mutate(
            {
                titulo: values.titulo,
                sintese: values.sintese || null,
                cliente_id: values.cliente_id,
                prioridade: values.prioridade,
                origem: values.origem,
                motivo: values.motivo as any,
                departamento: values.departamento as any,
                placa: values.placa || null,
                contrato_comercial: values.contrato_comercial || null,
                contrato_locacao: values.contrato_locacao || null,
                veiculo_modelo: veiculoData.modelo || null,
                veiculo_ano: veiculoData.ano || null,
                veiculo_cliente: veiculoData.cliente || null,
                veiculo_km: veiculoData.km || null,
                status: "aguardando_triagem",
                fase: "Análise do caso",
                tipo: "pos_venda"
            } as any,
            {
                onSuccess: (data) => {
                    // Criar vínculos se houver
                    if (vinculos.length > 0 && data?.id) {
                        // Os vínculos serão criados via hook separado após criação do ticket
                        console.log("Vínculos a criar:", vinculos);
                    }
                    toast.success("Ticket criado com sucesso!");
                    setOpen(false);
                    form.reset();
                    setPlaca("");
                    setVinculos([]);
                },
                onError: (error) => {
                    console.error("Create ticket error:", error);
                    toast.error("Erro ao criar ticket: " + (error?.message || String(error)));
                },
            }
        );
    }

    const handlePlacaChange = (value: string) => {
        setPlaca(value);
        form.setValue("placa", value);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Ticket
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] md:w-[70vw] max-w-[1000px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Ticket de Pós-Venda</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Título */}
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

                        {/* Cliente e Placa */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="cliente_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            Cliente
                                        </FormLabel>
                                        <FormControl>
                                            <ClienteCombobox
                                                value={field.value || null}
                                                onChange={(val) => field.onChange(val || "")}
                                                placeholder="Buscar cliente..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                    <Car className="w-4 h-4" />
                                    Placa do Veículo
                                </FormLabel>
                                <PlacaVeiculoInput
                                    value={placa}
                                    onChange={handlePlacaChange}
                                />
                            </FormItem>
                        </div>

                        {/* Dados do Veículo (auto-preenchidos) */}
                        {veiculoData.found && (
                            <Card className="bg-muted/50 border-dashed">
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Car className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">Dados do Veículo (BI)</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Modelo</span>
                                            <span className="font-medium">{veiculoData.modelo || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Ano</span>
                                            <span className="font-medium">{veiculoData.ano || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Cliente (Frota)</span>
                                            <span className="font-medium">{veiculoData.cliente || "-"}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">KM Atual</span>
                                            <span className="font-medium">{veiculoData.km?.toLocaleString('pt-BR') || "-"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Origem e Departamento */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="origem"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Origem do Lead</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {origens?.map((option) => (
                                                    <SelectItem key={option.id} value={option.value}>
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
                                        <Select onValueChange={field.onChange} value={field.value}>
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

                        {/* Motivo e Prioridade */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="motivo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo da Reclamação</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {motivos?.map((option) => (
                                                    <SelectItem key={option.id} value={option.value}>
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
                                        <Select onValueChange={field.onChange} value={field.value}>
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

                        {/* Contratos */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="contrato_comercial"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Contrato Comercial
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Número do contrato" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="contrato_locacao"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Contrato de Locação
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Número do contrato" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Nota: Vínculos serão adicionados após criação do ticket */}

                        {/* Síntese */}
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
                            {createTicket.isPending ? "Criando..." : "Criar Ticket"}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
