import { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { TIPOS_COR } from '@/types/modelos';

interface ModeloCoresManagerProps {
  modeloId: string;
}

export function ModeloCoresManager({ modeloId }: ModeloCoresManagerProps) {
  const { modelos, createModeloCor, deleteModeloCor } = useModelosVeiculos();
  const modelo = modelos.find((m) => m.id === modeloId);
  const cores = modelo?.cores || [];

  const [newCor, setNewCor] = useState({
    nome_cor: '',
    codigo_cor: '',
    tipo_cor: 'sólida' as const,
    valor_adicional: 0,
    is_padrao: false,
    hex_color: '#FFFFFF',
  });

  const [isAdding, setIsAdding] = useState(false);

  const handleAddCor = async () => {
    if (!newCor.nome_cor) return;
    
    await createModeloCor({
      modelo_id: modeloId,
      ...newCor,
    });
    
    setNewCor({
      nome_cor: '',
      codigo_cor: '',
      tipo_cor: 'sólida',
      valor_adicional: 0,
      is_padrao: false,
      hex_color: '#FFFFFF',
    });
    setIsAdding(false);
  };

  const handleDeleteCor = async (corId: string) => {
    await deleteModeloCor(corId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Cores Disponíveis</h3>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Cor
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Cor *</Label>
              <Input
                placeholder="Branco Polar"
                value={newCor.nome_cor}
                onChange={(e) =>
                  setNewCor({ ...newCor, nome_cor: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                placeholder="040"
                value={newCor.codigo_cor}
                onChange={(e) =>
                  setNewCor({ ...newCor, codigo_cor: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newCor.tipo_cor}
                onValueChange={(v: any) => setNewCor({ ...newCor, tipo_cor: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_COR.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Adicional (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={newCor.valor_adicional}
                onChange={(e) =>
                  setNewCor({
                    ...newCor,
                    valor_adicional: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cor (Preview)</Label>
              <Input
                type="color"
                value={newCor.hex_color}
                onChange={(e) =>
                  setNewCor({ ...newCor, hex_color: e.target.value })
                }
                className="h-10 p-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={newCor.is_padrao}
              onCheckedChange={(v) => setNewCor({ ...newCor, is_padrao: v })}
            />
            <Label>Cor padrão (sem custo adicional)</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddCor}>
              <Check className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {cores.length === 0 && !isAdding ? (
        <p className="text-muted-foreground text-center py-8 border rounded-lg">
          Nenhuma cor cadastrada
        </p>
      ) : (
        <div className="space-y-2">
          {cores.map((cor) => (
            <div
              key={cor.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full border-2"
                  style={{ backgroundColor: cor.hex_color || '#ccc' }}
                />
                <div>
                  <p className="font-medium">{cor.nome_cor}</p>
                  <p className="text-xs text-muted-foreground">
                    {cor.tipo_cor}
                    {cor.codigo_cor && ` • ${cor.codigo_cor}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {cor.is_padrao ? (
                  <span className="text-sm text-muted-foreground">Padrão</span>
                ) : (
                  <span className="text-sm font-medium">
                    +{formatCurrency(cor.valor_adicional)}
                  </span>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDeleteCor(cor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
