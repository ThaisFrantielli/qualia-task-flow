import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Portfolio } from '@/types';

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPortfolios() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      setPortfolios(data || []);
      setLoading(false);
    }
    fetchPortfolios();
  }, []);

  return { portfolios, loading, error };
}
