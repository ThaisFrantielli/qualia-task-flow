import React from 'react';
// Removendo imports do MUI e substituindo por componentes próprios
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, CalendarCheck, Phone, Mail, AlertCircle, CheckCircle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'message' | 'meeting' | 'call' | 'email' | 'alert' | 'status';
  title: string;
  description: string;
  date: string;
  status?: string;
}

interface CustomerTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
}

const getIconForEventType = (type: string) => {
  switch (type) {
    case 'message':
      return <MessageCircle size={16} />;
    case 'meeting':
      return <CalendarCheck size={16} />;
    case 'call':
      return <Phone size={16} />;
    case 'email':
      return <Mail size={16} />;
    case 'alert':
      return <AlertCircle size={16} />;
    case 'status':
      return <CheckCircle size={16} />;
    default:
      return <MessageCircle size={16} />;
  }
};

const getEventColor = (type: string) => {
  switch (type) {
    case 'message':
      return '#2563eb'; // blue
    case 'meeting':
      return '#8b5cf6'; // purple 
    case 'call':
      return '#10b981'; // green
    case 'email':
      return '#0ea5e9'; // sky
    case 'alert':
      return '#ef4444'; // red
    case 'status':
      return 'warning';
    default:
      return 'primary';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({ events, loading }) => {
  if (loading) {
    return <div>Carregando histórico...</div>;
  }

  if (!events || events.length === 0) {
    return <div>Nenhum evento registrado para este cliente.</div>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <Card key={event.id} className="border-l-4" style={{ borderLeftColor: getEventColor(event.type) }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-muted p-2 h-8 w-8 flex items-center justify-center">
                {getIconForEventType(event.type)}
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                <p className="text-sm">{event.description}</p>
                {event.status && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {event.status}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomerTimeline;