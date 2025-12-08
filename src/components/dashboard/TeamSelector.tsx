import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, UserCircle } from 'lucide-react';
import { getInitials } from '@/lib/utils';

export interface DirectReportWithTeam {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  nivel_acesso: string | null;
  has_subordinates: boolean;
  subordinates_count: number;
}

interface TeamSelectorProps {
  directReports: DirectReportWithTeam[];
  selectedTeam: string | null;
  onSelectTeam: (value: string | null) => void;
  isLoading?: boolean;
}

export function TeamSelector({ 
  directReports, 
  selectedTeam, 
  onSelectTeam,
  isLoading 
}: TeamSelectorProps) {
  // Apenas gerentes (que têm subordinados) aparecem como opção de equipe
  const managersWithTeams = directReports.filter(r => r.has_subordinates);

  // Se não há gerentes com equipes, não mostra o seletor
  if (managersWithTeams.length === 0 && !isLoading) {
    return null;
  }

  const handleChange = (value: string) => {
    if (value === 'all') {
      onSelectTeam(null);
    } else if (value === 'direct') {
      onSelectTeam('direct');
    } else {
      onSelectTeam(value);
    }
  };

  const getDisplayValue = () => {
    if (!selectedTeam) return 'Todas as Equipes';
    if (selectedTeam === 'direct') return 'Meus Reportes Diretos';
    const manager = directReports.find(r => r.user_id === selectedTeam);
    return manager ? `Equipe de ${manager.full_name?.split(' ')[0]}` : 'Equipe';
  };

  return (
    <Select 
      value={selectedTeam || 'all'} 
      onValueChange={handleChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-52">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <SelectValue>{getDisplayValue()}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Todas as Equipes</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              Consolidado
            </Badge>
          </div>
        </SelectItem>
        
        <SelectItem value="direct">
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>Meus Reportes Diretos</span>
          </div>
        </SelectItem>

        {managersWithTeams.map(manager => (
          <SelectItem key={manager.user_id} value={manager.user_id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={manager.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(manager.full_name)}
                </AvatarFallback>
              </Avatar>
              <span>Equipe de {manager.full_name?.split(' ')[0]}</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {manager.subordinates_count}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
