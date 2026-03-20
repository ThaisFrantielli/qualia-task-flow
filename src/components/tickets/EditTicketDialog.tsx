import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateTicket } from "@/hooks/useTickets";
import { useTicketOrigens, useTicketMotivos, useTicketDepartamentos, useTicketCustomFields } from "@/hooks/useTicketOptions";
import { useAuth } from "@/contexts/AuthContext";
import { ClienteCombobox } from "@/components/common/ClienteCombobox";
import { PlacaVeiculoInput } from "./PlacaVeiculoInput";

interface EditTicketDialogProps {
  ticket: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditTicketDialog({ ticket, open, onOpenChange, onSuccess }: EditTicketDialogProps) {
  const { user } = useAuth();
  const updateTicket = useUpdateTicket();
  const { data: origens } = useTicketOrigens();
  const { data: motivos } = useTicketMotivos();
  const { data: departamentos } = useTicketDepartamentos();
  const { data: customFields } = useTicketCustomFields();

  // Form state
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoAno, setVeiculoAno] = useState("");
  const [veiculoKm, setVeiculoKm] = useState("");
  const [origem, setOrigem] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoId, setMotivoId] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [contratoComercial, setContratoComercial] = useState("");
  const [contratoLocacao, setContratoLocacao] = useState("");
  const [sintese, setSintese] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

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

  // Populate form when ticket changes
  useEffect(() => {
    if (ticket && open) {
      setTitulo(ticket.titulo || "");
      setClienteId(ticket.cliente_id || null);
      setPlaca(ticket.placa || ticket.veiculo_placa || "");
      setVeiculoModelo(ticket.veiculo_modelo || "");
      setVeiculoAno(ticket.veiculo_ano || "");
      setVeiculoKm(ticket.veiculo_km?.toString() || "");
      setOrigem(ticket.origem || "");
      setOrigemId(ticket.origem_id || "");
      setDepartamento(ticket.departamento || "");
      setMotivo(ticket.motivo || "");
      setMotivoId(ticket.motivo_id || "");
      setPrioridade(ticket.prioridade || "media");
      setContratoComercial(ticket.contrato_comercial || "");
      setContratoLocacao(ticket.contrato_locacao || "");
      setSintese(ticket.sintese || ticket.descricao || "");
      setCustomFieldValues(ticket.custom_fields || {});
    }
  }, [ticket, open]);

  useEffect(() => {
    if (!open) return;

    if (!origemId && ticket?.origem && origens?.length) {
      const found = origens.find((item) => item.value === ticket.origem || item.label === ticket.origem);
      if (found) setOrigemId(found.id);
    }

    if (!motivoId && ticket?.motivo && motivos?.length) {
      const found = motivos.find((item) => item.value === ticket.motivo || item.label === ticket.motivo);
      if (found) setMotivoId(found.id);
    }
  }, [open, ticket?.origem, ticket?.motivo, origens, motivos, origemId, motivoId]);

  const handleVeiculoFound = (data: any) => {
    if (data.found) {
      setVeiculoModelo(data.Modelo || "");
      setVeiculoAno(data.AnoModelo || "");
      setVeiculoKm(data.KmAtual?.toString() || "");
      if (data.ContratoComercial) setContratoComercial(data.ContratoComercial);
      if (data.ContratoLocacao) setContratoLocacao(data.ContratoLocacao);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !ticket?.id) {
      console.error('[EditTicketDialog] Missing user or ticket:', { user, ticket });
      toast.error('Erro: usuário ou ticket não identificado');
      return;
    }

    try {
      console.log('[EditTicketDialog] Atualizando ticket:', ticket.id, 'com dados:', {
        titulo,
        cliente_id: clienteId,
        placa,
        veiculo_modelo: veiculoModelo,
        veiculo_ano: veiculoAno,
        veiculo_km: veiculoKm ? parseInt(veiculoKm) : null,
        origem,
        departamento,
        motivo,
        prioridade,
        contrato_comercial: contratoComercial,
        contrato_locacao: contratoLocacao,
        sintese,
        descricao: sintese,
      });

      await updateTicket.mutateAsync({
        ticketId: ticket.id,
        updates: {
          titulo,
          cliente_id: clienteId,
          placa,
          veiculo_modelo: veiculoModelo,
          veiculo_ano: veiculoAno,
          veiculo_km: veiculoKm ? parseInt(veiculoKm) : null,
          origem,
          origem_id: origemId || null,
          departamento,
          motivo,
          motivo_id: motivoId || null,
          prioridade,
          contrato_comercial: contratoComercial,
          contrato_locacao: contratoLocacao,
          sintese,
          descricao: sintese,
          custom_fields: customFieldValues,
        },
        userId: user.id,
      });

      toast.success("Ticket atualizado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('[EditTicketDialog] Erro ao atualizar:', error);
      toast.error("Erro ao atualizar ticket: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span>Editar Ticket</span>
                <span className="ml-2 text-muted-foreground font-mono text-sm">
                  #{ticket?.numero_ticket}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Assunto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assunto</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo curto do problema"
              className="h-11"
            />
          </div>

          {/* Cliente e Placa - Grid responsivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <ClienteCombobox
                value={clienteId}
                onChange={setClienteId}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Placa do Veículo</Label>
              <PlacaVeiculoInput
                value={placa}
                onChange={setPlaca}
                onVeiculoFound={handleVeiculoFound}
              />
            </div>
          </div>

          {/* Dados do Veículo (se preenchido) */}
          {veiculoModelo && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Dados do Veículo</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Modelo</Label>
                  <Input
                    value={veiculoModelo}
                    onChange={(e) => setVeiculoModelo(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ano</Label>
                  <Input
                    value={veiculoAno}
                    onChange={(e) => setVeiculoAno(e.target.value)}
                    className="h-9 text-sm bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">KM</Label>
                  <Input
                    value={veiculoKm}
                    onChange={(e) => setVeiculoKm(e.target.value)}
                    className="h-9 text-sm bg-background"
                    type="number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Origem e Departamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Origem do Lead</Label>
              <Select
                value={origemId}
                onValueChange={(id) => {
                  setOrigemId(id);
                  const selected = origens?.find((item) => item.id === id);
                  setOrigem(selected?.value || selected?.label || "");
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione a origem..." />
                </SelectTrigger>
                <SelectContent>
                  {origens?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o departamento..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos?.map((d) => (
                    <SelectItem key={d.id} value={d.label}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Motivo e Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Motivo da Reclamação</Label>
              <Select
                value={motivoId}
                onValueChange={(id) => {
                  setMotivoId(id);
                  const selected = motivos?.find((item) => item.id === id);
                  setMotivo(selected?.value || selected?.label || "");
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {motivos?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione a prioridade..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="urgente">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contratos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contrato Comercial</Label>
              <Input
                value={contratoComercial}
                onChange={(e) => setContratoComercial(e.target.value)}
                placeholder="Número do contrato"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Contrato de Locação</Label>
              <Input
                value={contratoLocacao}
                onChange={(e) => setContratoLocacao(e.target.value)}
                placeholder="Número do contrato"
                className="h-11"
              />
            </div>
          </div>

          {activeCustomFields.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground">Campos Customizados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCustomFields.map((field) => {
                  const value = customFieldValues[field.field_key];
                  const fieldOptions = normalizeOptions(field.options as any);

                  if (field.field_type === "textarea") {
                    return (
                      <div key={field.id} className="space-y-2 md:col-span-2">
                        <Label className="text-sm font-medium">{field.label}{field.is_required ? " *" : ""}</Label>
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
                        <Label className="text-sm font-medium">{field.label}{field.is_required ? " *" : ""}</Label>
                        <Select
                          value={value || ""}
                          onValueChange={(selected) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: selected }))}
                        >
                          <SelectTrigger className="h-11">
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
                        <Label className="text-sm font-medium">{field.label}{field.is_required ? " *" : ""}</Label>
                        {fieldOptions.length > 0 ? (
                          <div className="flex flex-wrap gap-2 min-h-11 items-center">
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
                            className="h-11"
                            value={selectedValues.join(", ")}
                            onChange={(e) => {
                              const list = e.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean);
                              setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: list }));
                            }}
                            placeholder={field.placeholder || "Valores separados por vírgula"}
                          />
                        )}
                      </div>
                    );
                  }

                  if (field.field_type === "checkbox") {
                    return (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-sm font-medium">{field.label}{field.is_required ? " *" : ""}</Label>
                        <label className="flex items-center gap-2 text-sm h-11">
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
                      <Label className="text-sm font-medium">{field.label}{field.is_required ? " *" : ""}</Label>
                      <Input
                        className="h-11"
                        type={inputType}
                        value={value || ""}
                        onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                        placeholder={field.placeholder || ""}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Síntese */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Síntese do Caso</Label>
            <Textarea
              value={sintese}
              onChange={(e) => setSintese(e.target.value)}
              placeholder="Descreva o problema detalhadamente..."
              className="min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="h-10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={updateTicket.isPending}
              className="h-10 min-w-[140px]"
            >
              {updateTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
