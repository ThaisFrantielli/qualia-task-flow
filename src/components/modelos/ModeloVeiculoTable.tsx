import { Edit, Trash2, MoreHorizontal, Copy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import type { ModeloVeiculo } from '@/types/modelos';
import { Skeleton } from '@/components/ui/skeleton';

interface ModeloVeiculoTableProps {
  modelos: ModeloVeiculo[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}

export function ModeloVeiculoTable({
  modelos,
  isLoading,
  onEdit,
}: ModeloVeiculoTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { deleteModelo } = useModelosVeiculos();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteModelo(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Montadora</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead>Preço Público</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Valor Final</TableHead>
              <TableHead>R$/km Adicional</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (modelos.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Nenhum modelo cadastrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modelo</TableHead>
              <TableHead>Montadora</TableHead>
              <TableHead>Ano</TableHead>
              <TableHead className="text-right">Preço Público</TableHead>
              <TableHead className="text-center">Desconto</TableHead>
              <TableHead className="text-right">Valor Final</TableHead>
              <TableHead className="text-right">R$/km Adicional</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modelos.map((modelo) => (
              <TableRow key={modelo.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{modelo.nome}</p>
                    {modelo.codigo && (
                      <p className="text-xs text-muted-foreground">
                        {modelo.codigo}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{modelo.montadora}</TableCell>
                <TableCell>
                  {modelo.ano_fabricacao && modelo.ano_fabricacao !== modelo.ano_modelo
                    ? `${modelo.ano_fabricacao}/${modelo.ano_modelo}`
                    : modelo.ano_modelo}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(modelo.preco_publico)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {formatPercent(modelo.percentual_desconto)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatCurrency(modelo.valor_final || modelo.preco_publico * (1 - modelo.percentual_desconto))}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {modelo.valor_km_adicional ? `R$ ${modelo.valor_km_adicional.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={modelo.ativo ? 'default' : 'secondary'}>
                    {modelo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(modelo.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(modelo.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
