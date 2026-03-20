import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { generateClienteCodigo, normalizeClienteCodigo } from '@/lib/clienteCodigo';
import {
  buildClienteIndexes,
  findMatchingCliente,
  hasDuplicateContact,
  hasMinimalClientData,
  mapImportClienteRow,
} from '@/components/customer-management/importClientesUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

type ImportResult = {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  contactsAdded: number;
  errors: number;
};

interface ImportClientesButtonProps {
  onImportComplete?: () => void;
}

export function ImportClientesButton({ onImportComplete }: ImportClientesButtonProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const accepted = useMemo(() => '.csv,.xlsx,.xls', []);

  const handleDownloadTemplate = () => {
    const template = [
      'codigo_cliente,razao_social,nome_fantasia,cpf_cnpj,situacao,nome_contato,email_contato,telefone_contato,departamento',
      'CLI-1001,Quality Exemplo LTDA,Quality Exemplo,12.345.678/0001-99,Ativo,Thais,thais@empresa.com,(11)99999-0001,Comercial',
      'CLI-1002,Cliente Sem Contato,,98.765.432/0001-11,Ativo,,,,',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_importacao_clientes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setProgress(5);
    setLastResult(null);

    const result: ImportResult = {
      total: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      contactsAdded: 0,
      errors: 0,
    };

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];
      const rows = jsonRows.map(mapImportClienteRow).filter(hasMinimalClientData);
      result.total = rows.length;

      if (rows.length === 0) {
        setLastResult(result);
        return;
      }

      setProgress(15);

      const { data: existingClientes, error: fetchError } = await supabase
        .from('clientes')
        .select('id, codigo_cliente, cpf_cnpj, razao_social, nome_fantasia, cliente_contatos(id, nome_contato, email_contato, telefone_contato)');

      if (fetchError) throw fetchError;

      const indexes = buildClienteIndexes((existingClientes || []) as any);

      let idx = 0;
      for (const row of rows) {
        idx += 1;
        setProgress(15 + Math.floor((idx / rows.length) * 80));

        try {
          const normalizedIncomingCode = row.codigo_cliente ? normalizeClienteCodigo(row.codigo_cliente) : '';
          let target = findMatchingCliente(indexes, row);

          if (!target) {
            const codigoGerado = normalizedIncomingCode || generateClienteCodigo(idx);
            const payload = {
              codigo_cliente: codigoGerado,
              razao_social: row.razao_social || row.nome_fantasia || `Cliente Importado ${idx}`,
              nome_fantasia: row.nome_fantasia || row.razao_social || null,
              cpf_cnpj: row.cpf_cnpj || null,
              situacao: row.situacao || 'Ativo',
              origem: 'manual_import',
            };

            const { data: inserted, error: insertErr } = await supabase
              .from('clientes')
              .insert(payload)
              .select('id, codigo_cliente, cpf_cnpj, razao_social, nome_fantasia, cliente_contatos(id, nome_contato, email_contato, telefone_contato)')
              .single();

            if (insertErr) throw insertErr;
            target = inserted;
            result.inserted += 1;
          } else {
            const updatePayload: Record<string, string | null> = {};
            if (row.razao_social) updatePayload.razao_social = row.razao_social;
            if (row.nome_fantasia) updatePayload.nome_fantasia = row.nome_fantasia;
            if (row.cpf_cnpj) updatePayload.cpf_cnpj = row.cpf_cnpj;
            if (row.situacao) updatePayload.situacao = row.situacao;
            if (normalizedIncomingCode && !target.codigo_cliente) updatePayload.codigo_cliente = normalizedIncomingCode;

            if (Object.keys(updatePayload).length > 0) {
              const { error: updateErr } = await supabase
                .from('clientes')
                .update(updatePayload)
                .eq('id', target.id);

              if (updateErr) throw updateErr;
              result.updated += 1;
            } else {
              result.skipped += 1;
            }
          }

          if (row.nome_contato || row.email_contato || row.telefone_contato) {
            const { data: existingContacts, error: contErr } = await supabase
              .from('cliente_contatos')
              .select('id, nome_contato, email_contato, telefone_contato')
              .eq('cliente_id', target.id);

            if (contErr) throw contErr;

            const exists = hasDuplicateContact(existingContacts || [], row);

            if (!exists) {
              const { error: insertContatoErr } = await supabase
                .from('cliente_contatos')
                .insert({
                  cliente_id: target.id,
                  nome_contato: row.nome_contato || row.razao_social || row.nome_fantasia || null,
                  email_contato: row.email_contato || null,
                  telefone_contato: row.telefone_contato || null,
                  departamento: row.departamento || null,
                });

              if (insertContatoErr) throw insertContatoErr;
              result.contactsAdded += 1;
            }
          }
        } catch {
          result.errors += 1;
        }
      }

      setLastResult(result);
      onImportComplete?.();
    } finally {
      setProgress(100);
      setImporting(false);
    }
  };

  const getResultIcon = () => {
    if (!lastResult) return null;
    if (lastResult.errors > 0) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Importar CSV/Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Clientes e Contatos
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV/XLSX para cadastrar ou atualizar clientes sem sincronização com BI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Formatos aceitos: CSV, XLS, XLSX</p>
            <p>• Chaves de deduplicação: código, CPF/CNPJ, telefone/email de contato e nome</p>
            <p>• Contatos duplicados por telefone/email no mesmo cliente são ignorados</p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadTemplate}>
              Baixar Template
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept={accepted}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSelectedFileName(file.name);
                  void handleImportFile(file);
                  e.currentTarget.value = '';
                }}
                disabled={importing}
              />
              <Button type="button" variant="default" disabled={importing} asChild>
                <span>{importing ? 'Importando...' : 'Selecionar Arquivo'}</span>
              </Button>
            </label>
          </div>

          {selectedFileName && (
            <p className="text-xs text-muted-foreground">Arquivo: {selectedFileName}</p>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">Processando registros...</p>
            </div>
          )}

          {lastResult && !importing && (
            <div className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                {getResultIcon()}
                <span className="font-medium text-sm">Resultado da importação</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>Total lidos: {lastResult.total}</div>
                <div>Inseridos: {lastResult.inserted}</div>
                <div>Atualizados: {lastResult.updated}</div>
                <div>Ignorados: {lastResult.skipped}</div>
                <div>Contatos novos: {lastResult.contactsAdded}</div>
                <div>Erros: {lastResult.errors}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
