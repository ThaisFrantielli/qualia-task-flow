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
import { useTicketOrigens } from "@/hooks/useTicketOptions";
import { useAuth } from "@/contexts/AuthContext";
import { ClienteCombobox } from "@/components/common/ClienteCombobox";
import { PlacaVeiculoInput } from "./PlacaVeiculoInput";
import { TICKET_DEPARTAMENTO_OPTIONS, TICKET_MOTIVO_OPTIONS } from "@/constants/ticketOptions";

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

  // Form state
  const [titulo, setTitulo] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [placa, setPlaca] = useState("");
  const [veiculoModelo, setVeiculoModelo] = useState("");
  const [veiculoAno, setVeiculoAno] = useState("");
  const [veiculoKm, setVeiculoKm] = useState("");
  const [origem, setOrigem] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [motivo, setMotivo] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [contratoComercial, setContratoComercial] = useState("");
  const [contratoLocacao, setContratoLocacao] = useState("");
  const [sintese, setSintese] = useState("");

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
      setDepartamento(ticket.departamento || "");
      setMotivo(ticket.motivo || "");
      setPrioridade(ticket.prioridade || "media");
      setContratoComercial(ticket.contrato_comercial || "");
      setContratoLocacao(ticket.contrato_locacao || "");
      setSintese(ticket.sintese || ticket.descricao || "");
    }
  }, [ticket, open]);

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
    if (!user?.id || !ticket?.id) return;

    try {
      await updateTicket.mutateAsync({
        ticketId: ticket.id,
        updates: {
          titulo,
          cliente_id: clienteId,
          placa,
          veiculo_placa: placa,
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
        },
        userId: user.id,
      });

      toast.success("Ticket atualizado com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Erro ao atualizar ticket: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Ticket #{ticket?.numero_ticket}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resumo curto do problema"
            />
          </div>

          {/* Cliente e Placa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <span>📋</span> Cliente
              </Label>
              <ClienteCombobox
                value={clienteId}
                onChange={setClienteId}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <span>🚗</span> Placa do Veículo
              </Label>
              <PlacaVeiculoInput
                value={placa}
                onChange={setPlaca}
                onVeiculoFound={handleVeiculoFound}
              />
            </div>
          </div>

          {/* Dados do Veículo (se preenchido) */}
          {veiculoModelo && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <Input
                  value={veiculoModelo}
                  onChange={(e) => setVeiculoModelo(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ano</Label>
                <Input
                  value={veiculoAno}
                  onChange={(e) => setVeiculoAno(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">KM</Label>
                <Input
                  value={veiculoKm}
                  onChange={(e) => setVeiculoKm(e.target.value)}
                  className="h-8 text-sm"
                  type="number"
                />
              </div>
            </div>
          )}

          {/* Origem e Departamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origem do Lead</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {origens?.map((o) => (
                    <SelectItem key={o.id} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_DEPARTAMENTO_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Motivo e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motivo da Reclamação</Label>
              <Select value={motivo} onValueChange={setMotivo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_MOTIVO_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contratos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <span>📄</span> Contrato Comercial
              </Label>
              <Input
                value={contratoComercial}
                onChange={(e) => setContratoComercial(e.target.value)}
                placeholder="Número do contrato"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <span>📄</span> Contrato de Locação
              </Label>
              <Input
                value={contratoLocacao}
                onChange={(e) => setContratoLocacao(e.target.value)}
                placeholder="Número do contrato"
              />
            </div>
          </div>

          {/* Síntese */}
          <div className="space-y-2">
            <Label>Síntese (Detalhes do Caso)</Label>
            <Textarea
              value={sintese}
              onChange={(e) => setSintese(e.target.value)}
              placeholder="Descreva o problema detalhadamente..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateTicket.isPending}>
            {updateTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
