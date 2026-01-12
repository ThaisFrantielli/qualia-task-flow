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

      // Buscar clientes existentes para evitar duplicação
      const { data: existingClientes, error: fetchError } = await supabase
        .from('clientes')
        .select('codigo_cliente, cpf_cnpj');

      if (fetchError) {
        console.error('Erro ao buscar clientes existentes:', fetchError);
        toast.error('Erro ao verificar clientes existentes');
        throw fetchError;
      }

      // Criar sets para verificação rápida
      const existingCodigos = new Set(
        existingClientes?.map(c => c.codigo_cliente?.toLowerCase().trim()).filter(Boolean) || []
      );
      const existingCnpjs = new Set(
        existingClientes?.map(c => c.cpf_cnpj?.replace(/\D/g, '').trim()).filter(Boolean) || []
      );

      // Filtrar apenas clientes novos
      const novosClientes: AnyObject[] = [];
      
      for (const cliente of biClientes) {
        const codigo = String(cliente.codigo_cliente || cliente.CodigoCliente || cliente.Codigo || cliente.Id || '').toLowerCase().trim();
        const cnpj = String(cliente.cpf_cnpj || cliente.CNPJ || cliente.CpfCnpj || cliente.CPF_CNPJ || '').replace(/\D/g, '').trim();
        
        // Verificar se já existe
        const codigoExiste = codigo && existingCodigos.has(codigo);
        const cnpjExiste = cnpj && existingCnpjs.has(cnpj);
        
        if (codigoExiste || cnpjExiste) {
          result.skipped++;
          continue;
        }

        // Mapear campos do dim_clientes para a tabela clientes
        const novoCliente = {
          codigo_cliente: (codigo || `bi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).toLowerCase(),
          razao_social: cliente.razao_social || cliente.RazaoSocial || cliente.Nome || cliente.NomeCliente || null,
          nome_fantasia: cliente.nome_fantasia || cliente.NomeFantasia || cliente.Nome || cliente.Fantasia || null,
          cpf_cnpj: cnpj || null,
          email: cliente.email || cliente.Email || null,
          telefone: cliente.telefone || cliente.Telefone || cliente.Fone || null,
          whatsapp_number: formatWhatsapp(cliente.celular || cliente.Celular || cliente.WhatsApp || cliente.telefone || null),
          endereco: cliente.endereco || cliente.Endereco || cliente.Logradouro || null,
          numero: cliente.numero || cliente.Numero || cliente.NumeroEndereco || null,
          bairro: cliente.bairro || cliente.Bairro || null,
          cidade: cliente.cidade || cliente.Cidade || cliente.Municipio || null,
          estado: cliente.estado || cliente.Estado || cliente.UF || null,
          cep: cliente.cep || cliente.CEP || null,
          situacao: cliente.situacao || cliente.status || cliente.Status || cliente.Situacao || 'Ativo',
          status: (cliente.situacao || cliente.status || cliente.Status || '').toLowerCase() === 'ativo' ? 'ativo' : 'inativo',
          tipo_cliente: cliente.tipo_cliente || cliente.TipoCliente || cliente.Segmento || null,
          natureza_cliente: cliente.natureza_cliente || cliente.NaturezaCliente || null,
          data_atualizacao_dados: cliente.DataAtualizacaoDados || cliente.data_atualizacao_dados || null,
          id_cliente_origem: cliente.IdCliente || cliente.Id || cliente.IdClienteOrigem || null,
          inscricao_estadual: cliente.InscricaoEstadual || cliente.inscricao_estadual || null,
          inscricao_municipal: cliente.InscricaoMunicipal || cliente.inscricao_municipal || null,
          rg: cliente.RG || cliente.rg || null,
          gestor_frota: cliente.GestorFrota || cliente.Gestor || null,
          email_gestor_frota: cliente.EmailGestorFrota || cliente.EmailGestor || null,
          telefone_gestor_frota: cliente.TelefoneGestorFrota || cliente.TelefoneGestor || null,
          site: cliente.Site || cliente.site || null,
          classificacao: cliente.Classificacao || cliente.classificacao || null,
          observacoes: cliente.Observacoes || cliente.observacoes || cliente.Observacao || null,
          data_criacao: cliente.DataCriacao || cliente.DataCriacao || null,
          complemento: cliente.Complemento || cliente.complemento || null,
          numero_carteira_condutor: cliente.NumeroCarteiraCondutor || cliente.NumeroCNH || cliente.NumeroCnh || null,
          tipo_carteira_condutor: cliente.TipoCarteiraCondutor || cliente.TipoCnh || null,
          vencimento_carteira_condutor: cliente.VencimentoCarteiraCondutor || cliente.VencCnh || null,
          informacoes_adicionais_condutor: cliente.InformacoesAdicionaisCondutor || cliente.InformacoesAdicionais || null,
          estado_carteira_condutor: cliente.EstadoCarteiraCondutor || null,
          emissor_carteira_condutor: cliente.EmissorCarteiraCondutor || null,
          documento_estrangeiro: cliente.DocumentoEstrangeiro || null,
          numero_documento_estrangeiro: cliente.NumeroDocumentoEstrangeiro || null,
          id_tipo_documento_internacional: cliente.IdTipoDocumentoInternacional || null,
          tipo_documento_internacional: cliente.TipoDocumentoInternacional || null,
          criado_por: cliente.CriadoPor || cliente.CriadoPorUsuario || null,
          participa_revisao_programada: parseBool(cliente.ParticipaRevisaoProgramada || cliente.ParticipaRevisaoProgramada === 1 || cliente.ParticipaRevisaoProgramada === '1'),
          liberar_aprovacao_itens_reembolsaveis_portal_cliente: parseBool(cliente.LiberarAprovacaoItensReembolsaveisPortalCliente || cliente.LiberarAprovacaoItensReembolsaveisPortalCliente === 1 || cliente.LiberarAprovacaoItensReembolsaveisPortalCliente === '1'),
          requer_aprovacao_de_itens_no_portal_do_cliente_para_faturar: parseBool(cliente.RequerAprovacaoDeItensNoPortalDoClienteParaFaturar || cliente.RequerAprovacaoDeItensNoPortalDoClienteParaFaturar === 1 || cliente.RequerAprovacaoDeItensNoPortalDoClienteParaFaturar === '1'),
          id_cliente_grupo_economico: cliente.IdClienteGrupoEconomico || cliente.IdClienteGrupo || null,
          grupo_economico: cliente.GrupoEconomico || cliente.Grupo || null,
          origem: 'dim_clientes_bi',
        };

        novosClientes.push(novoCliente);
      }

      if (novosClientes.length === 0) {
        toast.info('Todos os clientes do BI já estão cadastrados');
        return result;
      }

      // Inserir em lotes de 50 para evitar timeout e capturar os ids inseridos
      const batchSize = 50;
      for (let i = 0; i < novosClientes.length; i += batchSize) {
        const batch = novosClientes.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('clientes')
          .insert(batch)
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

function parseBool(val: any): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes' ) return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return null;
}
