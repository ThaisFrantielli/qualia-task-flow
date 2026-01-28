import { pdf } from '@react-pdf/renderer';
import { PropostaPDFDocument } from '@/components/proposta/pdf/PropostaPDFDocument';
import { PropostaTemplateWithDetails } from '@/types/proposta-template';
import { Proposta, PropostaVeiculoWithItems, PropostaCenario } from '@/types/proposta';
import { uploadPropostaPDF } from '@/hooks/usePropostaTemplates';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';
import type { ReactElement } from 'react';

export interface GeneratePDFOptions {
  proposta: Proposta;
  veiculos: PropostaVeiculoWithItems[];
  cenarios: PropostaCenario[];
  template: PropostaTemplateWithDetails;
  vendedorNome?: string;
  minutaEspecifica?: { url: string; nome: string } | null;
  saveToStorage?: boolean;
}

export interface GeneratePDFResult {
  blob: Blob;
  url?: string;
  fileName: string;
}

/**
 * Gera o PDF da proposta
 */
export async function generatePropostaPDF(
  options: GeneratePDFOptions
): Promise<GeneratePDFResult> {
  const { proposta, veiculos, cenarios, template, vendedorNome, saveToStorage = false } = options;

  // Criar o documento React-PDF
  const doc = React.createElement(PropostaPDFDocument, {
    proposta,
    veiculos,
    cenarios,
    template,
    vendedorNome
  }) as ReactElement;

  // Gerar o blob do PDF
  const blob = await pdf(doc).toBlob();
  
  // Nome do arquivo
  const fileName = `proposta-${String(proposta.numero_proposta).padStart(6, '0')}.pdf`;

  let url: string | undefined;

  // Salvar no storage se solicitado
  if (saveToStorage) {
    url = await uploadPropostaPDF(blob, fileName);
  }

  return {
    blob,
    url,
    fileName
  };
}

/**
 * Faz download direto do PDF
 */
export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Abre o PDF em nova aba
 */
export function openPDFInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Salva o registro do arquivo gerado no banco
 */
export async function savePropostaArquivo(
  propostaId: string,
  templateId: string | undefined,
  arquivoUrl: string,
  arquivoNome: string,
  minutaEspecifica?: { url: string; nome: string } | null
): Promise<void> {
  // Buscar última versão
  const { data: lastVersion } = await supabase
    .from('proposta_arquivos_gerados')
    .select('versao')
    .eq('proposta_id', propostaId)
    .order('versao', { ascending: false })
    .limit(1)
    .single();

  const novaVersao = (lastVersion?.versao || 0) + 1;

  // Buscar usuário atual
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from('proposta_arquivos_gerados')
    .insert({
      proposta_id: propostaId,
      template_id: templateId,
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      versao: novaVersao,
      gerado_por: user?.id,
      minuta_especifica_url: minutaEspecifica?.url,
      minuta_especifica_nome: minutaEspecifica?.nome
    });
}

/**
 * Busca o nome do vendedor
 */
export async function getVendedorNome(vendedorId: string | undefined): Promise<string | undefined> {
  if (!vendedorId) return undefined;

  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', vendedorId)
    .single();

  return data?.full_name;
}
