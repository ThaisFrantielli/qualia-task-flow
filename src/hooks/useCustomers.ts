import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/supabase';

export type CustomerRow = Database['public']['Tables']['atendimentos']['Row'];

export function useCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('atendimentos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setCustomers(data || []);
      setLoading(false);
    }
    fetchCustomers();
  }, []);

  return { customers, loading, error };
}
