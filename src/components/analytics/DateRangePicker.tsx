import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');

  useEffect(() => {
    if (value?.from) setFromInput(format(value.from, 'yyyy-MM-dd'));
    else setFromInput('');
    if (value?.to) setToInput(format(value.to, 'yyyy-MM-dd'));
    else setToInput('');
  }, [value]);

  function applyTyped() {
    let from: Date | undefined = fromInput ? new Date(fromInput + 'T00:00:00') : undefined;
    let to: Date | undefined = toInput ? new Date(toInput + 'T23:59:59') : undefined;
    if (from && to && from > to) {
      // swap
      const tmp = from;
      from = to;
      to = tmp;
    }
    if (!from && !to) return onChange(undefined);
    onChange({ from, to });
  }
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
            {/* Digitar datas manualmente */}
            <div className="mt-3">
              <div className="text-sm font-medium text-slate-700 mb-2">Digitar datas</div>
              <div className="space-y-2">
                <input
                  type="date"
                  className="border p-2 rounded text-sm w-full"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  aria-label="Data início"
                />
                <input
                  type="date"
                  className="border p-2 rounded text-sm w-full"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  aria-label="Data fim"
                />
                <div className="flex gap-2 mt-1">
                  <Button size="sm" className="flex-1" onClick={() => applyTyped()}>Aplicar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setFromInput(''); setToInput(''); onChange(undefined); }}>Limpar</Button>
                </div>
              </div>
            </div>
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
