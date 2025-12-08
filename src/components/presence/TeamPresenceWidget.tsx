
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresenceOptional } from '@/contexts/PresenceContext';
import { PresenceIndicator } from './PresenceIndicator';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface TeamPresenceWidgetProps {
  maxDisplay?: number;
  className?: string;
  showLabel?: boolean;
}

const pageLabels: Record<string, string> = {
  '/whatsapp': 'WhatsApp',
  '/tickets': 'Tickets',
  '/triagem': 'Triagem',
  '/projects': 'Projetos',
  '/oportunidades': 'Oportunidades',
  '/': 'Dashboard',
  '/tasks': 'Tarefas',
  '/calendar': 'Calendário',
  '/clientes': 'Clientes',
};

export function TeamPresenceWidget({ 
  maxDisplay = 5, 
  className,
  showLabel = true 
}: TeamPresenceWidgetProps) {
  const presence = usePresenceOptional();

  if (!presence) return null;

  const { onlineUsers } = presence;
  const onlineOnly = onlineUsers.filter(u => u.status !== 'offline');

  if (onlineOnly.length === 0) return null;

  const displayUsers = onlineOnly.slice(0, maxDisplay);
  const remainingCount = onlineOnly.length - maxDisplay;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getPageLabel = (path: string) => {
    // Check for exact match first
    if (pageLabels[path]) return pageLabels[path];
    
    // Check for partial matches
    for (const [key, label] of Object.entries(pageLabels)) {
      if (path.startsWith(key) && key !== '/') return label;
    }
    
    return path;
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        {showLabel && (
          <div className="flex items-center gap-1.5 text-[#C7C9D9]">
            <Users className="h-4 w-4" />
            <span className="text-xs">{onlineOnly.length}</span>
          </div>
        )}
        <div className="flex -space-x-1.5">
          {displayUsers.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-[#1D1B3F]">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px] bg-[#2C2854] text-white">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5">
                    <PresenceIndicator status={user.status} size="sm" showTooltip={false} />
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  <p className="font-medium">{user.fullName || 'Usuário'}</p>
                  <p className="text-muted-foreground">Em: {getPageLabel(user.currentPage)}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-[#1D1B3F]">
                  <AvatarFallback className="text-[10px] bg-[#2C2854] text-white">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>+{remainingCount} online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default TeamPresenceWidget;
