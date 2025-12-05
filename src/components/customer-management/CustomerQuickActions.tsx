import { Button } from '@/components/ui/button';
import { Ticket, Target, ListTodo, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CustomerQuickActionsProps {
  clienteId: string;
  whatsappNumber?: string | null;
}

export function CustomerQuickActions({
  clienteId,
  whatsappNumber,
}: CustomerQuickActionsProps) {
  const navigate = useNavigate();

  const handleCreateTicket = () => {
    navigate(`/tickets/novo?cliente_id=${clienteId}`);
  };

  const handleCreateOportunidade = () => {
    navigate(`/oportunidades?novo=true&cliente_id=${clienteId}`);
  };

  const handleCreateTask = () => {
    navigate(`/tasks?novo=true&cliente_id=${clienteId}`);
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
      const cleanNumber = whatsappNumber.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanNumber}`, '_blank');
    } else {
      toast.info('Cliente não possui número de WhatsApp cadastrado');
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleCreateTicket}>
        <Ticket className="h-4 w-4 mr-1.5" />
        Ticket
      </Button>
      <Button variant="outline" size="sm" onClick={handleCreateOportunidade}>
        <Target className="h-4 w-4 mr-1.5" />
        Oportunidade
      </Button>
      <Button variant="outline" size="sm" onClick={handleCreateTask}>
        <ListTodo className="h-4 w-4 mr-1.5" />
        Tarefa
      </Button>
      {whatsappNumber && (
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-1.5" />
          WhatsApp
        </Button>
      )}
    </div>
  );
}
