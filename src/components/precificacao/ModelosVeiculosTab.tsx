import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2, Save, Car, Download } from 'lucide-react';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const handleImportFromDW = async () => {
  toast.info('Importação em desenvolvimento', {
    description: 'Execute o script: node scripts/populate-modelos-from-dw.js'
  });
};

export function ModelosVeiculosTab() {
  const { modelos, isLoading: loading } = useModelosVeiculos();
  const queryClient = useQueryClient();
  const refetch = () => queryClient.invalidateQueries({ queryKey: ['modelos_veiculos'] });
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    montadora: '',
    nome: '',
    ano_modelo: new Date().getFullYear() + 1,
    categoria: 'hatch',
    preco_publico: 0,
    percentual_desconto: 0,
    valor_final: 0,
    valor_km_adicional: 0.70,
    consumo_medio: 12.0,
    ativo: true,
  });

  const handleEdit = (modelo: any) => {
    setEditingId(modelo.id);
    setFormData({
      montadora: modelo.montadora,
      nome: modelo.nome,
      ano_modelo: modelo.ano_modelo,
      categoria: modelo.categoria,
      preco_publico: modelo.preco_publico,
      percentual_desconto: modelo.percentual_desconto,
      valor_final: modelo.valor_final,
      valor_km_adicional: modelo.valor_km_adicional || 0.70,
      consumo_medio: modelo.consumo_medio || 12.0,
      ativo: modelo.ativo,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      montadora: '',
      nome: '',
      ano_modelo: new Date().getFullYear() + 1,
      categoria: 'hatch',
      preco_publico: 0,
      percentual_desconto: 0,
      valor_final: 0,
      valor_km_adicional: 0.70,
      consumo_medio: 12.0,
      ativo: true,
    });
    setOpen(true);
  };

  const calcularValorFinal = (preco: number, desconto: number) => {
    return preco * (1 - desconto);
  };

  const handlePrecoChange = (preco: number) => {
    const valorFinal = calcularValorFinal(preco, formData.percentual_desconto);
    setFormData({ ...formData, preco_publico: preco, valor_final: valorFinal });
  };

  const handleDescontoChange = (desconto: number) => {
    const valorFinal = calcularValorFinal(formData.preco_publico, desconto);
    setFormData({ ...formData, percentual_desconto: desconto, valor_final: valorFinal });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('modelos_veiculos')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Modelo atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('modelos_veiculos')
          .insert([formData]);
        if (error) throw error;
        toast.success('Modelo criado com sucesso!');
      }
      setOpen(false);
      refetch();
    } catch (error: any) {
      toast.error('Erro ao salvar modelo', {
        description: error.message
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await supabase
        .from('modelos_veiculos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Modelo excluído com sucesso!');
      refetch();
    } catch (error: any) {
      toast.error('Erro ao excluir modelo', {
        description: error.message
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Modelos de Veículos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie o catálogo de veículos disponíveis para locação
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportFromDW}>
            <Download className="h-4 w-4 mr-2" />
            Importar do DW
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Modelo
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Modelo de Veículo' : 'Novo Modelo de Veículo'}
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do modelo de veículo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montadora *</Label>
                  <Input
                    placeholder="Ex: Volkswagen"
                    value={formData.montadora}
                    onChange={(e) => setFormData({ ...formData, montadora: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Input
                    placeholder="Ex: Polo"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano Modelo</Label>
                  <Input
                    type="number"
                    value={formData.ano_modelo}
                    onChange={(e) => setFormData({ ...formData, ano_modelo: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hatch">Hatch</SelectItem>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="utilitario">Utilitário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço Público (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.preco_publico}
                    onChange={(e) => handlePrecoChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(formData.percentual_desconto * 100).toFixed(2)}
                    onChange={(e) => handleDescontoChange(parseFloat(e.target.value) / 100 || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Final (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_final}
                    onChange={(e) => setFormData({ ...formData, valor_final: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Consumo Médio (KM/L)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.consumo_medio}
                    onChange={(e) => setFormData({ ...formData, consumo_medio: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor KM Adicional (R$/km)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_km_adicional}
                    onChange={(e) => setFormData({ ...formData, valor_km_adicional: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativo
                </Label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

    <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Montadora</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço Público</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Valor Final</TableHead>
              <TableHead className="text-right">R$/KM Adic.</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Carregando modelos...
                </TableCell>
              </TableRow>
            ) : modelos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  <Car className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p>Nenhum modelo cadastrado</p>
                </TableCell>
              </TableRow>
            ) : (
              modelos.map((modelo) => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-medium">{modelo.montadora}</TableCell>
                  <TableCell>{modelo.nome}</TableCell>
                  <TableCell>{modelo.ano_modelo}</TableCell>
                  <TableCell className="capitalize">{modelo.categoria}</TableCell>
                  <TableCell className="text-right">{formatCurrency(modelo.preco_publico)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatPercent(modelo.percentual_desconto ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(modelo.valor_final ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 font-medium">
                    {formatCurrency(modelo.valor_km_adicional ?? 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {modelo.ativo ? (
                      <span className="text-green-600 font-medium">Ativo</span>
                    ) : (
                      <span className="text-muted-foreground">Inativo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(modelo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(modelo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
