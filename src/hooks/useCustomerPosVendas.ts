import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '../types/supabase';

type PosVendaTicket = Database['public']['Tables']['atendimentos']['Row'];

export function useCustomerPosVendas(clienteId: string | number | null) {
  const [tickets, setTickets] = useState<PosVendaTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) {
      setTickets([]);
      return;
    }
    setLoading(true);
    supabase
      .from('atendimentos')
      .select('*')
  .eq('client_name', String(clienteId))
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setTickets(data || []);
        setLoading(false);
      });
  }, [clienteId]);

  return { tickets, loading, error };
}
