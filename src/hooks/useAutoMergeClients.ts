import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClientData {
  id: string;
  codigo_cliente?: string | null;
  telefone?: string | null;
  whatsapp_number?: string | null;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  cliente_contatos?: Array<{
    telefone_contato?: string | null;
    email_contato?: string | null;
  }>;
}

interface DuplicateGroup {
  phone: string;
  clients: ClientData[];
}

export interface NameSimilaritySuggestion {
  key: string;
  score: number;
  reason: string;
  clients: [ClientData, ClientData];
}

/**
 * Normalizes a phone number to just the last 9 digits for comparison
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-9);
}

/**
 * Normalizes a CPF/CNPJ to digits only
 */
function normalizeCpfCnpj(cpf_cnpj: string | null | undefined): string {
  if (!cpf_cnpj) return '';
  return cpf_cnpj.replace(/\D/g, '').trim();
}

function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(text: string): string[] {
  const value = text.replace(/\s/g, '');
  if (value.length < 2) return [value];
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i++) out.push(value.slice(i, i + 2));
  return out;
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aPairs = bigrams(a);
  const bPairs = bigrams(b);
  const bCount = new Map<string, number>();
  for (const pair of bPairs) bCount.set(pair, (bCount.get(pair) || 0) + 1);
  let intersection = 0;
  for (const pair of aPairs) {
    const count = bCount.get(pair) || 0;
    if (count > 0) {
      intersection += 1;
      bCount.set(pair, count - 1);
    }
  }
  return (2 * intersection) / (aPairs.length + bPairs.length);
}

/**
 * Adds a client to a group map, avoiding same-id duplicates
 */
function addToGroup(groups: Record<string, ClientData[]>, key: string, client: ClientData) {
  if (!key) return;
  if (!groups[key]) groups[key] = [];
  if (!groups[key].find(c => c.id === client.id)) {
    groups[key].push(client);
  }
}

/**
 * Hook for auto-detecting and merging duplicate clients
 */
