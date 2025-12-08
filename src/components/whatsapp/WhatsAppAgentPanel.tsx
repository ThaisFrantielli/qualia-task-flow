import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageSquare } from 'lucide-react';
import { PresenceIndicator } from '@/components/presence/PresenceIndicator';
import type { WhatsAppAgent } from '@/hooks/useWhatsAppAgents';

interface WhatsAppAgentPanelProps {
  agents: WhatsAppAgent[];
  loading?: boolean;
}

const getStatusLabel = (status: WhatsAppAgent['status']) => {
  switch (status) {
    case 'online': return 'Online';
    case 'busy': return 'Ocupado';
    case 'away': return 'Ausente';
    case 'offline': return 'Offline';
    default: return 'Desconhecido';
  }
};

export const WhatsAppAgentPanel: React.FC<WhatsAppAgentPanelProps> = ({
  agents,
  loading
}) => {
  const onlineCount = agents.filter(a => a.status === 'online' || a.status === 'busy').length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Atendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-2 bg-muted rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Atendentes
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {onlineCount} online
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-48">
          <div className="px-4 pb-4 space-y-2">
            {agents.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                Nenhum atendente encontrado
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {agent.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <PresenceIndicator status={agent.status} size="sm" showTooltip={false} />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {agent.full_name || 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getStatusLabel(agent.status)}
                    </p>
                  </div>

                  {agent.activeConversations > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {agent.activeConversations}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default WhatsAppAgentPanel;
