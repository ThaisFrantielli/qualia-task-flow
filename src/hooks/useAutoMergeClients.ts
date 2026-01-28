import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientData {
  id: string;
  telefone?: string | null;
  whatsapp_number?: string | null;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
}

/**
 * Hook for auto-detecting and suggesting client merges based on phone number
 */
export function useAutoMergeClients() {
  
  /**
   * Find all clients with similar phone numbers
   */
  const findDuplicatesByPhone = useCallback(async (phone: string): Promise<ClientData[]> => {
    if (!phone) return [];
    
    // Normalize phone - keep only last 8-9 digits for comparison
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    if (normalizedPhone.length < 8) return [];

    const { data, error } = await supabase
      .from('clientes')
      .select('id, telefone, whatsapp_number, nome_fantasia, razao_social, cpf_cnpj, email')
      .or(`telefone.ilike.%${normalizedPhone},whatsapp_number.ilike.%${normalizedPhone}`);

    if (error) {
      console.error('Error finding duplicates:', error);
      return [];
    }

    return data || [];
  }, []);

  /**
   * Merge tickets from source client to target client
   */
  const mergeTickets = useCallback(async (sourceClientId: string, targetClientId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ cliente_id: targetClientId })
      .eq('cliente_id', sourceClientId);

    if (error) {
      console.error('Error merging tickets:', error);
      throw error;
    }
  }, []);

  /**
   * Merge opportunities from source client to target client
   */
  const mergeOportunidades = useCallback(async (sourceClientId: string, targetClientId: string) => {
    const { error } = await supabase
      .from('oportunidades')
      .update({ cliente_id: targetClientId })
      .eq('cliente_id', sourceClientId);

    if (error) {
      console.error('Error merging oportunidades:', error);
      throw error;
    }
  }, []);

  /**
   * Merge atendimentos from source client to target client
   */
  const mergeAtendimentos = useCallback(async (sourceClientId: string, targetClientId: string) => {
    const { error } = await supabase
      .from('atendimentos')
      .update({ cliente_id: targetClientId })
      .eq('cliente_id', sourceClientId);

    if (error) {
      console.error('Error merging atendimentos:', error);
      throw error;
    }
  }, []);

  /**
   * Merge two clients - move all related data to target and optionally delete source
   */
  const mergeClients = useCallback(async (
    sourceClientId: string, 
    targetClientId: string,
    deleteSource: boolean = false
  ) => {
    try {
      // Merge all related entities
      await Promise.all([
        mergeTickets(sourceClientId, targetClientId),
        mergeOportunidades(sourceClientId, targetClientId),
        mergeAtendimentos(sourceClientId, targetClientId),
      ]);

      // Optionally delete the source client
      if (deleteSource) {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', sourceClientId);

        if (error) {
          console.error('Error deleting source client:', error);
          // Don't throw - merge was successful, just couldn't delete
          toast.warning("Dados unificados, mas o cliente duplicado não pôde ser removido");
          return;
        }
      }

      toast.success("Clientes unificados com sucesso!");
    } catch (error) {
      console.error('Error merging clients:', error);
      toast.error("Erro ao unificar clientes");
      throw error;
    }
  }, [mergeTickets, mergeOportunidades, mergeAtendimentos]);

  /**
   * Auto-detect duplicates for a given client
   */
  const detectDuplicates = useCallback(async (client: ClientData): Promise<ClientData[]> => {
    const phone = client.telefone || client.whatsapp_number;
    if (!phone) return [];

    const allMatches = await findDuplicatesByPhone(phone);
    
    // Filter out the current client
    return allMatches.filter(c => c.id !== client.id);
  }, [findDuplicatesByPhone]);

  return {
    findDuplicatesByPhone,
    mergeClients,
    detectDuplicates,
    mergeTickets,
    mergeOportunidades,
    mergeAtendimentos,
  };
}
