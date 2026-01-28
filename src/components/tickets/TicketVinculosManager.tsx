import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Receipt, 
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { useTicketVinculos, useCreateTicketVinculo, useDeleteTicketVinculo } from '@/hooks/useTicketVinculos';
import { TicketVinculo, TicketVinculoTipo, VINCULO_LABELS } from '@/types/ticket-options';

interface TicketVinculosManagerProps {
  ticketId: string;
  readOnly?: boolean;
}

const TIPO_ICONS: Record<TicketVinculoTipo, React.ReactNode> = {
  ordem_servico: <Wrench className="h-4 w-4" />,
  fatura: <Receipt className="h-4 w-4" />,
  ocorrencia: <AlertTriangle className="h-4 w-4" />
};

const TIPO_COLORS: Record<TicketVinculoTipo, string> = {
  ordem_servico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  fatura: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ocorrencia: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
};

export function TicketVinculosManager({ ticketId, readOnly = false }: TicketVinculosManagerProps) {
  const { data: vinculos, isLoading } = useTicketVinculos(ticketId);
  const createVinculo = useCreateTicketVinculo();
  const deleteVinculo = useDeleteTicketVinculo();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVinculo, setNewVinculo] = useState({
    tipo: 'ordem_servico' as TicketVinculoTipo,
    numero: '',
    descricao: '',
    valor: ''
  });
  
  const handleCreate = async () => {
    if (!newVinculo.numero.trim()) return;
    
    await createVinculo.mutateAsync({
      ticket_id: ticketId,
      tipo: newVinculo.tipo,
      numero: newVinculo.numero.trim(),
      descricao: newVinculo.descricao.trim() || undefined,
      valor: newVinculo.valor ? parseFloat(newVinculo.valor) : undefined
    });
    
    setNewVinculo({ tipo: 'ordem_servico', numero: '', descricao: '', valor: '' });
    setIsDialogOpen(false);
  };
  
  const handleDelete = async (vinculo: TicketVinculo) => {
    await deleteVinculo.mutateAsync({ id: vinculo.id, ticketId });
  };
  
  // Agrupar vínculos por tipo
  const vinculosPorTipo: Record<TicketVinculoTipo, TicketVinculo[]> = vinculos?.reduce((acc, v) => {
    if (!acc[v.tipo]) acc[v.tipo] = [];
    acc[v.tipo].push(v);
    return acc;
  }, { ordem_servico: [], fatura: [], ocorrencia: [] } as Record<TicketVinculoTipo, TicketVinculo[]>) || { ordem_servico: [], fatura: [], ocorrencia: [] };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vínculos
          </CardTitle>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando...</div>
        ) : !vinculos?.length ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Nenhum vínculo adicionado
          </div>
        ) : (
          <div className="space-y-4">
            {(['ordem_servico', 'fatura', 'ocorrencia'] as TicketVinculoTipo[]).map(tipo => {
              const items = vinculosPorTipo[tipo] as TicketVinculo[] | undefined;
              if (!items?.length) return null;
              
              return (
                <div key={tipo} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {TIPO_ICONS[tipo]}
                    <span className="text-sm font-medium">{VINCULO_LABELS[tipo]}s</span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length}
                    </Badge>
                  </div>
                  <div className="space-y-1 pl-6">
                    {items.map((vinculo: TicketVinculo) => (
                      <div 
                        key={vinculo.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge className={TIPO_COLORS[vinculo.tipo]}>
                            {vinculo.numero}
                          </Badge>
                          {vinculo.descricao && (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {vinculo.descricao}
                            </span>
                          )}
                          {vinculo.valor && (
                            <span className="text-sm font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency', 
                                currency: 'BRL' 
                              }).format(vinculo.valor)}
                            </span>
                          )}
                        </div>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(vinculo)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      
      {/* Dialog para adicionar vínculo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vínculo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={newVinculo.tipo} 
                onValueChange={(v) => setNewVinculo({ ...newVinculo, tipo: v as TicketVinculoTipo })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordem_servico">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Ordem de Serviço
                    </div>
                  </SelectItem>
                  <SelectItem value="fatura">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Fatura
                    </div>
                  </SelectItem>
                  <SelectItem value="ocorrencia">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Ocorrência
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Número *</Label>
              <Input
                value={newVinculo.numero}
                onChange={(e) => setNewVinculo({ ...newVinculo, numero: e.target.value })}
                placeholder="Ex: OS-12345"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={newVinculo.descricao}
                onChange={(e) => setNewVinculo({ ...newVinculo, descricao: e.target.value })}
                placeholder="Breve descrição"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Valor (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={newVinculo.valor}
                onChange={(e) => setNewVinculo({ ...newVinculo, valor: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!newVinculo.numero.trim() || createVinculo.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
