import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types';

interface AssigneeFilterBannerProps {
  userId: string;
  onClear: () => void;
}

export function AssigneeFilterBanner({ userId, onClear }: AssigneeFilterBannerProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
      setLoading(false);
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 animate-pulse">
        <div className="h-8 w-8 bg-primary/20 rounded-full" />
        <div className="h-4 w-48 bg-primary/20 rounded" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 border-2 border-primary/30">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'Usuário'} />
          <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-foreground">
            Visualizando tarefas de <span className="text-primary font-semibold">{profile.full_name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {profile.funcao || profile.role || 'Membro da equipe'}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground gap-1.5"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Limpar filtro</span>
      </Button>
    </div>
  );
}
