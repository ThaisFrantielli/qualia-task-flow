import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AtendimentoComAssignee } from "../types";

export function useAtendimentosKanban() {
  const [data, setData] = useState<AtendimentoComAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAtendimentos = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('atendimentos')
      .select('*, assignee:profiles(*)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      const formattedData: AtendimentoComAssignee[] = data.map((at: any) => ({
        ...at,
        assignee: at.assignee ?? null,
        cliente: {
          id: at.cliente_id ?? null,
          nome: at.client_name ?? null,
          nome_fantasia: at.client_name ?? null,
          razao_social: at.client_name ?? null,
        },
        descricao: at.summary ?? at.description ?? null,
      }));
      setData(formattedData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAtendimentos();
  }, [fetchAtendimentos]);

  return { data, loading, error, refetch: fetchAtendimentos };
}
