import { useState } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSyncClientesFromBI } from '@/hooks/useSyncClientesFromBI';
import { Progress } from '@/components/ui/progress';

interface SyncClientesButtonProps {
  onSyncComplete?: () => void;
}

export function SyncClientesButton({ onSyncComplete }: SyncClientesButtonProps) {
  const [open, setOpen] = useState(false);
  const { syncClientes, syncing, loadingBI, lastResult, clientesBICount } = useSyncClientesFromBI();

  const handleSync = async () => {
    await syncClientes();
    onSyncComplete?.();
  };

  const getResultIcon = () => {
    if (!lastResult) return null;
    if (lastResult.errors > 0) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Sincronizar do BI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sincronizar Clientes do BI
          </DialogTitle>
          <DialogDescription>
            Importa automaticamente novos clientes do arquivo dim_clientes.json para a tabela de clientes do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Clientes no BI:</span>
            <span className="font-semibold">
              {loadingBI ? 'Carregando...' : clientesBICount}
            </span>
          </div>

          {syncing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sincronizando...
              </div>
              <Progress value={undefined} className="h-2" />
            </div>
          )}

          {lastResult && !syncing && (
            <div className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getResultIcon()}
                <span className="font-medium">Resultado da sincronização:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total analisados:</span>
                  <span className="font-medium">{lastResult.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adicionados:</span>
                  <span className="font-medium text-green-600">{lastResult.added}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Já existentes:</span>
                  <span className="font-medium text-blue-600">{lastResult.skipped}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Erros:</span>
                  <span className="font-medium text-red-600">{lastResult.errors}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>• Apenas clientes novos serão adicionados (sem duplicatas)</p>
            <p>• Verificação por código do cliente e CNPJ/CPF</p>
            <p>• Origem marcada como "dim_clientes_bi"</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button 
            onClick={handleSync} 
            disabled={syncing || loadingBI}
            className="gap-2"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
