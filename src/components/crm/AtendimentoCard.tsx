// src/components/crm/AtendimentoCard.tsx
import React from 'react';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { User } from 'lucide-react';

interface AtendimentoCardProps {
  atendimento: Atendimento;
  onClick: () => void;
}

const getInitials = (name: string | null) => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .slice(0, 2)
    .join('');
};

const AtendimentoCard: React.FC<AtendimentoCardProps> = ({ atendimento, onClick }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ATENDIMENTO_CARD,
    item: { ...atendimento },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  // Lógica para a cor da badge de resolução
  const getResolutionVariant = (analysis: string | null) => {
    switch (analysis) {
      case 'Procedente': return 'default'; // Verde/Azul
      case 'Improcedente': return 'destructive'; // Vermelho
      case 'Dúvida': return 'secondary'; // Cinza
      default: return 'outline';
    }
  };

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card
        className="mb-4 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-primary bg-white"
        onClick={onClick}
      >
        <CardContent className="p-4 flex flex-col gap-2">
          {/* Header: Cliente + ID + Avatar */}
          <div className="flex items-center gap-3 mb-1">
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                {getInitials(atendimento.client_name || atendimento.contact_person || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-gray-900 truncate">
                {atendimento.client_name || 'Cliente Desconhecido'}
                <span className="ml-2 text-xs text-gray-400 font-normal">#{atendimento.id}</span>
              </div>
              <div className="text-xs text-gray-500 truncate">
                {atendimento.contact_person || ''}
              </div>
            </div>
            {atendimento.assignee_id && (
              <div className="flex items-center gap-1 ml-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">{atendimento.assignee_id}</span>
              </div>
            )}
          </div>

          {/* Resumo/Descrição */}
          <div className="text-sm text-gray-700 font-medium line-clamp-2">
            {atendimento.summary || <span className="italic text-gray-400">Sem resumo.</span>}
          </div>

          {/* Tags/Categorias/Motivo */}
          <div className="flex flex-wrap gap-2 mt-1">
            {atendimento.reason && (
              <Badge variant="secondary" className="capitalize">{atendimento.reason}</Badge>
            )}
            {atendimento.tipo_atendimento && (
              <Badge variant="outline" className="capitalize">{atendimento.tipo_atendimento}</Badge>
            )}
            {atendimento.status === 'Resolvido' && atendimento.final_analysis && (
              <Badge variant={getResolutionVariant(atendimento.final_analysis)}>
                {atendimento.final_analysis}
              </Badge>
            )}
          </div>

          {/* Footer: Ícones de contexto, datas, comentários, anexos */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="font-medium text-gray-700">{new Date(atendimento.created_at).toLocaleDateString('pt-BR')}</span>
                <span className="text-gray-400">•</span>
                <span className="capitalize">{atendimento.status}</span>
              </span>
              {/* Comentários e anexos removidos: campos não existem no tipo Atendimento */}
            </div>
            {/* Prioridade removida: campo não existe no tipo Atendimento */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AtendimentoCard;