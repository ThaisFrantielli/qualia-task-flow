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

    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        cliente_contatos ( * )
      `)
      .order('razao_social', { ascending: true });

    if (error) {
      console.error('ERRO NO HOOK useClientes:', error.message);
      setError(new Error(error.message));
      setClientes([]);
    } else {
      console.log('[useClientes] Clientes da tabela `clientes` buscados:', data);
      setClientes(data as ClienteComContatos[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, error, refetch: fetchClientes };
};