// src/components/crm/AtendimentosFilters.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface AtendimentosFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  motivo: string;
  onMotivoChange: (value: string) => void;
  period: string;
  onPeriodChange: (value: string) => void;
  onClear: () => void;
  statusOptions: string[];
  motivoOptions: string[];
  periodOptions: string[];
}

const AtendimentosFilters: React.FC<AtendimentosFiltersProps> = ({
  search, onSearchChange, status, onStatusChange, motivo, onMotivoChange, period, onPeriodChange, onClear, statusOptions, motivoOptions, periodOptions
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-end mb-4">
      <div>
        <Input
          placeholder="Buscar cliente, contato, resumo..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-56"
        />
      </div>
      <div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {statusOptions.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select value={motivo} onValueChange={onMotivoChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Motivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Motivos</SelectItem>
            {motivoOptions.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo Período</SelectItem>
            {periodOptions.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={onClear}>Limpar</Button>
    </div>
  );
};

export default AtendimentosFilters;
