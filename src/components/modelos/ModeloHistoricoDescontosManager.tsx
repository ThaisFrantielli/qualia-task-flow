import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Calendar, Percent, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoricoDesconto {
  id: string;
  modelo_id: string;
  percentual_desconto: number;
  fornecedor: string | null;
  data_lancamento: string;
  data_vigencia_fim: string | null;
  observacoes: string | null;
  created_at: string;
}

interface Props {
  modeloId: string;
  currentDesconto: number;
  onDescontoChange: (value: number) => void;
}

export function ModeloHistoricoDescontosManager({ modeloId, currentDesconto, onDescontoChange }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newDesconto, setNewDesconto] = useState({
    percentual_desconto: currentDesconto * 100,
    fornecedor: '',
    data_lancamento: format(new Date(), 'yyyy-MM-dd'),
    data_vigencia_fim: '',
    observacoes: ''
  });

  const { data: historico, isLoading } = useQuery({
    queryKey: ['modelo_historico_descontos', modeloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelo_historico_descontos')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('data_lancamento', { ascending: false });
      
      if (error) throw error;
      return data as HistoricoDesconto[];
    },
    enabled: !!modeloId
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('modelo_historico_descontos')
        .insert({
          modelo_id: modeloId,
          percentual_desconto: newDesconto.percentual_desconto / 100,
          fornecedor: newDesconto.fornecedor || null,
          data_lancamento: newDesconto.data_lancamento,
          data_vigencia_fim: newDesconto.data_vigencia_fim || null,
          observacoes: newDesconto.observacoes || null
        });
      
      if (error) throw error;
      
      // Atualizar desconto atual do modelo
      onDescontoChange(newDesconto.percentual_desconto / 100);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelo_historico_descontos', modeloId] });
      toast.success('Desconto registrado no histórico!');
      setShowForm(false);
      setNewDesconto({
        percentual_desconto: currentDesconto * 100,
        fornecedor: '',
        data_lancamento: format(new Date(), 'yyyy-MM-dd'),
        data_vigencia_fim: '',
        observacoes: ''
      });
    },
    onError: (err: Error) => {
      toast.error('Erro ao registrar desconto', { description: err.message });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelo_historico_descontos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelo_historico_descontos', modeloId] });
      toast.success('Registro removido!');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Histórico de Descontos</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Registrar Desconto
        </Button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={newDesconto.percentual_desconto}
                onChange={(e) => setNewDesconto(prev => ({ ...prev, percentual_desconto: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Fornecedor/Montadora</Label>
              <Input
                placeholder="Ex: Toyota do Brasil"
                value={newDesconto.fornecedor}
                onChange={(e) => setNewDesconto(prev => ({ ...prev, fornecedor: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Lançamento</Label>
              <Input
                type="date"
                value={newDesconto.data_lancamento}
                onChange={(e) => setNewDesconto(prev => ({ ...prev, data_lancamento: e.target.value }))}
              />
            </div>
            <div>
              <Label>Vigência até (opcional)</Label>
              <Input
                type="date"
                value={newDesconto.data_vigencia_fim}
                onChange={(e) => setNewDesconto(prev => ({ ...prev, data_vigencia_fim: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Condições especiais, volumes, etc."
              value={newDesconto.observacoes}
              onChange={(e) => setNewDesconto(prev => ({ ...prev, observacoes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => addMutation.mutate()}>
              Salvar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
      ) : historico && historico.length > 0 ? (
        <div className="space-y-2">
          {historico.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-primary font-semibold">
                  <Percent className="h-4 w-4" />
                  {(item.percentual_desconto * 100).toFixed(1)}%
                </div>
                {item.fornecedor && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {item.fornecedor}
                  </div>
                )}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(item.data_lancamento), 'dd/MM/yyyy', { locale: ptBR })}
                  {item.data_vigencia_fim && ` até ${format(new Date(item.data_vigencia_fim), 'dd/MM/yyyy', { locale: ptBR })}`}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum histórico de desconto registrado.
        </p>
      )}
    </div>
  );
}
