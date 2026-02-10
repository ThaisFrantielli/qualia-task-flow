import { useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface DataUpdateBadgeProps {
  metadata?: {
    generated_at?: string;
    dw_last_update?: string;
    table?: string;
    record_count?: number;
    etl_version?: string;
  } | null;
  compact?: boolean;
}

export default function DataUpdateBadge({ metadata, compact = false }: DataUpdateBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!metadata?.dw_last_update && !metadata?.generated_at) return null;

  // Datas explicitamente separadas
  const dwDate = metadata.dw_last_update ? new Date(metadata.dw_last_update) : null;
  const etlDate = metadata.generated_at ? new Date(metadata.generated_at) : null;
  // Usar dwDate como prioridade para cálculo do 'time ago', cair para etlDate se não houver
  const referenceDate = dwDate || etlDate!;
  const updateDate = new Date(referenceDate);
  const now = new Date();
  const diffMs = now.getTime() - updateDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  const getTimeAgo = (dHours: number, dDays: number) => {
    if (dDays > 0) return `${dDays} dia${dDays > 1 ? 's' : ''} atrás`;
    if (dHours > 0) return `${dHours} hora${dHours > 1 ? 's' : ''} atrás`;
    return 'Recém atualizado';
  };

  const getStatusColor = () => {
    if (diffDays > 1) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (diffHours > 12) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  if (compact) {
    const displayDate = dwDate || etlDate;
    const dateStr = displayDate ? `${displayDate.toLocaleDateString('pt-BR')} ${displayDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '';
    
    return (
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm ${getStatusColor()}`}
        title={`Última atualização do DW: ${dateStr}\nClique para ver mais detalhes`}
      >
        <Clock size={12} />
        <span className="hidden sm:inline">Atualizado: </span>
        <span className="font-semibold">{dateStr}</span>
        
        {showDetails && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-4 min-w-[280px] z-50">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <RefreshCw size={14} className="text-slate-600" />
                <span className="font-semibold text-slate-900 text-xs">Informações de Atualização</span>
              </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Última atualização (DW):</span>
                        <span className="font-medium text-slate-900">
                          {dwDate ? `${dwDate.toLocaleDateString('pt-BR')} às ${dwDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dados atualizados há:</span>
                        <span className="font-medium text-slate-900">{getTimeAgo(diffHours, diffDays)}</span>
                      </div>
                      {etlDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">ETL executado em:</span>
                          <span className="font-medium text-slate-900">{etlDate.toLocaleDateString('pt-BR')} às {etlDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                {metadata.record_count && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registros:</span>
                    <span className="font-medium text-slate-900">{metadata.record_count.toLocaleString('pt-BR')}</span>
                  </div>
                )}
                {metadata.etl_version && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Versão ETL:</span>
                    <span className="font-medium text-slate-900">{metadata.etl_version}</span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t text-[10px] text-slate-400">
                ETL automático: 00:30, 10:30 e 15:30 (horário local)
              </div>
            </div>
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()}`}>
      <Clock size={16} />
      <div className="flex flex-col">
        <span className="text-xs font-medium">Dados atualizados</span>
        <span className="text-[10px] opacity-75">{getTimeAgo(diffHours, diffDays)}</span>
      </div>
    </div>
  );
}
