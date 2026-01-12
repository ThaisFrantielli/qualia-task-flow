import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useBIData from '@/hooks/useBIData';
import { toast } from 'sonner';

type AnyObject = { [k: string]: any };

interface SyncResult {
  added: number;
  skipped: number;
  errors: number;
  total: number;
}

export function useSyncClientesFromBI() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const { data: rawClientes, loading: loadingBI, refetch } = useBIData<AnyObject[]>('dim_clientes.json');

  const getClientes = (): AnyObject[] => {
    const raw = (rawClientes as any)?.data || rawClientes || [];
    return Array.isArray(raw) ? raw : [];
  };

  const syncClientes = async (): Promise<SyncResult> => {
    setSyncing(true);
    const result: SyncResult = { added: 0, skipped: 0, errors: 0, total: 0 };

    try {
      const biClientes = getClientes();
      result.total = biClientes.length;

      if (biClientes.length === 0) {
        toast.warning('Nenhum cliente encontrado no arquivo dim_clientes.json');
        return result;
      }

      // Limpar clientes existentes do BI antes de reimportar
      const { error: cleanError } = await supabase.rpc('limpar_clientes_bi');
      if (cleanError) {
        console.error('Erro ao limpar clientes BI:', cleanError);
        toast.error('Erro ao limpar clientes existentes do BI');
        throw cleanError;
      }

      // Preparar todos os clientes para inserção
      const clientesToInsert: AnyObject[] = [];
      
      for (const cliente of biClientes) {
        const codigo = String(cliente.codigo_cliente || cliente.CodigoCliente || cliente.Codigo || cliente.Id || '').toLowerCase().trim();
        const cnpj = String(cliente.cpf_cnpj || cliente.CNPJ || cliente.CpfCnpj || cliente.CPF_CNPJ || '').replace(/\D/g, '').trim();
        
        const novoCliente = {
          codigo_cliente: codigo || `BI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          razao_social: cliente.razao_social || cliente.RazaoSocial || cliente.Nome || cliente.NomeCliente || null,
          nome_fantasia: cliente.nome_fantasia || cliente.NomeFantasia || cliente.Fantasia || null,
          cpf_cnpj: cnpj || null,
          email: cliente.email || cliente.Email || null,
          telefone: cliente.telefone || cliente.Telefone || cliente.Fone || null,
          whatsapp_number: formatWhatsapp(cliente.celular || cliente.Celular || cliente.WhatsApp || cliente.telefone || null),
          endereco: cliente.endereco || cliente.Endereco || cliente.Logradouro || null,
          numero: cliente.numero || cliente.Numero || null,
          bairro: cliente.bairro || cliente.Bairro || null,
          cidade: cliente.cidade || cliente.Cidade || cliente.Municipio || null,
          estado: cliente.estado || cliente.Estado || cliente.UF || null,
          cep: cliente.cep || cliente.CEP || null,
          situacao: cliente.status || cliente.Status || cliente.Situacao || 'Ativo',
          status: (cliente.status || cliente.Status || '').toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
          tipo_cliente: cliente.tipo_cliente || cliente.TipoCliente || cliente.Segmento || null,
          natureza_cliente: cliente.natureza_cliente || cliente.NaturezaCliente || null,
          origem: 'dim_clientes_bi',
        };

        clientesToInsert.push(novoCliente);
      }

      // Inserir em lotes de 50 para evitar timeout
      const batchSize = 50;
      for (let i = 0; i < clientesToInsert.length; i += batchSize) {
        const batch = clientesToInsert.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('clientes')
          .insert(batch);

        if (insertError) {
          console.error('Erro ao inserir lote:', insertError);
          result.errors += batch.length;
        } else {
          result.added += batch.length;
        }
      }

      if (result.added > 0) {
        toast.success(`${result.added} clientes importados com sucesso do dim_clientes.json!`);
      }
      if (result.errors > 0) {
        toast.warning(`${result.errors} clientes com erro na importação`);
      }

      setLastResult(result);
      return result;
    } catch (error) {
      console.error('Erro na sincronização:', error);
      toast.error('Erro ao sincronizar clientes');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncClientes,
    syncing,
    loadingBI,
    lastResult,
    clientesBICount: getClientes().length,
    refetchBI: refetch,
  };
}

function formatWhatsapp(phone: string | null): string | null {
  if (!phone) return null;
  
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');
  
  // Se já tem código do país, retorna
  if (numbers.startsWith('55') && numbers.length >= 12) {
    return numbers;
  }
  
  // Adiciona código do país Brasil
  if (numbers.length >= 10) {
    return `55${numbers}`;
  }
  
  return null;
}
