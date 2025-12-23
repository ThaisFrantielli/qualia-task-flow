import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const presets = [
    { label: 'Hoje', getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { from: today, to: today };
    }},
    { label: 'Últimos 7 dias', getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = subDays(today, 6); // 6 dias atrás + hoje = 7 dias
      return { from, to: today };
    }},
    { label: 'Últimos 30 dias', getValue: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const from = subDays(today, 29); // 29 dias atrás + hoje = 30 dias
      return { from, to: today };
    }},
    { label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: 'Mês passado', getValue: () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }},
    { label: 'Este ano', getValue: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-[280px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(value.to, "dd/MM/yyyy", { locale: ptBR })}
              </>
            ) : (
              format(value.from, "dd/MM/yyyy", { locale: ptBR })
            )
          ) : (
            <span>Selecione o período</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="border-r p-3 space-y-2">
            <div className="text-sm font-medium text-slate-700 mb-2">Períodos rápidos</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onChange(preset.getValue())}
              >
                {preset.label}
              </Button>
            ))}
            {value && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs mt-4"
                onClick={() => onChange(undefined)}
              >
                Limpar filtro
              </Button>
            )}
          </div>
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={(range) => onChange(range as DateRange | undefined)}
              numberOfMonths={2}
              locale={ptBR}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
