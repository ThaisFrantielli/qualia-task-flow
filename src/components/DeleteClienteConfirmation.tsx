// React é importado automaticamente no React 17+ com JSX Transform
// Removendo o import para evitar o aviso
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
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DeleteClienteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  clienteName: string;
  dependencias?: {
    temDependencias: boolean;
    atendimentosAtivos?: number;
    tarefasPendentes?: number;
  };
}

export function DeleteClienteConfirmation({
  open,
  onOpenChange,
  onConfirm,
  clienteName,
  dependencias
}: DeleteClienteConfirmationProps) {
  const temDependencias = dependencias?.temDependencias || false;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Confirmar exclusão
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a excluir o cliente <strong>{clienteName}</strong>.
              Esta ação não pode ser desfeita.
            </p>
            
            {temDependencias && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                <p className="font-medium">Atenção: Este cliente possui dependências!</p>
                <ul className="list-disc pl-5 mt-1">
                  {dependencias?.atendimentosAtivos && dependencias.atendimentosAtivos > 0 && (
                    <li>{dependencias.atendimentosAtivos} atendimento(s) ativo(s)</li>
                  )}
                  {dependencias?.tarefasPendentes && dependencias.tarefasPendentes > 0 && (
                    <li>{dependencias.tarefasPendentes} tarefa(s) pendente(s)</li>
                  )}
                </ul>
                <p className="mt-1">
                  Recomendamos resolver estas pendências antes de excluir o cliente.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Cancelar</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {temDependencias ? "Excluir mesmo assim" : "Confirmar exclusão"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteClienteConfirmation;