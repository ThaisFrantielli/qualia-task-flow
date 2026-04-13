import { Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';
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
  numberOfMonths?: number;
  minDate?: Date;
  maxDate?: Date;
  yearStart?: number;
}

export function DateRangePicker({
  value,
  onChange,
  className,
  numberOfMonths = 2,
  minDate,
  maxDate,
  yearStart,
}: DateRangePickerProps) {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const today = useMemo(() => new Date(), []);

  const minBoundary = useMemo(() => (minDate ? startOfDay(minDate) : undefined), [minDate]);
  const maxBoundary = useMemo(() => (maxDate ? endOfDay(maxDate) : undefined), [maxDate]);

  const clampDate = (date: Date, mode: 'start' | 'end'): Date => {
    let next = new Date(date);
    next = mode === 'start' ? startOfDay(next) : endOfDay(next);
    if (minBoundary && next < minBoundary) return new Date(minBoundary);
    if (maxBoundary && next > maxBoundary) return new Date(maxBoundary);
    return next;
  };

  const normalizeRange = (range?: DateRange): DateRange | undefined => {
    if (!range?.from && !range?.to) return undefined;

    let from = range?.from ? new Date(range.from) : undefined;
    let to = range?.to ? new Date(range.to) : undefined;

    if (minBoundary || maxBoundary) {
      from = from ? clampDate(from, 'start') : undefined;
      to = to ? clampDate(to, 'end') : undefined;
    }

    if (from && to && from > to) {
      const tmp = from;
      from = minBoundary || maxBoundary ? clampDate(to, 'start') : new Date(to);
      to = minBoundary || maxBoundary ? clampDate(tmp, 'end') : new Date(tmp);
    }

    return { from, to };
  };

  useEffect(() => {
    if (value?.from) setFromInput(format(value.from, 'yyyy-MM-dd'));
    else setFromInput('');
    if (value?.to) setToInput(format(value.to, 'yyyy-MM-dd'));
    else setToInput('');
  }, [value]);

  function applyTyped() {
    const from = fromInput ? new Date(`${fromInput}T00:00:00`) : undefined;
    const to = toInput ? new Date(`${toInput}T23:59:59`) : undefined;
    onChange(normalizeRange({ from, to }));
  }

  const yearPresets = useMemo(() => {
    if (!yearStart) return [] as Array<{ label: string; getValue: () => DateRange }>;

    const maxYear = (maxDate || today).getFullYear();
    const minYear = Math.min(yearStart, maxYear);
    const presets: Array<{ label: string; getValue: () => DateRange }> = [
      {
        label: `Desde ${minYear}`,
        getValue: () => ({
          from: new Date(minYear, 0, 1, 0, 0, 0),
          to: maxDate || today,
        }),
      },
    ];

    for (let y = maxYear; y >= minYear; y--) {
      presets.push({
        label: `Ano ${y}`,
        getValue: () => ({
          from: new Date(y, 0, 1, 0, 0, 0),
          to: y === maxYear ? (maxDate || today) : new Date(y, 11, 31, 23, 59, 59),
        }),
      });
    }

    return presets;
  }, [yearStart, maxDate, today]);

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
    ...yearPresets,
  ];

  const minInputDate = minBoundary ? format(minBoundary, 'yyyy-MM-dd') : undefined;
  const maxInputDate = maxBoundary ? format(maxBoundary, 'yyyy-MM-dd') : undefined;

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
                onClick={() => onChange(normalizeRange(preset.getValue()))}
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
                  min={minInputDate}
                  max={maxInputDate}
                  onChange={(e) => setFromInput(e.target.value)}
                  aria-label="Data início"
                />
                <input
                  type="date"
                  className="border p-2 rounded text-sm w-full"
                  value={toInput}
                  min={minInputDate}
                  max={maxInputDate}
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
              onSelect={(range) => onChange(normalizeRange(range as DateRange | undefined))}
              numberOfMonths={numberOfMonths}
              fromDate={minBoundary}
              toDate={maxBoundary}
              locale={ptBR}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