export function useAutoMergeClients() {

  const findNameSimilaritySuggestions = useCallback(async (): Promise<NameSimilaritySuggestion[]> => {
    const { data: clients, error } = await supabase
      .from('clientes')
      .select('id, codigo_cliente, telefone, whatsapp_number, nome_fantasia, razao_social, cpf_cnpj, email, cliente_contatos(telefone_contato, email_contato)');

    if (error || !clients) {
      console.error('Error fetching clients for name similarity:', error);
      return [];
    }

    const candidates = clients
      .map((c) => {
        const name = (c.nome_fantasia || c.razao_social || '').trim();
        return {
          ...c,
          _name: normalizeName(name),
          _display: name,
          _doc: normalizeCpfCnpj(c.cpf_cnpj),
          _phones: new Set([
            normalizePhone(c.telefone),
            normalizePhone(c.whatsapp_number),
            ...((c.cliente_contatos || []).map((cc) => normalizePhone(cc.telefone_contato))),
          ].filter(Boolean)),
          _emails: new Set([
            normalizeEmail(c.email),
            ...((c.cliente_contatos || []).map((cc) => normalizeEmail(cc.email_contato))),
          ].filter(Boolean)),
        };
      })
      .filter((c) => c._name.length >= 6);

    const buckets = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const firstToken = c._name.split(' ')[0] || '';
      const key = `${firstToken}|${c._name.charAt(0)}`;
      const arr = buckets.get(key) || [];
      arr.push(c);
      buckets.set(key, arr);
    }

    const suggestions: NameSimilaritySuggestion[] = [];
    const seenPair = new Set<string>();

    for (const group of buckets.values()) {
      if (group.length < 2) continue;

      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const pairKey = [a.id, b.id].sort().join('|');
          if (seenPair.has(pairKey)) continue;

          // Se já tem chave forte, não entra como caso ambíguo de nome.
          const hasSameDoc = a._doc && b._doc && a._doc === b._doc;
          const hasPhoneOverlap = [...a._phones].some((p) => b._phones.has(p));
          const hasEmailOverlap = [...a._emails].some((e) => b._emails.has(e));
          if (hasSameDoc || hasPhoneOverlap || hasEmailOverlap) continue;

          const score = diceCoefficient(a._name, b._name);
          const contains = a._name.includes(b._name) || b._name.includes(a._name);
          const likely = score >= 0.86 || (contains && score >= 0.78);

          if (!likely) continue;
          seenPair.add(pairKey);

          suggestions.push({
            key: pairKey,
            score,
            reason: contains ? 'Nome muito parecido (contém variação)' : 'Alta similaridade nominal',
            clients: [a, b],
          });
        }
      }
    }

    return suggestions.sort((x, y) => y.score - x.score).slice(0, 50);
  }, []);
  
  /**
   * Find all duplicate groups across ALL clients.
   * Detects duplicates by: normalized phone, cpf_cnpj, and bi_ random-codigo pattern.
   */
  const findAllDuplicates = useCallback(async (): Promise<DuplicateGroup[]> => {
    const { data: clients, error } = await supabase
      .from('clientes')
      .select('id, telefone, whatsapp_number, nome_fantasia, razao_social, cpf_cnpj, email, codigo_cliente, cliente_contatos(telefone_contato, email_contato)');

    if (error || !clients) {
      console.error('Error fetching clients for duplicate detection:', error);
      return [];
    }

    // Group by normalized phone (last 9 digits)
    const phoneGroups: Record<string, ClientData[]> = {};
    // Group by cpf_cnpj (digits only)
    const cnpjGroups: Record<string, ClientData[]> = {};
    // Group by normalized email (client or contact)
    const emailGroups: Record<string, ClientData[]> = {};

    for (const client of clients) {
      // Phone-based grouping
      const phones = [
        normalizePhone(client.telefone),
        normalizePhone(client.whatsapp_number),
        ...((client.cliente_contatos || []).map((cc) => normalizePhone(cc.telefone_contato)))
      ].filter(p => p.length >= 8);

      for (const phone of phones) {
        addToGroup(phoneGroups, phone, client);
      }

      // CPF/CNPJ-based grouping (more reliable than phone)
      const cnpj = normalizeCpfCnpj(client.cpf_cnpj);
      if (cnpj.length >= 8) {
        addToGroup(cnpjGroups, cnpj, client);
      }

      const emails = [
        normalizeEmail(client.email),
        ...((client.cliente_contatos || []).map((cc) => normalizeEmail(cc.email_contato)))
      ].filter((e) => e.length >= 5);

      for (const email of emails) {
        addToGroup(emailGroups, email, client);
      }
    }

    // Merge all duplicate groups, keyed by the "best" identifier
    const allGroups: DuplicateGroup[] = [];
    const seenIds = new Set<string>();

    // First pass: cpf_cnpj groups (more reliable)
    for (const [cnpj, grpClients] of Object.entries(cnpjGroups)) {
      if (grpClients.length < 2) continue;
      const ids = grpClients.map(c => c.id).sort().join('|');
      if (seenIds.has(ids)) continue;
      seenIds.add(ids);
      allGroups.push({ phone: `cnpj:${cnpj}`, clients: grpClients });
    }

    // Second pass: phone groups (any not already captured)
    for (const [phone, grpClients] of Object.entries(phoneGroups)) {
      if (grpClients.length < 2) continue;
      const ids = grpClients.map(c => c.id).sort().join('|');
      if (seenIds.has(ids)) continue;
      seenIds.add(ids);
      allGroups.push({ phone, clients: grpClients });
    }

    // Third pass: email groups
    for (const [email, grpClients] of Object.entries(emailGroups)) {
      if (grpClients.length < 2) continue;
      const ids = grpClients.map(c => c.id).sort().join('|');
      if (seenIds.has(ids)) continue;
      seenIds.add(ids);
      allGroups.push({ phone: `email:${email}`, clients: grpClients });
    }

    return allGroups;
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
    findNameSimilaritySuggestions,
    mergeClients,
    detectDuplicates,
    autoMergeAllDuplicates,
    mergeTickets,
    mergeOportunidades,
    mergeAtendimentos,
  };
}
