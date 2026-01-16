import { X, Filter, MousePointer2 } from 'lucide-react';
import { Card } from '@tremor/react';

interface ChartFilterBadgesProps {
  filters: Record<string, string[]>;
  onClearFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
  labelMap?: Record<string, string>;
}

const defaultLabels: Record<string, string> = {
  productivity: 'Produtividade',
  mes: 'Mês',
  modelo: 'Modelo',
  status: 'Status',
  montadora: 'Montadora',
  fornecedor: 'Fornecedor',
  cliente: 'Cliente',
  tipo: 'Tipo',
  oficina: 'Oficina',
  placa: 'Placa',
  segmento: 'Segmento',
  estado: 'Estado',
  filial: 'Filial',
  banco: 'Banco',
  vendedor: 'Vendedor',
  situacao: 'Situação',
  motivo: 'Motivo',
  condutor: 'Condutor',
  natureza: 'Natureza',
  categoria: 'Categoria',
  faixa: 'Faixa',
  proprietario: 'Proprietário'
};

export function ChartFilterBadges({ filters, onClearFilter, onClearAll, labelMap = {} }: ChartFilterBadgesProps) {
  const activeFilters = Object.entries(filters).filter(([_, values]) => values.length > 0);
  
  if (activeFilters.length === 0) return null;

  const labels = { ...defaultLabels, ...labelMap };

  return (
    <Card className="bg-blue-50 border-blue-200 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="text-sm font-medium text-blue-700 shrink-0">Filtros ativos:</span>
        
        {activeFilters.map(([key, values]) => 
          values.map(value => (
            <span 
              key={`${key}-${value}`} 
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 hover:bg-blue-200 transition-colors"
            >
              <span className="text-blue-500">{labels[key] || key}:</span> {value}
              <X 
                size={14} 
                className="cursor-pointer hover:text-blue-900 ml-1" 
                onClick={() => onClearFilter(key, value)} 
              />
            </span>
          ))
        )}
        
        <button 
          onClick={onClearAll} 
          className="text-xs text-red-500 hover:text-red-700 underline ml-2 shrink-0 font-medium"
        >
          Limpar Todos
        </button>
      </div>
      
      <div className="flex items-center gap-1 mt-2 text-xs text-blue-500">
        <MousePointer2 size={12} />
        <span>Dica: Use Ctrl+Click para selecionar múltiplos valores</span>
      </div>
    </Card>
  );
}

export function FloatingClearButton({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <button 
        onClick={onClick} 
        className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"
      >
        <X className="w-5 h-5" /> Limpar Filtros
      </button>
    </div>
  );
}

export default ChartFilterBadges;
