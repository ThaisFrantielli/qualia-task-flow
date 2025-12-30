import { useState } from 'react';
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
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { useKmPackages } from '@/hooks/useKmPackages';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function PacotesKmTab() {
  const { data: packages = [], refetch } = useKmPackages();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    km_mensal: 0,
    is_ilimitado: false,
    valor_km_adicional: 0,
    ordem: 0,
    ativo: true,
  });

  const handleEdit = (pkg: any) => {
    setEditingId(pkg.id);
    setFormData({
      nome: pkg.nome,
      descricao: pkg.descricao || '',
      km_mensal: pkg.km_mensal,
      is_ilimitado: pkg.is_ilimitado,
      valor_km_adicional: pkg.valor_km_adicional,
      ordem: pkg.ordem,
      ativo: pkg.ativo,
    });
    setOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setFormData({
      nome: '',
      descricao: '',
      km_mensal: 0,
      is_ilimitado: false,
      valor_km_adicional: 0,
      ordem: packages.length + 1,
      ativo: true,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('km_packages')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Pacote atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('km_packages')
          .insert([formData]);
        if (error) throw error;
        toast.success('Pacote criado com sucesso!');
      }
      setOpen(false);
      refetch();
    } catch (error: any) {
      toast.error('Erro ao salvar pacote', {
        description: error.message
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pacote?')) return;

    try {
      const { error } = await supabase
        .from('km_packages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Pacote excluído com sucesso!');
      refetch();
    } catch (error: any) {
      toast.error('Erro ao excluir pacote', {
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pacotes de Quilometragem</h3>
          <p className="text-sm text-muted-foreground">
            Configure os pacotes de KM oferecidos aos clientes
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pacote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Pacote de KM' : 'Novo Pacote de KM'}
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do pacote de quilometragem
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Pacote *</Label>
                <Input
                  placeholder="Ex: 5.000 KM/mês"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="Descrição opcional"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>KM Mensal</Label>
                  <Input
                    type="number"
                    value={formData.km_mensal}
                    onChange={(e) => setFormData({ ...formData, km_mensal: parseInt(e.target.value) || 0 })}
                    disabled={formData.is_ilimitado}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor KM Adicional (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor_km_adicional}
                    onChange={(e) => setFormData({ ...formData, valor_km_adicional: parseFloat(e.target.value) || 0 })}
                    disabled={formData.is_ilimitado}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordem de Exibição</Label>
                  <Input
                    type="number"
                    value={formData.ordem}
                    onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="ilimitado"
                    checked={formData.is_ilimitado}
                    onChange={(e) => setFormData({ ...formData, is_ilimitado: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="ilimitado" className="cursor-pointer">
                    Ilimitado
                  </Label>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">KM/Mês</TableHead>
              <TableHead className="text-right">Valor KM Adicional</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum pacote cadastrado
                </TableCell>
              </TableRow>
            ) : (
              packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell>{pkg.ordem}</TableCell>
                  <TableCell className="font-medium">{pkg.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.descricao || '-'}</TableCell>
                  <TableCell className="text-right">
                    {pkg.is_ilimitado ? (
                      <span className="text-primary font-semibold">Ilimitado</span>
                    ) : (
                      pkg.km_mensal.toLocaleString('pt-BR')
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {pkg.is_ilimitado ? '-' : formatCurrency(pkg.valor_km_adicional)}
                  </TableCell>
                  <TableCell className="text-center">
                    {pkg.ativo ? (
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
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(pkg.id)}
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
