import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Car, CheckCircle, AlertCircle } from 'lucide-react';
import { useVeiculoByPlaca } from '@/hooks/useVeiculoByPlaca';
import { cn } from '@/lib/utils';

interface PlacaVeiculoInputProps {
  value: string;
  onChange: (placa: string) => void;
  onVeiculoFound?: (data: {
    modelo?: string;
    ano?: string;
    cliente?: string;
    km?: number;
    contratoLocacao?: string;
    contratoComercial?: string;
  }) => void;
  className?: string;
}

export function PlacaVeiculoInput({ 
  value, 
  onChange, 
  onVeiculoFound,
  className 
}: PlacaVeiculoInputProps) {
  const [inputValue, setInputValue] = useState(value);
  
  const veiculo = useVeiculoByPlaca(inputValue);
  
  // Formatar placa no padrão brasileiro
  const formatPlaca = (placa: string) => {
    const cleaned = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}`;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlaca(e.target.value);
    setInputValue(formatted);
    onChange(formatted);
  };
  
  // Notificar quando veículo for encontrado
  useEffect(() => {
    if (veiculo.found && onVeiculoFound) {
      onVeiculoFound({
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        cliente: veiculo.cliente,
        km: veiculo.km,
        contratoLocacao: veiculo.contratoLocacao,
        contratoComercial: veiculo.contratoComercial
      });
    }
  }, [veiculo.found, veiculo.modelo, onVeiculoFound]);
  
  const showVeiculoInfo = inputValue.length >= 7;
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Input
          id="placa"
          value={inputValue}
          onChange={handleChange}
          placeholder="ABC-1234"
          maxLength={8}
          className={cn(
            "uppercase font-mono tracking-wider h-11",
            veiculo.found && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        {showVeiculoInfo && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {veiculo.found ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </div>
        )}
      </div>
      
      {/* Card com dados do veículo */}
      {showVeiculoInfo && veiculo.found && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Modelo:</span>
                  <p className="font-medium">{veiculo.modelo || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ano:</span>
                  <p className="font-medium">{veiculo.ano || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente Frota:</span>
                  <p className="font-medium truncate">{veiculo.cliente || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">KM:</span>
                  <p className="font-medium">
                    {veiculo.km ? veiculo.km.toLocaleString('pt-BR') : '-'}
                  </p>
                </div>
                {veiculo.contratoLocacao && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Contrato:</span>
                    <p className="font-medium">{veiculo.contratoLocacao}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {showVeiculoInfo && !veiculo.found && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4" />
          <span>Veículo não encontrado na base de frota</span>
        </div>
      )}
    </div>
  );
}
