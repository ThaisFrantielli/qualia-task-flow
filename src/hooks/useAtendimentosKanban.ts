import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import type { Database } from "../types/supabase";

export type Atendimento = Database["public"]["Tables"]["atendimentos"]["Row"];

export function useAtendimentosKanban() {
  const [data, setData] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("atendimentos")
      .select("*")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData(data || []);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
