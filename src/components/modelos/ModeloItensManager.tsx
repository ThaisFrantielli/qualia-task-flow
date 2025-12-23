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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { TIPOS_ITEM_ADICIONAL } from '@/types/modelos';

interface ModeloItensManagerProps {
  modeloId: string;
}

export function ModeloItensManager({ modeloId }: ModeloItensManagerProps) {
  const { modelos, addItem, deleteItem } = useModelosVeiculos();
  const modelo = modelos.find((m) => m.id === modeloId);
  const itens = modelo?.itens || [];

  const [newItem, setNewItem] = useState({
    tipo: 'acessorio' as const,
    nome: '',
    descricao: '',
    valor: 0,
    obrigatorio: false,
    incluso_padrao: false,
  });

  const [isAdding, setIsAdding] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.nome) return;
    
    await addItem({
      modelo_id: modeloId,
      ...newItem,
    });
    
    setNewItem({
      tipo: 'acessorio',
      nome: '',
      descricao: '',
      valor: 0,
      obrigatorio: false,
      incluso_padrao: false,
    });
    setIsAdding(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    await deleteItem(itemId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTipoBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'acessorio':
        return 'default';
      case 'opcional':
        return 'secondary';
      case 'pacote':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Itens Adicionais e Acessórios</h3>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={newItem.tipo}
                onValueChange={(v: any) => setNewItem({ ...newItem, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ITEM_ADICIONAL.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Sensor de estacionamento"
                value={newItem.nome}
                onChange={(e) =>
                  setNewItem({ ...newItem, nome: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descrição do item..."
              value={newItem.descricao}
              onChange={(e) =>
                setNewItem({ ...newItem, descricao: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={newItem.valor}
              onChange={(e) =>
                setNewItem({
                  ...newItem,
                  valor: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={newItem.incluso_padrao}
                onCheckedChange={(v) =>
                  setNewItem({ ...newItem, incluso_padrao: v })
                }
              />
              <Label>Incluso de fábrica</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newItem.obrigatorio}
                onCheckedChange={(v) =>
                  setNewItem({ ...newItem, obrigatorio: v })
                }
              />
              <Label>Obrigatório</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddItem}>
              <Check className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {itens.length === 0 && !isAdding ? (
        <p className="text-muted-foreground text-center py-8 border rounded-lg">
          Nenhum item cadastrado
        </p>
      ) : (
        <div className="space-y-2">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge variant={getTipoBadgeVariant(item.tipo)}>
                  {TIPOS_ITEM_ADICIONAL.find((t) => t.value === item.tipo)?.label || item.tipo}
                </Badge>
                <div>
                  <p className="font-medium">{item.nome}</p>
                  {item.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {item.descricao}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {item.incluso_padrao ? (
                    <span className="text-sm text-muted-foreground">Incluso</span>
                  ) : (
                    <span className="text-sm font-medium">
                      {formatCurrency(item.valor)}
                    </span>
                  )}
                  {item.obrigatorio && (
                    <p className="text-xs text-orange-500">Obrigatório</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
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
