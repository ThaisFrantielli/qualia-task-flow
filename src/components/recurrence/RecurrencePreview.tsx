import { format } from 'date-fns';

interface Props {
  dates: (string | Date)[];
}

export default function RecurrencePreview({ dates }: Props) {
  return (
    <div className="text-sm text-muted-foreground">
      Próximas: {dates && dates.length > 0 ? dates.slice(0, 3).map(d => typeof d === 'string' ? d : format(new Date(d), 'dd/MM/yyyy')).join(', ') : '—'}
    </div>
  );
}
