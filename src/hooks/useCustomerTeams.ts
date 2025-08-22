import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerTeam {
  id: string;
  name: string;
}

export function useCustomerTeams(profileId: string | number | null) {
  const [teams, setTeams] = useState<CustomerTeam[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    supabase
      .from('teams')
      .select('id, name')
      .eq('profile_id', String(profileId))
      .then(({ data }) => {
        setTeams((data || []).map((tm: any) => ({ id: tm.id, name: tm.name || '' })));
        setLoading(false);
      });
  }, [profileId]);

  return { teams, loading };
}
