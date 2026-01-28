import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface CampoCustomizado {
  id: string;
  modelo_id: string;
  nome_campo: string;
  valor_campo: string;
  ordem: number;
  created_at: string;
}

interface Props {
  modeloId: string;
}

export function ModeloCamposCustomizadosManager({ modeloId }: Props) {
  const queryClient = useQueryClient();
  const [newCampo, setNewCampo] = useState({ nome: '', valor: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ nome: '', valor: '' });

  const { data: campos, isLoading } = useQuery({
    queryKey: ['modelo_campos_customizados', modeloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelo_campos_customizados')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data as CampoCustomizado[];
    },
    enabled: !!modeloId
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const ordem = (campos?.length || 0) + 1;
      const { error } = await supabase
        .from('modelo_campos_customizados')
        .insert({
          modelo_id: modeloId,
          nome_campo: newCampo.nome,
          valor_campo: newCampo.valor,
          ordem
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelo_campos_customizados', modeloId] });
      toast.success('Campo adicionado!');
      setNewCampo({ nome: '', valor: '' });
    },
    onError: (err: Error) => {
      toast.error('Erro ao adicionar campo', { description: err.message });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelo_campos_customizados')
        .update({
          nome_campo: editValues.nome,
          valor_campo: editValues.valor
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelo_campos_customizados', modeloId] });
      setEditingId(null);
      toast.success('Campo atualizado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelo_campos_customizados')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelo_campos_customizados', modeloId] });
      toast.success('Campo removido!');
    }
  });

  const startEdit = (campo: CampoCustomizado) => {
    setEditingId(campo.id);
    setEditValues({ nome: campo.nome_campo, valor: campo.valor_campo });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ nome: '', valor: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Campos Personalizados</h4>
      </div>

      {/* Add new campo */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <Label className="text-xs">Nome do Campo</Label>
          <Input
            placeholder="Ex: Garantia"
            value={newCampo.nome}
            onChange={(e) => setNewCampo(prev => ({ ...prev, nome: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs">Valor</Label>
          <Input
            placeholder="Ex: 5 anos"
            value={newCampo.valor}
            onChange={(e) => setNewCampo(prev => ({ ...prev, valor: e.target.value }))}
          />
        </div>
        <Button
          type="button"
          size="icon"
          disabled={!newCampo.nome || !newCampo.valor}
          onClick={() => addMutation.mutate()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List campos */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : campos && campos.length > 0 ? (
        <div className="space-y-2">
          {campos.map((campo) => (
            <div key={campo.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              
              {editingId === campo.id ? (
                <>
                  <Input
                    className="flex-1"
                    value={editValues.nome}
                    onChange={(e) => setEditValues(prev => ({ ...prev, nome: e.target.value }))}
                  />
                  <Input
                    className="flex-1"
                    value={editValues.valor}
                    onChange={(e) => setEditValues(prev => ({ ...prev, valor: e.target.value }))}
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={() => updateMutation.mutate(campo.id)}>
                    <Check className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium text-sm">{campo.nome_campo}</span>
                  <span className="flex-1 text-sm text-muted-foreground">{campo.valor_campo}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(campo)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => deleteMutation.mutate(campo.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhum campo personalizado adicionado.
        </p>
      )}
    </div>
  );
}
