// src/components/crm/AtendimentoCard.tsx
import React from 'react';
import type { Atendimento } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';

interface AtendimentoCardProps {
  atendimento: Atendimento;
  onClick: () => void;
}

const getInitials = (name: string | null) => name?.charAt(0).toUpperCase() || '?';

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
      <Card className="mb-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
        <CardHeader className="p-3 pb-2">
          {/* ... (código do header do card) ... */}
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <p className="text-sm text-muted-foreground line-clamp-2">{atendimento.summary || 'Sem resumo.'}</p>
          <div className="flex items-center gap-2">
            {atendimento.reason && <Badge variant="outline">{atendimento.reason}</Badge>}
            
            {/* --- ADICIONADO: Badge de Resolução --- */}
            {atendimento.status === 'Resolvido' && atendimento.final_analysis && (
              <Badge variant={getResolutionVariant(atendimento.final_analysis)}>
                {atendimento.final_analysis}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground pt-1">
            Criado em: {new Date(atendimento.created_at).toLocaleDateString('pt-BR')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AtendimentoCard;