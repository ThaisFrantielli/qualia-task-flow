import { useState } from 'react';
import { Download, Loader2, Database, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useImportModelosFromBI } from '@/hooks/useImportModelosFromBI';

interface ImportModelosDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModelosDialog({ open, onClose }: ImportModelosDialogProps) {
  const {
    uniqueModels,
    totalUniqueModels,
    totalVehicles,
    isLoading,
    isProcessing,
    importAllModels
  } = useImportModelosFromBI();
  
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  
  const toggleModel = (key: string) => {
    const newSet = new Set(selectedModels);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedModels(newSet);
    setSelectAll(newSet.size === uniqueModels.length);
  };
  
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(
        uniqueModels.map(m => `${m.montadora}-${m.modelo}-${m.anoModelo}`)
      ));
    }
    setSelectAll(!selectAll);
  };
  
  const handleImport = async () => {
    await importAllModels();
    onClose();
  };
  
  // Agrupar modelos por montadora
  const modelsByMontadora = uniqueModels.reduce((acc, model) => {
    if (!acc[model.montadora]) {
      acc[model.montadora] = [];
    }
    acc[model.montadora].push(model);
    return acc;
  }, {} as Record<string, typeof uniqueModels>);
  
  const montadoras = Object.keys(modelsByMontadora).sort();
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Importar Modelos do BI
          </DialogTitle>
          <DialogDescription>
            Importe modelos únicos detectados na base de veículos (dim_frota) para o catálogo.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados da frota...</p>
          </div>
        ) : (
          <>
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{totalVehicles.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Veículos na Base</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalUniqueModels.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">Modelos Únicos</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-violet-600">{montadoras.length}</p>
                <p className="text-xs text-muted-foreground">Montadoras</p>
              </div>
            </div>
            
            {/* Lista de modelos */}
            <div className="border rounded-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Selecionar Todos
                  </label>
                </div>
                <Badge variant="secondary">{uniqueModels.length} modelos</Badge>
              </div>
              
              <ScrollArea className="h-[300px]">
                <div className="divide-y">
                  {montadoras.map(montadora => (
                    <div key={montadora} className="px-4 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{montadora}</span>
                        <Badge variant="outline" className="text-xs">
                          {modelsByMontadora[montadora].length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 gap-1 pl-4">
                        {modelsByMontadora[montadora].map(model => {
                          const key = `${model.montadora}-${model.modelo}-${model.anoModelo}`;
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between text-sm py-2 px-2 rounded hover:bg-muted/50 border-b border-dashed last:border-0"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Checkbox
                                  checked={selectAll || selectedModels.has(key)}
                                  onCheckedChange={() => toggleModel(key)}
                                  id={key}
                                />
                                <label htmlFor={key} className="cursor-pointer flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{model.modelo}</span>
                                    <span className="text-muted-foreground">{model.anoModelo}</span>
                                    {model.motor && (
                                      <Badge variant="outline" className="text-xs">
                                        {model.motor}
                                      </Badge>
                                    )}
                                    {model.transmissao && (
                                      <Badge variant="outline" className="text-xs">
                                        {model.transmissao}
                                      </Badge>
                                    )}
                                    {model.combustivel && (
                                      <Badge variant="outline" className="text-xs">
                                        {model.combustivel}
                                      </Badge>
                                    )}
                                  </div>
                                </label>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {model.categoria && (
                                  <Badge variant="secondary" className="text-xs">
                                    {model.categoria}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {model.quantidade} veíc.
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Os modelos importados serão criados com <strong>Preço Público = R$ 0,00</strong>. 
                Você precisará editar cada modelo para definir os valores corretos de precificação.
              </p>
            </div>
          </>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isLoading || isProcessing || uniqueModels.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Importar {uniqueModels.length} Modelos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
