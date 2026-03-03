import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AnyObject = { [k: string]: any };

interface SyncResult {
  added: number;
  skipped: number;
  errors: number;
  total: number;
}

/**
 * dim_clientes.json é gerado pelo ETL como JSON_ONLY e está em public/data/.
 * O Vite (dev) e o Vercel (prod) servem a pasta public/ como arquivos estáticos.
 * Uso simples: fetch('/data/dim_clientes.json') — sem Oracle PG, sem Storage.
 */
async function fetchDimClientesFromPublic(): Promise<AnyObject[]> {
  try {
    const resp = await fetch('/data/dim_clientes.json');
    if (!resp.ok) {
      console.error('[useSyncClientesFromBI] Erro ao buscar /data/dim_clientes.json:', resp.status, resp.statusText);
      return [];
    }
    const parsed = await resp.json();
    // Suporta estrutura { metadata, data: [...] } OU array direto
    const rows = parsed?.data ?? parsed;
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('[useSyncClientesFromBI] Falha ao carregar dim_clientes.json:', err);
    return [];
  }
}

/**
 * Gera um codigo_cliente DETERMINÍSTICO baseado nos dados disponíveis.
 * Nunca usa valores aleatórios/timestamp para evitar duplicação a cada sync.
 */
function gerarCodigoDeterministico(cnpj: string, razaoSocial: string | null): string | null {
  if (cnpj && cnpj.length >= 8) {
    return `bi_cnpj_${cnpj}`;
  }
  if (razaoSocial && razaoSocial.trim().length >= 3) {
    const slug = razaoSocial
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);
    if (slug.length >= 3) return `bi_nome_${slug}`;
  }
  return null; // Não identificável — deve ser pulado
}

