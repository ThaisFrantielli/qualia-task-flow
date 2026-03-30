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
import { Label } from "@/components/ui/label";
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
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Car, Building2, FileText } from "lucide-react";
import { useTicketOrigens, useTicketMotivos, useTicketDepartamentos, useTicketCustomFields } from "@/hooks/useTicketOptions";
import { useAuth } from '@/contexts/AuthContext';
import { useUsersContext } from '@/contexts/UsersContext';
import { useVeiculoByPlaca } from "@/hooks/useVeiculoByPlaca";
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
    atendente: z.string().optional(),
});

export function CreateTicketDialog() {
    const [open, setOpen] = useState(false);
    const [placa, setPlaca] = useState("");
    const [vinculos, setVinculos] = useState<Array<{ tipo: string; numero: string }>>([]);
    const createTicket = useCreateTicket();
    const isSubmittingRef = useRef(false);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

    const { data: origens } = useTicketOrigens();
    const { data: motivos } = useTicketMotivos();
    const { data: departamentos } = useTicketDepartamentos();
    const { data: customFields } = useTicketCustomFields();
    const veiculoData = useVeiculoByPlaca(placa);

    const activeCustomFields = (customFields || []).filter((field) => field.is_active);

    const normalizeOptions = (options: any): Array<{ value: string; label: string }> => {
        if (!Array.isArray(options)) return [];
        return options
            .map((option) => {
                if (typeof option === "string") return { value: option, label: option };
                if (option && typeof option === "object") {
                    return {
                        value: String(option.value ?? option.label ?? ""),
                        label: String(option.label ?? option.value ?? ""),
                    };
                }
                return null;
            })
            .filter((option): option is { value: string; label: string } => !!option && !!option.value);
    };

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
                    atendente: "",
        },
    });

    // Auto-preencher campos do veículo quando encontrado
    useEffect(() => {
        if (veiculoData.found) {
            if (veiculoData.contratoComercial) {
                form.setValue("contrato_comercial", veiculoData.contratoComercial);
            }
        }
    }, [veiculoData.found, veiculoData.contratoComercial, form]);

    // Pré-preencher atendente com o usuário logado
    const { user } = useAuth();
    const { users } = useUsersContext();

    useEffect(() => {
        if (user?.id) {
            form.setValue('atendente', user.id);
        }
    }, [user?.id, form]);

    function onSubmit(values: z.infer<typeof formSchema>) {
        // Prevent double submission
        if (isSubmittingRef.current || createTicket.isPending) {
            console.log("[CreateTicketDialog] Submission blocked - already in progress");
            return;
        }

        // Validate required fields
        if (!values.cliente_id || !values.motivo || !values.departamento) {
            toast.error("Preencha todos os campos obrigatórios");
            return;
        }

        const missingCustomRequired = activeCustomFields
            .filter((field) => field.is_required)
            .some((field) => {
                const value = customFieldValues[field.field_key];
                if (Array.isArray(value)) return value.length === 0;
                return value === undefined || value === null || value === "";
            });

        if (missingCustomRequired) {
            toast.error("Preencha todos os campos customizados obrigatórios");
            return;
        }

        isSubmittingRef.current = true;
        console.log("[CreateTicketDialog] Submitting ticket:", { 
            titulo: values.titulo, 
            cliente_id: values.cliente_id,
            motivo_id: values.motivo,
            departamento: values.departamento 
        });

        createTicket.mutate(
            {
                titulo: values.titulo,
                descricao: values.sintese || null,
                cliente_id: values.cliente_id,
                prioridade: values.prioridade,
                origem_id: values.origem, // UUID da tabela ticket_origens
                motivo_id: values.motivo, // UUID da tabela ticket_motivos
                setor_responsavel: values.departamento,
                placa: values.placa || null,
                contrato_comercial: values.contrato_comercial || null,
                atendente_id: values.atendente || user?.id || null,
                veiculo_modelo: veiculoData.modelo || null,
                veiculo_ano: veiculoData.ano || null,
                veiculo_cliente: veiculoData.cliente || null,
                veiculo_km: veiculoData.km || null,
                custom_fields: customFieldValues,
                status: "novo",
                tipo_reclamacao: "pos_venda"
            } as any,
            {
                onSuccess: (data) => {
                    console.log("[CreateTicketDialog] Ticket created successfully:", data?.id);
                    // Criar vínculos se houver
                    if (vinculos.length > 0 && data?.id) {
                        console.log("[CreateTicketDialog] Vínculos a criar:", vinculos);
                    }
                    toast.success("Ticket criado com sucesso!");
                    setOpen(false);
                    form.reset();
                    setPlaca("");
                    setVinculos([]);
                    setCustomFieldValues({});
                    isSubmittingRef.current = false;
                },
                onError: (error: any) => {
                    console.error("[CreateTicketDialog] Error creating ticket:", error);
                    const errorMessage = error?.message || error?.details || String(error);
                    toast.error("Erro ao criar ticket: " + errorMessage);
                    isSubmittingRef.current = false;
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
                                                    <SelectItem key={option.id} value={option.id}>
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
                                                {departamentos?.map((option) => (
                                                    <SelectItem key={option.id} value={option.label}>
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
                                                    <SelectItem key={option.id} value={option.id}>
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
                                name="atendente"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Atendente (atribuir)
                                        </FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione atendente..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {users?.map((u: any) => (
                                                        <SelectItem key={u.id} value={u.id}>
                                                            {u.full_name || u.email}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Nota: Vínculos serão adicionados após criação do ticket */}

                        {activeCustomFields.length > 0 && (
                            <Card className="bg-muted/40 border-dashed">
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <p className="text-sm font-medium">Campos Customizados</p>
                                        <p className="text-xs text-muted-foreground">
                                            Campos configurados no painel de tickets
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activeCustomFields.map((field) => {
                                            const value = customFieldValues[field.field_key];
                                            const fieldOptions = normalizeOptions(field.options as any);

                                            if (field.field_type === "textarea") {
                                                return (
                                                    <div key={field.id} className="space-y-2 md:col-span-2">
                                                        <Label>
                                                            {field.label}{field.is_required ? " *" : ""}
                                                        </Label>
                                                        <Textarea
                                                            value={value || ""}
                                                            onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                                                            placeholder={field.placeholder || ""}
                                                            className="resize-none"
                                                        />
                                                    </div>
                                                );
                                            }

                                            if (field.field_type === "select") {
                                                return (
                                                    <div key={field.id} className="space-y-2">
                                                        <Label>
                                                            {field.label}{field.is_required ? " *" : ""}
                                                        </Label>
                                                        <Select
                                                            value={value || ""}
                                                            onValueChange={(selected) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: selected }))}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={field.placeholder || "Selecione..."} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {fieldOptions.map((option) => (
                                                                    <SelectItem key={`${field.field_key}-${option.value}`} value={option.value}>
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            }

                                            if (field.field_type === "multiselect") {
                                                const selectedValues = Array.isArray(value)
                                                    ? value
                                                    : (typeof value === "string" && value ? value.split(",").map((item) => item.trim()).filter(Boolean) : []);

                                                return (
                                                    <div key={field.id} className="space-y-2">
                                                        <Label>
                                                            {field.label}{field.is_required ? " *" : ""}
                                                        </Label>
                                                        {fieldOptions.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {fieldOptions.map((option) => {
                                                                    const isSelected = selectedValues.includes(option.value);
                                                                    return (
                                                                        <button
                                                                            key={`${field.field_key}-${option.value}`}
                                                                            type="button"
                                                                            className={`px-2 py-1 text-xs rounded border transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                                                                            onClick={() => {
                                                                                const nextValues = isSelected
                                                                                    ? selectedValues.filter((item) => item !== option.value)
                                                                                    : [...selectedValues, option.value];
                                                                                setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: nextValues }));
                                                                            }}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <Input
                                                                value={selectedValues.join(", ")}
                                                                onChange={(e) => {
                                                                    const list = e.target.value
                                                                        .split(",")
                                                                        .map((item) => item.trim())
                                                                        .filter(Boolean);
                                                                    setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: list }));
                                                                }}
                                                                placeholder={field.placeholder || "Informe valores separados por vírgula"}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            }

                                            if (field.field_type === "checkbox") {
                                                return (
                                                    <div key={field.id} className="space-y-2">
                                                        <Label>
                                                            {field.label}{field.is_required ? " *" : ""}
                                                        </Label>
                                                        <label className="flex items-center gap-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={Boolean(value)}
                                                                onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.checked }))}
                                                            />
                                                            Ativar
                                                        </label>
                                                    </div>
                                                );
                                            }

                                            const inputType = field.field_type === "number"
                                                ? "number"
                                                : field.field_type === "date"
                                                    ? "date"
                                                    : field.field_type === "datetime"
                                                        ? "datetime-local"
                                                        : "text";

                                            return (
                                                <div key={field.id} className="space-y-2">
                                                    <Label>
                                                        {field.label}{field.is_required ? " *" : ""}
                                                    </Label>
                                                    <Input
                                                        type={inputType}
                                                        value={value || ""}
                                                        onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                                                        placeholder={field.placeholder || ""}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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
