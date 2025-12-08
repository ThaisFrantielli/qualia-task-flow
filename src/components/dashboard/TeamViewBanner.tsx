import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface TeamViewBannerProps {
  managerName: string | null;
  managerAvatar?: string | null;
  membersCount: number;
  isDirectReports?: boolean;
  onBack: () => void;
}

export function TeamViewBanner({ 
  managerName, 
  managerAvatar, 
  membersCount,
  isDirectReports,
  onBack 
}: TeamViewBannerProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex items-center gap-2">
          {!isDirectReports && managerAvatar !== undefined && (
            <Avatar className="h-8 w-8 border-2 border-primary/20">
              <AvatarImage src={managerAvatar || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(managerName)}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div>
            <p className="font-medium text-sm">
              {isDirectReports 
                ? 'Meus Reportes Diretos' 
                : `Equipe de ${managerName || 'Gerente'}`
              }
            </p>
            <p className="text-xs text-muted-foreground">
              {membersCount} {membersCount === 1 ? 'membro' : 'membros'}
            </p>
          </div>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" />
        Voltar para visão consolidada
      </Button>
    </div>
  );
}
