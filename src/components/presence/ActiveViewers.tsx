import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePresenceOptional } from '@/contexts/PresenceContext';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';

interface ActiveViewersProps {
  entityType: string;
  entityId: string;
  maxDisplay?: number;
  className?: string;
}

export function ActiveViewers({ 
  entityType, 
  entityId, 
  maxDisplay = 3,
  className 
}: ActiveViewersProps) {
  const presence = usePresenceOptional();
  
  if (!presence) return null;

  const viewers = presence.getUsersViewingEntity(entityType, entityId);

  if (viewers.length === 0) return null;

  const displayViewers = viewers.slice(0, maxDisplay);
  const remainingCount = viewers.length - maxDisplay;

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex -space-x-2">
          {displayViewers.map((viewer) => (
            <Tooltip key={viewer.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={viewer.avatarUrl || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(viewer.fullName)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewer.fullName || viewer.email || 'Usuário'} está visualizando</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-muted">
                    +{remainingCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>+{remainingCount} pessoa(s) visualizando</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {viewers.length === 1 ? '1 visualizando' : `${viewers.length} visualizando`}
        </span>
      </div>
    </TooltipProvider>
  );
}

export default ActiveViewers;
