// src/hooks/useClientes.ts (VERSÃO FINAL E CORRETA)

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClienteComContatos } from "@/types";

interface UseClientesReturn {
  clientes: ClienteComContatos[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useClientes = (): UseClientesReturn => {
  const [clientes, setClientes] = useState<ClienteComContatos[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pageSize = 1000; // PostgREST costuma limitar a 1000 por requisição
      let offset = 0;
      let all: ClienteComContatos[] = [];

      while (true) {
        const { data, error } = await supabase
          .from('clientes')
          .select(`*, cliente_contatos ( * )`)
          .order('razao_social', { ascending: true })
          .range(offset, offset + pageSize - 1);

        if (error) {
          console.error('ERRO NO HOOK useClientes (page):', error.message);
          throw error;
        }

        if (!data || (Array.isArray(data) && data.length === 0)) break;

        all = all.concat(data as ClienteComContatos[]);
        if (!Array.isArray(data) || (data as any).length < pageSize) break;

        offset += pageSize;
      }

      console.log('[useClientes] Clientes total agregados:', all.length);
      setClientes(all);
    } catch (err: any) {
      console.error('ERRO NO HOOK useClientes:', err?.message || err);
      setError(new Error(err?.message || 'Erro ao buscar clientes'));
      setClientes([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, error, refetch: fetchClientes };
};
