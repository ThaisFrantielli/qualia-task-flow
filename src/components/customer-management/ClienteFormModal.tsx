// src/components/customer-management/ClienteFormModal.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteComContatos } from '@/types';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

const contatoSchema = z.object({
  id: z.string().optional(),
  nome_contato: z.string().min(1, "Nome é obrigatório."),
  email_contato: z.string().email("Email inválido.").optional().or(z.literal('')),
  telefone_contato: z.string().optional(),
  departamento: z.string().optional(), 
});

const formSchema = z.object({
  codigo_cliente: z.string().min(1, "Código é obrigatório."),
  razao_social: z.string().min(3, "Razão Social é obrigatória."),
  nome_fantasia: z.string().optional(),
  cpf_cnpj: z.string().optional(),
  situacao: z.string().optional(),
  contatos: z.array(contatoSchema).min(1, "É necessário pelo menos um contato."),
});

type FormData = z.infer<typeof formSchema>;

interface ClienteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (newId?: string) => void;
  cliente: ClienteComContatos | null;
}

// Situações disponíveis para seleção

// Normaliza a situação para exibição consistente
const normalizeSituacao = (situacao: string | null | undefined): string => {
  if (!situacao) return 'Ativo';
  const lower = situacao.toLowerCase();
  if (lower === 'ativo') return 'Ativo';
  if (lower === 'inativo') return 'Inativo';
  return situacao;
};

