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

interface DuplicateGroup {
  phone: string;
  clients: ClientData[];
}

/**
 * Normalizes a phone number to just the last 9 digits for comparison
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-9);
}

/**
 * Hook for auto-detecting and merging duplicate clients
 */
export function useAutoMergeClients() {
  
  /**
   * Find all duplicate groups across ALL clients (by phone)
   */
  const findAllDuplicates = useCallback(async (): Promise<DuplicateGroup[]> => {
    const { data: clients, error } = await supabase
      .from('clientes')
      .select('id, telefone, whatsapp_number, nome_fantasia, razao_social, cpf_cnpj, email');

    if (error || !clients) {
      console.error('Error fetching clients for duplicate detection:', error);
      return [];
    }

    // Group by normalized phone (last 9 digits)
    const phoneGroups: Record<string, ClientData[]> = {};
    
    for (const client of clients) {
      const phones = [
        normalizePhone(client.telefone),
        normalizePhone(client.whatsapp_number)
      ].filter(p => p.length >= 8);
      
      for (const phone of phones) {
        if (!phoneGroups[phone]) {
          phoneGroups[phone] = [];
        }
        // Avoid adding same client twice
        if (!phoneGroups[phone].find(c => c.id === client.id)) {
          phoneGroups[phone].push(client);
        }
      }
    }

    // Return only groups with duplicates (more than 1 client)
    return Object.entries(phoneGroups)
      .filter(([_, clients]) => clients.length > 1)
      .map(([phone, clients]) => ({ phone, clients }));
  }, []);

  /**
   * Find duplicates for a specific phone
   */
  const findDuplicatesByPhone = useCallback(async (phone: string): Promise<ClientData[]> => {
    if (!phone) return [];
    
    const normalizedPhone = normalizePhone(phone);
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
   * Auto-merge all duplicates found (keeps the first client, merges others into it)
   */
  const autoMergeAllDuplicates = useCallback(async () => {
    try {
      const duplicateGroups = await findAllDuplicates();
      
      if (duplicateGroups.length === 0) {
        toast.info("Nenhum cliente duplicado encontrado");
        return { merged: 0, groups: 0 };
      }

      let mergedCount = 0;
      
      for (const group of duplicateGroups) {
        // Keep the first client (usually the oldest/original)
        const [target, ...sources] = group.clients;
        
        for (const source of sources) {
          try {
            await mergeClients(source.id, target.id, true);
            mergedCount++;
          } catch (e) {
            console.error('Error merging client pair:', e);
          }
        }
      }

      toast.success(`${mergedCount} clientes duplicados unificados`);
      return { merged: mergedCount, groups: duplicateGroups.length };
    } catch (error) {
      console.error('Error in autoMergeAllDuplicates:', error);
      toast.error("Erro ao unificar clientes automaticamente");
      throw error;
    }
  }, [findAllDuplicates, mergeClients]);

  /**
   * Detect duplicates for a given client
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
    findAllDuplicates,
    mergeClients,
    detectDuplicates,
    autoMergeAllDuplicates,
    mergeTickets,
    mergeOportunidades,
    mergeAtendimentos,
  };
}
