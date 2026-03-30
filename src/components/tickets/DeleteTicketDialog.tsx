import { useState } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useDeleteTicket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";

const DELETION_REASONS = [
  { value: "duplicado", label: "Ticket duplicado" },
  { value: "erro_criacao", label: "Erro na criação" },
  { value: "dados_incorretos", label: "Dados incorretos" },
  { value: "cliente_cancelou", label: "Cliente cancelou" },
  { value: "sem_solucao", label: "Sem solução identificada" },
  { value: "outro", label: "Outro motivo" },
];

interface DeleteTicketDialogProps {
  ticketId: string;
  numeroTicket: string;
  titulo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteTicketDialog({
  ticketId,
  numeroTicket,
  titulo,
  open,
  onOpenChange,
  onSuccess,
}: DeleteTicketDialogProps) {
  const { user } = useAuth();
  const deleteTicket = useDeleteTicket();
  
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [confirmation, setConfirmation] = useState<string>("");

  const handleDelete = async () => {
    // Validations
    if (!selectedReason) {
      toast.error("Selecione um motivo para a exclusão");
      return;
    }

    if (selectedReason === "outro" && !customReason.trim()) {
      toast.error("Descreva o motivo da exclusão");
      return;
    }

    if (confirmation !== numeroTicket) {
      toast.error(`Digite "${numeroTicket}" para confirmar a exclusão`);
      return;
    }

    if (!user?.id) {
      toast.error("Usuário não identificado");
      return;
    }

    try {
      const finalReason = selectedReason === "outro" ? customReason : DELETION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      await deleteTicket.mutateAsync({
        ticketId,
        deletedReason: finalReason,
        userId: user.id,
      });

      toast.success("Ticket excluído com sucesso");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setSelectedReason("");
      setCustomReason("");
      setConfirmation("");
    } catch (error) {
      toast.error("Erro ao excluir ticket");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <DialogTitle>Excluir Ticket</DialogTitle>
          </div>
          <DialogDescription>
            Esta ação não pode ser desfeita. Você está prestes a excluir o ticket permanentemente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ticket Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Ticket a ser excluído:</p>
            <p className="font-mono text-sm">{numeroTicket}</p>
            <p className="text-sm truncate">{titulo}</p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da exclusão *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {DELETION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason (if "outro" is selected) */}
          {selectedReason === "outro" && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Descreva o motivo *</Label>
              <Textarea
                id="customReason"
                placeholder="Descreva detalhadamente o motivo da exclusão..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-24"
              />
            </div>
          )}

          {/* Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Digite <span className="font-mono font-bold">{numeroTicket}</span> para confirmar *
            </Label>
            <Input
              id="confirmation"
              placeholder={numeroTicket}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className={confirmation === numeroTicket ? "border-green-500" : ""}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteTicket.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={
              !selectedReason ||
              (selectedReason === "outro" && !customReason.trim()) ||
              confirmation !== numeroTicket ||
              deleteTicket.isPending
            }
          >
            {deleteTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Excluir Permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