const ClienteFormModal: React.FC<ClienteFormModalProps> = ({ isOpen, onClose, onSave, cliente }) => {
  const isEditMode = !!cliente;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_cliente: '',
      razao_social: '',
      nome_fantasia: '',
      cpf_cnpj: '',
      situacao: 'Ativo',
      contatos: [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contatos",
  });

  useEffect(() => {
    if (isEditMode && cliente) {
      form.reset({
        codigo_cliente: cliente.codigo_cliente || '',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
        cpf_cnpj: cliente.cpf_cnpj || '',
        situacao: normalizeSituacao(cliente.situacao),
        contatos: cliente.cliente_contatos.length > 0
          ? cliente.cliente_contatos.map(c => ({
              id: c.id,
              nome_contato: c.nome_contato || '',
              email_contato: c.email_contato || '',
              telefone_contato: c.telefone_contato || '',
              departamento: c.departamento || '',
            }))
          : [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
      });
    } else {
      form.reset({
        codigo_cliente: `CLI-${Date.now().toString().slice(-6)}`,
        razao_social: '',
        nome_fantasia: '',
        cpf_cnpj: '',
        situacao: 'Ativo',
        contatos: [{ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' }],
      });
    }
  }, [cliente, isEditMode, form, isOpen]);

  // Detecção de duplicados
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[] | null>(null);
  const checkTimeout = useRef<any>(null);
  const navigate = useNavigate();

  // Detecção por CPF/CNPJ
  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name !== 'cpf_cnpj') return;
      const raw = (value as any).cpf_cnpj || '';
      const cpf = String(raw).replace(/\D/g, '').trim();
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
      if (!cpf || cpf.length < 8) {
        setDuplicateCandidates(null);
        return;
      }
      checkTimeout.current = setTimeout(async () => {
        try {
          const { data } = await supabase
            .from('clientes')
            .select('id, razao_social, nome_fantasia, cpf_cnpj, telefone')
            .ilike('cpf_cnpj', `%${cpf}%`)
            .limit(10);
          if (data && data.length > 0 && (!isEditMode || !data.every(d => d.id === cliente?.id))) {
            setDuplicateCandidates(data.filter(d => d.id !== cliente?.id));
          } else {
            setDuplicateCandidates(null);
          }
        } catch {
          setDuplicateCandidates(null);
        }
      }, 500);
    });
    return () => {
      try { sub.unsubscribe && sub.unsubscribe(); } catch {};
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    };
  }, [form, isEditMode, cliente]);

  // Detecção por telefone
  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (!name || !String(name).includes('telefone_contato')) return;
      const raw = (value as any);
      const phones: string[] = [];
      try {
        const cs = raw.contatos || [];
        for (const c of cs) {
          if (c && c.telefone_contato) {
            const normalized = String(c.telefone_contato).replace(/\D/g, '');
            if (normalized.length >= 8) phones.push(normalized.slice(-9));
          }
        }
      } catch {}
      
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
      const unique = Array.from(new Set(phones)).filter(Boolean);
      if (unique.length === 0) return;
      
      checkTimeout.current = setTimeout(async () => {
        try {
          // Buscar por telefone em clientes e cliente_contatos
          const orConditions = unique.map(p => `telefone_contato.ilike.%${p}%`).join(',');
          const { data: contatosData } = await supabase
            .from('cliente_contatos')
            .select('cliente_id, telefone_contato')
            .or(orConditions)
            .limit(40);
          
          const clienteIds = Array.from(new Set((contatosData || []).map(r => r.cliente_id))).filter(Boolean);
          if (clienteIds.length === 0) return;
          
          // Filtrar o cliente atual se estiver editando
          const filteredIds = isEditMode && cliente ? clienteIds.filter(id => id !== cliente.id) : clienteIds;
          if (filteredIds.length === 0) return;
          
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('id, razao_social, nome_fantasia, cpf_cnpj, telefone')
            .in('id', filteredIds)
            .limit(20);
          
          if (clientesData && clientesData.length > 0) {
            setDuplicateCandidates(prev => {
              const existing = prev || [];
              const newItems = clientesData.filter(c => !existing.some(e => e.id === c.id));
              return [...existing, ...newItems].slice(0, 10);
            });
          }
        } catch {}
      }, 500);
    });
    return () => {
      try { sub.unsubscribe && sub.unsubscribe(); } catch {};
      if (checkTimeout.current) clearTimeout(checkTimeout.current);
    };
  }, [form, isEditMode, cliente]);

  const handleUseCliente = async (id: string) => {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('*, cliente_contatos(*)')
        .eq('id', id)
        .single();
      if (!data) return;
      
      const displayName = data.nome_fantasia || data.razao_social || 'Cliente selecionado';
      if (!window.confirm(`Substituir formulário pelos dados de "${displayName}"?`)) return;
      
      form.reset({
        codigo_cliente: data.codigo_cliente || '',
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cpf_cnpj: data.cpf_cnpj || '',
        situacao: normalizeSituacao(data.situacao),
        contatos: (data.cliente_contatos || []).map((c: any) => ({
          id: c.id,
          nome_contato: c.nome_contato || '',
          email_contato: c.email_contato || '',
          telefone_contato: c.telefone_contato || '',
          departamento: c.departamento || ''
        }))
      });
      setDuplicateCandidates(null);
      toast.success('Dados carregados do cliente existente');
    } catch {}
  };

  const onSubmit: SubmitHandler<FormData> = async (values) => {
    try {
      if (isEditMode && cliente) {
        // Atualização
        const { error: updateError } = await supabase
          .from('clientes')
          .update({
            razao_social: values.razao_social,
            nome_fantasia: values.nome_fantasia,
            cpf_cnpj: values.cpf_cnpj,
            situacao: values.situacao,
          })
          .eq('id', cliente.id);

        if (updateError) throw updateError;

        // Atualizar contatos existentes e criar novos
        for (const contato of values.contatos) {
          if (contato.id) {
            await supabase
              .from('cliente_contatos')
              .update({
                nome_contato: contato.nome_contato,
                email_contato: contato.email_contato,
                telefone_contato: contato.telefone_contato,
                departamento: contato.departamento,
              })
              .eq('id', contato.id);
          } else {
            await supabase
              .from('cliente_contatos')
              .insert({
                cliente_id: cliente.id,
                nome_contato: contato.nome_contato,
                email_contato: contato.email_contato,
                telefone_contato: contato.telefone_contato,
                departamento: contato.departamento,
              });
          }
        }

        toast.success("Cliente atualizado com sucesso!");
        if (typeof onSave === 'function') onSave(cliente.id);
      } else {
        // Criação
        const { data: newCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            codigo_cliente: values.codigo_cliente,
            razao_social: values.razao_social,
            nome_fantasia: values.nome_fantasia,
            cpf_cnpj: values.cpf_cnpj,
            situacao: values.situacao,
          })
          .select()
          .single();

        if (clienteError) throw clienteError;
        if (!newCliente) throw new Error("Falha ao criar cliente.");

        const contatosToInsert = values.contatos.map(contato => ({
          cliente_id: newCliente.id,
          nome_contato: contato.nome_contato,
          email_contato: contato.email_contato,
          telefone_contato: contato.telefone_contato,
          departamento: contato.departamento,
        }));

        const { error: contatoError } = await supabase
          .from('cliente_contatos')
          .insert(contatosToInsert);
        
        if (contatoError) {
          await supabase.from('clientes').delete().eq('id', newCliente.id);
          throw contatoError;
        }

        toast.success("Cliente criado com sucesso!");
        if (typeof onSave === 'function') onSave(newCliente.id);
      }
      onClose();
    } catch (error: any) {
      toast.error("Erro ao salvar", { description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] md:w-[600px] max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-lg">{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode ? 'Altere as informações do cliente.' : 'Preencha os dados para cadastrar.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Alerta de duplicados */}
            {duplicateCandidates && duplicateCandidates.length > 0 && (
              <Alert variant="default" className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-sm">
                  <span className="font-medium">Possíveis duplicados encontrados:</span>
                  <div className="mt-2 space-y-1.5">
                    {duplicateCandidates.slice(0, 3).map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{c.nome_fantasia || c.razao_social}</span>
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleUseCliente(c.id)}>
                            Usar este
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={() => navigate(`/clientes?open=${c.id}`)}>
                            Abrir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[55vh] pr-4">
              <div className="space-y-4">
                {/* Código do Cliente */}
                <FormField 
                  control={form.control} 
                  name="codigo_cliente" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Código do Cliente</FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="bg-muted/50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Razão Social e Nome Fantasia */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField 
                    control={form.control} 
                    name="razao_social" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Razão Social *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField 
                    control={form.control} 
                    name="nome_fantasia" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Nome Fantasia</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* CPF/CNPJ e Situação */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField 
                    control={form.control} 
                    name="cpf_cnpj" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">CPF/CNPJ</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00.000.000/0000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField 
                    control={form.control} 
                    name="situacao" 
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Situação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Inativo">Inativo</SelectItem>
                            <SelectItem value="Suspenso">Suspenso</SelectItem>
                            <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Contatos */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium">Contatos</h3>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => append({ nome_contato: '', email_contato: '', telefone_contato: '', departamento: '' })}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-3 border rounded-lg space-y-3 relative bg-muted/30">
                        <FormField 
                          control={form.control} 
                          name={`contatos.${index}.nome_contato`} 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nome *</FormLabel>
                              <FormControl>
                                <Input {...field} className="h-8 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField 
                            control={form.control} 
                            name={`contatos.${index}.email_contato`} 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Email</FormLabel>
                                <FormControl>
                                  <Input type="email" {...field} className="h-8 text-sm" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField 
                            control={form.control} 
                            name={`contatos.${index}.telefone_contato`} 
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Telefone</FormLabel>
                                <FormControl>
                                  <Input {...field} className="h-8 text-sm" placeholder="(00) 00000-0000" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField 
                          control={form.control} 
                          name={`contatos.${index}.departamento`} 
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Departamento</FormLabel>
                              <FormControl>
                                <Input placeholder="Ex: Financeiro, TI" {...field} className="h-8 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {fields.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-6 w-6" 
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteFormModal;