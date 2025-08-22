// src/components/crm/AtendimentoTimeline.tsx
import React from 'react';


interface TimelineEvent {
  type: 'status' | 'comment' | 'attachment' | 'edit';
  date: string;
  user?: string;
  content?: string;
  status?: string | null;
  fileName?: string;
}

interface AtendimentoTimelineProps {
  events: TimelineEvent[];
}

const iconMap = {
  status: '🟢',
  comment: '💬',
  attachment: '📎',
  edit: '✏️',
};

const AtendimentoTimeline: React.FC<AtendimentoTimelineProps> = ({ events }) => {
  return (
    <ol className="relative border-l border-gray-200 ml-4">
      {events.map((ev, i) => (
        <li key={i} className="mb-8 ml-6">
          <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full ring-8 ring-white">
            {iconMap[ev.type]}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{new Date(ev.date).toLocaleString('pt-BR')}</span>
            {ev.user && <span>por <b>{ev.user}</b></span>}
          </div>
          <div className="text-sm">
            {ev.type === 'status' && <span>Status alterado para <b>{ev.status}</b></span>}
            {ev.type === 'comment' && <span>Comentou: "{ev.content}"</span>}
            {ev.type === 'attachment' && <span>Anexou arquivo: <b>{ev.fileName}</b></span>}
            {ev.type === 'edit' && <span>Editou o atendimento</span>}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default AtendimentoTimeline;