export function useSyncClientesFromBI() {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [clientesBICount, setClientesBICount] = useState<number | null>(null);
  const [loadingBI, setLoadingBI] = useState(false);

  // Pré-carrega contagem para exibição no dialog (não bloqueia a UI)
  useEffect(() => {
    setLoadingBI(true);
    fetchDimClientesFromPublic()
      .then(rows => setClientesBICount(rows.length))
      .catch(() => setClientesBICount(null))
      .finally(() => setLoadingBI(false));
  }, []);

  const syncClientes = async (): Promise<SyncResult> => {
    setSyncing(true);
    const result: SyncResult = { added: 0, skipped: 0, errors: 0, total: 0 };

    try {
      const biClientes = await fetchDimClientesFromPublic();
      result.total = biClientes.length;

      if (biClientes.length === 0) {
        toast.warning('Nenhum cliente encontrado no arquivo dim_clientes.json');
        setLastResult(result);
        return result;
      }

      // CORREÇÃO: incluir 'id' no select para poder associar contatos depois
      const { data: existingClientes, error: fetchError } = await supabase
        .from('clientes')
        .select('id, codigo_cliente, cpf_cnpj');

      if (fetchError) {
        console.error('Erro ao buscar clientes existentes:', fetchError);
        toast.error('Erro ao verificar clientes existentes');
        throw fetchError;
      }

      // Normalização consistente — mesma lógica usada no loop abaixo
      const normCod = (s?: string | null) => (s ?? '').toLowerCase().trim();
      const normDoc = (s?: string | null) => (s ?? '').replace(/\D/g, '').trim();

      // Criar sets para verificação rápida
      const existingCodigos = new Set(
        existingClientes?.map(c => normCod(c.codigo_cliente)).filter(Boolean) || []
      );
      const existingCnpjs = new Set(
        existingClientes?.map(c => normDoc(c.cpf_cnpj)).filter(Boolean) || []
      );

      // Filtrar apenas clientes novos
      const novosClientes: AnyObject[] = [];
      // Mapa do codigo_cliente final → registro BI original (para lookup de contatos)
      const biMapByCodigo: Record<string, AnyObject> = {};
      // Set in-memory p/ evitar duplicatas dentro do próprio lote do BI
      const batchCodigos = new Set<string>();
      const batchCnpjs = new Set<string>();

      for (const cliente of biClientes) {
        // IdCliente é o identificador primário do BI (ex: "271181", "29980")
        const codigoOriginal = normCod(
          cliente.IdCliente || cliente.id_cliente ||
          cliente.codigo_cliente || cliente.CodigoCliente || cliente.Codigo || cliente.Id || ''
        );

        // CPF (Pessoa Física) fica em campo separado `CPF` no JSON do BI
        const cnpj = normDoc(
          cliente.cpf_cnpj || cliente.CNPJ || cliente.CPF ||
          cliente.CpfCnpj || cliente.CPF_CNPJ || ''
        );

        const razaoSocial = (cliente.razao_social || cliente.RazaoSocial || cliente.Nome || cliente.NomeCliente || '') as string;

        // Com IdCliente mapeado, codigoOriginal nunca será vazio — fallback apenas para segurança
        const codigo = codigoOriginal || gerarCodigoDeterministico(cnpj, razaoSocial);

        // Sem identificador confiável → pular (conta separado)
        if (!codigo) {
          result.skipped++;
          continue;
        }

        // Verificar se já existe no banco OU já está no lote atual (duplicata interna do BI)
        const codigoExiste = existingCodigos.has(codigo) || batchCodigos.has(codigo);
        const cnpjExiste = cnpj.length > 0 && (existingCnpjs.has(cnpj) || batchCnpjs.has(cnpj));

        if (codigoExiste || cnpjExiste) {
          result.skipped++;
          biMapByCodigo[codigo] = cliente; // preservar para upsert de contatos
          continue;
        }

        // Mapear campos do dim_clientes para a tabela clientes
        const novoCliente = {
          codigo_cliente: codigo,
          razao_social: razaoSocial || null,
          nome_fantasia: (cliente.NomeFantasia || cliente.nome_fantasia || cliente.Fantasia || razaoSocial || null) as string | null,
          cpf_cnpj: cnpj || null,
          email: cliente.EmailGestorFrota || cliente.email || cliente.Email || null,
          telefone: cliente.TelefoneGestorFrota || cliente.telefone || cliente.Telefone || cliente.Fone || null,
          whatsapp_number: formatWhatsapp(cliente.TelefoneGestorFrota || cliente.celular || cliente.Celular || cliente.WhatsApp || cliente.telefone || null),
          endereco: cliente.Endereco || cliente.endereco || cliente.Logradouro || null,
          numero: cliente.NumeroEndereco || cliente.numero || cliente.Numero || null,
          bairro: cliente.Bairro || cliente.bairro || null,
          cidade: cliente.Cidade || cliente.cidade || cliente.Municipio || null,
          estado: cliente.Estado || cliente.estado || cliente.UF || null,
          cep: cliente.cep || cliente.CEP || null,
          situacao: cliente.Situacao || cliente.situacao || cliente.Status || cliente.status || 'Ativo',
          // Situacao (capital S) é o campo correto no dim_clientes.json
          status: (cliente.Situacao || cliente.situacao || cliente.Status || cliente.status || '').toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
          tipo_cliente: cliente.Segmento || cliente.tipo_cliente || cliente.TipoCliente || null,
          natureza_cliente: cliente.NaturezaCliente || cliente.natureza_cliente || null,
          nome_contratante: cliente.GestorFrota || cliente.nome_contratante || cliente.NomeContratante || cliente.Gestor || null,
          origem: 'dim_clientes_bi',
        };

        novosClientes.push(novoCliente);
        biMapByCodigo[codigo] = cliente;
        batchCodigos.add(codigo);
        if (cnpj) batchCnpjs.add(cnpj);
      }

      if (novosClientes.length === 0) {
        toast.info('Todos os clientes do BI já estão cadastrados');
        setLastResult(result);
        return result;
      }

      // Criar mapas de clientes existentes pelo id para lookup de contatos
      const existingByCodigo: Record<string, AnyObject> = {};
      const existingByCnpj: Record<string, AnyObject> = {};
      for (const c of existingClientes || []) {
        const cod = c.codigo_cliente?.toLowerCase().trim();
        const cnpj = c.cpf_cnpj?.replace(/\D/g, '').trim();
        if (cod) existingByCodigo[cod] = c;
        if (cnpj) existingByCnpj[cnpj] = c;
      }

      // Rastrear clientes que foram 'skipped' para verificar contatos depois
      const existingMatches: Array<{ codigo: string; cnpj: string; cliente: AnyObject }> = [];
      for (const cliente of biClientes) {
        // Mesmo mapeamento do loop principal (IdCliente + CPF mapeados)
        const codigoOriginal = String(
          cliente.IdCliente || cliente.id_cliente ||
          cliente.codigo_cliente || cliente.CodigoCliente || cliente.Codigo || cliente.Id || ''
        ).toLowerCase().trim();
        const cnpj = String(
          cliente.cpf_cnpj || cliente.CNPJ || cliente.CPF ||
          cliente.CpfCnpj || cliente.CPF_CNPJ || ''
        ).replace(/\D/g, '').trim();
        const razaoSocial = (cliente.razao_social || cliente.RazaoSocial || cliente.Nome || cliente.NomeCliente || '') as string;
        const codigo = codigoOriginal || gerarCodigoDeterministico(cnpj, razaoSocial) || '';
        const codigoExiste = codigo && existingCodigos.has(codigo);
        const cnpjExiste = cnpj && existingCnpjs.has(cnpj);
        if (codigoExiste || cnpjExiste) {
          existingMatches.push({ codigo, cnpj, cliente });
        }
      }

      // CORREÇÃO: usar upsert com ignoreDuplicates para garantir idempotência total
      // caso o check acima falhe por race condition, o banco não cria duplicatas
      const batchSize = 50;
      for (let i = 0; i < novosClientes.length; i += batchSize) {
        const batch = novosClientes.slice(i, i + batchSize);

        const { data: insertedClients, error: insertError } = await supabase
          .from('clientes')
          .upsert(batch, { onConflict: 'codigo_cliente', ignoreDuplicates: true })
          .select('id, codigo_cliente');

        if (insertError || !insertedClients) {
          console.error('Erro ao inserir lote:', insertError);
          result.errors += batch.length;
          continue;
        }

        result.added += insertedClients.length;

        // Preparar contatos baseados nos campos do registro BI original
        const contatosToInsert: AnyObject[] = [];

        for (const ins of insertedClients) {
          const codigoInserted = String(ins.codigo_cliente || '').toLowerCase().trim();
          const biRecord = biMapByCodigo[codigoInserted];
          if (!biRecord) {
            console.debug('[syncClientes] nenhum registro BI encontrado para codigo:', codigoInserted, 'insertedId:', ins.id);
            continue;
          }

          // Extrair possíveis variações de campo (diferentes fontes/nomes)
          const emailCondutor = biRecord.EmailCondutor || biRecord.emailCondutor || biRecord.email_condutor || biRecord.Email_Condutor || biRecord.Email || null;
          const telefone1 = biRecord.Telefone1Condutor || biRecord.telefone1Condutor || biRecord.Telefone1 || biRecord.Telefone1Condutor || null;
          const telefone2 = biRecord.Telefone2Condutor || biRecord.telefone2Condutor || biRecord.Telefone2 || null;
          const telefone3 = biRecord.Telefone3Condutor || biRecord.telefone3Condutor || biRecord.Telefone3 || null;

          // Normalizar números (manter apenas dígitos)
          const phones = [telefone1, telefone2, telefone3]
            .map((p: any) => (p ? String(p).replace(/\D/g, '') : null))
            .filter(Boolean) as string[];

          // Se existe email e pelo menos um telefone, criar um contato com ambos
          if (emailCondutor && phones.length > 0) {
            contatosToInsert.push({
              cliente_id: ins.id,
              nome_contato: 'Condutor',
              email_contato: emailCondutor,
              telefone_contato: phones[0],
              departamento: null,
              is_gestor: false,
            });
          } else if (emailCondutor) {
            contatosToInsert.push({
              cliente_id: ins.id,
              nome_contato: 'Condutor',
              email_contato: emailCondutor,
              telefone_contato: null,
              departamento: null,
              is_gestor: false,
            });
          }

          // Adicionar os demais telefones como contatos separados (se existirem)
          if (phones.length > 1) {
            for (let k = 1; k < phones.length; k++) {
              contatosToInsert.push({
                cliente_id: ins.id,
                nome_contato: 'Condutor',
                email_contato: null,
                telefone_contato: phones[k],
                departamento: null,
                is_gestor: false,
              });
            }
          }
        }

        if (contatosToInsert.length > 0) {
          const { error: contatosError } = await supabase
            .from('cliente_contatos')
            .insert(contatosToInsert);

          if (contatosError) {
            console.error('Erro ao inserir contatos do lote:', contatosError);
          }
        }
      }

      // Para clientes que já existem (foram 'skipped'), garantir que tenham contatos importados
      if (existingMatches.length > 0) {
        for (const match of existingMatches) {
          const codigoKey = String(match.codigo || '').toLowerCase().trim();
          const cnpjKey = String(match.cnpj || '').replace(/\D/g, '').trim();
          const existingClient = existingByCodigo[codigoKey] || existingByCnpj[cnpjKey];
          if (!existingClient) continue;

          try {
            const { data: existingContatos, error: contatosFetchError } = await supabase
              .from('cliente_contatos')
              .select('id')
              .eq('cliente_id', existingClient.id)
              .limit(1);

            if (contatosFetchError) {
              console.error('Erro ao verificar contatos existentes para cliente', existingClient.id, contatosFetchError);
              continue;
            }

            if (existingContatos && existingContatos.length > 0) {
              // já possui contato, pular
              continue;
            }

            // Criar contatos a partir do registro BI
            const biRecord = match.cliente;
            const emailCondutor = biRecord.EmailCondutor || biRecord.emailCondutor || biRecord.email_condutor || biRecord.Email_Condutor || biRecord.Email || null;
            const telefone1 = biRecord.Telefone1Condutor || biRecord.telefone1Condutor || biRecord.Telefone1 || null;
            const telefone2 = biRecord.Telefone2Condutor || biRecord.telefone2Condutor || biRecord.Telefone2 || null;
            const telefone3 = biRecord.Telefone3Condutor || biRecord.telefone3Condutor || biRecord.Telefone3 || null;

            const phones = [telefone1, telefone2, telefone3]
              .map((p: any) => (p ? String(p).replace(/\D/g, '') : null))
              .filter(Boolean) as string[];

            const contatosToInsertExisting: AnyObject[] = [];
            if (emailCondutor && phones.length > 0) {
              contatosToInsertExisting.push({
                cliente_id: existingClient.id,
                nome_contato: 'Condutor',
                email_contato: emailCondutor,
                telefone_contato: phones[0],
                departamento: null,
                is_gestor: false,
              });
            } else if (emailCondutor) {
              contatosToInsertExisting.push({
                cliente_id: existingClient.id,
                nome_contato: 'Condutor',
                email_contato: emailCondutor,
                telefone_contato: null,
                departamento: null,
                is_gestor: false,
              });
            }

            if (phones.length > 1) {
              for (let k = 1; k < phones.length; k++) {
                contatosToInsertExisting.push({
                  cliente_id: existingClient.id,
                  nome_contato: 'Condutor',
                  email_contato: null,
                  telefone_contato: phones[k],
                  departamento: null,
                  is_gestor: false,
                });
              }
            }

            if (contatosToInsertExisting.length > 0) {
              const { error: contatosInsertError } = await supabase
                .from('cliente_contatos')
                .insert(contatosToInsertExisting);
              if (contatosInsertError) {
                console.error('Erro ao inserir contatos para cliente existente', existingClient.id, contatosInsertError);
              } else {
                console.log('[syncClientes] contatos inseridos para cliente existente', existingClient.id, contatosToInsertExisting.length);
              }
            }
          } catch (err) {
            console.error('Erro processando contatos para cliente existente', err);
          }
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
    clientesBICount: clientesBICount ?? 0,
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

// Utility function kept for potential future use
// function parseBool(val: any): boolean | null {
//   if (val === null || val === undefined) return null;
//   if (typeof val === 'boolean') return val;
//   const s = String(val).trim().toLowerCase();
//   if (s === '1' || s === 'true' || s === 'yes' ) return true;
//   if (s === '0' || s === 'false' || s === 'no') return false;
//   return null;
// }
