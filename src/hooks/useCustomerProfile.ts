import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  funcao: string | null;
}

export function useCustomerProfile(profileId: string | null) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, funcao')
      .eq('id', profileId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            ...data,
            full_name: data.full_name ?? '',
            email: data.email ?? '',
          });
        } else {
          setProfile(null);
        }
        setLoading(false);
      });
  }, [profileId]);

  return { profile, loading };
}
